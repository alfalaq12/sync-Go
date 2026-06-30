"use client";

import React, { useState, useEffect } from "react";
import { Database, Search, Filter, Server, Network, KeySquare, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchNodes, fetchNetworks, fetchCredentials } from "@/lib/api";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

type DataSourceItem = {
  id: string;
  type: 'node' | 'network' | 'credential';
  title: string;
  subtitle: string;
  status?: string;
  details: Record<string, string>;
};

export default function DataSourcesPage() {
  const [items, setItems] = useState<DataSourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "node" | "network" | "credential">("all");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [nodes, networks, credentials] = await Promise.all([
        fetchNodes().catch(() => []),
        fetchNetworks().catch(() => []),
        fetchCredentials().catch(() => [])
      ]);

      const formattedItems: DataSourceItem[] = [];

      nodes.forEach((n: any) => {
        formattedItems.push({
          id: `node-${n.node_id}`,
          type: 'node',
          title: n.node_name,
          subtitle: n.node_ip,
          status: n.is_active ? 'ACTIVE' : 'INACTIVE',
          details: {
            "Driver": n.driver_name,
            "OS": n.os_type,
            "Host": n.host_name || "N/A"
          }
        });
      });

      networks.forEach((n: any) => {
        formattedItems.push({
          id: `net-${n.network_id}`,
          type: 'network',
          title: `${n.source_node_name} → ${n.target_node_name}`,
          subtitle: `Port: ${n.source_node_port || 'N/A'}`,
          status: n.status || 'UNKNOWN',
          details: {
            "Type": n.network_type,
            "Bandwidth": n.bandwidth_limit ? `${n.bandwidth_limit} Mbps` : 'Unlimited',
            "IP Mapping": `${n.source_ip_mapping} → ${n.target_ip_mapping}`
          }
        });
      });

      credentials.forEach((c: any) => {
        formattedItems.push({
          id: `cred-${c.credential_id}`,
          type: 'credential',
          title: c.credential_name,
          subtitle: c.db_username,
          details: {
            "Auth Type": c.auth_type,
            "Target Node": c.node_name || "Unassigned",
            "Updated": new Date(c.updated_at).toLocaleDateString()
          }
        });
      });

      setItems(formattedItems);
    } catch (err) {
      console.error("Failed to load data sources", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesFilter = filterType === "all" || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'node': return <Server className="w-5 h-5 text-blue-500" />;
      case 'network': return <Network className="w-5 h-5 text-emerald-500" />;
      case 'credential': return <KeySquare className="w-5 h-5 text-purple-500" />;
      default: return <Database className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getBadgeColor = (status?: string) => {
    if (!status) return "bg-muted text-muted-foreground";
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'CONNECTED':
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case 'INACTIVE':
      case 'DISCONNECTED':
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      case 'PENDING':
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Database className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Aggregated Data Sources</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Global registry view of all nodes, network topologies, and credentials in the Sync-Go cluster.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            disabled={isLoading}
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /> Refresh Registry
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="enterprise-card p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Tabs */}
        <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border shrink-0">
          {[
            { id: "all", label: "All Resources", icon: Filter },
            { id: "node", label: "Nodes", icon: Server },
            { id: "network", label: "Networks", icon: Network },
            { id: "credential", label: "Credentials", icon: KeySquare },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 h-9 rounded-md text-[12px] font-bold transition-all",
                  filterType === tab.id 
                    ? "bg-card shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {filterType === tab.id && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                    {tab.id === 'all' ? items.length : items.filter(i => i.type === tab.id).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full h-11 pl-10 pr-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground shadow-sm"
          />
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="enterprise-card p-6 h-48 animate-pulse flex flex-col justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="space-y-2 flex-1 pt-1">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 mt-4 pt-4 border-t border-border/50">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="enterprise-card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">No resources found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            We couldn't find any data sources matching your current filter and search criteria.
          </p>
          <button 
            onClick={() => { setSearchTerm(""); setFilterType("all"); }}
            className="mt-6 px-4 py-2 rounded-lg bg-primary/10 text-primary font-bold text-sm hover:bg-primary hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="enterprise-card p-0 overflow-hidden hover:border-primary/30 transition-colors group flex flex-col">
              <div className="p-5 flex items-start gap-4 bg-gradient-to-br from-card to-muted/20">
                <div className="w-12 h-12 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-[15px] text-foreground truncate">{item.title}</h3>
                    {item.status && (
                      <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shrink-0", getBadgeColor(item.status))}>
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground font-mono truncate">{item.subtitle}</p>
                </div>
              </div>
              
              <div className="p-5 pt-4 border-t border-border/50 bg-card flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {Object.entries(item.details).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-[12px]">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-bold text-foreground truncate max-w-[60%] text-right">{val}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-5 pt-4 border-t border-border/30 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.type}</span>
                  <button className="text-primary hover:text-primary/80 flex items-center gap-1 text-[11px] font-bold transition-colors">
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
