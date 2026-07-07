"use client";

import { useState, useEffect } from "react";
import {
  Database,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Table as TableIcon,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface TableMetadata {
  id: string;
  displayName: string;
  recordsCount: number;
}

const tableMetadataDetails: Record<string, {
  primaryKey: string;
  foreignKeys: string[];
  relationships: string[];
  lastUpdated: string;
}> = {
  users: {
    primaryKey: "id",
    foreignKeys: ["roleId", "branchId"],
    relationships: ["User belongs to Role", "User belongs to Branch"],
    lastUpdated: "2026-06-29 12:00:00"
  },
  roles: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: ["Role has many Users"],
    lastUpdated: "2026-06-01 00:00:00"
  },
  branches: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: ["Branch has many Inventories", "Branch has many Users"],
    lastUpdated: "2026-06-01 00:00:00"
  },
  categories: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: ["Category has many Products"],
    lastUpdated: "2026-06-29 10:30:00"
  },
  products: {
    primaryKey: "id (SKU is unique)",
    foreignKeys: ["categoryId"],
    relationships: ["Product belongs to Category", "Product has many Inventories"],
    lastUpdated: "2026-06-29 13:45:00"
  },
  inventory: {
    primaryKey: "id",
    foreignKeys: ["productId", "branchId"],
    relationships: ["Inventory belongs to Product", "Inventory belongs to Branch"],
    lastUpdated: "2026-06-29 13:50:00"
  },
  inventoryMovements: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: [],
    lastUpdated: "2026-06-29 13:52:00"
  },
  stockAlerts: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: [],
    lastUpdated: "2026-06-29 13:52:00"
  },
  productPrices: {
    primaryKey: "id (sku, branchCode is unique)",
    foreignKeys: [],
    relationships: [],
    lastUpdated: "2026-06-29 13:50:00"
  },
  productPriceHistory: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: [],
    lastUpdated: "2026-06-29 13:50:00"
  },
  chatSessions: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: ["ChatSession has many ChatMessages"],
    lastUpdated: "2026-06-29 13:54:00"
  },
  chatMessages: {
    primaryKey: "id",
    foreignKeys: ["chatSessionId"],
    relationships: ["ChatMessage belongs to ChatSession"],
    lastUpdated: "2026-06-29 13:54:00"
  },
  aiQueryLogs: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: [],
    lastUpdated: "2026-06-29 13:55:00"
  },
  aiAuditLogs: {
    primaryKey: "id",
    foreignKeys: [],
    relationships: [],
    lastUpdated: "2026-06-29 13:55:00"
  }
};

export default function DatabaseExplorer() {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("inventory");
  const [rows, setRows] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Fetch Table Metadata List
  const fetchMetadata = async () => {
    setMetaLoading(true);
    try {
      const res = await fetch("/api/admin/database");
      const data = await res.json();
      if (data.tables) {
        setTables(data.tables);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Failed to load schema tables metadata.");
    } finally {
      setMetaLoading(false);
    }
  };

  // Fetch Table Rows
  const fetchTableRows = async (tableName: string, pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/database?table=${tableName}&page=${pageNum}&limit=${limit}`);
      const data = await res.json();
      if (data.rows) {
        setRows(data.rows);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Failed to load table records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchTableRows(selectedTable, 1);
  }, [selectedTable]);

  const handlePageChange = (newPageNum: number) => {
    if (newPageNum < 1 || newPageNum > totalPages) return;
    setPage(newPageNum);
    fetchTableRows(selectedTable, newPageNum);
  };

  // Filter rows by query
  const getFilteredRows = () => {
    if (!searchQuery.trim()) return rows;
    const lowerQuery = searchQuery.toLowerCase();
    return rows.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerQuery);
      });
    });
  };

  const filteredRows = getFilteredRows();

  // Extract columns dynamically from the first record
  const getColumns = () => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  };

  const columns = getColumns();

  // Format cell contents helper
  const formatCell = (val: any) => {
    if (val === null || val === undefined) return <span className="text-stone-300 italic">null</span>;
    if (typeof val === "boolean") {
      return val ? (
        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">TRUE</span>
      ) : (
        <span className="bg-stone-50 text-stone-505 px-2 py-0.5 rounded text-[10px] font-bold border border-stone-200">FALSE</span>
      );
    }
    if (typeof val === "object") {
      return <span className="text-[10px] font-mono bg-stone-50 p-1 border rounded truncate max-w-[150px] block">{JSON.stringify(val)}</span>;
    }
    // Check if looks like ISO Date
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      return new Date(val).toLocaleDateString() + " " + new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-650/5 border-orange-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-orange-500" />
            <h1 className="text-xl font-bold text-stone-900 font-outfit">Database Explorer & Schema Inspector</h1>
          </div>
          <p className="text-stone-500 text-xs mt-1">
            System Administrator console. Direct read-only exploration of the Conquer ERP mock data collections.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-orange-600 font-semibold text-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-orange-500" />
          <span>Security Level: Read-Only Audit</span>
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Tables Selection list & Metadata Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-4 bg-white border border-stone-200 space-y-4 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-orange-500" />
                <span>Tables List ({tables.length})</span>
              </h2>
              <button
                onClick={fetchMetadata}
                className="text-stone-400 hover:text-stone-700 transition-colors p-1"
                title="Refresh Schema"
                disabled={metaLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${metaLoading ? "animate-spin text-orange-500" : ""}`} />
              </button>
            </div>

            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {tables.map((t) => {
                const isSelected = selectedTable === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTable(t.id)}
                    className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-orange-500 border-orange-500 text-white shadow-sm font-semibold"
                        : "hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <span className="text-xs truncate">{t.displayName}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                        isSelected
                          ? "bg-orange-600 text-white border-orange-400"
                          : "bg-stone-150 text-stone-500 border-stone-200"
                      }`}
                    >
                      {t.recordsCount}
                    </span>
                  </div>
                );
              })}
              {tables.length === 0 && !metaLoading && (
                <div className="text-center py-6 text-stone-400 italic text-xs">
                  No database tables loaded.
                </div>
              )}
            </div>
          </div>

          {/* Table Schema Metadata Details Card */}
          {selectedTable && (
            <div className="glass-panel p-4 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-3 animate-in slide-in-from-bottom-2 duration-200 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2 border-b pb-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span>Schema Metadata Details</span>
              </h3>
              
              <div className="space-y-2 text-stone-600">
                <div className="flex justify-between">
                  <span className="font-semibold text-stone-450">Table Name:</span>
                  <span className="font-mono text-stone-900 font-bold">{selectedTable}</span>
                </div>

                <div className="flex justify-between">
                  <span className="font-semibold text-stone-450">Record Count:</span>
                  <span className="font-mono text-stone-900 font-bold">
                    {tables.find(t => t.id === selectedTable)?.recordsCount || 0}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-semibold text-stone-450">Primary Key:</span>
                  <span className="font-mono text-orange-600 font-bold">
                    {tableMetadataDetails[selectedTable]?.primaryKey || "id"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-stone-450 block mb-1">Foreign Keys:</span>
                  {tableMetadataDetails[selectedTable]?.foreignKeys && tableMetadataDetails[selectedTable].foreignKeys.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tableMetadataDetails[selectedTable].foreignKeys.map((fk) => (
                        <span key={fk} className="px-1.5 py-0.5 bg-stone-50 border border-stone-200 rounded font-mono text-[9px] text-stone-750">
                          {fk}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400 italic">None</span>
                  )}
                </div>

                <div>
                  <span className="font-semibold text-stone-450 block mb-1">Relationships:</span>
                  {tableMetadataDetails[selectedTable]?.relationships && tableMetadataDetails[selectedTable].relationships.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-[10px] text-stone-600">
                      {tableMetadataDetails[selectedTable].relationships.map((rel, idx) => (
                        <li key={idx} className="truncate" title={rel}>{rel}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[10px] text-stone-400 italic">None Defined</span>
                  )}
                </div>

                <div className="pt-2 border-t flex justify-between text-[10px] text-stone-405 font-medium">
                  <span>Last Updated:</span>
                  <span>{tableMetadataDetails[selectedTable]?.lastUpdated || "2026-06-29 13:56"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Spreadsheet table view */}
        <div className="glass-panel p-5 bg-white border border-stone-200 lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <div>
              <span className="text-[10px] text-stone-450 uppercase font-bold tracking-wider">Active Table Ledger</span>
              <h3 className="text-base font-bold text-stone-900 font-outfit mt-0.5">
                {tables.find((t) => t.id === selectedTable)?.displayName || selectedTable}
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
              {/* Search within table */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-stone-50 border border-stone-200 hover:border-stone-300 focus:border-orange-500 focus:bg-white rounded-lg py-1.5 pl-8 pr-3 text-xs text-stone-800 placeholder-stone-405 focus:outline-none transition-all w-full sm:w-48"
                />
                <Search className="w-3.5 h-3.5 text-stone-450 absolute left-2.5 top-2.5" />
              </div>

              {/* Refresh table */}
              <button
                onClick={() => fetchTableRows(selectedTable, page)}
                className="px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-500" : ""}`} />
                <span>Reload</span>
              </button>
            </div>
          </div>

          {/* Spreadsheet Data Grid */}
          <div className="overflow-x-auto border border-stone-200 rounded-xl bg-stone-50/50 max-h-[480px]">
            {loading ? (
              <div className="p-20 text-center flex flex-col justify-center items-center space-y-3">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                <span className="text-xs text-stone-400 italic">Querying records from ledger...</span>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-20 text-center flex flex-col justify-center items-center space-y-2 text-stone-400">
                <AlertCircle className="w-8 h-8 text-stone-300" />
                <span className="text-xs italic">No records match filter query.</span>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-stone-100/80 sticky top-0 backdrop-blur border-b border-stone-200 text-stone-550 uppercase tracking-wider text-[9px] font-bold">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-3 font-semibold select-none whitespace-nowrap">
                        {col.replace(/([A-Z])/g, " $1")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-orange-50/10 transition-colors">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2.5 max-w-[200px] truncate text-stone-700 font-mono text-[11px]">
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Paginator */}
          {!loading && rows.length > 0 && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                Showing {Math.min(totalCount, (page - 1) * limit + 1)}-{Math.min(totalCount, page * limit)} of {totalCount} Records
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="p-1.5 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-600 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs text-stone-700 font-bold">
                  Page {page} of {totalPages}
                </div>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="p-1.5 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-600 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
