export interface PredictionItem {
  sku: string;
  name: string;
  brand: string;
  categoryName: string;
  predictedSales: number;
  confidenceScore: number;
  trend: "up" | "down";
  previousSales: { year: number; sales: number }[];
  currentMonthForecast: number;
  popularityScore: number;
  previousMonthSales: number;
}

export function getSeasonalPredictions(products: any[], categories: any[]): PredictionItem[] {
  // Current month is July (local time: July 3, 2026)
  
  // Build a stable prediction dictionary by generating deterministic metrics
  // based on characters in product names/SKUs.
  return products.map((p) => {
    // Generate a pseudo-random seed from the SKU string
    let seed = 0;
    for (let i = 0; i < p.sku.length; i++) {
      seed += p.sku.charCodeAt(i);
    }
    
    // Determine a base level of sales based on category/brand
    const brandLower = p.brand.toLowerCase();
    const isApple = brandLower.includes("apple");
    const isGoogle = brandLower.includes("google") || brandLower.includes("pixel");
    const isHp = brandLower.includes("hp");
    
    let baseSales = 15 + (seed % 35);
    if (isApple) baseSales += 45;
    if (isGoogle) baseSales += 25;
    if (isHp) baseSales += 15;
    
    // Year-over-Year July sales
    const sales2023 = Math.round(baseSales * 0.75);
    const sales2024 = Math.round(baseSales * 0.88);
    const sales2025 = Math.round(baseSales * 1.0);
    
    // MoM trend (up or down)
    const trendDir: "up" | "down" = (seed % 10) > 2 ? "up" : "down";
    const growthFactor = trendDir === "up" ? 1.18 : 0.88;
    
    // Forecasted sales for July 2026 (current month)
    const predictedSales = Math.round(sales2025 * growthFactor);
    const currentMonthForecast = predictedSales;
    
    // Confidence score (78% to 98%)
    const confidenceScore = 78 + (seed % 21);
    
    // Popularity score (65 to 99)
    const popularityScore = 65 + (seed % 35);
    
    // Previous Month Sales (June 2026)
    const previousMonthSales = Math.round(sales25ForMoM(sales2025, seed));
    
    const categoryObj = categories.find(c => c.id === p.categoryId);
    const categoryName = categoryObj ? categoryObj.name : "Smartphones";
    
    return {
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      categoryName,
      predictedSales,
      confidenceScore,
      trend: trendDir,
      previousSales: [
        { year: 2023, sales: sales2023 },
        { year: 2024, sales: sales2024 },
        { year: 2025, sales: sales2025 }
      ],
      currentMonthForecast,
      popularityScore,
      previousMonthSales
    };
  }).sort((a, b) => b.predictedSales - a.predictedSales); // Sort so top predicted appear first
}

function sales25ForMoM(baseSales2025: number, seed: number) {
  // June sales are generally a bit lower or higher depending on the product seed
  const factor = 0.85 + (seed % 20) / 100;
  return baseSales2025 * factor;
}
