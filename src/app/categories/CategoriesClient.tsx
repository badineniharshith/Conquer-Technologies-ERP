"use client";

import { useState, useMemo } from "react";
import { FolderOpen, Plus, Boxes, Sparkles, ArrowRight, Edit2, Trash2, Search, X, Layers, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions";
import Link from "next/link";
import SearchableDropdown from "@/components/ui/SearchableDropdown";

interface CategoriesClientProps {
  categories: any[];
  products: any[];
}

export default function CategoriesClient({ categories, products }: CategoriesClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [buFilter, setBuFilter] = useState("ALL"); // ALL, Apple BU, Non-Apple BU, Solutions BU

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any | null>(null);

  // Forms state
  const [selectedBu, setSelectedBu] = useState("Apple BU");
  const [catName, setCatName] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper to determine Business Unit from category name
  const getCategoryBu = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("apple") || n.startsWith("apple bu")) return "Apple BU";
    if (n.includes("wintel") || n.startsWith("wintel bu") || n.includes("non-apple")) return "Non-Apple BU";
    if (n.includes("solutions") || n.startsWith("solutions bu")) return "Solutions BU";
    return "Wintel BU";
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = cat.name.toLowerCase().includes(q) || cat.id.toLowerCase().includes(q);
      const catBu = getCategoryBu(cat.name);
      
      let matchesBu = true;
      if (buFilter === "Apple BU") matchesBu = catBu === "Apple BU";
      else if (buFilter === "Non-Apple BU") matchesBu = catBu === "Non-Apple BU";
      else if (buFilter === "Solutions BU") matchesBu = catBu === "Solutions BU";

      return matchesSearch && matchesBu;
    });
  }, [categories, searchQuery, buFilter]);

  const catStats = useMemo(() => {
    return filteredCategories.map((cat: any) => {
      const matchingProducts = products.filter((p: any) => p.categoryId === cat.id);
      const brands = Array.from(new Set(matchingProducts.map((p: any) => p.brand).filter(Boolean)));
      return {
        ...cat,
        bu: getCategoryBu(cat.name),
        productCount: matchingProducts.length,
        brands: brands.join(", ") || "Generic",
        isActive: matchingProducts.some((p: any) => p.status === "ACTIVE") || true
      };
    });
  }, [filteredCategories, products]);

  // Grouped Categories
  const groupedCategories = useMemo(() => {
    const groups: Record<string, any[]> = {
      "Apple BU": [],
      "Non-Apple BU": [],
      "Solutions BU": []
    };

    catStats.forEach(cat => {
      const bu = cat.bu || "Non-Apple BU";
      if (!groups[bu]) groups[bu] = [];
      groups[bu].push(cat);
    });

    return groups;
  }, [catStats]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setLoading(true);
    try {
      const fullName = `${selectedBu} - ${catName.trim()}`;
      await createCategoryAction(fullName);
      toast.success(`Category "${fullName}" created successfully!`);
      setIsAddOpen(false);
      setCatName("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !selectedCat) return;
    setLoading(true);
    try {
      const fullName = `${selectedBu} - ${catName.trim()}`;
      await updateCategoryAction(selectedCat.id, fullName);
      toast.success("Category updated successfully!");
      setIsEditOpen(false);
      setSelectedCat(null);
      setCatName("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update category.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat: any) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    try {
      await deleteCategoryAction(cat.id);
      toast.success("Category deleted successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category.");
    }
  };

  const openEditModal = (cat: any) => {
    setSelectedCat(cat);
    const bu = getCategoryBu(cat.name);
    setSelectedBu(bu);
    setCatName(cat.name.replace(/^(Apple BU|Wintel BU|Solutions BU|Non-Apple BU)\s*-\s*/i, ''));
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit flex items-center space-x-2">
            <Layers className="w-6 h-6 text-orange-500" />
            <span>Business Units & Categories Directory</span>
          </h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Structured hierarchy for <strong>Apple BU</strong>, <strong>Non-Apple BU</strong>, and <strong>Solutions BU</strong> Sub-Categories.
          </p>
        </div>
        <button
          onClick={() => { setCatName(""); setSelectedBu("Apple BU"); setIsAddOpen(true); }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-orange-550/15 cursor-pointer pt-2.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Sub-Category</span>
        </button>
      </div>

      {/* Business Unit Selection Dropdown & KPI bar */}
      <div className="glass-panel p-4 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">Filter Business Unit:</span>
          <div className="w-full md:w-64">
            <SearchableDropdown
              options={[
                { value: "ALL", label: "All Business Units (3 BU)" },
                { value: "Apple BU", label: "Apple BU (4 Sub-Categories)" },
                { value: "Non-Apple BU", label: "Non-Apple BU (7 Sub-Categories)" },
                { value: "Solutions BU", label: "Solutions BU (7 Sub-Categories)" }
              ]}
              value={buFilter}
              onChange={(val) => setBuFilter(val)}
            />
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto bg-stone-100 p-1 rounded-xl text-xs font-bold">
          {[
            { id: "ALL", label: "All BUs" },
            { id: "Apple BU", label: "Apple BU" },
            { id: "Non-Apple BU", label: "Non-Apple BU" },
            { id: "Solutions BU", label: "Solutions BU" }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setBuFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                buFilter === t.id ? "bg-orange-500 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Overview Table */}
      <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">Sub-Category Classification List</h2>
            <p className="text-[11px] text-stone-400 mt-0.5">Showing sub-categories mapped under selected Business Unit structure.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search category or OEM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-250 rounded-lg text-xs outline-none focus:border-orange-500 transition-all text-stone-850"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">Business Unit</th>
                <th className="px-4 py-3">Sub-Category Name</th>
                <th className="px-4 py-3 text-center">Associated OEMs</th>
                <th className="px-4 py-3 text-right">Mapped Products</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {catStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400 italic">No matching sub-categories found.</td>
                </tr>
              ) : (
                catStats.map((cat) => (
                  <tr key={cat.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        cat.bu === "Apple BU" ? "bg-stone-900 text-white border-stone-800" :
                        cat.bu === "Solutions BU" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {cat.bu}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-stone-900 block">{cat.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-stone-600 font-medium">{cat.brands}</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">{cat.productCount} items</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer"
                          title="Edit Sub-Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1 text-red-600 hover:bg-red-50 border border-red-200 rounded cursor-pointer"
                          title="Delete Sub-Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link href={`/products?category=${cat.id}`} className="inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold ml-2 hover:underline">
                          <span>View Products</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SUB-CATEGORY MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-20">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-2xl max-w-sm w-full border border-stone-200 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-stone-900">Add New Sub-Category</h4>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5">Select Business Unit *</label>
              <select
                value={selectedBu}
                onChange={(e) => setSelectedBu(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold outline-none text-stone-800"
              >
                <option value="Apple BU">Apple BU</option>
                <option value="Non-Apple BU">Non-Apple BU (Wintel)</option>
                <option value="Solutions BU">Solutions BU</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5">Sub-Category Name *</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. End Compute, Cybersecurity, Unified Communications"
                required
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 placeholder-stone-400 font-medium"
              />
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                {loading ? "Creating..." : "Save Sub-Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT SUB-CATEGORY MODAL */}
      {isEditOpen && selectedCat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-20">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-2xl max-w-sm w-full border border-stone-200 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-stone-900">Modify Sub-Category</h4>
              <button type="button" onClick={() => setIsEditOpen(false)} className="text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5">Business Unit</label>
              <select
                value={selectedBu}
                onChange={(e) => setSelectedBu(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold outline-none text-stone-800"
              >
                <option value="Apple BU">Apple BU</option>
                <option value="Non-Apple BU">Non-Apple BU (Wintel)</option>
                <option value="Solutions BU">Solutions BU</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5">Sub-Category Name</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 font-medium"
              />
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                {loading ? "Saving..." : "Update Sub-Category"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
