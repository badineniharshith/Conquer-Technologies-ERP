"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Target, Users, User, ArrowRight, ShieldCheck, ChevronRight, ChevronDown,
  Search, RefreshCw, Layers, FolderPlus, FolderMinus, Mail, Phone, MapPin,
  Briefcase, Building, CheckCircle, ExternalLink, ShieldAlert, Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface TreeNode {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employeeId?: string;
  roleId: string;
  roleName?: string; // Human-readable name (e.g., "DIRECTOR_OPERATIONS")
  role?: { name: string };
  branchId?: string;
  branchName?: string;
  department?: string;
  designation?: string;
  city?: string;
  state?: string;
  country?: string;
  reportsToId?: string;
  reportsTo?: { id: string; name: string; email: string; employeeId?: string };
  children: TreeNode[];
  customers?: any[];
}

const ERP_ROLES = ["SUPER_ADMIN", "ADMIN", "DIRECTOR_OPERATIONS", "OPERATIONS_MANAGER", "ASSISTANT_MANAGER", "OPERATIONS_EXECUTIVE"];

export default function OrgHierarchyPage() {
  const { activeUser } = useErpStore();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ERP" | "CRM">("ERP");

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedUser, setSelectedUser] = useState<TreeNode | null>(null);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?userId=${activeUser?.id || ""}&mode=tree`);
      const data = await res.json();
      if (res.ok) {
        setTreeData(data.tree || []);
        setBranches(data.branches || []);
      } else {
        toast.error(data.error || "Failed to load organization hierarchy");
      }
    } catch {
      toast.error("Error retrieving tree structure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, [activeUser]);

  const getAllNodeIds = useCallback((nodes: TreeNode[]): string[] => {
    let ids: string[] = [];
    nodes.forEach(n => {
      ids.push(n.id);
      if (n.children && n.children.length > 0) {
        ids = ids.concat(getAllNodeIds(n.children));
      }
    });
    return ids;
  }, []);

  const handleExpandAll = () => {
    const allIds = getAllNodeIds(treeData);
    const map: Record<string, boolean> = {};
    allIds.forEach(id => { map[id] = true; });
    setExpandedNodes(map);
    toast.success("Expanded all hierarchy levels");
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
    toast.success("Collapsed all hierarchy levels");
  };

  const toggleExpand = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Filter node recursively based on Tab (ERP vs CRM)
  // IMPORTANT: Use roleName (not roleId) since ERP roles use UUID-based roleIds in the DB
  const filterNode = useCallback((node: TreeNode, tab: "ERP" | "CRM"): TreeNode | null => {
    const effectiveRole = node.roleName || node.role?.name || node.roleId;
    if (effectiveRole === "CUSTOMER") return null;

    const isErpNode = ERP_ROLES.includes(effectiveRole);
    if (tab === "ERP" && !isErpNode) return null;
    if (tab === "CRM" && isErpNode && effectiveRole !== "SUPER_ADMIN" && effectiveRole !== "ADMIN") return null;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      node.name.toLowerCase().includes(q) ||
      node.email.toLowerCase().includes(q) ||
      (node.employeeId && node.employeeId.toLowerCase().includes(q)) ||
      effectiveRole.toLowerCase().includes(q) ||
      (node.department && node.department.toLowerCase().includes(q)) ||
      (node.designation && node.designation.toLowerCase().includes(q));

    const matchesRole = roleFilter === "ALL" || effectiveRole === roleFilter;
    const matchesBranch = branchFilter === "ALL" || node.branchId === branchFilter;

    const filteredChildren = (node.children || [])
      .map(c => filterNode(c, tab))
      .filter((c): c is TreeNode => c !== null);

    if (matchesSearch && matchesRole && matchesBranch) {
      return { ...node, children: filteredChildren };
    }

    if (filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }

    return null;
  }, [searchQuery, roleFilter, branchFilter]);

  const filteredTreeData = useMemo(() => {
    return treeData
      .map(node => filterNode(node, activeTab))
      .filter((node): node is TreeNode => node !== null);
  }, [treeData, filterNode, activeTab]);

  const getRoleBadge = (node: TreeNode) => {
    const roleName = node.roleName || node.role?.name || node.roleId;
    const map: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
      ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
      DIRECTOR_OPERATIONS: "bg-rose-50 text-rose-700 border-rose-200",
      OPERATIONS_MANAGER: "bg-amber-50 text-amber-700 border-amber-200",
      ASSISTANT_MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
      OPERATIONS_EXECUTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      SALES_DIRECTOR: "bg-indigo-50 text-indigo-700 border-indigo-200",
      BUSINESS_MANAGER: "bg-cyan-50 text-cyan-700 border-cyan-200",
      REGIONAL_SALES_MANAGER: "bg-teal-50 text-teal-700 border-teal-200",
      KEY_ACCOUNT_MANAGER: "bg-orange-50 text-orange-700 border-orange-200",
      INSIDE_SALES_MANAGER: "bg-sky-50 text-sky-700 border-sky-200"
    };
    return map[roleName] || "bg-stone-50 text-stone-600 border-stone-200";
  };

  const getRoleTitle = (node: TreeNode) => {
    const roleName = node.roleName || node.role?.name || node.roleId;
    const map: Record<string, string> = {
      SUPER_ADMIN: "L0 - Super Admin",
      ADMIN: "L0 - Admin",
      DIRECTOR_OPERATIONS: "L1 - Director of Operations",
      OPERATIONS_MANAGER: "L2 - Operations / SCM Manager",
      ASSISTANT_MANAGER: "L3 - Assistant Manager",
      OPERATIONS_EXECUTIVE: "L4 - Operations Executive",
      SALES_DIRECTOR: "L1 - Sales Director",
      DIRECTOR_OF_TECHNOLOGY: "L1 - Director of Technology",
      MARKETING_MANAGER: "L1 - Marketing Manager",
      POST_SALES_MANAGER: "L1 - Post Sales Manager",
      BUSINESS_MANAGER: "L2 - Business Manager",
      PRESALES_MANAGER: "L2 - Presales Manager",
      REGIONAL_SALES_MANAGER: "L3 - Regional Sales Manager",
      KEY_ACCOUNT_MANAGER: "L4 - Key Account Manager",
      INSIDE_SALES_MANAGER: "L5 - Inside Sales Manager"
    };
    return map[roleName] || roleName.replace(/_/g, " ");
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedNodes[node.id];

    return (
      <div key={node.id} className="relative pl-4 sm:pl-8 mt-3 border-l-2 border-stone-200/70 last:border-l-transparent">
        <div
          onClick={() => setSelectedUser(node)}
          className={`group flex items-center justify-between p-3.5 bg-white border border-stone-200 rounded-xl shadow-sm hover:shadow-md hover:border-primary-300 transition-all cursor-pointer ${
            selectedUser?.id === node.id ? "ring-2 ring-primary-500 border-primary-400 bg-primary-50/20" : ""
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-1 rounded-lg bg-stone-100 hover:bg-primary-50 hover:text-primary-600 text-stone-500 transition-colors"
                title={isExpanded ? "Collapse branch" : "Expand branch"}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6 h-6 flex items-center justify-center text-stone-300">•</span>
            )}

            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${getRoleBadge(node)}`}>
              {getInitials(node.name)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-stone-850 text-xs truncate">{node.name}</span>
                {node.employeeId && (
                  <span className="text-[10px] font-mono text-primary-500 font-bold bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">
                    {node.employeeId}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-400 truncate flex items-center space-x-2">
                <span>{node.email}</span>
                {node.designation && <span>• {node.designation}</span>}
                {node.branchName && <span>• {node.branchName}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 ml-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getRoleBadge(node)}`}>
              {getRoleTitle(node)}
            </span>
            {hasChildren && (
              <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200 flex items-center space-x-1">
                <Users className="w-3 h-3 text-stone-400" />
                <span>{node.children.length}</span>
              </span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {node.children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#8c3120] to-[#a03828] text-white shadow-md">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-outfit text-stone-900 tracking-tight">Organization Hierarchy</h1>
            <p className="text-xs text-stone-400 mt-0.5">Separate reporting tables for ERP Operations and CRM Sales divisions.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={handleExpandAll} className="btn-secondary px-3 py-2 text-xs flex items-center space-x-1.5">
            <FolderPlus className="w-4 h-4 text-primary-500" />
            <span>Expand All</span>
          </button>
          <button onClick={handleCollapseAll} className="btn-ghost px-3 py-2 text-xs flex items-center space-x-1.5 border border-stone-200 bg-white">
            <FolderMinus className="w-4 h-4 text-stone-500" />
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher: ERP Table vs CRM Table */}
      <div className="flex items-center space-x-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab("ERP")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "ERP"
              ? "bg-[#8c3120] text-white shadow-md"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>ERP Operations Hierarchy Table</span>
        </button>
        <button
          onClick={() => setActiveTab("CRM")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "CRM"
              ? "bg-[#8c3120] text-white shadow-md"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>CRM Sales & Marketing Hierarchy Table</span>
        </button>
      </div>

      {/* Legend & Controls Toolbar */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee by Name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 input-field"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button onClick={fetchHierarchy} className="btn-ghost px-3 py-2 text-xs shrink-0 flex items-center space-x-1">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Hierarchy Tree View */}
      <div className="glass-panel p-6 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-[#8c3120] animate-spin" />
            <span className="text-xs text-stone-400 font-semibold">Loading hierarchy tree...</span>
          </div>
        ) : filteredTreeData.length === 0 ? (
          <div className="py-20 text-center text-stone-400 text-xs italic">
            No reporting hierarchy nodes found for {activeTab} division matching your downline permissions.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
              <span className="font-semibold">
                {activeTab === "ERP" ? "⚙️ ERP Operations Hierarchy (Director → SCM Manager → Asst. Manager → Executive)" : "💼 CRM Sales & Marketing Hierarchy (Sales Director → Biz Manager → RSM → KAM → Inside Sales)"}
              </span>
              <span className="font-bold font-mono text-[11px] text-amber-900">Total Root Chains: {filteredTreeData.length}</span>
            </div>
            {filteredTreeData.map(node => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}
