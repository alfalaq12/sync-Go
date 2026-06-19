"use client";

import React, { useState, useEffect } from "react";
import { BookType, Search, Plus, Trash2, Edit2, Database, Download, Upload, AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

const MySwal = withReactContent(Swal);
const swalTheme = { 
  background: 'var(--card)', 
  color: 'var(--foreground)', 
  customClass: { 
    popup: 'enterprise-card shadow-2xl border border-border', 
    confirmButton: 'premium-button premium-button-primary px-6 py-2 ml-4',
    cancelButton: 'premium-button bg-muted text-muted-foreground border border-border px-6 py-2'
  } 
};

type Entry = { key: string, value: string };

export default function TextDBQueryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchKey, setSearchKey] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [originalKey, setOriginalKey] = useState("");

  const DB_PREFIX = "textdb_";

  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = () => {
    const loaded: Entry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DB_PREFIX)) {
        loaded.push({
          key: k.replace(DB_PREFIX, ""),
          value: localStorage.getItem(k) || ""
        });
      }
    }
    setEntries(loaded.sort((a, b) => a.key.localeCompare(b.key)));
  };

  const handleSearch = () => {
    if (!searchKey.trim()) {
      setSearchResult(null);
      setHasSearched(false);
      return;
    }
    const val = localStorage.getItem(DB_PREFIX + searchKey);
    setSearchResult(val);
    setHasSearched(true);
  };

  const handleSave = () => {
    if (!formKey.trim() || !formValue.trim()) {
      MySwal.fire({ title: "Error", text: "Key and Value cannot be empty", icon: "error", ...swalTheme });
      return;
    }
    
    // If editing and key changed, remove old key
    if (isEditing && formKey !== originalKey) {
      localStorage.removeItem(DB_PREFIX + originalKey);
    }
    
    localStorage.setItem(DB_PREFIX + formKey, formValue);
    
    setFormKey("");
    setFormValue("");
    setIsEditing(false);
    loadDatabase();
    
    MySwal.fire({ 
      title: "Saved", 
      text: "Entry has been saved successfully.", 
      icon: "success", 
      toast: true, 
      position: 'top-end', 
      showConfirmButton: false, 
      timer: 1500, 
      ...swalTheme 
    });
  };

  const handleEdit = (entry: Entry) => {
    setIsEditing(true);
    setFormKey(entry.key);
    setOriginalKey(entry.key);
    setFormValue(entry.value);
    
    // Scroll to form (rough approximation)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (key: string) => {
    MySwal.fire({
      title: 'Are you sure?',
      text: `Delete entry '${key}'?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      ...swalTheme
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem(DB_PREFIX + key);
        loadDatabase();
        if (searchKey === key) {
          setSearchResult(null);
          setHasSearched(false);
        }
      }
    });
  };

  const exportDB = () => {
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncgo-textdb-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as Entry[];
        if (Array.isArray(imported)) {
          imported.forEach(entry => {
            if (entry.key && entry.value) {
              localStorage.setItem(DB_PREFIX + entry.key, entry.value);
            }
          });
          loadDatabase();
          MySwal.fire({ title: "Imported", text: `Successfully imported ${imported.length} entries.`, icon: "success", ...swalTheme });
        }
      } catch (err) {
        MySwal.fire({ title: "Error", text: "Invalid JSON format.", icon: "error", ...swalTheme });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <BookType className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">TextDB Query</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Lightweight key-value storage for flat file mappings and configurations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportDB}
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
          <label className="h-10 px-4 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[13px] font-bold text-primary transition-all flex items-center gap-2 active:scale-95 shadow-sm cursor-pointer">
            <Upload className="w-4 h-4" /> Import JSON
            <input type="file" accept=".json" className="hidden" onChange={importDB} />
          </label>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Left Column (Query & Form) */}
        <div className="w-full xl:w-96 shrink-0 flex flex-col gap-6">
          
          {/* Query Box */}
          <div className="enterprise-card p-6 shadow-lg">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" /> Query Engine
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter exact key..."
                className="flex-1 h-10 px-3 rounded bg-muted/50 border border-border text-sm outline-none focus:border-primary font-mono"
              />
              <button 
                onClick={handleSearch}
                className="h-10 px-4 rounded bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center"
              >
                Find
              </button>
            </div>

            {hasSearched && (
              <div className="mt-4 p-4 bg-muted/20 border border-border rounded-lg">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Query Result</div>
                {searchResult !== null ? (
                  <div className="font-mono text-sm text-foreground break-words">{searchResult}</div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-500 text-sm">
                    <AlertCircle className="w-4 h-4" /> Key not found.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit Form */}
          <div className="enterprise-card p-6 shadow-lg border-primary/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                {isEditing ? <Edit2 className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />} 
                {isEditing ? "Edit Entry" : "Add New Entry"}
              </h3>
              {isEditing && (
                <button 
                  onClick={() => { setIsEditing(false); setFormKey(""); setFormValue(""); }}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Key Name</label>
                <input 
                  type="text" 
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="e.g. mapping_table_1"
                  className="w-full h-10 px-3 rounded bg-card border border-border text-sm outline-none focus:border-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Value Content</label>
                <textarea 
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="Enter value..."
                  className="w-full h-32 p-3 rounded bg-card border border-border text-sm outline-none focus:border-primary font-mono resize-none"
                />
              </div>
              <button 
                onClick={handleSave}
                className="w-full h-10 rounded bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Save className="w-4 h-4" /> {isEditing ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column (Data Table) */}
        <div className="flex-1 enterprise-card flex flex-col min-h-[600px] shadow-lg overflow-hidden">
          <div className="h-12 border-b border-border bg-muted/10 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-foreground">
              <Database className="w-4 h-4 text-primary" /> All Records
            </div>
            <div className="text-[11px] font-bold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full">
              {entries.length} items
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-card">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <Database className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-medium">Database is empty.</p>
                <p className="text-xs mt-1 text-center max-w-[250px]">Add a new entry or import a JSON file to populate the TextDB.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur shadow-sm">
                  <tr>
                    <th className="px-6 py-3 font-bold text-muted-foreground border-b border-border text-[10px] uppercase w-1/3">Key</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground border-b border-border text-[10px] uppercase">Value Preview</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground border-b border-border text-[10px] uppercase w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry, idx) => (
                    <tr key={idx} className={cn(
                      "transition-colors",
                      isEditing && originalKey === entry.key ? "bg-primary/10" : "hover:bg-muted/30"
                    )}>
                      <td className="px-6 py-3 font-mono text-[12px] text-foreground font-bold break-all align-top">
                        {entry.key}
                      </td>
                      <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground line-clamp-3">
                        {entry.value}
                      </td>
                      <td className="px-6 py-3 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(entry)}
                            className="p-1.5 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(entry.key)}
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
