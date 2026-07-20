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

  // Build the DB where filter dynamically
  const whereClause: any = {};

  if (selectedBrand !== "All") {
    whereClause.brand = { equals: selectedBrand, mode: "insensitive" };
  }
  if (selectedCategory !== "All") {
    whereClause.categoryId = selectedCategory;
  }
  if (selectedStatus !== "All") {
    whereClause.status = selectedStatus;
  }

  // Handle Search Query directly in DB using indexes
  let finalQuery = q.trim();
  if (finalQuery) {
    whereClause.OR = [
      { name: { contains: finalQuery, mode: "insensitive" } },
      { sku: { contains: finalQuery, mode: "insensitive" } },
      { brand: { contains: finalQuery, mode: "insensitive" } }
    ];
  }

  const itemsPerPage = 10;

  // 1. Parallel fetch products (paginated) & categories
  const [productsData, totalFilteredCount, categories] = await Promise.all([
    erpDb.products.findMany({
      where: whereClause,
      select: {
        id: true,
        sku: true,
        name: true,
        brand: true,
        categoryId: true,
        barcode: true,
        safetyStock: true,
        reorderLevel: true,
        serialTracking: true,
        status: true
      },
      take: itemsPerPage,
      skip: (page - 1) * itemsPerPage
    }),
    erpDb.products.findMany({
      where: whereClause,
      select: { id: true }
    }).then(list => list.length),
    erpDb.categories.findMany({
      select: {
        id: true,
        name: true
      }
    })
  ]);

  const paginatedSkus = productsData.map(p => p.sku);

  // 2. Fetch inventory and prices ONLY for products on the current page (saves 99% database resources)
  const [inventory, prices] = await Promise.all([
    erpDb.inventory.findMany({
      where: { sku: { in: paginatedSkus } },
      select: {
        sku: true,
        branchCode: true,
        quantity: true,
        reservedQty: true
      }
    }),
    erpDb.productPrices.findMany({
      where: { sku: { in: paginatedSkus } },
      select: {
        sku: true,
        branchCode: true,
        sellingPrice: true
      }
    })
  ]);

  const predictions = getSeasonalPredictions(productsData, categories);

  return (
    <ProductMasterClient
      products={productsData}
      categories={categories}
      inventory={inventory}
      prices={prices}
      predictions={predictions}
      searchQueryString={q}
      correctedQueryString=""
      totalFilteredCount={totalFilteredCount}
      currentPage={page}
    />
  );
}
