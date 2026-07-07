"use client";

import { useState } from "react";
import { FolderHeart, Plus, Boxes, Sparkles, FolderOpen, ArrowRight, Edit2, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions";
import Link from "next/link";

interface CategoriesClientProps {
  categories: any[];
  products: any[];
}

export default function CategoriesClient({ categories, products }: CategoriesClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any | null>(null);
  
  // Forms state
  const [catName, setCatName] = useState("");
  const [loading, setLoading] = useState(false);

  // Search filter & stats mapping
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cat.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const catStats = filteredCategories.map((cat: any) => {
    const matchingProducts = products.filter((p: any) => p.categoryId === cat.id);
    const brands = Array.from(new Set(matchingProducts.map((p: any) => p.brand)));
    return {
      ...cat,
      productCount: matchingProducts.length,
      brands: brands.join(", ") || "None",
      isActive: matchingProducts.some((p: any) => p.status === "ACTIVE")
    };
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setLoading(true);
    try {
      await createCategoryAction(catName);
      toast.success("Category created successfully!");
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
      await updateCategoryAction(selectedCat.id, catName);
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
    setCatName(cat.name);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">Categories Directory</h1>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Configure product grouping classes, organize active brands, and map catalog distribution schemas.
          </p>
        </div>
        <button
          onClick={() => { setCatName(""); setIsAddOpen(true); }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-orange-550/15 cursor-pointer pt-2.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Categories</span>
            <h3 className="text-2xl font-bold mt-1 text-stone-900">{categories.length}</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <FolderOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Cataloged Products</span>
            <h3 className="text-2xl font-bold mt-1 text-stone-900">{products.length}</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Active Brands</span>
            <h3 className="text-2xl font-bold mt-1 text-stone-900">
              {Array.from(new Set(products.map((p: any) => p.brand))).length}
            </h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* List Table with Search */}
      <div className="glass-panel p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">Classification Classes</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search category name or ID..."
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
                <th className="px-4 py-3">Category Name</th>
                <th className="px-4 py-3">Category ID</th>
                <th className="px-4 py-3 text-center">Associated Brands</th>
                <th className="px-4 py-3 text-right">Products Count</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {catStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400 italic">No matching categories found.</td>
                </tr>
              ) : (
                catStats.map((cat) => (
                  <tr key={cat.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-stone-900 block">{cat.name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-500">{cat.id}</td>
                    <td className="px-4 py-3 text-center text-stone-600 font-medium">{cat.brands}</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">{cat.productCount} items</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        cat.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-stone-50 text-stone-500 border-stone-200"
                      }`}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer"
                          title="Edit Category Name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1 text-red-600 hover:bg-red-50 border border-red-200 rounded cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link href={`/products?category=${cat.id}`} className="inline-flex items-center text-orange-655 hover:text-orange-700 font-semibold ml-2 hover:underline">
                          <span>Products</span>
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

      {/* ADD CATEGORY MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in-20">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-2xl max-w-sm w-full border border-stone-200 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-stone-900">Add New Category Classification</h4>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1.5">Category Name</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Tablets, Wearables"
                required
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850 placeholder-stone-400"
              />
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                {loading ? "Creating..." : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {isEditOpen && selectedCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in-20">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-2xl max-w-sm w-full border border-stone-200 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-stone-900">Modify Category Name</h4>
              <button type="button" onClick={() => setIsEditOpen(false)} className="text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-455 uppercase mb-1.5">Category Name</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-orange-500 focus:bg-white text-stone-850"
              />
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                {loading ? "Saving..." : "Save Classification"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
