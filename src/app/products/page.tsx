import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import ProductMasterClient from "@/components/products/ProductMasterClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    brand?: string;
    category?: string;
    status?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const page = Number(params.page || "1");
  const selectedBrand = params.brand || "All";
  const selectedCategory = params.category || "All";
  const selectedStatus = params.status || "All";

  // 1. Fetch ERP products
  const erpProducts = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch CRM products via Raw SQL
  let crmProductsRaw: any[] = [];
  try {
    crmProductsRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        id, sku, name, brand, price, cost_price, market_price, 
        category, status, item_number, "createdAt"
      FROM crm.products
      ORDER BY id DESC;
    `);
  } catch (err: any) {
    console.error("Error fetching CRM products:", err.message);
  }

  // 3. Fetch Categories
  const categories = await prisma.category.findMany({
    select: { id: true, name: true }
  });

  // Map ERP products
  const erpMapped = erpProducts.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand || "Generic",
    price: Number(p.sellingPrice || p.costPrice || 0),
    costPrice: Number(p.costPrice || 0),
    marketPrice: Number(p.marketPrice || 0),
    categoryId: p.categoryId,
    categoryName: p.category?.name || "Apple Hardware",
    barcode: p.barcode || "N/A",
    itemNumber: p.itemNumber || null,
    status: p.status || "ACTIVE",
    source: "ERP"
  }));

  // Map CRM products
  const crmMapped = crmProductsRaw.map(p => ({
    id: `crm-${p.id}`,
    sku: p.sku,
    name: p.name,
    brand: p.brand || "Generic",
    price: Number(p.price || p.cost_price || 0),
    costPrice: Number(p.cost_price || 0),
    marketPrice: Number(p.market_price || 0),
    categoryId: null,
    categoryName: p.category || "Apple Hardware",
    barcode: "N/A",
    itemNumber: p.item_number || null,
    status: p.status || "ACTIVE",
    source: "CRM"
  }));

  // Combine products: tag as 'CRM & ERP' if SKU exists in both
  const combinedProductsMap = new Map<string, any>();

  erpMapped.forEach(p => {
    combinedProductsMap.set(p.sku, { ...p, source: "ERP" });
  });

  crmMapped.forEach(p => {
    if (combinedProductsMap.has(p.sku)) {
      const existing = combinedProductsMap.get(p.sku)!;
      combinedProductsMap.set(p.sku, { ...existing, source: "CRM & ERP" });
    } else {
      combinedProductsMap.set(p.sku, { ...p, source: "CRM" });
    }
  });

  let allProducts = Array.from(combinedProductsMap.values());

  // Apply filters
  if (selectedBrand !== "All") {
    allProducts = allProducts.filter(p => p.brand.toLowerCase() === selectedBrand.toLowerCase());
  }
  if (selectedCategory !== "All") {
    allProducts = allProducts.filter(p => p.categoryId === selectedCategory || p.categoryName.toLowerCase().includes(selectedCategory.toLowerCase()));
  }
  if (selectedStatus !== "All") {
    allProducts = allProducts.filter(p => p.status === selectedStatus);
  }

  const queryTrim = q.trim().toLowerCase();
  if (queryTrim) {
    allProducts = allProducts.filter(p => 
      p.name.toLowerCase().includes(queryTrim) ||
      p.sku.toLowerCase().includes(queryTrim) ||
      p.brand.toLowerCase().includes(queryTrim) ||
      p.categoryName.toLowerCase().includes(queryTrim)
    );
  }

  // Fetch live inventory for branch breakdown
  const inventories = await prisma.inventory.findMany({
    select: {
      sku: true,
      branchCode: true,
      branchId: true,
      quantity: true,
      reservedQty: true,
      availableQty: true
    }
  });

  const itemsPerPage = 50;
  const totalFilteredCount = allProducts.length;
  const paginatedProducts = allProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const serializedProducts = serializeData<any[]>(paginatedProducts);
  const serializedCategories = serializeData<any[]>(categories);
  const serializedInventory = serializeData<any[]>(inventories);

  return (
    <ProductMasterClient
      products={serializedProducts}
      categories={serializedCategories}
      inventory={serializedInventory}
      prices={[]}
      predictions={[]}
      searchQueryString={q}
      correctedQueryString=""
      totalFilteredCount={totalFilteredCount}
      currentPage={page}
    />
  );
}
