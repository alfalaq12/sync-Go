"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Database, Plus, Trash2, GripVertical, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getSchema, createSchema, updateSchema } from "@/lib/api";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

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

interface QueryRule {
  id: number;
  source_query: string;
  target_table: string;
  truncate_before: boolean;
  batch_size: number;
  extract_pre_query: string;
  extract_post_query: string;
  upload_pre_query: string;
  upload_post_query: string;
  sync_method: string;
  upsert_keys: string;
  incremental_column: string;
}

export default function SchemaEditPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isNew = params?.id === "new";
  const isView = searchParams.get("mode") === "view";

  const [formData, setFormData] = useState({
    name: "",
    owner: "admin",
    description: "",
    notes: "",
  });

  const [queries, setQueries] = useState<QueryRule[]>([]);
  let nextId = queries.length > 0 ? Math.max(...queries.map(q => q.id)) + 1 : 1;

  // Fetch existing schema for edit mode
  const { data: schemaData } = useQuery({
    queryKey: ["schema", params?.id],
    queryFn: () => getSchema(params?.id as string),
    enabled: !isNew && !!params?.id,
  });

  useEffect(() => {
    if (schemaData?.data) {
      const s = schemaData.data;
      setFormData({ name: s.name || "", owner: s.owner || "admin", description: s.description || "", notes: s.notes || "" });
      if (s.queries && s.queries.length > 0) {
        setQueries(s.queries.map((q: any, i: number) => ({
          id: q.id || i + 1,
          source_query: q.source_query || "",
          target_table: q.target_table || "",
          truncate_before: q.truncate_before || false,
          batch_size: q.batch_size || 5000,
          extract_pre_query: q.extract_pre_query || "",
          extract_post_query: q.extract_post_query || "",
          upload_pre_query: q.upload_pre_query || "",
          upload_post_query: q.upload_post_query || "",
          sync_method: q.sync_method || "INSERT",
          upsert_keys: q.upsert_keys || "",
          incremental_column: q.incremental_column || "updated_at",
        })));
      }
    }
  }, [schemaData]);

  const addQuery = () => {
    setQueries([...queries, { 
      id: nextId++, 
      source_query: "", 
      target_table: "", 
      truncate_before: false, 
      batch_size: 5000, 
      extract_pre_query: "", 
      extract_post_query: "", 
      upload_pre_query: "", 
      upload_post_query: "",
      sync_method: "INSERT",
      upsert_keys: "",
      incremental_column: "updated_at"
    }]);
  };

  const removeQuery = (id: number) => {
    setQueries(queries.filter(q => q.id !== id));
  };

  const updateQuery = (id: number, field: string, value: any) => {
    setQueries(queries.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        owner: formData.owner,
        description: formData.description,
        notes: formData.notes,
        queries: queries.map((q, i) => ({
          source_query: q.source_query,
          target_table: q.target_table,
          truncate_before: q.truncate_before,
          batch_size: Number(q.batch_size),
          extract_pre_query: q.extract_pre_query,
          extract_post_query: q.extract_post_query,
          upload_pre_query: q.upload_pre_query,
          upload_post_query: q.upload_post_query,
          sync_method: q.sync_method,
          upsert_keys: q.upsert_keys,
          incremental_column: q.incremental_column,
          sort_order: i + 1,
        })),
      };
      if (isNew) return createSchema(payload);
      return updateSchema(params?.id as string, payload);
    },
    onSuccess: () => {
      MySwal.fire({ title: isNew ? 'Schema Created' : 'Schema Updated', text: `Schema "${formData.name}" saved successfully.`, icon: 'success', ...swalTheme }).then(() => router.push("/dashboard/schema"));
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Error', text: err?.response?.data?.error || 'Failed to save schema.', icon: 'error', ...swalTheme });
    },
  });

  const handleSave = () => {
    // 1. Validate Schema Name
    if (!formData.name.trim()) {
      MySwal.fire({
        title: 'Missing Identity',
        text: 'Please provide a unique name for this Schema definition.',
        icon: 'warning',
        ...swalTheme
      });
      return;
    }

    // 2. Validate Target Tables in Rules
    const emptyTargetIdx = queries.findIndex(q => !q.target_table.trim());
    if (emptyTargetIdx !== -1) {
      MySwal.fire({
        title: 'Definition Incomplete',
        text: `Rule #${emptyTargetIdx + 1} is missing a Target Destination table. All active rules must have a valid destination.`,
        icon: 'warning',
        ...swalTheme
      });
      return;
    }

    // 3. Validate Source Queries
    const emptySourceIdx = queries.findIndex(q => !q.source_query.trim());
    if (emptySourceIdx !== -1) {
      MySwal.fire({
        title: 'Logic Error',
        text: `Rule #${emptySourceIdx + 1} has no Source Extraction Query. Data cannot be moved without a query.`,
        icon: 'warning',
        ...swalTheme
      });
      return;
    }

    saveMutation.mutate();
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => router.push("/dashboard/schema")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-primary hover:border-primary transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Database className="w-5 h-5" />
               </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {isView ? `View Schema: ${formData.name}` : (isNew ? "Create New Schema" : `Configure Schema: ${formData.name}`)}
                </h1>
            </div>
            <p className="text-[14px] font-medium text-muted-foreground">Define extract and load queries for synchronization pipeline.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Core Settings */}
        <div className="enterprise-card bg-card border border-border p-8 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <div className="grid gap-10 sm:grid-cols-2">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Schema Name</label>
                <input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. MASTER_TRANS_LOG" 
                  disabled={isView}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none disabled:bg-muted/30 disabled:text-muted-foreground" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Schema Owner</label>
                <input 
                  value={formData.owner} 
                  onChange={(e) => setFormData({...formData, owner: e.target.value})} 
                  className="w-full sm:w-[350px] h-11 px-4 rounded-lg border border-border bg-muted/30 text-sm font-bold text-muted-foreground outline-none" 
                />
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Description</label>
                <input 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  disabled={isView}
                  placeholder="Short explanation of this schema's purpose" 
                  className="w-full h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-medium text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none disabled:bg-muted/30 disabled:text-muted-foreground" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Implementation Notes</label>
                <textarea 
                  rows={2} 
                  value={formData.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                  disabled={isView}
                  placeholder="Optional internal notes for administrators" 
                  className="w-full p-4 rounded-lg border border-border bg-muted/50 text-sm font-medium text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none disabled:bg-muted/30 disabled:text-muted-foreground" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Query Definitions */}
        <div className="enterprise-card flex flex-col bg-card border border-border overflow-hidden shadow-xl">
          <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <h2 className="text-[14px] font-bold text-foreground uppercase tracking-wide">Sync Transformation Rules</h2>
               <div className="px-3 py-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">{queries.length} RULES</div>
            </div>
            {!isView && (
              <button 
                onClick={addQuery} 
                className="h-10 px-6 rounded-lg bg-card border border-primary text-primary hover:bg-primary hover:text-white text-[11px] font-bold transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" /> Add Extraction Rule
              </button>
            )}
          </div>

          <div className="p-8 space-y-6 bg-card min-h-[200px]">
            {queries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Database className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium text-[15px]">No query rules defined for this schema.</p>
                <button onClick={addQuery} className="mt-4 text-primary font-bold hover:underline text-sm uppercase tracking-widest">Connect First Rule Now</button>
              </div>
            )}
            
            {queries.map((q, idx) => (
              <div key={q.id} className="group relative border border-border rounded-xl bg-card overflow-hidden transition-all hover:border-primary hover:shadow-lg shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col items-center py-5 bg-muted/20 border-r border-border transition-colors group-hover:bg-primary/5">
                  <GripVertical className="w-4 h-4 text-[#94A3B8] cursor-grab mb-auto" />
                  <span className="text-[12px] font-bold text-foreground">{idx+1}</span>
                  {!isView && <button onClick={() => removeQuery(q.id)} className="mt-auto p-2 text-muted-foreground hover:text-red-500 transition-all"><Trash2 className="w-4.5 h-4.5" /></button>}
                </div>

                <div className="pl-14 pr-8 py-8">
                  <div className="grid lg:grid-cols-[1.8fr_1fr_2fr] gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                        Source Extraction Query
                        <span className="text-primary font-mono text-[9px] bg-primary/10 px-2 py-0.5 rounded-full">SOURCE SQL</span>
                      </label>
                      <textarea 
                        value={q.source_query} 
                        onChange={(e) => updateQuery(q.id, 'source_query', e.target.value)} 
                        rows={6} 
                        disabled={isView}
                        placeholder="SELECT col1, col2 FROM table WHERE ..." 
                        className="w-full p-4 rounded-lg border border-border bg-muted/30 font-mono text-[13px] text-foreground focus:border-primary focus:bg-muted/50 transition-all outline-none resize-none shadow-inner disabled:opacity-70" 
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target Destination</label>
                        <div className="relative">
                          <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input 
                            value={q.target_table} 
                            onChange={(e) => updateQuery(q.id, 'target_table', e.target.value)} 
                            disabled={isView}
                            placeholder="table_name" 
                            className="w-full h-11 pl-9 pr-4 rounded-lg border border-border bg-muted/30 font-mono text-[13px] font-bold text-foreground focus:border-primary focus:bg-muted/50 outline-none transition-all disabled:opacity-70" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Buffer Size (Rows)</label>
                        <input 
                          type="number"
                          value={q.batch_size} 
                          onChange={(e) => updateQuery(q.id, 'batch_size', e.target.value)} 
                          disabled={isView}
                          className="w-full h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all disabled:bg-muted/30" 
                        />
                      </div>

                      <div className="flex items-center gap-4 py-4 px-5 rounded-lg bg-red-500/10 border border-red-500/20">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" disabled={isView || q.sync_method === 'INCREMENTAL'} checked={q.truncate_before} onChange={(e) => updateQuery(q.id, 'truncate_before', e.target.checked)} className="sr-only peer" />
                          <div className="w-10 h-5.5 bg-muted border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all shadow-inner"></div>
                        </label>
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${q.sync_method === 'INCREMENTAL' ? 'text-muted-foreground' : 'text-red-500'}`}>Truncate Target</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sync Strategy</label>
                        <select 
                          value={q.sync_method} 
                          onChange={(e) => updateQuery(q.id, 'sync_method', e.target.value)}
                          disabled={isView}
                          className="w-full h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-bold text-primary focus:border-primary outline-none transition-all"
                        >
                          <option value="INSERT">Standard Insert (Append)</option>
                          <option value="UPSERT">Smart Upsert (Update Existing)</option>
                          <option value="INCREMENTAL">Incremental Flow (High-Water Mark)</option>
                        </select>
                      </div>

                      {q.sync_method === 'UPSERT' && (
                        <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                             Upsert Unique Keys <span className="text-[9px] text-primary normal-case">(Comma separated)</span>
                          </label>
                          <input 
                            value={q.upsert_keys} 
                            onChange={(e) => updateQuery(q.id, 'upsert_keys', e.target.value)}
                            disabled={isView}
                            placeholder="e.g. id, record_code" 
                            className="w-full h-11 px-4 rounded-lg border border-border bg-primary/10 font-mono text-[13px] text-foreground focus:border-primary outline-none" 
                          />
                        </div>
                      )}

                      {q.sync_method === 'INCREMENTAL' && (
                        <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                             Progress Column <span className="text-[9px] text-primary normal-case">(Must be monotonic)</span>
                          </label>
                          <input 
                            value={q.incremental_column} 
                            onChange={(e) => updateQuery(q.id, 'incremental_column', e.target.value)}
                            disabled={isView}
                            placeholder="e.g. updated_at" 
                            className="w-full h-11 px-4 rounded-lg border border-border bg-primary/10 font-mono text-[13px] text-foreground focus:border-primary outline-none" 
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Extract Pre-Query</label>
                           <textarea rows={2} disabled={isView} value={q.extract_pre_query} onChange={(e) => updateQuery(q.id, 'extract_pre_query', e.target.value)} className="w-full p-3 rounded-lg border border-border bg-muted/30 font-mono text-[11px] text-foreground focus:border-primary outline-none disabled:opacity-50" placeholder="None" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Extract Post-Query</label>
                           <textarea rows={2} disabled={isView} value={q.extract_post_query} onChange={(e) => updateQuery(q.id, 'extract_post_query', e.target.value)} className="w-full p-3 rounded-lg border border-border bg-muted/30 font-mono text-[11px] text-foreground focus:border-primary outline-none disabled:opacity-50" placeholder="None" />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Upload Pre-Query</label>
                           <textarea rows={2} disabled={isView} value={q.upload_pre_query} onChange={(e) => updateQuery(q.id, 'upload_pre_query', e.target.value)} className="w-full p-3 rounded-lg border border-border bg-muted/30 font-mono text-[11px] text-foreground focus:border-primary outline-none disabled:opacity-50" placeholder="None" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Upload Post-Query</label>
                           <textarea rows={2} disabled={isView} value={q.upload_post_query} onChange={(e) => updateQuery(q.id, 'upload_post_query', e.target.value)} className="w-full p-3 rounded-lg border border-border bg-muted/30 font-mono text-[11px] text-foreground focus:border-primary outline-none disabled:opacity-50" placeholder="None" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between py-6 px-10 border border-border rounded-xl bg-card">
          <button 
            onClick={() => router.push("/dashboard/schema")} 
            className="h-11 px-8 rounded-lg border border-border bg-card text-[11px] font-bold text-muted-foreground uppercase tracking-widest hover:bg-muted transition-all active:scale-[0.98]"
          >
            <X className="w-4 h-4 inline mr-2" /> {isView ? 'Close View' : 'Discard Changes'}
          </button>
          {!isView && (
            <button 
              onClick={handleSave} 
              disabled={saveMutation.isPending} 
              className="h-11 px-10 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Save className="w-4 h-4 inline mr-2" /> {saveMutation.isPending ? 'Saving Configuration...' : 'Save Configuration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
