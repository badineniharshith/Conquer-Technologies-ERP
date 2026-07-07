// Helper for deterministic random generation to ensure consistency
function seedRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return function() {
    h = h + 0x9e3779b9 | 0;
    let z = h;
    z ^= z >>> 16;
    z = Math.imul(z, 0x21f0aa7b);
    z ^= z >>> 15;
    z = Math.imul(z, 0x735a2d97);
    z ^= z >>> 16;
    return (z >>> 0) / 4294967296;
  };
}

export const LARGE_CATEGORIES = [
  { id: "cat-phones", name: "Mobile Phones" },
  { id: "cat-laptops", name: "Laptops" },
  { id: "cat-tablets", name: "Tablets" },
  { id: "cat-watches", name: "Smart Watches" },
  { id: "cat-accessories", name: "Accessories" },
  { id: "cat-headphones", name: "Headphones" },
  { id: "cat-monitors", name: "Monitors" },
  { id: "cat-printers", name: "Printers" },
  { id: "cat-networking", name: "Networking Devices" },
  { id: "cat-storage", name: "Storage Devices" },
  { id: "cat-components", name: "Components" },
  { id: "cat-office", name: "Office Equipment" },
  { id: "cat-smarthome", name: "Smart Home Devices" }
];

const APPROVED_BRANDS = ["Apple", "Samsung", "Google Pixel", "Lenovo", "HP", "Beats", "Logitech"];

export function generateLargeDatabase() {
  const categories = LARGE_CATEGORIES;
  const products: any[] = [];
  const productPrices: any[] = [];
  const productPriceHistory: any[] = [];
  const inventory: any[] = [];

  const rng = seedRandom("conquer-erp-standardized-catalog-v3");

  const branches = ["HYD-HQ", "HYD-THUB", "HYD-JH", "BLR", "CHN", "MUM", "DEL", "VZG", "VJA"];
  const suppliers = ["Redington India Ltd", "Ingram Micro India", "Savex Technologies", "Supertron Electronics"];
  const warehouses = ["Central Warehouse A", "Southern Depot B", "North logistics hub", "West Distribution Zone"];

  let productIndex = 1;

  // Let's generate variations per approved brand
  // 1. APPLE: ~280 items
  const appleModels = [
    // Phones
    { type: "phone", name: "iPhone 13", cost: 38000 },
    { type: "phone", name: "iPhone 13 Mini", cost: 32000 },
    { type: "phone", name: "iPhone 13 Pro", cost: 58000 },
    { type: "phone", name: "iPhone 13 Pro Max", cost: 65000 },
    { type: "phone", name: "iPhone 14", cost: 44000 },
    { type: "phone", name: "iPhone 14 Plus", cost: 50000 },
    { type: "phone", name: "iPhone 14 Pro", cost: 68000 },
    { type: "phone", name: "iPhone 14 Pro Max", cost: 75000 },
    { type: "phone", name: "iPhone 15", cost: 52000 },
    { type: "phone", name: "iPhone 15 Plus", cost: 58000 },
    { type: "phone", name: "iPhone 15 Pro", cost: 78000 },
    { type: "phone", name: "iPhone 15 Pro Max", cost: 86000 },
    { type: "phone", name: "iPhone 16", cost: 60000 },
    { type: "phone", name: "iPhone 16 Plus", cost: 68000 },
    { type: "phone", name: "iPhone 16 Pro", cost: 88000 },
    { type: "phone", name: "iPhone 16 Pro Max", cost: 98000 },
    // MacBooks
    { type: "laptop", name: "MacBook Air 13\"", cost: 62000 },
    { type: "laptop", name: "MacBook Air 15\"", cost: 75000 },
    { type: "laptop", name: "MacBook Pro 14\"", cost: 110000 },
    { type: "laptop", name: "MacBook Pro 16\"", cost: 145000 },
    // iPads
    { type: "tablet", name: "iPad Standard", cost: 24000 },
    { type: "tablet", name: "iPad Air", cost: 38000 },
    { type: "tablet", name: "iPad Pro 11\"", cost: 62000 },
    { type: "tablet", name: "iPad Pro 13\"", cost: 78000 },
    { type: "tablet", name: "iPad Mini", cost: 35000 },
    // Watch
    { type: "watch", name: "Apple Watch SE", cost: 18000 },
    { type: "watch", name: "Apple Watch Series 10", cost: 32000 },
    { type: "watch", name: "Apple Watch Ultra 2", cost: 58000 },
    // Accessories
    { type: "accessory", name: "AirPods Gen 3", cost: 12000 },
    { type: "accessory", name: "AirPods Pro Gen 2", cost: 18000 },
    { type: "accessory", name: "AirPods Max", cost: 38000 },
    { type: "accessory", name: "MagSafe Charger", cost: 3200 },
    { type: "accessory", name: "Apple Pencil Pro", cost: 9500 },
    { type: "accessory", name: "Magic Keyboard", cost: 24000 },
    { type: "accessory", name: "Magic Mouse", cost: 6500 }
  ];

  // 2. SAMSUNG: ~250 items
  const samsungModels = [
    { type: "phone", name: "Galaxy S24 Ultra", cost: 92000 },
    { type: "phone", name: "Galaxy S24 Plus", cost: 74000 },
    { type: "phone", name: "Galaxy S24", cost: 58000 },
    { type: "phone", name: "Galaxy S23 FE", cost: 42000 },
    { type: "phone", name: "Galaxy Z Flip 6", cost: 78000 },
    { type: "phone", name: "Galaxy Z Fold 6", cost: 120000 },
    { type: "phone", name: "Galaxy A55 5G", cost: 32000 },
    { type: "phone", name: "Galaxy A35 5G", cost: 24000 },
    { type: "tablet", name: "Galaxy Tab S9 Ultra", cost: 78000 },
    { type: "tablet", name: "Galaxy Tab S9 FE", cost: 36000 },
    { type: "watch", name: "Galaxy Watch 7 Pro", cost: 26000 },
    { type: "watch", name: "Galaxy Watch FE", cost: 15000 },
    { type: "accessory", name: "Galaxy Buds 3 Pro", cost: 16000 },
    { type: "storage", name: "Samsung 990 PRO NVMe M.2 SSD", cost: 8500 },
    { type: "storage", name: "Samsung T7 Shield Portable SSD", cost: 9500 },
    { type: "monitor", name: "Samsung Odyssey G9 OLED 49\"", cost: 98000 },
    { type: "monitor", name: "Samsung ViewFinity S9 5K", cost: 75000 }
  ];

  // 3. GOOGLE PIXEL: ~150 items
  const googleModels = [
    { type: "phone", name: "Pixel 7", cost: 36000 },
    { type: "phone", name: "Pixel 7 Pro", cost: 54000 },
    { type: "phone", name: "Pixel 8", cost: 48000 },
    { type: "phone", name: "Pixel 8 Pro", cost: 68000 },
    { type: "phone", name: "Pixel 9", cost: 58000 },
    { type: "phone", name: "Pixel 9 Pro", cost: 78000 },
    { type: "phone", name: "Pixel 9 Pro XL", cost: 90000 },
    { type: "phone", name: "Pixel Fold 2", cost: 130000 },
    { type: "tablet", name: "Pixel Tablet Wi-Fi", cost: 34000 },
    { type: "watch", name: "Pixel Watch 3 LTE", cost: 28000 },
    { type: "accessory", name: "Pixel Buds Pro 2", cost: 14000 }
  ];

  // 4. LENOVO: ~150 items
  const lenovoModels = [
    { type: "laptop", name: "ThinkPad X1 Carbon Gen 12", cost: 125000 },
    { type: "laptop", name: "ThinkPad T14s Gen 5", cost: 84000 },
    { type: "laptop", name: "IdeaPad Slim 5 AMD", cost: 42000 },
    { type: "laptop", name: "Legion Pro 7i Gaming", cost: 165000 },
    { type: "laptop", name: "Yoga Pro 9i Intel", cost: 110000 },
    { type: "laptop", name: "LOQ 15 Gaming", cost: 58000 },
    { type: "monitor", name: "ThinkVision 27\" Creator", cost: 24000 },
    { type: "accessory", name: "ThinkPad USB-C Dock Gen 2", cost: 12000 },
    { type: "accessory", name: "Lenovo Essential Keyboard", cost: 1800 },
    { type: "accessory", name: "Lenovo Wireless Mouse M20", cost: 800 }
  ];

  // 5. HP: ~120 items
  const hpModels = [
    { type: "laptop", name: "EliteBook 840 G11", cost: 88000 },
    { type: "laptop", name: "ProBook 440 G10", cost: 48000 },
    { type: "laptop", name: "Pavilion 15 Laptop", cost: 38000 },
    { type: "laptop", name: "Omen Transcend 16", cost: 135000 },
    { type: "laptop", name: "Victus 15 Gaming", cost: 55000 },
    { type: "laptop", name: "Spectre x360 OLED", cost: 115000 },
    { type: "laptop", name: "Envy x360 convertible", cost: 72000 },
    { type: "monitor", name: "HP Series 5 27\" FHD", cost: 12000 },
    { type: "printer", name: "HP LaserJet Pro MFP M428dw", cost: 28000 },
    { type: "printer", name: "HP Smart Tank 580 Wi-Fi", cost: 14000 },
    { type: "accessory", name: "HP Premium Wireless Keyboard", cost: 2400 },
    { type: "accessory", name: "HP Dual Mode Mouse", cost: 1200 }
  ];

  // 6. BEATS: ~50 items
  const beatsModels = [
    { type: "headphones", name: "Beats Studio Pro", cost: 22000 },
    { type: "headphones", name: "Beats Solo 4 Wireless", cost: 14000 },
    { type: "headphones", name: "Beats Fit Pro ANC", cost: 15000 },
    { type: "headphones", name: "Beats Flex Wireless", cost: 4800 },
    { type: "smarthome", name: "Beats Pill Portable Speaker", cost: 11000 },
    { type: "accessory", name: "Beats Fast Charger USB-C", cost: 220 }
  ];

  // 7. LOGITECH: ~100 items
  const logitechModels = [
    { type: "accessory", name: "Logitech MX Master 3S", cost: 7800 },
    { type: "accessory", name: "Logitech MX Anywhere 3S", cost: 5800 },
    { type: "accessory", name: "Logitech G Pro X Superlight 2", cost: 12000 },
    { type: "accessory", name: "Logitech G502 X Plus Gaming", cost: 11000 },
    { type: "accessory", name: "Logitech M185 Compact Mouse", cost: 900 },
    { type: "accessory", name: "Logitech M720 Triathlon", cost: 2800 },
    { type: "accessory", name: "Logitech MX Keys S Keyboard", cost: 9500 },
    { type: "accessory", name: "Logitech POP Keys Mechanical", cost: 6500 },
    { type: "accessory", name: "Logitech G915 TKL Mechanical", cost: 16500 },
    { type: "accessory", name: "Logitech K380 Bluetooth", cost: 2400 },
    { type: "accessory", name: "Logitech Wave Keys Ergonomic", cost: 4500 },
    { type: "accessory", name: "Logitech Brio 4K Webcam", cost: 14500 },
    { type: "accessory", name: "Logitech C920 HD Pro", cost: 6800 },
    { type: "accessory", name: "Logitech C922 Pro Stream", cost: 7800 },
    { type: "accessory", name: "Logitech G Pro X Gaming Headset", cost: 9800 },
    { type: "accessory", name: "Logitech Zone Wireless Headset", cost: 15000 },
    { type: "smarthome", name: "Logitech StreamCam Full HD", cost: 11000 },
    { type: "office", name: "Logitech MK270 Keyboard Mouse Combo", cost: 1800 }
  ];

  // Colors & Storage lists
  const colors = ["Titanium Black", "Titanium Gray", "Silver", "Space Black", "Midnight", "Starlight", "Obsidian", "Porcelain", "Pale Grey", "Graphite", "Sandstone"];
  const specs = ["128GB", "256GB", "512GB", "1TB", "8GB RAM / 256GB SSD", "16GB RAM / 512GB SSD", "24GB RAM / 1TB SSD", "32GB RAM / 2TB SSD", "RTX 4060 GPU", "RTX 4070 GPU", "RTX 4080 GPU"];

  // Helper to map model types to categoryIds
  const typeToCat: Record<string, string> = {
    "phone": "cat-phones",
    "laptop": "cat-laptops",
    "tablet": "cat-tablets",
    "watch": "cat-watches",
    "accessory": "cat-accessories",
    "headphones": "cat-headphones",
    "monitor": "cat-monitors",
    "printer": "cat-printers",
    "networking": "cat-networking",
    "storage": "cat-storage",
    "components": "cat-components",
    "office": "cat-office",
    "smarthome": "cat-smarthome"
  };

  const skuPrefix: Record<string, string> = {
    "cat-phones": "PHN",
    "cat-laptops": "LAP",
    "cat-tablets": "TAB",
    "cat-watches": "WTC",
    "cat-accessories": "ACC",
    "cat-headphones": "HDP",
    "cat-monitors": "MON",
    "cat-printers": "PRN",
    "cat-networking": "NET",
    "cat-storage": "STG",
    "cat-components": "CMP",
    "cat-office": "OFC",
    "cat-smarthome": "SHT"
  };

  // We need exactly 1,020 unique configurations.
  // Combine brand models with colors and specifications
  const addProductList = (brandName: string, modelsList: any[], count: number) => {
    let localIndex = 0;
    while (localIndex < count) {
      const model = modelsList[Math.floor(rng() * modelsList.length)];
      const color = colors[Math.floor(rng() * colors.length)];
      const spec = specs[Math.floor(rng() * specs.length)];
      
      const catId = typeToCat[model.type] || "cat-accessories";
      const prefix = skuPrefix[catId];
      const sku = `${prefix}-${brandName.substring(0, 3).toUpperCase()}-${Math.floor(100000 + rng() * 900000)}`;

      if (products.some(p => p.sku === sku)) continue;

      const pName = `${model.name} (${spec}, ${color})`;
      const baseCost = model.cost;
      
      // Cost modification based on spec variation
      let modCost = baseCost;
      if (spec.includes("512GB") || spec.includes("512GB SSD")) modCost = Math.round(baseCost * 1.15);
      else if (spec.includes("1TB") || spec.includes("1TB SSD")) modCost = Math.round(baseCost * 1.30);
      else if (spec.includes("2TB SSD")) modCost = Math.round(baseCost * 1.50);
      else if (spec.includes("RTX 4080")) modCost = Math.round(baseCost * 1.45);

      const marginPct = 0.20 + rng() * 0.15; // 20% to 35% margin
      const sellingPrice = Math.round(modCost * (1 + marginPct));
      const mrp = Math.round(sellingPrice * (1.05 + rng() * 0.10)); // mrp 5-15% above selling price
      const margin = Math.round(((sellingPrice - modCost) / sellingPrice) * 100) / 100;
      
      const barcode = `890${Math.floor(1000000000 + rng() * 9000000000)}`;
      const supplier = suppliers[Math.floor(rng() * suppliers.length)];
      const warehouse = warehouses[Math.floor(rng() * warehouses.length)];
      const active = rng() > 0.05;

      const p = {
        id: `prod-${productIndex++}`,
        sku,
        name: pName,
        brand: brandName === "Google Pixel" ? "Google Pixel" : brandName,
        categoryId: catId,
        barcode,
        costPrice: modCost,
        sellingPrice,
        mrp,
        serialTracking: model.type === "phone" || model.type === "laptop",
        supplier,
        warehouse,
        status: active ? "ACTIVE" : "DEACTIVE",
        reorderLevel: 5 + Math.floor(rng() * 10),
        safetyStock: 3 + Math.floor(rng() * 5),
        createdAt: new Date(Date.now() - 150 * 24 * 3600 * 1000), // 5 months ago
        updatedAt: new Date()
      };

      products.push(p);

      // Seed branch pricing & histories
      branches.forEach((bCode) => {
        productPrices.push({
          id: `prc-${bCode}-${sku}`,
          sku,
          branchCode: bCode,
          costPrice: modCost,
          sellingPrice,
          mrp,
          margin,
          lastUpdated: new Date()
        });

        // 5 Price History entries (Jan, Feb, Mar, Apr, May) showing upward/downward delta zigs-zags
        const basePrice = sellingPrice;
        const historyUpdates = [
          { month: "Jan", ratio: 0.92 + rng() * 0.04, reason: "Festival Offer", changer: "marketing@conquer.com" }, // Down
          { month: "Feb", ratio: 0.96 + rng() * 0.04, reason: "Supplier Cost Increase", changer: "supply@conquer.com" }, // Up
          { month: "Mar", ratio: 0.88 + rng() * 0.05, reason: "Promotional Discount", changer: "sales@conquer.com" }, // Down
          { month: "Apr", ratio: 0.97 + rng() * 0.03, reason: "Currency Fluctuation", changer: "accounts@conquer.com" }, // Up
          { month: "May", ratio: 1.00, reason: "Market Stabilization", changer: "admin@conquer.com" } // Target price
        ];

        let runningCost = Math.round(modCost * 0.90);
        historyUpdates.forEach((upInfo, hIdx) => {
          const histSelling = Math.round(basePrice * upInfo.ratio);
          const histCost = Math.round(runningCost * (0.96 + rng() * 0.08));
          runningCost = histCost;

          productPriceHistory.push({
            id: `prch-${hIdx}-${bCode}-${sku}`,
            sku,
            branchCode: bCode,
            costPrice: histCost,
            sellingPrice: histSelling,
            mrp,
            updatedBy: upInfo.changer,
            updatedAt: new Date(`2026-0${hIdx + 1}-15T12:00:00.000Z`)
          });
        });

        // Inventory Stock levels per branch
        const availableQty = Math.floor(rng() * 60);
        const reservedQty = Math.floor(rng() * availableQty * 0.15); // max 15% reserved
        const damagedQty = rng() > 0.90 ? Math.floor(rng() * 3) : 0;
        
        inventory.push({
          id: `inv-${bCode}-${sku}`,
          itemName: pName,
          sku,
          productId: p.id,
          branchId: bCode,
          branchCode: bCode,
          quantity: availableQty,
          availableQty: availableQty - reservedQty,
          reservedQty,
          damagedQty,
          returnedQty: rng() > 0.92 ? Math.floor(rng() * 2) : 0,
          transitQty: rng() > 0.85 ? Math.floor(rng() * 5) : 0,
          incomingQty: rng() > 0.80 ? Math.floor(rng() * 8) : 0,
          outgoingQty: rng() > 0.80 ? Math.floor(rng() * 6) : 0,
          deadQty: rng() > 0.90 ? Math.floor(rng() * 4) : 0,
          minStock: p.reorderLevel,
          maxStock: 300,
          warehouseZone: `Zone-${String.fromCharCode(65 + Math.floor(rng() * 6))}${Math.floor(1 + rng() * 9)}`,
          ageingDays: Math.floor(rng() * 60)
        });
      });

      localIndex++;
    }
  };

  // Generate distributions to hit target > 1000
  addProductList("Apple", appleModels, 280);
  addProductList("Samsung", samsungModels, 240);
  addProductList("Google Pixel", googleModels, 160);
  addProductList("Lenovo", lenovoModels, 140);
  addProductList("HP", hpModels, 110);
  addProductList("Beats", beatsModels, 50);
  addProductList("Logitech", logitechModels, 40); // 280+240+160+140+110+50+40 = 1,020 items

  return {
    categories,
    products,
    productPrices,
    productPriceHistory,
    inventory
  };
}
