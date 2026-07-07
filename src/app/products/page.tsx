import { erpDb } from "@/lib/db";
import ProductMasterClient from "@/components/products/ProductMasterClient";
import { getSeasonalPredictions } from "@/lib/predictions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    brand?: string;
    category?: string;
    availability?: string;
    status?: string;
    priceRange?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const page = Number(params.page || "1");
  const selectedBrand = params.brand || "All";
  const selectedCategory = params.category || "All";
  const selectedAvailability = params.availability || "All";
  const selectedStatus = params.status || "All";
  const selectedPriceRange = params.priceRange || "All";

  // 1. Fetch all datasets from DB on server
  const products = await erpDb.products.findMany();
  const categories = await erpDb.categories.findMany();
  const inventory = await erpDb.inventory.findMany();
  const prices = await erpDb.productPrices.findMany();

  const minimalInventory = inventory.map((i: any) => ({
    sku: i.sku,
    branchCode: i.branchCode,
    quantity: i.quantity,
    reservedQty: i.reservedQty || 0
  }));

  const minimalProducts = products.map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    categoryId: p.categoryId,
    barcode: p.barcode,
    safetyStock: p.safetyStock,
    reorderLevel: p.reorderLevel,
    serialTracking: p.serialTracking,
    status: p.status,
    category: p.category ? { name: p.category.name } : null
  }));

  const minimalPrices = prices.map((pr: any) => ({
    sku: pr.sku,
    branchCode: pr.branchCode,
    sellingPrice: pr.sellingPrice
  }));

  const predictions = getSeasonalPredictions(minimalProducts, categories);

  // Implement Spelling Correction Dictionary dynamically
  const dictionary = Array.from(new Set([
    ...minimalProducts.map(p => p.brand),
    ...categories.map(c => c.name),
    "iPhone", "MacBook", "iPad", "Pixel", "Spectre", "EliteBook", "Apple", "Google", "HP"
  ]));

  function getLevenshteinDistance(a: string, b: string): number {
    const tmp = [];
    let i, j;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    for (i = 0; i <= a.length; i++) tmp[i] = [i];
    for (j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return tmp[a.length][b.length];
  }

  function getSpellingCorrection(term: string): string {
    if (!term) return "";
    const words = term.trim().split(/\s+/);
    const corrected = words.map(w => {
      if (w.length < 3) return w;
      const lw = w.toLowerCase();
      const hasSubstring = dictionary.find(d => d.toLowerCase().includes(lw) || lw.includes(d.toLowerCase()));
      if (hasSubstring) return hasSubstring;

      let bestMatch = w;
      let minDistance = 3;
      for (const d of dictionary) {
        const dist = getLevenshteinDistance(lw, d.toLowerCase());
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = d;
        }
      }
      return bestMatch;
    });
    return corrected.join(" ");
  }

  let finalQuery = q.trim();
  let originalQuery = q;
  let didCorrect = false;

  if (finalQuery) {
    const hasMatches = minimalProducts.some(p => {
      const matchText = `${p.name} ${p.sku} ${p.brand} ${p.category?.name || ""}`.toLowerCase();
      return matchText.includes(finalQuery.toLowerCase());
    });

    if (!hasMatches) {
      const corrected = getSpellingCorrection(finalQuery);
      if (corrected.toLowerCase() !== finalQuery.toLowerCase()) {
        finalQuery = corrected;
        didCorrect = true;
      }
    }
  }

  // Pre-build Maps for O(1) matching in filters
  const skuStockMap = new Map();
  minimalInventory.forEach(inv => {
    skuStockMap.set(inv.sku, (skuStockMap.get(inv.sku) || 0) + inv.quantity);
  });

  const skuPriceMap = new Map();
  minimalPrices.forEach((pr: any) => {
    skuPriceMap.set(pr.sku, pr.sellingPrice);
  });
  minimalPrices.forEach((pr: any) => {
    if (pr.branchCode === "HYD-HQ") {
      skuPriceMap.set(pr.sku, pr.sellingPrice);
    }
  });

  const getProductStock = (sku: string) => skuStockMap.get(sku) || 0;
  const getProductPrice = (sku: string) => skuPriceMap.get(sku) || 0;

  // Filter products server-side
  const filteredProducts = minimalProducts.filter(p => {
    // 1. Search Query
    let matchesSearch = true;
    if (finalQuery) {
      const categoryObj = categories.find(c => c.id === p.categoryId);
      const catName = categoryObj ? categoryObj.name : "Smartphones";
      const matchText = `${p.name} ${p.sku} ${p.brand} ${catName} ${p.barcode || ""}`.toLowerCase();
      matchesSearch = matchText.includes(finalQuery.toLowerCase());
    }

    // 2. Brand
    const matchesBrand = selectedBrand === "All" || p.brand.toLowerCase() === selectedBrand.toLowerCase();

    // 3. Category
    const matchesCategory = selectedCategory === "All" || p.categoryId === selectedCategory;

    // 4. Status
    const matchesStatus = selectedStatus === "All" || p.status === selectedStatus;

    // 5. Availability
    const stock = getProductStock(p.sku);
    let matchesAvailability = true;
    if (selectedAvailability === "In Stock") {
      matchesAvailability = stock > 0;
    } else if (selectedAvailability === "Out of Stock") {
      matchesAvailability = stock === 0;
    }

    // 6. Price range
    const price = getProductPrice(p.sku);
    let matchesPrice = true;
    if (selectedPriceRange === "under60") {
      matchesPrice = price > 0 && price < 60000;
    } else if (selectedPriceRange === "60to100") {
      matchesPrice = price >= 60000 && price <= 100000;
    } else if (selectedPriceRange === "over100") {
      matchesPrice = price > 100000;
    }

    return matchesSearch && matchesBrand && matchesCategory && matchesStatus && matchesAvailability && matchesPrice;
  });

  // Sort products (Trending first)
  const trendingSkus = predictions.slice(0, 5).map(p => p.sku);
  const trendingSkuSet = new Set(trendingSkus);

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const isTrendingA = trendingSkuSet.has(a.sku) ? 1 : 0;
    const isTrendingB = trendingSkuSet.has(b.sku) ? 1 : 0;
    if (isTrendingA !== isTrendingB) return isTrendingB - isTrendingA;

    const statusA = a.status === "ACTIVE" ? 1 : 2;
    const statusB = b.status === "ACTIVE" ? 1 : 2;
    if (statusA !== statusB) return statusA - statusB;

    return 0;
  });

  // Slice to current page (10 items per page)
  const itemsPerPage = 10;
  const totalFilteredCount = sortedProducts.length;
  const paginatedProducts = sortedProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Filter inventory and prices to only include matching SKUs to keep props payload tiny
  const paginatedSkus = new Set(paginatedProducts.map(p => p.sku));
  const filteredInventoryProps = minimalInventory.filter(inv => paginatedSkus.has(inv.sku));
  const filteredPricesProps = minimalPrices.filter((pr: any) => paginatedSkus.has(pr.sku));

  return (
    <ProductMasterClient
      products={paginatedProducts}
      categories={categories}
      inventory={filteredInventoryProps}
      prices={filteredPricesProps}
      predictions={predictions}
      searchQueryString={originalQuery}
      correctedQueryString={didCorrect ? finalQuery : ""}
      totalFilteredCount={totalFilteredCount}
      currentPage={page}
    />
  );
}
