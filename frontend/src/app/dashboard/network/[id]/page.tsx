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
  background: 'var(--card)', 
  color: 'var(--foreground)', 
  customClass: { 
    popup: 'enterprise-card shadow-2xl border border-border', 
    confirmButton: 'premium-button premium-button-primary px-6 py-2 ml-4',
    cancelButton: 'premium-button bg-muted text-muted-foreground border border-border px-6 py-2'
  } 
};

const DB_DRIVERS = ["postgresql", "mysql", "oracle", "sqlserver"];
const FILE_DRIVERS = ["csv", "ftp", "sftp"];

const DRIVER_OPTIONS = [
  { value: "", label: "Select Driver Engine" },
  { value: "postgresql", label: "PostgreSQL Standard" },
  { value: "mysql", label: "MySQL (MariaDB)" },
  { value: "oracle", label: "Oracle Database" },
  { value: "sqlserver", label: "Microsoft SQL Server" },
  { value: "csv", label: "Flat File (CSV/TXT)" },
  { value: "ftp", label: "File Transfer (FTP)" },
  { value: "sftp", label: "Secure File Transfer (SFTP)" },
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
    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2 group-focus-within:text-primary transition-colors">
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
        className={`w-full h-11 px-4 rounded-lg border border-border bg-muted/50 text-[13px] font-medium text-foreground focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-muted-foreground/50 ${mono ? 'font-mono text-foreground font-bold bg-card' : ''} ${disabled ? 'cursor-not-allowed bg-muted/30' : ''}`} 
      />
    </div>
  </div>
));
InputField.displayName = "InputField";

const SelectField = memo(({ label, value, onChange, options, icon: Icon, disabled }: any) => (
  <div className={`space-y-2 ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </label>
    <div className="relative">
      <select 
        value={value} 
        onChange={onChange} 
        disabled={disabled}
        className={`w-full h-11 px-4 rounded-lg border border-border bg-muted/50 text-[13px] font-medium text-foreground focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer pr-10 ${disabled ? 'cursor-not-allowed bg-muted/30' : ''}`}
      >
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50">
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
    sid: "", name: "",
    schema_id: null as number | null,
    source_node_id: "" as string | number, target_node_id: "" as string | number,
    source_driver: "", source_resource_type: "", source_host: "", source_port: "",
    source_database: "", source_username: "", source_password: "", source_credential_id: null as number | null, source_path: "",
    source_charset: "UTF-8", source_csv_header: false, source_csv_separator: "|", source_csv_extension: ".TXT",
    target_driver: "", target_resource_type: "", target_host: "", target_port: "",
    target_database: "", target_username: "", target_password: "", target_credential_id: null as number | null, target_path: "",
    schedule_engine: "manual", cron_expression: "" as string, notes: "", owner: "admin",
  });

  const cloneId = searchParams.get('clone');
  const actualId = cloneId || (params?.id as string);
  const isClone = !!cloneId;

  const { data: netData } = useQuery({ 
    queryKey: ["network", actualId], 
    queryFn: () => getNetwork(actualId), 
    enabled: (!isNew || isClone) && !!actualId 
  });
  const { data: nodesData } = useQuery({ queryKey: ["nodes"], queryFn: fetchNodes });
  const { data: schemasData } = useQuery({ queryKey: ["schemas"], queryFn: fetchSchemas });
  const { data: credsData } = useQuery({ queryKey: ["credentials"], queryFn: fetchCredentials });

  useEffect(() => {
    if (netData?.data) {
      const n = netData.data;
      setForm({
        sid: isClone ? `${n.sid || ''}_CLONE` : (n.sid || ""),
        name: isClone ? `${n.name || ''} (Cloned)` : (n.name || ""),
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
  }, [netData, isClone]);

  useEffect(() => {
    let source_resource_type = form.source_resource_type;
    if (DB_DRIVERS.includes(form.source_driver)) {
      source_resource_type = "service_path";
    } else if (form.source_driver === "csv") {
      source_resource_type = "local_path";
    } else if (["ftp", "sftp"].includes(form.source_driver)) {
      source_resource_type = "ftp_path";
    } else if (form.source_driver === "api") {
      source_resource_type = "api_url";
    }

    let target_resource_type = form.target_resource_type;
    if (DB_DRIVERS.includes(form.target_driver)) {
      target_resource_type = "service_path";
    } else if (form.target_driver === "csv") {
      target_resource_type = "local_path";
    } else if (["ftp", "sftp"].includes(form.target_driver)) {
      target_resource_type = "ftp_path";
    } else if (form.target_driver === "api") {
      target_resource_type = "api_url";
    }

    if (source_resource_type !== form.source_resource_type || target_resource_type !== form.target_resource_type) {
      setForm(prev => ({
        ...prev,
        source_resource_type,
        target_resource_type
      }));
    }
  }, [form.source_driver, form.target_driver, form.source_resource_type, form.target_resource_type]);

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
      MySwal.fire({ 
        title: 'Source Connection', 
        text: res.success ? 'Source connection successful' : res.message, 
        icon: res.success ? 'success' : 'error', 
        ...swalTheme 
      });
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
      MySwal.fire({ 
        title: 'Target Connection', 
        text: res.success ? 'Target connection successful' : res.message, 
        icon: res.success ? 'success' : 'error', 
        ...swalTheme 
      });
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
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-primary hover:border-primary transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Network className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {isNew ? "Create Network Topology" : isViewOnly ? "View Network Topology" : "Modify Network Topology"}
              </h1>
            </div>
            <p className="text-[14px] font-medium text-muted-foreground">Architect high-availability data streams between secure endpoints.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-10">
        
        {/* Module Settings Card */}
        <div className="enterprise-card bg-card p-8 shadow-lg border border-border overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-500" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 relative">
            <InputField 
              label="Network Name (SID)" 
              icon={Network}
              disabled={isViewOnly}
              value={form.sid} 
              onChange={(e: any) => setForm({...form, sid: e.target.value})} 
              placeholder="e.g. NET_PROD_SBD"
              mono
            />
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
            <div className="mt-8 pt-6 border-t border-border animate-in slide-in-from-top-4 duration-300">
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
                <div className="lg:col-span-2 flex items-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                   <Info className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />
                   <p className="text-[12px] text-amber-500 font-medium">
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
          <div className="enterprise-card bg-card border border-border overflow-hidden shadow-xl flex flex-col group hover:border-primary transition-all duration-300">
            <div className="bg-muted/20 border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-[11px] font-black text-primary tracking-widest uppercase flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Source Configuration
              </h2>
              <Globe className="w-4.5 h-4.5 text-primary/30 group-hover:rotate-12 transition-transform" />
            </div>
            <div className="p-8 space-y-6 flex-1">
              <div className="grid sm:grid-cols-2 gap-6">
                <SelectField label="Node" disabled={isViewOnly} value={form.source_node_id} onChange={(e: any) => setForm({...form, source_node_id: e.target.value})} options={[{value: "", label: "Select Node..."}, ...nodes.map((n: any) => ({value: n.id, label: `${n.node_code} (${n.node_name || n.hostname})`}))]} />
                <SelectField label="Driver" disabled={isViewOnly} value={form.source_driver} onChange={(e: any) => setForm({...form, source_driver: e.target.value})} options={DRIVER_OPTIONS} />
              </div>

              {!form.source_driver && (
                <SelectField label="Connectivity Type" disabled={isViewOnly} value={form.source_resource_type} onChange={(e: any) => setForm({...form, source_resource_type: e.target.value})} options={RESOURCE_TYPES} />
              )}
              
              {/* Host & Port for DB, FTP, SFTP, and API */}
              {(DB_DRIVERS.includes(form.source_driver) || ["ftp", "sftp", "api"].includes(form.source_driver)) && (
                <div className="grid sm:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  <div className="sm:col-span-2">
                    <InputField 
                      label={form.source_driver === 'api' ? "API Base URL / Endpoint" : "Cloud/Local Host"} 
                      disabled={isViewOnly} 
                      value={form.source_host} 
                      onChange={(e: any) => setForm({...form, source_host: e.target.value})} 
                      mono 
                      icon={Server} 
                      placeholder={form.source_driver === 'api' ? "https://api.example.com" : "db.origin.com"} 
                    />
                  </div>
                  {form.source_driver !== 'api' && (
                    <InputField 
                      label="Port" 
                      disabled={isViewOnly} 
                      value={form.source_port} 
                      onChange={(e: any) => setForm({...form, source_port: e.target.value})} 
                      mono 
                      placeholder={form.source_driver === 'postgresql' ? "5432" : form.source_driver === 'sftp' ? "22" : form.source_driver === 'ftp' ? "21" : "3306"} 
                    />
                  )}
                </div>
              )}

              {/* Database Name - Only for Databases */}
              {DB_DRIVERS.includes(form.source_driver) && (
                <InputField 
                  label={form.source_driver === 'oracle' ? "SID / Service Name" : "Source Database Name"} 
                  disabled={isViewOnly} 
                  value={form.source_database} 
                  onChange={(e: any) => setForm({...form, source_database: e.target.value})} 
                  mono 
                  placeholder={form.source_driver === 'oracle' ? "ORCL" : "production_db"} 
                  className="animate-in fade-in duration-300"
                />
              )}
              
              {/* Credentials Section - DB, FTP, SFTP, API */}
              {(DB_DRIVERS.includes(form.source_driver) || ["ftp", "sftp", "api"].includes(form.source_driver)) && (
                <div className="grid sm:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <InputField label="User / Identity" disabled={isViewOnly} value={form.source_username} onChange={(e: any) => setForm({...form, source_username: e.target.value})} placeholder={form.source_driver === 'api' ? "API_KEY" : "usr_sync"} />
                  <div className={`space-y-2 ${isViewOnly ? 'opacity-70 pointer-events-none' : ''}`}>
                     <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <KeyRound className="w-3.5 h-3.5" />
                          Auth Vault
                        </label>
                        <span className="text-[9px] font-bold text-primary uppercase cursor-help hover:underline" title="Select a shared credential from your Vault to override manual password.">Use shared?</span>
                     </div>
                     <select 
                        value={form.source_credential_id || ""} 
                        disabled={isViewOnly}
                        onChange={(e) => setForm({...form, source_credential_id: e.target.value ? parseInt(e.target.value) : null})}
                        className={`w-full h-11 px-4 rounded-lg border border-border bg-card text-[12px] font-bold text-primary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer ${isViewOnly ? 'cursor-not-allowed bg-muted/30' : ''}`}
                     >
                        <option value="">— Use Manual Password Below —</option>
                        {(credsData?.data || []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.username})</option>
                        ))}
                     </select>
                  </div>
                </div>
              )}
              
              {/* Manual Password - DB, FTP, SFTP, API */}
              {(DB_DRIVERS.includes(form.source_driver) || ["ftp", "sftp", "api"].includes(form.source_driver)) && (
                <div className="animate-in fade-in duration-300">
                  {!form.source_credential_id ? (
                    <InputField label="Key Secret (Manual)" type="password" disabled={isViewOnly} value={form.source_password} onChange={(e: any) => setForm({...form, source_password: e.target.value})} icon={Lock} placeholder="••••••••" />
                  ) : (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                       <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Linked to Vault Identity</span>
                       <Shield className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              )}

              {/* Flat File Specific Config */}
              {form.source_driver === "csv" && (
                <div className="space-y-6 p-6 rounded-xl bg-muted/30 border border-border border-dashed animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Flat File Configuration</span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <InputField label="CSV Separator" disabled={isViewOnly} value={form.source_csv_separator} onChange={(e: any) => setForm({...form, source_csv_separator: e.target.value})} mono placeholder="|"/>
                    <InputField label="File Extension" disabled={isViewOnly} value={form.source_csv_extension} onChange={(e: any) => setForm({...form, source_csv_extension: e.target.value})} mono placeholder=".TXT" />
                    <div className="flex items-center gap-4 pt-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" disabled={isViewOnly} checked={form.source_csv_header} onChange={(e: any) => setForm({...form, source_csv_header: e.target.checked})} className="sr-only peer" />
                        <div className="w-10 h-5.5 bg-muted/50 border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all shadow-inner"></div>
                      </label>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Has Header</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Path/Resource identifier - Only for CSV, FTP, SFTP, and API (NOT for DB) */}
              {(form.source_driver !== "" && !DB_DRIVERS.includes(form.source_driver)) && (
                <InputField 
                  label={form.source_driver === 'api' ? "API Route Path" : "Resource Identifier Path"} 
                  disabled={isViewOnly} 
                  value={form.source_path} 
                  onChange={(e: any) => setForm({...form, source_path: e.target.value})} 
                  mono 
                  placeholder={form.source_driver === 'api' ? "/v1/metrics/throughput" : "/mnt/data/source.csv"} 
                  className="animate-in fade-in duration-300"
                />
              )}
            </div>
            
            <div className="p-6 border-t border-border bg-muted/10 flex justify-center">
              <button onClick={handleTestSource} className="h-10 px-8 rounded-lg bg-card border border-primary text-primary hover:bg-primary hover:text-primary-foreground text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 group/btn">
                <RefreshCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" /> Verify Source Connectivity
              </button>
            </div>
          </div>

          {/* TARGET (DOWNSTREAM) */}
          <div className="enterprise-card bg-card border border-border overflow-hidden shadow-xl flex flex-col group hover:border-emerald-500 transition-all duration-300">
            <div className="bg-muted/20 border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-[11px] font-black text-emerald-500 tracking-widest uppercase flex items-center gap-3">
                <ArrowRight className="w-4 h-4" />
                Target Destination
              </h2>
              <Database className="w-4.5 h-4.5 text-emerald-500/30 group-hover:-rotate-12 transition-transform" />
            </div>
            <div className="p-8 space-y-6 flex-1">
               <div className="grid sm:grid-cols-2 gap-6">
                <SelectField label="Node" disabled={isViewOnly} value={form.target_node_id} onChange={(e: any) => setForm({...form, target_node_id: e.target.value})} options={[{value: "", label: "Select Node..."}, ...nodes.map((n: any) => ({value: n.id, label: `${n.node_code} (${n.node_name || n.hostname})`}))]} />
                <SelectField label="Driver" disabled={isViewOnly} value={form.target_driver} onChange={(e: any) => setForm({...form, target_driver: e.target.value})} options={DRIVER_OPTIONS} />
              </div>

              {!form.target_driver && (
                <SelectField label="Connectivity Type" disabled={isViewOnly} value={form.target_resource_type} onChange={(e: any) => setForm({...form, target_resource_type: e.target.value})} options={RESOURCE_TYPES} />
              )}
              
              {/* Host & Port for DB, FTP, SFTP, and API */}
              {(DB_DRIVERS.includes(form.target_driver) || ["ftp", "sftp", "api"].includes(form.target_driver)) && (
                <div className="grid sm:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  <div className="sm:col-span-2">
                    <InputField 
                      label={form.target_driver === 'api' ? "API Base URL / Endpoint" : "Cloud/Local Host"} 
                      disabled={isViewOnly} 
                      value={form.target_host} 
                      onChange={(e: any) => setForm({...form, target_host: e.target.value})} 
                      mono 
                      icon={Server} 
                      placeholder={form.target_driver === 'api' ? "https://api.target.com" : "rds.target.aws..."} 
                    />
                  </div>
                  {form.target_driver !== 'api' && (
                    <InputField 
                      label="Port" 
                      disabled={isViewOnly} 
                      value={form.target_port} 
                      onChange={(e: any) => setForm({...form, target_port: e.target.value})} 
                      mono 
                      placeholder={form.target_driver === 'mysql' ? "3306" : form.target_driver === 'sftp' ? "22" : form.target_driver === 'ftp' ? "21" : "5432"} 
                    />
                  )}
                </div>
              )}

              {/* Database Name - Only for Databases */}
              {DB_DRIVERS.includes(form.target_driver) && (
                <InputField 
                  label={form.target_driver === 'oracle' ? "SID / Service Name" : "Target Database Name"} 
                  disabled={isViewOnly} 
                  value={form.target_database} 
                  onChange={(e: any) => setForm({...form, target_database: e.target.value})} 
                  mono 
                  placeholder={form.target_driver === 'oracle' ? "XE" : "warehouse_db"} 
                  className="animate-in fade-in duration-300"
                />
              )}
              
              {/* Credentials Section - DB, FTP, SFTP, API */}
              {(DB_DRIVERS.includes(form.target_driver) || ["ftp", "sftp", "api"].includes(form.target_driver)) && (
                <div className="grid sm:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <InputField label="User / Identity" disabled={isViewOnly} value={form.target_username} onChange={(e: any) => setForm({...form, target_username: e.target.value})} placeholder={form.target_driver === 'api' ? "API_KEY" : "usr_sink"} />
                  <div className={`space-y-2 ${isViewOnly ? 'opacity-70 pointer-events-none' : ''}`}>
                     <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <KeyRound className="w-3.5 h-3.5" />
                          Auth Vault
                        </label>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase cursor-help hover:underline" title="Select a shared credential from your Vault to override manual password.">Use shared?</span>
                     </div>
                     <select 
                        value={form.target_credential_id || ""} 
                        disabled={isViewOnly}
                        onChange={(e) => setForm({...form, target_credential_id: e.target.value ? parseInt(e.target.value) : null})}
                        className={`w-full h-11 px-4 rounded-lg border border-border bg-card text-[12px] font-bold text-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none cursor-pointer ${isViewOnly ? 'cursor-not-allowed bg-muted/30' : ''}`}
                     >
                        <option value="">— Use Manual Password Below —</option>
                        {(credsData?.data || []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.username})</option>
                        ))}
                     </select>
                  </div>
                </div>
              )}
              
              {/* Manual Password - DB, FTP, SFTP, API */}
              {(DB_DRIVERS.includes(form.target_driver) || ["ftp", "sftp", "api"].includes(form.target_driver)) && (
                <div className="animate-in fade-in duration-300">
                  {!form.target_credential_id ? (
                    <InputField label="Key Secret (Manual)" type="password" disabled={isViewOnly} value={form.target_password} onChange={(e: any) => setForm({...form, target_password: e.target.value})} icon={Lock} placeholder="••••••••" />
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                       <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Linked to Vault Identity</span>
                       <Shield className="w-4 h-4 text-emerald-500" />
                    </div>
                  )}
                </div>
              )}

              {/* Flat File Specific Config */}
              {form.target_driver === "csv" && (
                <div className="space-y-6 p-6 rounded-xl bg-muted/30 border border-border border-dashed animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Info className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">File Sink Configuration</span>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                     <p className="text-[11px] text-emerald-500 font-medium">Exporting to Flat File. Ensure the process has write permissions to the path below.</p>
                  </div>
                </div>
              )}
              
              {/* Path/Resource identifier - Only for CSV, FTP, SFTP, and API (NOT for DB) */}
              {(form.target_driver !== "" && !DB_DRIVERS.includes(form.target_driver)) && (
                <InputField 
                  label={form.target_driver === 'api' ? "API Route Path" : "Resource Identifier Path"} 
                  disabled={isViewOnly} 
                  value={form.target_path} 
                  onChange={(e: any) => setForm({...form, target_path: e.target.value})} 
                  mono 
                  placeholder={form.target_driver === 'api' ? "/v1/metrics/throughput" : "/var/www/target/"} 
                  className="animate-in fade-in duration-300"
                />
              )}
            </div>
            
            <div className="p-6 border-t border-border bg-muted/10 flex justify-center">
              <button onClick={handleTestTarget} className="h-10 px-8 rounded-lg bg-card border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 group/btn">
                <RefreshCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" /> Verify Target Connectivity
              </button>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between py-6 px-10 border border-border rounded-xl bg-card">
          <button 
            onClick={() => router.push("/dashboard/network")} 
            className="h-11 px-8 rounded-lg border border-border bg-card text-[11px] font-bold text-muted-foreground uppercase tracking-widest hover:bg-muted transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" /> {isViewOnly ? "Return to Gallery" : "Discard"}
          </button>
          {!isViewOnly && (
            <button 
              onClick={() => saveMutation.mutate()} 
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
