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

  const finalQuery = q.trim();
  if (finalQuery) {
    whereClause.OR = [
      { name: { contains: finalQuery, mode: "insensitive" } },
      { sku: { contains: finalQuery, mode: "insensitive" } },
      { brand: { contains: finalQuery, mode: "insensitive" } }
    ];
  }

  const itemsPerPage = 15;

  const [productsData, totalFilteredCount, categories] = await Promise.all([
    prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
      take: itemsPerPage,
      skip: (page - 1) * itemsPerPage
    }),
    prisma.product.count({ where: whereClause }),
    prisma.category.findMany({
      select: {
        id: true,
        name: true
      }
    })
  ]);

  const paginatedSkus = productsData.map(p => p.sku);

  const inventory = await prisma.inventory.findMany({
    where: { sku: { in: paginatedSkus } },
    select: {
      sku: true,
      branchCode: true,
      quantity: true,
      availableQty: true,
      reservedQty: true
    }
  });

  const serializedProducts = serializeData<any[]>(productsData);
  const serializedCategories = serializeData<any[]>(categories);
  const serializedInventory = serializeData<any[]>(inventory);

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
