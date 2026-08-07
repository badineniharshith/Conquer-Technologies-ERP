import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ select: { id: true, categoryId: true, brand: true, status: true } }),
  ]);

  return <CategoriesClient categories={serializeData(categories)} products={serializeData(products)} />;
}
