import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import PriceHistoryClient from "./PriceHistoryClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ sku?: string; compareSku?: string }>;
}

export default async function PriceHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const products = await prisma.product.findMany({ select: { id: true, sku: true, name: true, categoryId: true } });
  const categories = await prisma.category.findMany();

  const sku = params.sku || products[0]?.sku || "";
  const compareSku = params.compareSku || products[1]?.sku || "";

  const history = await prisma.productPriceHistory.findMany({
    where: {
      sku: { in: [sku, compareSku].filter(Boolean) }
    },
    orderBy: { updatedAt: "asc" }
  });

  return (
    <PriceHistoryClient
      initialHistory={serializeData(history)}
      products={serializeData(products)}
      categories={serializeData(categories)}
      purchaseOrders={[]}
      reservations={[]}
      searchSku={sku}
      searchCompareSku={compareSku}
    />
  );
}
