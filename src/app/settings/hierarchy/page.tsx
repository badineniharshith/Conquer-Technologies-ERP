"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useErpStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Target, Users, User, ArrowRight, ShieldCheck, ChevronRight, ChevronDown,
  Search, RefreshCw, Layers, FolderPlus, FolderMinus, Mail, Phone, MapPin,
  Briefcase, Building, CheckCircle, ExternalLink, ShieldAlert
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

export default function OrgHierarchyPage() {
  const { activeUser } = useErpStore();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Collect all node IDs in tree for Expand All
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

  // Filter node recursively
  const filterNode = useCallback((node: TreeNode): TreeNode | null => {
    if (node.roleId === "CUSTOMER") return null;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      node.name.toLowerCase().includes(q) ||
      node.email.toLowerCase().includes(q) ||
      (node.employeeId && node.employeeId.toLowerCase().includes(q)) ||
      node.roleId.toLowerCase().includes(q) ||
      (node.department && node.department.toLowerCase().includes(q)) ||
      (node.designation && node.designation.toLowerCase().includes(q));

    const matchesRole = roleFilter === "ALL" || node.roleId === roleFilter;
    const matchesBranch = branchFilter === "ALL" || node.branchId === branchFilter;

    // Filter children
    const filteredChildren = (node.children || [])
      .map(c => filterNode(c))
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
      .map(node => filterNode(node))
      .filter((node): node is TreeNode => node !== null);
  }, [treeData, filterNode]);

  // Auto-expand tree when searching
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const allIds = getAllNodeIds(filteredTreeData);
      const map: Record<string, boolean> = {};
      allIds.forEach(id => { map[id] = true; });
      setExpandedNodes(map);
    }
  }, [searchQuery, filteredTreeData, getAllNodeIds]);

  const getRoleBadge = (roleId: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
      DIRECTOR_OPERATIONS: "bg-rose-50 text-rose-700 border-rose-200",
      OPERATIONS_MANAGER: "bg-amber-50 text-amber-700 border-amber-200",
      ASSISTANT_MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
      OPERATIONS_EXECUTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
    return map[roleId] || "bg-stone-50 text-stone-600 border-stone-200";
  };

  const getRoleTitle = (roleId: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: "L0 - Super Admin",
      DIRECTOR_OPERATIONS: "L1 - Director of Operations",
      OPERATIONS_MANAGER: "L2 - Operations / SCM Manager",
      ASSISTANT_MANAGER: "L3 - Assistant Manager",
      OPERATIONS_EXECUTIVE: "L4 - Operations Executive",
    };
    return map[roleId] || roleId.replace(/_/g, " ");
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  // Render node recursively
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    // Default collapsed unless explicitly expanded in expandedNodes state
    const isExpanded = !!expandedNodes[node.id];

    return (
      <div key={node.id} className="relative pl-4 sm:pl-8 mt-3 border-l-2 border-stone-200/70 last:border-l-transparent">
        {/* Node card */}
        <div
          onClick={() => setSelectedUser(node)}
          className={`group flex items-center justify-between p-3.5 bg-white border border-stone-200 rounded-xl shadow-sm hover:shadow-md hover:border-primary-300 transition-all cursor-pointer ${
            selectedUser?.id === node.id ? "ring-2 ring-primary-500 border-primary-400 bg-primary-50/20" : ""
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            {/* Expand / Collapse Icon */}
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

            {/* Avatar */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${getRoleBadge(node.roleId)}`}>
              {getInitials(node.name)}
            </div>

            {/* Info */}
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

          {/* Right badges & subordinate count */}
          <div className="flex items-center space-x-2 shrink-0 ml-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getRoleBadge(node.roleId)}`}>
              {getRoleTitle(node.roleId)}
            </span>
            {hasChildren && (
              <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200 flex items-center space-x-1">
                <Users className="w-3 h-3 text-stone-400" />
                <span>{node.children.length}</span>
              </span>
            )}
          </div>
        </div>

        {/* Children Sub-tree */}
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
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 text-white shadow-md">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-outfit text-stone-900 tracking-tight">Organization Hierarchy</h1>
            <p className="text-xs text-stone-400 mt-0.5">Strict multi-tier reporting chain (L0 Super Admin → L1 Director → L2 SCM Manager → L3 Asst. Manager → L4 Executive).</p>
          </div>
        </div>

        {/* Expand / Collapse Controls */}
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

      {/* Legend & Controls Toolbar */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee by Name, Employee ID (EMP000001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 input-field"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field text-xs font-semibold flex-1 md:w-44"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">L0 Super Admin</option>
              <option value="DIRECTOR_OPERATIONS">L1 Director</option>
              <option value="OPERATIONS_MANAGER">L2 SCM Manager</option>
              <option value="ASSISTANT_MANAGER">L3 Asst. Manager</option>
              <option value="OPERATIONS_EXECUTIVE">L4 Executive</option>
            </select>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="input-field text-xs font-semibold flex-1 md:w-44"
            >
              <option value="ALL">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <button onClick={fetchHierarchy} className="btn-ghost px-3 py-2 text-xs shrink-0 flex items-center space-x-1">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Hierarchy Legend */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-[10px]">
          <span className="font-bold text-stone-400 uppercase tracking-wider mr-1">Hierarchy Level:</span>
          <span className="px-2 py-0.5 rounded border font-bold uppercase bg-purple-50 text-purple-700 border-purple-200">L0 Super Admin</span>
          <span className="px-2 py-0.5 rounded border font-bold uppercase bg-rose-50 text-rose-700 border-rose-200">L1 Director</span>
          <span className="px-2 py-0.5 rounded border font-bold uppercase bg-amber-50 text-amber-700 border-amber-200">L2 SCM Manager</span>
          <span className="px-2 py-0.5 rounded border font-bold uppercase bg-blue-50 text-blue-700 border-blue-200">L3 Asst. Manager</span>
          <span className="px-2 py-0.5 rounded border font-bold uppercase bg-emerald-50 text-emerald-700 border-emerald-200">L4 Executive</span>
        </div>
      </div>

      {/* Main Hierarchy Tree View */}
      <div className="glass-panel p-6 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-primary-500 animate-spin" />
            <span className="text-xs text-stone-400 font-semibold">Loading organization tree...</span>
          </div>
        ) : filteredTreeData.length === 0 ? (
          <div className="py-20 text-center text-stone-400 text-xs italic">
            No employees found matching your query or filter criteria.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
              <span className="font-semibold">💡 Top-level reporting tree loaded (collapsed by default). Click ▶ to expand sub-teams or use 'Expand All'.</span>
              <span className="font-bold font-mono text-[11px] text-amber-900">Total Root Chains: {filteredTreeData.length}</span>
            </div>
            {filteredTreeData.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {/* Employee Profile Side Drawer */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/30 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-white h-full shadow-2xl border-l border-stone-200 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h3 className="text-base font-bold font-outfit text-stone-900">Employee Hierarchy Detail</h3>
                <button onClick={() => setSelectedUser(null)} className="text-stone-400 hover:text-stone-600">✕</button>
              </div>

              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold ${getRoleBadge(selectedUser.roleId)}`}>
                    {getInitials(selectedUser.name)}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{selectedUser.name}</h4>
                    <span className="text-[10px] font-mono font-bold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">
                      {selectedUser.employeeId || "No Employee ID"}
                    </span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getRoleBadge(selectedUser.roleId)}`}>
                        {getRoleTitle(selectedUser.roleId)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                      <Mail className="w-3 h-3" /><span>Email</span>
                    </div>
                    <div className="text-xs font-semibold text-stone-700 break-all">{selectedUser.email}</div>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                      <Phone className="w-3 h-3" /><span>Phone</span>
                    </div>
                    <div className="text-xs font-semibold text-stone-700">{selectedUser.phone || "—"}</div>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                      <Briefcase className="w-3 h-3" /><span>Department</span>
                    </div>
                    <div className="text-xs font-semibold text-stone-700">{selectedUser.department || "Operations"}</div>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                      <MapPin className="w-3 h-3" /><span>Branch</span>
                    </div>
                    <div className="text-xs font-semibold text-stone-700">{selectedUser.branchName || "Head Office"}</div>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-2">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Hierarchy Information</div>
                  <div className="text-xs text-stone-700 flex justify-between">
                    <span className="text-stone-400">Reports To:</span>
                    <span className="font-bold">{selectedUser.reportsTo?.name || "None (Super Admin)"}</span>
                  </div>
                  <div className="text-xs text-stone-700 flex justify-between">
                    <span className="text-stone-400">Direct Subordinates:</span>
                    <span className="font-bold text-primary-600">{selectedUser.children ? selectedUser.children.length : 0} members</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Link href="/admin/customers" className="w-full py-2.5 btn-ghost text-xs flex items-center justify-center space-x-1.5 border border-stone-200 rounded-xl">
                    <Building className="w-4 h-4" /><span>View Assigned Enterprise Customers</span>
                  </Link>
                </div>
              </div>

              <div className="p-4 border-t border-stone-100">
                <button onClick={() => setSelectedUser(null)} className="w-full py-2.5 btn-primary text-xs">Close Details</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
