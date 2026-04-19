"use client";

import { useState, useEffect, memo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Network, RefreshCcw, Database, Server, KeyRound, ArrowRight, Shield, Globe, Info, Settings2, ArrowDownUp, Lock } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getNetwork, createNetwork, updateNetwork, testSourceConnection, testTargetConnection, testNetworkAdhoc, fetchNodes, fetchSchemas, fetchCredentials } from "@/lib/api";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);
const swalTheme = { 
  background: '#FFFFFF', 
  color: '#0F172A', 
  customClass: { 
    popup: 'enterprise-card shadow-2xl border border-[#E2E8F0]', 
    confirmButton: 'premium-button premium-button-primary px-6 py-2 ml-4',
    cancelButton: 'premium-button bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] px-6 py-2'
  } 
};

const DRIVER_OPTIONS = [
  { value: "", label: "Select Driver Engine" },
  { value: "postgresql", label: "PostgreSQL Standard" },
  { value: "mysql", label: "MySQL Connector" },
  { value: "oracle", label: "Oracle Enterprise" },
  { value: "csv", label: "Flat File (CSV/TXT)" },
  { value: "ftp", label: "FTP Protocol" },
  { value: "sftp", label: "SFTP Secure" },
  { value: "api", label: "RESTful API Ingestion" },
];

const RESOURCE_TYPES = [
  { value: "", label: "Select Resource Type" },
  { value: "service_path", label: "Direct Service Access" },
  { value: "local_path", label: "Local File System" },
  { value: "ftp_path", label: "Remote File Transfer" },
  { value: "api_url", label: "Web Service Endpoint" },
];

// --- Sub-components moved outside to fix the re-render focus bug ---

const InputField = memo(({ label, value, onChange, mono, icon: Icon, placeholder, type = "text", disabled }: any) => (
  <div className={`space-y-2 group ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
    <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest pl-1 flex items-center gap-2 group-focus-within:text-[#1E90FF] transition-colors">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </label>
    <div className="relative">
      <input 
        type={type}
        value={value} 
        onChange={onChange} 
        disabled={disabled}
        placeholder={placeholder || ""} 
        className={`w-full h-11 px-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] font-medium text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#1E90FF]/5 focus:border-[#1E90FF] transition-all placeholder:text-[#94A3B8] ${mono ? 'font-mono text-[#0F172A] font-bold bg-white' : ''} ${disabled ? 'cursor-not-allowed bg-slate-50' : ''}`} 
      />
    </div>
  </div>
));
InputField.displayName = "InputField";

const SelectField = memo(({ label, value, onChange, options, icon: Icon, disabled }: any) => (
  <div className={`space-y-2 ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
    <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest pl-1 flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </label>
    <div className="relative">
      <select 
        value={value} 
        onChange={onChange} 
        disabled={disabled}
        className={`w-full h-11 px-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] font-medium text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#1E90FF]/5 focus:border-[#1E90FF] transition-all appearance-none cursor-pointer pr-10 ${disabled ? 'cursor-not-allowed bg-slate-50' : ''}`}
      >
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]">
         <ArrowDownUp className="w-3.5 h-3.5" />
      </div>
    </div>
  </div>
));
SelectField.displayName = "SelectField";

export default function NetworkEditPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isNew = params?.id === "new";
  const isViewOnly = searchParams.get('mode') === 'view';

  const [form, setForm] = useState({
    schema_id: null as number | null,
    source_node_id: "" as string | number, target_node_id: "" as string | number,
    source_driver: "", source_resource_type: "", source_host: "", source_port: "",
    source_database: "", source_username: "", source_password: "", source_credential_id: null as number | null, source_path: "",
    source_charset: "UTF-8", source_csv_header: false, source_csv_separator: "|", source_csv_extension: ".TXT",
    target_driver: "", target_resource_type: "", target_host: "", target_port: "",
    target_database: "", target_username: "", target_password: "", target_credential_id: null as number | null, target_path: "",
    schedule_engine: "manual", cron_expression: "" as string, notes: "", owner: "admin",
  });

  const { data: netData } = useQuery({ queryKey: ["network", params?.id], queryFn: () => getNetwork(params?.id as string), enabled: !isNew && !!params?.id });
  const { data: nodesData } = useQuery({ queryKey: ["nodes"], queryFn: fetchNodes });
  const { data: schemasData } = useQuery({ queryKey: ["schemas"], queryFn: fetchSchemas });
  const { data: credsData } = useQuery({ queryKey: ["credentials"], queryFn: fetchCredentials });

  useEffect(() => {
    if (netData?.data) {
      const n = netData.data;
      setForm({
        schema_id: n.schema_id, 
        source_node_id: n.source_node_id || "", 
        target_node_id: n.target_node_id || "",
        source_driver: n.source_driver || "", source_resource_type: n.source_resource_type || "",
        source_host: n.source_host || "", source_port: n.source_port ? String(n.source_port) : "",
        source_database: n.source_database || "", source_username: n.source_username || "", source_password: n.source_password || "",
        source_credential_id: n.source_credential_id,
        source_path: n.source_path || "", source_charset: n.source_charset || "UTF-8", source_csv_header: n.source_csv_header || false,
        source_csv_separator: n.source_csv_separator || "|", source_csv_extension: n.source_csv_extension || ".TXT",
        target_driver: n.target_driver || "", target_resource_type: n.target_resource_type || "",
        target_host: n.target_host || "", target_port: n.target_port ? String(n.target_port) : "",
        target_database: n.target_database || "", target_username: n.target_username || "", target_password: n.target_password || "",
        target_credential_id: n.target_credential_id,
        target_path: n.target_path || "", schedule_engine: n.schedule_engine || "manual", 
        cron_expression: n.cron_expression || "",
        notes: n.notes || "", owner: n.owner || "admin",
      });
    }
  }, [netData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        source_port: form.source_port ? parseInt(form.source_port) : null,
        target_port: form.target_port ? parseInt(form.target_port) : null,
        source_node_id: form.source_node_id ? parseInt(String(form.source_node_id)) : null,
        target_node_id: form.target_node_id ? parseInt(String(form.target_node_id)) : null,
        source_credential_id: form.source_credential_id ? parseInt(String(form.source_credential_id)) : null,
        target_credential_id: form.target_credential_id ? parseInt(String(form.target_credential_id)) : null,
      };
      if (isNew) return createNetwork(payload);
      return updateNetwork(params?.id as string, payload);
    },
    onSuccess: () => {
      MySwal.fire({ title: isNew ? 'Pipeline Created' : 'Topology Updated', text: 'Network configuration has been synchronized to registry.', icon: 'success', ...swalTheme }).then(() => router.push("/dashboard/network"));
    },
    onError: (err: any) => { MySwal.fire({ title: 'Deployment Error', text: err?.response?.data?.error || 'Failed to sync topology.', icon: 'error', ...swalTheme }); },
  });

  const handleTestSource = async () => {
    try {
      // Safely convert potential string inputs to numbers
      const toNum = (val: any) => (val === "" || val === null || val === undefined) ? null : Number(val);

      const payload = {
        ...form,
        type: 'source',
        source_port: toNum(form.source_port),
        target_port: toNum(form.target_port),
        schema_id: toNum(form.schema_id),
        source_node_id: toNum(form.source_node_id),
        target_node_id: toNum(form.target_node_id),
        source_credential_id: toNum(form.source_credential_id),
        target_credential_id: toNum(form.target_credential_id),
      };
      const res = await testNetworkAdhoc(payload);
      MySwal.fire({ title: 'Source Uplink', text: res.message, icon: res.success ? 'success' : 'error', ...swalTheme });
    } catch (err: any) { 
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 'Could not reach source node.';
      MySwal.fire({ title: 'Link Failure', text: errorMsg, icon: 'error', ...swalTheme }); 
    }
  };

  const handleTestTarget = async () => {
    try {
      const toNum = (val: any) => (val === "" || val === null || val === undefined) ? null : Number(val);

      const payload = {
        ...form,
        type: 'target',
        source_port: toNum(form.source_port),
        target_port: toNum(form.target_port),
        schema_id: toNum(form.schema_id),
        source_node_id: toNum(form.source_node_id),
        target_node_id: toNum(form.target_node_id),
        source_credential_id: toNum(form.source_credential_id),
        target_credential_id: toNum(form.target_credential_id),
      };
      const res = await testNetworkAdhoc(payload);
      MySwal.fire({ title: 'Target Uplink', text: res.message, icon: res.success ? 'success' : 'error', ...swalTheme });
    } catch (err: any) { 
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 'Could not reach target destination.';
      MySwal.fire({ title: 'Link Failure', text: errorMsg, icon: 'error', ...swalTheme }); 
    }
  };

  const nodes = nodesData?.data || [];
  const schemas = schemasData?.data || [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <button 
            onClick={() => router.push("/dashboard/network")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#E2E8F0] shadow-sm text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
                <Network className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                {isNew ? "Create Network Topology" : isViewOnly ? "View Network Topology" : "Modify Network Topology"}
              </h1>
            </div>
            <p className="text-[14px] font-medium text-[#64748B]">Architect high-availability data streams between secure endpoints.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-10">
        
        {/* Module Settings Card */}
        <div className="enterprise-card bg-white p-8 shadow-lg border border-[#E2E8F0] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1E90FF] to-[#00C6AD]" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 relative">
            <SelectField 
              label="Mapping Logic" 
              icon={Database}
              disabled={isViewOnly}
              value={form.schema_id || ""} 
              onChange={(e: any) => setForm({...form, schema_id: e.target.value ? parseInt(e.target.value) : null})} 
              options={[{value: "", label: "Assign Sync Schema..."}, ...schemas.map((s: any) => ({value: s.id, label: s.name}))]} 
            />
            <SelectField 
              label="Sync Engine" 
              icon={Settings2}
              disabled={isViewOnly}
              value={form.schedule_engine} 
              onChange={(e: any) => setForm({...form, schedule_engine: e.target.value})} 
              options={[{value: "manual", label: "Manual Execution (Default)"}, {value: "cron", label: "CRON Scheduler"}]} 
            />
            <InputField 
              label="Resource Owner" 
              icon={Shield}
              disabled={isViewOnly}
              value={form.owner} 
              onChange={(e: any) => setForm({...form, owner: e.target.value})} 
            />
            <InputField 
              label="Internal Memo" 
              icon={Info}
              disabled={isViewOnly}
              value={form.notes} 
              onChange={(e: any) => setForm({...form, notes: e.target.value})} 
              placeholder="Internal tracking notes..."
            />
          </div>
          
          {form.schedule_engine === 'cron' && (
            <div className="mt-8 pt-6 border-t border-[#E2E8F0] animate-in slide-in-from-top-4 duration-300">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <SelectField 
                  label="Execution Interval" 
                  icon={RefreshCcw}
                  disabled={isViewOnly}
                  value={form.cron_expression && !['*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *', '0 0 * * *'].includes(form.cron_expression) ? 'custom' : form.cron_expression} 
                  onChange={(e: any) => setForm({...form, cron_expression: e.target.value})} 
                  options={[
                    {value: "", label: "Select Interval..."},
                    {value: "*/5 * * * *", label: "Every 5 Minutes"},
                    {value: "*/15 * * * *", label: "Every 15 Minutes"},
                    {value: "*/30 * * * *", label: "Every 30 Minutes"},
                    {value: "0 * * * *", label: "Every Hour"},
                    {value: "0 0 * * *", label: "Daily at Midnight"},
                    {value: "custom", label: "Custom Cron Expression..."}
                  ]} 
                />
                {(form.cron_expression === 'custom' || (!['', '*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *', '0 0 * * *'].includes(form.cron_expression) && form.cron_expression !== 'manual')) && (
                  <InputField 
                    label="Custom Cron Output" 
                    icon={Settings2}
                    disabled={isViewOnly}
                    value={form.cron_expression === 'custom' ? "" : form.cron_expression} 
                    onChange={(e: any) => setForm({...form, cron_expression: e.target.value})} 
                    placeholder="* * * * *"
                    mono
                  />
                )}
                <div className="lg:col-span-2 flex items-center p-4 bg-amber-50 rounded-lg border border-amber-100">
                   <Info className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />
                   <p className="text-[12px] text-amber-800 font-medium">
                     Scheduling is powered by <strong>robfig/cron</strong>. The engine will automatically wake up and pull data from source based on this interval.
                   </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dual Stream Config */}
        <div className="grid gap-10 lg:grid-cols-2">
          
          {/* SOURCE (UPSTREAM) */}
          <div className="enterprise-card bg-white border border-[#E2E8F0] overflow-hidden shadow-xl flex flex-col group hover:border-[#1E90FF] transition-all duration-300">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-6 flex items-center justify-between">
              <h2 className="text-[11px] font-black text-[#1E90FF] tracking-widest uppercase flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#1E90FF] animate-pulse" />
                Source Configuration
              </h2>
              <Globe className="w-4.5 h-4.5 text-[#1E90FF]/30 group-hover:rotate-12 transition-transform" />
            </div>
            <div className="p-8 space-y-6 flex-1">
              <div className="grid sm:grid-cols-2 gap-6">
                <SelectField label="Origin Node" disabled={isViewOnly} value={form.source_node_id} onChange={(e: any) => setForm({...form, source_node_id: e.target.value})} options={[{value: "", label: "Select Origin..."}, ...nodes.map((n: any) => ({value: n.id, label: `${n.node_code} (${n.node_name || n.hostname})`}))]} />
                <SelectField label="Core Driver" disabled={isViewOnly} value={form.source_driver} onChange={(e: any) => setForm({...form, source_driver: e.target.value})} options={DRIVER_OPTIONS} />
              </div>
              <SelectField label="Connectivity Type" disabled={isViewOnly} value={form.source_resource_type} onChange={(e: any) => setForm({...form, source_resource_type: e.target.value})} options={RESOURCE_TYPES} />
              
              {form.source_driver !== 'csv' ? (
                <>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div className="sm:col-span-2"><InputField label="Cloud/Local Host" disabled={isViewOnly} value={form.source_host} onChange={(e: any) => setForm({...form, source_host: e.target.value})} mono icon={Server} placeholder="db.origin.com" /></div>
                    <InputField label="Port" disabled={isViewOnly} value={form.source_port} onChange={(e: any) => setForm({...form, source_port: e.target.value})} mono placeholder="5432" />
                  </div>

                  <InputField label="Source Database Name" disabled={isViewOnly} value={form.source_database} onChange={(e: any) => setForm({...form, source_database: e.target.value})} mono placeholder="production_db" />
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <InputField label="Service Account" disabled={isViewOnly} value={form.source_username} onChange={(e: any) => setForm({...form, source_username: e.target.value})} placeholder="usr_sync" />
                    <div className={`space-y-2 ${isViewOnly ? 'opacity-70 pointer-events-none' : ''}`}>
                       <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5" />
                            Auth Vault
                          </label>
                          <span className="text-[9px] font-bold text-[#1E90FF] uppercase cursor-help hover:underline" title="Select a shared credential from your Vault to override manual password.">Use shared?</span>
                       </div>
                       <select 
                          value={form.source_credential_id || ""} 
                          disabled={isViewOnly}
                          onChange={(e) => setForm({...form, source_credential_id: e.target.value ? parseInt(e.target.value) : null})}
                          className={`w-full h-11 px-4 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#1E90FF] focus:outline-none focus:ring-4 focus:ring-[#1E90FF]/5 focus:border-[#1E90FF] transition-all appearance-none cursor-pointer ${isViewOnly ? 'cursor-not-allowed bg-slate-50' : ''}`}
                       >
                          <option value="">— Use Manual Password Below —</option>
                          {(credsData?.data || []).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.username})</option>
                          ))}
                       </select>
                    </div>
                  </div>
                  
                  {!form.source_credential_id ? (
                    <InputField label="Key Secret (Manual)" type="password" value={form.source_password} onChange={(e: any) => setForm({...form, source_password: e.target.value})} icon={Lock} placeholder="••••••••" />
                  ) : (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
                       <span className="text-[11px] font-bold text-[#1E90FF] uppercase tracking-wider">Linked to Vault Identity</span>
                       <Shield className="w-4 h-4 text-[#1E90FF]" />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6 p-6 rounded-xl bg-slate-50 border border-slate-200 border-dashed animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Flat File Configuration</span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <InputField label="CSV Separator" disabled={isViewOnly} value={form.source_csv_separator} onChange={(e: any) => setForm({...form, source_csv_separator: e.target.value})} mono placeholder="|" />
                    <InputField label="File Extension" disabled={isViewOnly} value={form.source_csv_extension} onChange={(e: any) => setForm({...form, source_csv_extension: e.target.value})} mono placeholder=".TXT" />
                    <div className="flex items-center gap-4 pt-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" disabled={isViewOnly} checked={form.source_csv_header} onChange={(e: any) => setForm({...form, source_csv_header: e.target.checked})} className="sr-only peer" />
                        <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#1E90FF] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all shadow-inner"></div>
                      </label>
                      <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">Has Header</span>
                    </div>
                  </div>
                </div>
              )}
              
              <InputField label="Resource Identifier Path" disabled={isViewOnly} value={form.source_path} onChange={(e: any) => setForm({...form, source_path: e.target.value})} mono placeholder="/mnt/data/source.csv" />
            </div>
            
            <div className="p-6 border-t border-[#E2E8F0] bg-[#F8FAFC]/50 flex justify-center">
              <button onClick={handleTestSource} className="h-10 px-8 rounded-lg bg-white border border-[#1E90FF] text-[#1E90FF] hover:bg-[#1E90FF] hover:text-white text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 group/btn">
                <RefreshCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" /> Verify Source Connectivity
              </button>
            </div>
          </div>

          {/* TARGET (DOWNSTREAM) */}
          <div className="enterprise-card bg-white border border-[#E2E8F0] overflow-hidden shadow-xl flex flex-col group hover:border-[#00C6AD] transition-all duration-300">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-6 flex items-center justify-between">
              <h2 className="text-[11px] font-black text-[#00C6AD] tracking-widest uppercase flex items-center gap-3">
                <ArrowRight className="w-4 h-4" />
                Target Destination
              </h2>
              <Database className="w-4.5 h-4.5 text-[#00C6AD]/30 group-hover:-rotate-12 transition-transform" />
            </div>
            <div className="p-8 space-y-6 flex-1">
               <div className="grid sm:grid-cols-2 gap-6">
                <SelectField label="Destination Node" disabled={isViewOnly} value={form.target_node_id} onChange={(e: any) => setForm({...form, target_node_id: e.target.value})} options={[{value: "", label: "Select Destination..."}, ...nodes.map((n: any) => ({value: n.id, label: `${n.node_code} (${n.node_name || n.hostname})`}))]} />
                <SelectField label="Core Driver" disabled={isViewOnly} value={form.target_driver} onChange={(e: any) => setForm({...form, target_driver: e.target.value})} options={DRIVER_OPTIONS} />
              </div>
              <SelectField label="Connectivity Type" disabled={isViewOnly} value={form.target_resource_type} onChange={(e: any) => setForm({...form, target_resource_type: e.target.value})} options={RESOURCE_TYPES} />
              
              {form.target_driver !== 'csv' ? (
                <>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div className="sm:col-span-2"><InputField label="Cloud/Local Host" disabled={isViewOnly} value={form.target_host} onChange={(e: any) => setForm({...form, target_host: e.target.value})} mono icon={Server} placeholder="rds.target.aws..." /></div>
                    <InputField label="Port" disabled={isViewOnly} value={form.target_port} onChange={(e: any) => setForm({...form, target_port: e.target.value})} mono placeholder="3306" />
                  </div>

                  <InputField label="Target Database Name" disabled={isViewOnly} value={form.target_database} onChange={(e: any) => setForm({...form, target_database: e.target.value})} mono placeholder="warehouse_db" />
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <InputField label="Service Account" disabled={isViewOnly} value={form.target_username} onChange={(e: any) => setForm({...form, target_username: e.target.value})} placeholder="usr_sink" />
                    <div className={`space-y-2 ${isViewOnly ? 'opacity-70 pointer-events-none' : ''}`}>
                       <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5" />
                            Auth Vault
                          </label>
                          <span className="text-[9px] font-bold text-[#00C6AD] uppercase cursor-help hover:underline" title="Select a shared credential from your Vault to override manual password.">Use shared?</span>
                       </div>
                       <select 
                          value={form.target_credential_id || ""} 
                          disabled={isViewOnly}
                          onChange={(e) => setForm({...form, target_credential_id: e.target.value ? parseInt(e.target.value) : null})}
                          className={`w-full h-11 px-4 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#00C6AD] focus:outline-none focus:ring-4 focus:ring-[#00C6AD]/5 focus:border-[#00C6AD] transition-all appearance-none cursor-pointer ${isViewOnly ? 'cursor-not-allowed bg-slate-50' : ''}`}
                       >
                          <option value="">— Use Manual Password Below —</option>
                          {(credsData?.data || []).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.username})</option>
                          ))}
                       </select>
                    </div>
                  </div>
                  
                  {!form.target_credential_id ? (
                    <InputField label="Key Secret (Manual)" type="password" value={form.target_password} onChange={(e: any) => setForm({...form, target_password: e.target.value})} icon={Lock} placeholder="••••••••" />
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                       <span className="text-[11px] font-bold text-[#00C6AD] uppercase tracking-wider">Linked to Vault Identity</span>
                       <Shield className="w-4 h-4 text-[#00C6AD]" />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6 p-6 rounded-xl bg-slate-50 border border-slate-200 border-dashed animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Info className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">File Sink Configuration</span>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                     <p className="text-[11px] text-emerald-800 font-medium">Exporting to Flat File. Ensure the process has write permissions to the path below.</p>
                  </div>
                </div>
              )}
              
              <InputField label="Resource Identifier Path" disabled={isViewOnly} value={form.target_path} onChange={(e: any) => setForm({...form, target_path: e.target.value})} mono placeholder="/var/www/target/" />
            </div>
            
            <div className="p-6 border-t border-[#E2E8F0] bg-[#F8FAFC]/50 flex justify-center">
              <button onClick={handleTestTarget} className="h-10 px-8 rounded-lg bg-white border border-[#00C6AD] text-[#00C6AD] hover:bg-[#00C6AD] hover:text-white text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 group/btn">
                <RefreshCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" /> Verify Target Connectivity
              </button>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between py-6 px-10 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
          <button 
            onClick={() => router.push("/dashboard/network")} 
            className="h-11 px-8 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-bold text-[#64748B] uppercase tracking-widest hover:bg-zinc-50 transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" /> {isViewOnly ? "Return to Gallery" : "Discard"}
          </button>
          {!isViewOnly && (
            <button 
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending} 
              className="h-11 px-10 rounded-lg bg-[#1E90FF] text-white text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-[#1E90FF]/20 hover:bg-[#1c86ee] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Save className="w-4 h-4 inline mr-2" /> {saveMutation.isPending ? 'Deploying Topology...' : 'Commit Topology Settings'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
