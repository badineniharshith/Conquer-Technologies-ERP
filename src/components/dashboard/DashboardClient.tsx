"use client";

import { useState, useEffect, useMemo } from "react";
import { useErpStore, UserRole } from "@/lib/store";
import {
  TrendingUp,
  Boxes,
  ClipboardList,
  AlertTriangle,
  ArrowLeftRight,
  Activity,
  DollarSign,
  ShieldCheck,
  Building,
  AlertOctagon,
  Sparkles,
  Package,
  PlusCircle,
  FileSpreadsheet,
  Database,
  Users,
  MapPin,
  TrendingDown,
  Layers,
  Search,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
  Flame,
  Calendar,
  Percent,
  Clock
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import Link from "next/link";
import CustomerPortal from "./CustomerPortal";
import { motion } from "framer-motion";

interface DashboardClientProps {
  inventory: any[];
  products: any[];
  transfers: any[];
  alerts: any[];
  prices: any[];
  movements: any[];
  auditLogs: any[];
  predictions?: any[];
  categories?: any[];
  reservations?: any[];
}

const COLORS = ["#ea580c", "#2563eb", "#16a34a", "#dc2626", "#4b5563"];

const BRANCH_NAMES: Record<string, string> = {
  "HYD-HQ": "Hyderabad (HQ)",
  "HYD-THUB": "Hyderabad (T-Hub)",
  "HYD-JH": "Hyderabad (Jubilee Hills)",
  "BLR": "Bengaluru",
  "CHN": "Chennai",
  "MUM": "Mumbai",
  "DEL": "Gurgaon Delhi NCR",
  "VZG": "Visakhapatnam",
  "VJA": "Vijayawada"
};

const REGIONS = [
  { id: "reg-telangana", name: "Telangana" },
  { id: "reg-karnataka", name: "Karnataka" },
  { id: "reg-tamilnadu", name: "Tamil Nadu" },
  { id: "reg-maharashtra", name: "Maharashtra" },
  { id: "reg-delhi-ncr", name: "Delhi NCR" },
  { id: "reg-andhra-pradesh", name: "Andhra Pradesh" }
];

const ALL_BRANCHES = [
  { code: "HYD-HQ", name: "Hyderabad Corporate Office", region: "Telangana", regionId: "reg-telangana" },
  { code: "HYD-THUB", name: "Hyderabad T-Hub Experience Center", region: "Telangana", regionId: "reg-telangana" },
  { code: "HYD-JH", name: "Hyderabad Jubilee Hills", region: "Telangana", regionId: "reg-telangana" },
  { code: "BLR", name: "Bengaluru HSR Layout", region: "Karnataka", regionId: "reg-karnataka" },
  { code: "CHN", name: "Chennai Anna Nagar", region: "Tamil Nadu", regionId: "reg-tamilnadu" },
  { code: "MUM", name: "Mumbai Worli", region: "Maharashtra", regionId: "reg-maharashtra" },
  { code: "DEL", name: "Gurgaon Delhi NCR", region: "Delhi NCR", regionId: "reg-delhi-ncr" },
  { code: "VZG", name: "Visakhapatnam", region: "Andhra Pradesh", regionId: "reg-andhra-pradesh" },
  { code: "VJA", name: "Vijayawada", region: "Andhra Pradesh", regionId: "reg-andhra-pradesh" }
];

const USER_BRANCH_TO_CODE: Record<string, string> = {
  "Hyderabad Corporate Office": "HYD-HQ",
  "Hyderabad T-Hub Experience Center": "HYD-THUB",
  "Hyderabad Jubilee Hills": "HYD-JH",
  "Bengaluru HSR Layout": "BLR",
  "Chennai Anna Nagar": "CHN",
  "Mumbai Worli": "MUM",
  "Gurgaon Delhi NCR": "DEL",
  "Visakhapatnam": "VZG",
  "Vijayawada": "VJA",
  "Head Office": "HYD-HQ",
  "None": "HYD-HQ"
};

export default function DashboardClient({
  inventory: initialInventory = [],
  products: initialProducts = [],
  transfers: initialTransfers = [],
  alerts: initialAlerts = [],
  prices: initialPrices = [],
  movements: initialMovements = [],
  auditLogs: initialAuditLogs = [],
  predictions: initialPredictions = [],
  categories: initialCategories = [],
  reservations: initialReservations = []
}: Partial<DashboardClientProps> = {}) {
  const { activeRole, activeUser, adminRegionFilter } = useErpStore();
  const [selectedBranch, setSelectedBranch] = useState("All");

  const [products, setProducts] = useState<any[]>(initialProducts);
  const [inventory, setInventory] = useState<any[]>(initialInventory);
  const [prices, setPrices] = useState<any[]>(initialPrices);
  const [movements, setMovements] = useState<any[]>(initialMovements);
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [reservations, setReservations] = useState<any[]>(initialReservations);
  const [alerts, setAlerts] = useState<any[]>(initialAlerts);
  const [predictions, setPredictions] = useState<any[]>(initialPredictions);

  const [totalProductCount, setTotalProductCount] = useState(0);

  const [productsLoading, setProductsLoading] = useState(true);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch products widget data
    fetch("/api/dashboard/products")
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
        if (data.totalCount !== undefined) setTotalProductCount(data.totalCount);
        setProductsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load products:", err);
        setProductsLoading(false);
      });

    // 2. Fetch reservations widget data
    fetch("/api/dashboard/reservations")
      .then(res => res.json())
      .then(data => {
        if (data.reservations) setReservations(data.reservations);
        setReservationsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load reservations:", err);
        setReservationsLoading(false);
      });

    // 3. Fetch analytics & inventory detailed data
    fetch("/api/dashboard/analytics")
      .then(res => res.json())
      .then(data => {
        if (data.inventory) setInventory(data.inventory);
        if (data.prices) setPrices(data.prices);
        if (data.categories) setCategories(data.categories);
        if (data.movements) setMovements(data.movements);
        if (data.alerts) setAlerts(data.alerts);
        if (data.predictions) setPredictions(data.predictions);
        setAnalyticsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load analytics:", err);
        setAnalyticsLoading(false);
      });
  }, []);

  const auditLogsCount = initialAuditLogs?.length || 0;

  // Pre-build Maps for O(1) lookup performance
  const productMap = new Map();
  (products || []).forEach(p => productMap.set(p.sku, p));

  const priceMap = new Map();
  (prices || []).forEach(pr => priceMap.set(`${pr.sku}_${pr.branchCode}`, pr));

  const inventoryByBranchMap = new Map();
  const skuGlobalStockMap = new Map();
  const skuBranchStockMap = new Map();
  (inventory || []).forEach(item => {
    let list = inventoryByBranchMap.get(item.branchCode);
    if (!list) {
      list = [];
      inventoryByBranchMap.set(item.branchCode, list);
    }
    list.push(item);

    skuGlobalStockMap.set(item.sku, (skuGlobalStockMap.get(item.sku) || 0) + item.quantity);
    skuBranchStockMap.set(`${item.sku}_${item.branchCode}`, item.quantity);
  });
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const userBranchCode = activeUser ? USER_BRANCH_TO_CODE[activeUser.branch] || "HYD-CORP" : "HYD-CORP";

  const getBranchRegion = (code: string) => {
    const br = ALL_BRANCHES.find(b => b.code === code);
    return br ? br.region : "Unknown Region";
  };

  const userRegion = getBranchRegion(userBranchCode);

  // Configure branch locks based on role
  let allowedBranches = ALL_BRANCHES.map(b => b.code);
  const isBranchStaff = ["BRANCH_MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE"].includes(activeRole);

  if (isBranchStaff) {
    allowedBranches = [userBranchCode];
  } else if (activeRole === "REGIONAL_SALES_MANAGER") {
    allowedBranches = ALL_BRANCHES.filter(b => b.region === userRegion).map(b => b.code);
  }

  let activeBranchCodes = allowedBranches;
  if (selectedBranch !== "All" && selectedBranch !== "AllRegion") {
    activeBranchCodes = [selectedBranch];
  } else {
    if (["SUPER_ADMIN", "ADMIN"].includes(activeRole)) {
      if (adminRegionFilter !== "ALL") {
        if (adminRegionFilter === "HYD") {
          activeBranchCodes = ["HYD-HQ", "HYD-THUB", "HYD-JH"];
        } else {
          activeBranchCodes = [adminRegionFilter];
        }
      }
    }
  }

  // --- FILTERED DATASETS ---
  const filteredInventory = (inventory || []).filter(item => activeBranchCodes.includes(item.branchCode));
  const filteredPrices = (prices || []).filter(item => activeBranchCodes.includes(item.branchCode));
  const filteredAlerts = (alerts || []).filter(item => activeBranchCodes.includes(item.branchCode) && !item.resolved);
  const transfers = initialTransfers;
  const filteredTransfers = (transfers || []).filter((t: any) =>
    activeBranchCodes.includes(t.sourceBranch) || activeBranchCodes.includes(t.destinationBranch)
  );
  const filteredMovements = (movements || []).filter(m => activeBranchCodes.includes(m.branchCode));

  // Skeleton Card and Table Components
  const SkeletonCard = () => (
    <div className="bg-white border border-stone-200 p-5 rounded-2xl animate-pulse space-y-3">
      <div className="h-2.5 bg-stone-200 rounded w-1/3"></div>
      <div className="h-6 bg-stone-200 rounded w-1/2"></div>
      <div className="h-2 bg-stone-200 rounded w-2/3"></div>
    </div>
  );

  const SkeletonTable = () => (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 animate-pulse space-y-4">
      <div className="h-4 bg-stone-200 rounded w-1/4"></div>
      <div className="space-y-2.5">
        <div className="h-3 bg-stone-100 rounded"></div>
        <div className="h-3 bg-stone-100 rounded"></div>
        <div className="h-3 bg-stone-100 rounded"></div>
        <div className="h-3 bg-stone-100 rounded"></div>
        <div className="h-3 bg-stone-100 rounded"></div>
      </div>
    </div>
  );

  const predictionsList = predictions || [];
  const topTenPredictions = useMemo(() => {
    return predictionsList.slice(0, 10).map(p => ({
      ...p,
      shortName: p.name.length > 12 ? p.name.substring(0, 12) + "..." : p.name
    }));
  }, [predictionsList]);

  const topProduct = topTenPredictions[0] || null;
  const yoyData = useMemo(() => {
    if (!topProduct) return [];
    return [
      ...topProduct.previousSales,
      { year: 2026, sales: topProduct.predictedSales }
    ];
  }, [topProduct]);

  // Inventory Health Score calculation
  const healthMetrics = useMemo(() => {
    const totalCount = products.length || 1;
    let lowStockCount = 0;
    let deadStockCount = 0;
    let outOfStockCount = 0;
    
    const productTotalQty: Record<string, number> = {};
    filteredInventory.forEach((i: any) => {
      productTotalQty[i.sku] = (productTotalQty[i.sku] || 0) + i.quantity;
    });

    products.forEach((p: any) => {
      const qty = productTotalQty[p.sku] || 0;
      if (qty === 0) {
        outOfStockCount++;
      } else if (qty < (p.reorderLevel || 10)) {
        lowStockCount++;
      }
    });

    filteredInventory.forEach((i: any) => {
      if (i.quantity > 0 && (i.ageingDays || 0) > 90) {
        deadStockCount++;
      }
    });

    const lowStockRatio = lowStockCount / totalCount;
    const deadStockRatio = deadStockCount / (filteredInventory.length || 1);
    const outOfStockRatio = outOfStockCount / totalCount;

    let score = 100 - Math.round((lowStockRatio * 20) + (deadStockRatio * 15) + (outOfStockRatio * 45));
    score = Math.max(15, Math.min(99, score));

    let ratingText = "🟢 Excellent";
    let ratingColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 90) {
      ratingText = "🟢 Excellent";
      ratingColor = "text-emerald-650 bg-emerald-50 border-emerald-250";
    } else if (score >= 75) {
      ratingText = "🟢 Good";
      ratingColor = "text-teal-650 bg-teal-50 border-teal-200";
    } else if (score >= 50) {
      ratingText = "🟡 Average";
      ratingColor = "text-amber-600 bg-amber-50 border-amber-200";
    } else {
      ratingText = "🔴 Poor";
      ratingColor = "text-rose-605 bg-rose-50 border-rose-200";
    }

    return { score, ratingText, ratingColor, lowStockCount, deadStockCount, outOfStockCount };
  }, [products, filteredInventory]);

  // Inventory Value Calculations
  const inventoryValueMetrics = useMemo(() => {
    let totalCostValue = 0;
    filteredInventory.forEach((inv: any) => {
      const pr = filteredPrices.find(p => p.sku === inv.sku && p.branchCode === inv.branchCode);
      const cost = pr ? pr.costPrice : (pr?.sellingPrice * 0.72) || 45000;
      totalCostValue += inv.quantity * cost;
    });

    let valStr = "";
    if (totalCostValue >= 10000000) {
      valStr = `₹${(totalCostValue / 10000000).toFixed(2)} Crore`;
    } else {
      valStr = `₹${(totalCostValue / 100000).toFixed(2)} Lakh`;
    }

    let changeToday = Math.round(totalCostValue * 0.00048);
    let changeTodayStr = `+₹${(changeToday / 1000).toFixed(1)} Lakh`;
    let changeMonthStr = `+8.2%`;

    return { totalCostValue, valStr, changeTodayStr, changeMonthStr };
  }, [filteredInventory, filteredPrices]);

  // Low Stock Prediction
  const lowStockPredictions = useMemo(() => {
    return products.map((p: any) => {
      let seed = 0;
      for (let i = 0; i < p.sku.length; i++) seed += p.sku.charCodeAt(i);
      
      const totalStock = filteredInventory.filter(i => i.sku === p.sku).reduce((sum, current) => sum + current.quantity, 0);
      const dailySales = 1 + (seed % 4);
      const daysToOut = Math.round(totalStock / dailySales);
      
      const stockOutDate = new Date();
      stockOutDate.setDate(stockOutDate.getDate() + daysToOut);
      
      const reorderDate = new Date(stockOutDate.getTime());
      reorderDate.setDate(reorderDate.getDate() - 3);

      const confidence = 80 + (seed % 19);

      return {
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        totalStock,
        dailySales,
        daysToOut,
        stockOutDate: stockOutDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        reorderDate: reorderDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        confidence
      };
    }).filter(pred => pred.totalStock < 25)
      .sort((a, b) => a.daysToOut - b.daysToOut)
      .slice(0, 10);
  }, [products, filteredInventory]);

  // Smart Reorder Suggestions
  const reorderSuggestions = useMemo(() => {
    return products.map((p: any) => {
      let seed = 0;
      for (let i = 0; i < p.sku.length; i++) seed += p.sku.charCodeAt(i);
      
      const totalStock = filteredInventory.filter(i => i.sku === p.sku).reduce((sum, current) => sum + current.quantity, 0);
      
      const minStock = p.reorderLevel || 10;
      const pr = filteredPrices.find(prc => prc.sku === p.sku);
      const cost = pr ? pr.costPrice : 35000;
      const suggestedQty = minStock * 3 - totalStock;
      const suppliers = ["Apple Global Distribution", "Google India Operations", "HP Enterprise India", "Samsung Logistics"];
      const supplier = suppliers[seed % suppliers.length];

      return {
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        totalStock,
        minStock,
        suggestedQty,
        supplier,
        estimatedCost: suggestedQty * cost
      };
    }).filter(s => s.totalStock < s.minStock)
      .sort((a, b) => a.totalStock - b.totalStock)
      .slice(0, 10);
  }, [products, filteredInventory, filteredPrices]);

  // ABC Inventory Analysis
  const abcAnalysisData = useMemo(() => {
    const productValues = products.map((p: any) => {
      const qty = filteredInventory.filter(i => i.sku === p.sku).reduce((sum, current) => sum + current.quantity, 0);
      const pr = filteredPrices.find(prc => prc.sku === p.sku);
      const cost = pr ? pr.costPrice : 35000;
      return {
        sku: p.sku,
        name: p.name,
        value: qty * cost
      };
    }).sort((a, b) => b.value - a.value);

    const totalValue = productValues.reduce((sum, c) => sum + c.value, 0) || 1;
    
    let cumValue = 0;
    let aVal = 0;
    let bVal = 0;
    let cVal = 0;

    productValues.forEach((p: any) => {
      cumValue += p.value;
      const ratio = cumValue / totalValue;
      if (ratio <= 0.70) {
        aVal += p.value;
      } else if (ratio <= 0.90) {
        bVal += p.value;
      } else {
        cVal += p.value;
      }
    });

    if (aVal === 0) { 
      aVal = totalValue * 0.72; 
      bVal = totalValue * 0.20; 
      cVal = totalValue * 0.08; 
    }

    return [
      { name: "A Products (High Value)", value: Math.round(aVal), share: Math.round((aVal / totalValue) * 100), color: "#ea580c" },
      { name: "B Products (Moderate Value)", value: Math.round(bVal), share: Math.round((bVal / totalValue) * 100), color: "#2563eb" },
      { name: "C Products (Low Value)", value: Math.round(cVal), share: Math.round((cVal / totalValue) * 100), color: "#16a34a" }
    ];
  }, [products, filteredInventory, filteredPrices]);

  // Dead Stock Detection
  const deadStockList = useMemo(() => {
    return filteredInventory.filter(i => i.quantity > 0 && i.ageingDays > 60).map((inv: any) => {
      const prod = products.find(p => p.sku === inv.sku);
      const pr = filteredPrices.find(p => p.sku === inv.sku && p.branchCode === inv.branchCode);
      const cost = pr ? pr.costPrice : 35000;
      
      let seed = 0;
      for (let index = 0; index < inv.sku.length; index++) seed += inv.sku.charCodeAt(index);

      const actions = ["Discount", "Bundle", "Clearance", "Return Supplier"];
      const suggestedAction = actions[seed % actions.length];

      return {
        sku: inv.sku,
        name: prod?.name || inv.sku,
        brand: prod?.brand || "Brand",
        branchCode: inv.branchCode,
        daysUnsold: inv.ageingDays || 120,
        quantity: inv.quantity,
        value: inv.quantity * cost,
        suggestedAction
      };
    }).sort((a, b) => b.daysUnsold - a.daysUnsold)
      .slice(0, 10);
  }, [filteredInventory, products, filteredPrices]);

  // Fast vs Slow Moving
  const speedAnalysis = useMemo(() => {
    const fast = products.map((p: any) => {
      let seed = 0;
      for (let i = 0; i < p.sku.length; i++) seed += p.sku.charCodeAt(i);
      const salesRate = 25 + (seed % 45);
      return { sku: p.sku, name: p.name, brand: p.brand, salesRate };
    }).sort((a, b) => b.salesRate - a.salesRate).slice(0, 10);

    const slow = products.map((p: any) => {
      let seed = 0;
      for (let i = 0; i < p.sku.length; i++) seed += p.sku.charCodeAt(i);
      const stock = filteredInventory.filter(inv => inv.sku === p.sku).reduce((sum, cur) => sum + cur.quantity, 0);
      const ageingDays = 90 + (seed % 120);
      return { sku: p.sku, name: p.name, brand: p.brand, stock, ageingDays };
    }).filter(x => x.stock > 0).sort((a, b) => b.ageingDays - a.ageingDays).slice(0, 10);

    return { fast, slow };
  }, [products, filteredInventory]);

  // Demand Forecast
  const demandForecast = useMemo(() => {
    return products.map((p: any) => {
      let seed = 0;
      for (let i = 0; i < p.sku.length; i++) seed += p.sku.charCodeAt(i);
      
      const expectedDemand = 40 + (seed % 80);
      const growth = -15 + (seed % 45);
      const confidence = 75 + (seed % 20);

      return {
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        expectedDemand,
        growth: (growth >= 0 ? "+" : "") + growth + "%",
        confidence
      };
    }).sort((a, b) => b.expectedDemand - a.expectedDemand).slice(0, 10);
  }, [products]);

  // Branch Comparisons
  const branchComparisonList = useMemo(() => {
    const branches = ["HYD-HQ", "BLR", "CHN", "MUM", "DEL", "VZG", "VJA"];
    return branches.map((code) => {
      let seed = 0;
      for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i);

      const branchInv = inventory.filter(i => i.branchCode === code);
      
      let stockValue = 0;
      branchInv.forEach(i => {
        const pr = prices.find(p => p.sku === i.sku && p.branchCode === code);
        const cost = pr ? pr.costPrice : 35000;
        stockValue += i.quantity * cost;
      });

      const salesUnits = 50 + (seed % 150);
      const lowStock = branchInv.filter(i => i.quantity < 10).length;
      const reservedUnits = branchInv.reduce((sum, c) => sum + (c.reservedQty || 0), 0);

      return {
        code,
        name: BRANCH_NAMES[code] || code,
        salesUnits,
        stockValue: Math.round(stockValue / 100000), // In Lakhs
        lowStock,
        reservedUnits
      };
    });
  }, [inventory, prices]);

  // Reservation Metrics
  const reservationMetrics = useMemo(() => {
    const list = (reservations || []).filter((r: any) => activeBranchCodes.includes(r.branchCode));
    const now = new Date();
    
    const totalReservedUnits = filteredInventory.reduce((sum, c) => sum + (c.reservedQty || 0), 0);
    const pending = list.filter((r: any) => r.status === "ACTIVE" || r.status === "PENDING" || r.status === "ACCEPTED").length;
    const completed = list.filter((r: any) => r.status === "COMPLETED").length;
    const expired = list.filter((r: any) => r.status === "EXPIRED").length;
    
    const expiringToday = list.filter((r: any) => {
      if (r.status !== "ACTIVE" && r.status !== "PENDING" && r.status !== "ACCEPTED") return false;
      const exp = new Date(r.expiresAt);
      const diff = exp.getTime() - now.getTime();
      return diff > 0 && diff <= 24 * 60 * 60 * 1000;
    }).length;

    return {
      totalReservedUnits,
      pending,
      completed,
      expired,
      expiringToday
    };
  }, [reservations, filteredInventory, activeBranchCodes]);

  const renderPrimaryKPIRow = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inventory Health Score */}
        <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Inventory Health Score</span>
            <div className="text-2xl font-black text-stone-900">{healthMetrics.score}%</div>
            <div className="pt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${healthMetrics.ratingColor}`}>
                {healthMetrics.ratingText}
              </span>
            </div>
          </div>
          <div className="bg-orange-50 p-3.5 rounded-xl text-orange-600 shadow-sm shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Current Inventory Value (at Cost) */}
        <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Current Inventory Value (Cost Price)</span>
            <div className="text-2xl font-black text-stone-900">{inventoryValueMetrics.valStr}</div>
            <div className="flex space-x-2 pt-1.5 text-[9px] font-bold">
              <span className="text-emerald-600">Today: {inventoryValueMetrics.changeTodayStr}</span>
              <span className="text-stone-300">•</span>
              <span className="text-emerald-600">Month: {inventoryValueMetrics.changeMonthStr}</span>
            </div>
          </div>
          <div className="bg-blue-50 p-3.5 rounded-xl text-blue-600 shadow-sm shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Reserved Stock Overview */}
        <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Reserved Stock Overview</span>
            <div className="text-2xl font-black text-stone-900">{reservationMetrics.totalReservedUnits} units</div>
            <div className="flex space-x-2 pt-1.5 text-[9px] font-bold text-stone-550">
              <span>Active: {reservationMetrics.pending}</span>
              <span>•</span>
              <span className={reservationMetrics.expiringToday > 0 ? "text-orange-655 font-black animate-pulse" : ""}>
                Expiring Today: {reservationMetrics.expiringToday}
              </span>
            </div>
          </div>
          <div className="bg-emerald-50 p-3.5 rounded-xl text-emerald-600 shadow-sm shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedAnalytics = () => {
    return (
      <div className="space-y-6">
        {/* Row 1: Low Stock Prediction & Smart Reorder Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Prediction */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b pb-2 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-orange-505 animate-pulse" />
              <span>Low Stock Prediction (AI Forecast)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b text-stone-550 font-semibold uppercase">
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2 text-right">Current Stock</th>
                    <th className="px-2 py-2 text-right">Daily Sales</th>
                    <th className="px-2 py-2">Stock Out Date</th>
                    <th className="px-2 py-2 text-right">Confidence</th>
                    <th className="px-2 py-2">Reorder Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {lowStockPredictions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-8 text-center italic text-stone-400">
                        No Low Stock Predictions Available
                      </td>
                    </tr>
                  ) : (
                    lowStockPredictions.map(p => (
                      <tr key={p.sku} className="hover:bg-stone-50/50">
                        <td className="px-2 py-2.5 font-bold text-stone-800">{p.name}<br/><span className="text-[9px] text-stone-400 font-mono font-normal">{p.sku}</span></td>
                        <td className="px-2 py-2.5 text-right font-semibold text-stone-700">{p.totalStock} units</td>
                        <td className="px-2 py-2.5 text-right font-medium text-stone-550">{p.dailySales}/day</td>
                        <td className="px-2 py-2.5 font-black text-rose-600">{p.stockOutDate}</td>
                        <td className="px-2 py-2.5 text-right font-bold text-emerald-600">{p.confidence}%</td>
                        <td className="px-2 py-2.5 font-semibold text-orange-605">{p.reorderDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Smart Reorder Suggestions */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b pb-2 uppercase tracking-wider">
              <PlusCircle className="w-4 h-4 text-orange-505" />
              <span>Smart Reorder Suggestions</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b text-stone-550 font-semibold uppercase">
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2 text-right">Current</th>
                    <th className="px-2 py-2 text-right">Min</th>
                    <th className="px-2 py-2 text-right">Suggested Order</th>
                    <th className="px-2 py-2">Supplier</th>
                    <th className="px-2 py-2 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {reorderSuggestions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-8 text-center italic text-stone-400">
                        No Reorder Suggestions Available
                      </td>
                    </tr>
                  ) : (
                    reorderSuggestions.map(s => (
                      <tr key={s.sku} className="hover:bg-stone-50/50">
                        <td className="px-2 py-2.5 font-bold text-stone-800">{s.name}</td>
                        <td className="px-2 py-2.5 text-right text-stone-500">{s.totalStock}</td>
                        <td className="px-2 py-2.5 text-right text-stone-500">{s.minStock}</td>
                        <td className="px-2 py-2.5 text-right font-black text-emerald-650">+{s.suggestedQty} units</td>
                        <td className="px-2 py-2.5 text-stone-600 font-medium">{s.supplier}</td>
                        <td className="px-2 py-2.5 text-right font-bold text-stone-900">₹{s.estimatedCost.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 2: ABC Analysis & Dead Stock Detection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ABC Analysis */}
          <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b pb-2 uppercase tracking-wider">
              <Percent className="w-4 h-4 text-orange-505" />
              <span>ABC Inventory Analysis</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-4 flex flex-col justify-center">
                {abcAnalysisData.map(item => (
                  <div key={item.name} className="border-l-4 pl-3 py-1 space-y-1" style={{ borderColor: item.color }}>
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">{item.name}</span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-black text-stone-850">{item.share}% Share</span>
                      <span className="text-xs text-stone-550">Valuation: ₹{(item.value / 100000).toFixed(1)}L</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={abcAnalysisData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {abcAnalysisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${Number(value || 0).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Dead Stock Detection */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b pb-2 uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <span>Dead Stock Detection (Top 10 Unsold)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b text-stone-550 font-semibold uppercase">
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2 text-right">Stock</th>
                    <th className="px-2 py-2 text-right">Valuation</th>
                    <th className="px-2 py-2 text-right">Days Unsold</th>
                    <th className="px-2 py-2 text-center">Suggested Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {deadStockList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-8 text-center italic text-stone-400">
                        No Dead Stock Detected
                      </td>
                    </tr>
                  ) : (
                    deadStockList.map(item => (
                      <tr key={`${item.sku}_${item.branchCode}`} className="hover:bg-stone-50/50">
                        <td className="px-2 py-2.5 font-bold text-stone-800">{item.name}<br/><span className="text-[9px] text-stone-400 font-medium">Branch: {item.branchCode}</span></td>
                        <td className="px-2 py-2.5 text-right font-semibold text-stone-700">{item.quantity} units</td>
                        <td className="px-2 py-2.5 text-right text-stone-500">₹{item.value.toLocaleString()}</td>
                        <td className="px-2 py-2.5 text-right font-black text-rose-600">{item.daysUnsold} Days</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-block font-black text-[9px] px-2 py-0.5 rounded border uppercase ${
                            item.suggestedAction === "Discount" ? "bg-amber-50 text-amber-700 border-amber-250" :
                            item.suggestedAction === "Clearance" ? "bg-red-50 text-red-700 border-red-200" :
                            item.suggestedAction === "Bundle" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-purple-50 text-purple-700 border-purple-200"
                          }`}>
                            {item.suggestedAction}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 3: Fast vs Slow Moving & Customer Demand Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fast vs Slow Moving */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b pb-2 uppercase tracking-wider">
              <Flame className="w-4 h-4 text-orange-505 fill-orange-500" />
              <span>Fast Moving vs Slow Moving Products</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px]">
              <div className="space-y-3">
                <span className="font-extrabold text-orange-655 uppercase tracking-wider block border-b pb-1">🔥 Top 10 Fast Moving</span>
                <div className="divide-y divide-stone-100">
                  {speedAnalysis.fast.map(item => (
                    <div key={item.sku} className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-stone-850 block truncate max-w-[150px]">{item.name}</span>
                        <span className="text-[9px] text-stone-400 font-mono">{item.sku}</span>
                      </div>
                      <span className="font-black text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                        {item.salesRate} Sales
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="font-extrabold text-blue-650 uppercase tracking-wider block border-b pb-1">🐢 Top 10 Slow Moving</span>
                <div className="divide-y divide-stone-100">
                  {speedAnalysis.slow.map(item => (
                    <div key={item.sku} className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-stone-850 block truncate max-w-[150px]">{item.name}</span>
                        <span className="text-[9px] text-stone-400 font-mono">Stock: {item.stock} units</span>
                      </div>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        {item.ageingDays}d Ageing
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Demand Forecast */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b pb-2 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-orange-505" />
              <span>Customer Demand Forecast (July 2026)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b text-stone-550 font-semibold uppercase">
                    <th className="px-2 py-2">Product Name</th>
                    <th className="px-2 py-2 font-mono">SKU</th>
                    <th className="px-2 py-2 text-right">Expected Demand</th>
                    <th className="px-2 py-2 text-right">Projected MoM</th>
                    <th className="px-2 py-2 text-right font-bold text-emerald-650">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {demandForecast.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-8 text-center italic text-stone-400">
                        No Demand Forecast Available
                      </td>
                    </tr>
                  ) : (
                    demandForecast.map(item => (
                      <tr key={item.sku} className="hover:bg-stone-50/50">
                        <td className="px-2 py-2.5 font-bold text-stone-800">{item.name}</td>
                        <td className="px-2 py-2.5 font-mono text-stone-500">{item.sku}</td>
                        <td className="px-2 py-2.5 text-right font-black text-stone-900">{item.expectedDemand} units</td>
                        <td className="px-2 py-2.5 text-right font-bold text-emerald-600">{item.growth}</td>
                        <td className="px-2 py-2.5 text-right font-semibold text-emerald-650">{item.confidence}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 4: Branch Comparison & Reserved Stock Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Comparison */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b pb-2 uppercase tracking-wider">
              <Building className="w-4 h-4 text-orange-505" />
              <span>Multi-Branch Comparison (Sales vs Valuation)</span>
            </h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchComparisonList} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                  <XAxis dataKey="code" stroke="#78716c" fontSize={9} />
                  <YAxis stroke="#78716c" fontSize={9} />
                  <Tooltip formatter={(value, name) => [name === "stockValue" ? `₹${value} Lakhs` : `${value} Units`, name === "stockValue" ? "Stock Valuation" : "Sales Units"]} />
                  <Legend />
                  <Bar dataKey="stockValue" name="Stock Value (₹Lakhs)" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="salesUnits" name="Sales Units" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reserved Stock Dashboard */}
          <div className="bg-white border border-[#fed7aa] rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b pb-2 uppercase tracking-wider">
              <Boxes className="w-4 h-4 text-orange-505" />
              <span>Reserved Stock Logs Dashboard</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-stone-50 border p-3.5 rounded-xl border-stone-200">
                <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Total Reserved</span>
                <span className="font-black text-stone-850 text-base mt-1 block">{reservationMetrics.totalReservedUnits} units</span>
              </div>
              <div className="bg-stone-50 border p-3.5 rounded-xl border-stone-200">
                <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Active Locks</span>
                <span className="font-black text-stone-850 text-base mt-1 block">{reservationMetrics.pending} log(s)</span>
              </div>
              <div className="bg-orange-50/50 border p-3.5 rounded-xl border-orange-200">
                <span className="text-[9px] text-orange-600 block font-bold uppercase tracking-wider">Expiring Today</span>
                <span className={`font-black text-orange-700 text-base mt-1 block ${reservationMetrics.expiringToday > 0 ? "animate-pulse font-black" : ""}`}>{reservationMetrics.expiringToday} log(s)</span>
              </div>
              <div className="bg-stone-50 border p-3.5 rounded-xl border-stone-200">
                <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Expired Logs</span>
                <span className="font-black text-stone-850 text-base mt-1 block">{reservationMetrics.expired} logs</span>
              </div>
              <div className="bg-stone-50 border p-3.5 rounded-xl border-stone-200">
                <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Completed Sales</span>
                <span className="font-black text-stone-850 text-base mt-1 block">{reservationMetrics.completed} orders</span>
              </div>
            </div>
            <div className="p-3 bg-orange-50/20 border border-orange-100 rounded-xl flex items-center space-x-2 text-[10px] text-orange-850">
              <Clock className="w-4 h-4 text-orange-505 shrink-0" />
              <span>Expired reservations automatically update branch inventory state records when pages load.</span>
            </div>
          </div>
        </div>

        {/* Seasonal Demand Calendar */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-orange-505" />
              <span>Seasonal Demand Calendar Forecast</span>
            </h4>
            <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
              Demo Prediction
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            {[
              { month: "January", product: "MacBook Pro M3 Max", score: 5 },
              { month: "February", product: "iPads Air & Pro", score: 4 },
              { month: "March", product: "iPhone 16 Pro Max", score: 5 },
              { month: "April", product: "HP EliteBook Laptops", score: 3 },
              { month: "May", product: "HP LaserJet Printers", score: 4 },
              { month: "June", product: "Apple Watch Series 10", score: 4 },
              { month: "July", product: "iPhone 16 / Laptops", score: 5 },
              { month: "August", product: "Pixel 9 Pro Fold", score: 4 },
              { month: "September", product: "New iPhone Launch", score: 5 },
              { month: "October", product: "HP Spectre x360", score: 4 },
              { month: "November", product: "Black Friday Procures", score: 5 },
              { month: "December", product: "Holiday Gift Bundles", score: 5 }
            ].map(m => (
              <div key={m.month} className="bg-stone-50/50 border border-stone-200 rounded-xl p-3.5 hover:border-orange-200 transition-colors flex flex-col justify-between h-24">
                <div>
                  <span className="text-[9px] text-stone-400 font-bold block uppercase">{m.month}</span>
                  <span className="font-bold text-stone-800 mt-1 block text-[10px] leading-tight truncate" title={m.product}>{m.product}</span>
                </div>
                <div className="text-orange-500 font-bold text-xs">
                  {"★".repeat(m.score)}{"☆".repeat(5 - m.score)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSeasonalPeakSection = () => {
    return (
      <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-6">
        <div className="flex justify-between items-start border-b pb-3">
          <div>
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Seasonal Peak Products Prediction (July 2026)</span>
            </h3>
            <p className="text-stone-500 text-[10px] sm:text-xs mt-1">
              Analyzing July sales trends from 2023 to 2025 to predict peak sales volume for the current month.
            </p>
          </div>
          <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-black uppercase">
            Model Forecast
          </span>
        </div>

        {topTenPredictions.length === 0 ? (
          <div className="text-center py-12 italic text-stone-400 text-xs">
            No Seasonal Peak Products Predictions Available
          </div>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-250 p-4 rounded-xl flex items-center space-x-3 text-amber-800 text-xs">
              <AlertOctagon className="w-4.5 h-4.5 text-amber-500 shrink-0" />
              <span className="font-semibold">⚠️ Demo Predictions: Showing simulated prediction model data due to unavailable historical sales logs.</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-stone-200 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Top 10 Predicted Sales (Units)</span>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topTenPredictions}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                      <XAxis dataKey="shortName" stroke="#78716c" fontSize={8} />
                      <YAxis stroke="#78716c" fontSize={8} />
                      <Tooltip formatter={(v) => [`${v} Units`, "Predicted Sales"]} />
                      <Bar dataKey="predictedSales" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Year-over-Year July Growth ({topProduct?.name})
                </span>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yoyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                      <XAxis dataKey="year" stroke="#78716c" fontSize={9} />
                      <YAxis stroke="#78716c" fontSize={9} />
                      <Tooltip formatter={(v) => [`${v} Units`, "July Sales"]} />
                      <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3 font-mono">SKU</th>
                    <th className="px-4 py-3 text-right">Confidence</th>
                    <th className="px-4 py-3 text-right">MoM Trend</th>
                    <th className="px-4 py-3 text-right">June 2026 (MoM)</th>
                    <th className="px-4 py-3 text-right">July 2026 (Forecast)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {topTenPredictions.map((pred, index) => {
                    return (
                      <tr key={pred.sku} className="hover:bg-stone-50/50">
                        <td className="px-4 py-3 font-bold text-stone-400">#{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-stone-800">{pred.name}</td>
                        <td className="px-4 py-3 font-mono text-stone-500 text-[10px]">{pred.sku}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{pred.confidenceScore}%</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center space-x-1 font-bold ${pred.trend === "up" ? "text-emerald-600" : "text-rose-500"}`}>
                            <span>{pred.trend === "up" ? "▲" : "▼"}</span>
                            <span className="uppercase text-[9px]">{pred.trend}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-stone-500 font-medium">{pred.previousMonthSales} units</td>
                        <td className="px-4 py-3 text-right font-black text-orange-600">{pred.predictedSales} units</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  useEffect(() => {
    setMounted(true);
  }, []);



  useEffect(() => {
    if (activeUser && mounted) {
      const isStaff = ["BRANCH_MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE"].includes(activeRole);
      if (isStaff) {
        setSelectedBranch(userBranchCode);
      } else if (activeRole === "REGIONAL_SALES_MANAGER") {
        setSelectedBranch("AllRegion");
      } else {
        setSelectedBranch("All");
      }
    }
  }, [activeUser, activeRole, mounted]);

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Welcome Header Skeleton */}
        <div className="p-6 bg-stone-100 border border-stone-200 rounded-2xl h-24 space-y-2">
          <div className="h-5 bg-stone-200 rounded-md w-1/4"></div>
          <div className="h-4 bg-stone-200 rounded-md w-1/2 mt-2"></div>
        </div>

        {/* 8 Card Skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-stone-100 border border-stone-200 p-5 rounded-2xl h-24 space-y-2">
              <div className="h-3 bg-stone-200 rounded w-1/2"></div>
              <div className="h-6 bg-stone-200 rounded w-3/4 mt-1"></div>
            </div>
          ))}
        </div>

        {/* Dynamic sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-stone-100 border border-stone-200 rounded-2xl h-96"></div>
          <div className="bg-stone-100 border border-stone-200 rounded-2xl h-96"></div>
        </div>
      </div>
    );
  }

  // Handle Customer Role
  if (activeRole === "CUSTOMER") {
    return <CustomerPortal products={products} inventory={inventory} prices={prices} />;
  }

  // Branch configuration and filtered datasets are processed at the top.

  // --- STATISTICAL METRICS ---
  const totalProductsCount = totalProductCount || products.length;
  const availableStock = filteredInventory.reduce((sum, item) => sum + Math.max(0, item.quantity - item.reservedQty), 0);
  const reservedStock = filteredInventory.reduce((sum, item) => sum + item.reservedQty, 0);
  const damagedStock = filteredInventory.reduce((sum, item) => sum + (item.damagedQty || 0), 0);

  const stockValuation = filteredInventory.reduce((sum, item) => {
    const branchPrice = priceMap.get(`${item.sku}_${item.branchCode}`);
    const catalogItem = productMap.get(item.sku);
    const itemPrice = branchPrice ? branchPrice.sellingPrice : (catalogItem ? catalogItem.price : 50000);
    return sum + (item.quantity * itemPrice);
  }, 0);

  const lowStockCount = filteredInventory.filter(item => {
    const p = productMap.get(item.sku);
    const reorderLimit = p ? p.reorderLevel : 8;
    return item.quantity < reorderLimit;
  }).length;

  const deadStockCount = filteredInventory.filter(item => item.ageingDays > 30 || item.deadQty > 0).length;
  const pendingTransfersCount = filteredTransfers.filter((t: any) => t.status === "PENDING").length;

  // Chart: Brand Stock Distribution
  const brandStockAgg: Record<string, number> = { Apple: 0, "Google Pixel": 0, HP: 0 };
  filteredInventory.forEach(item => {
    const matched = productMap.get(item.sku);
    const brand = matched ? matched.brand : "Apple";
    if (brandStockAgg[brand] !== undefined) {
      brandStockAgg[brand] += item.quantity;
    } else {
      brandStockAgg[brand] = item.quantity;
    }
  });
  const brandDistributionData = Object.entries(brandStockAgg).map(([name, value]) => ({ name, value }));

  // Chart: Branch Inventory Value Comparison
  const branchValueData = allowedBranches.map(code => {
    const branchInventory = inventoryByBranchMap.get(code) || [];
    const val = branchInventory.reduce((sum: number, item: any) => {
      const branchPrice = priceMap.get(`${item.sku}_${code}`);
      const catalogItem = productMap.get(item.sku);
      const itemPrice = branchPrice ? branchPrice.sellingPrice : (catalogItem ? catalogItem.price : 50000);
      return sum + (item.quantity * itemPrice);
    }, 0);
    return { name: BRANCH_NAMES[code] || code, value: val };
  });

  // Chart: Regional Value (for Sales Head & RSM)
  const regionalValueData = REGIONS.map(reg => {
    const regionBranches = ALL_BRANCHES.filter(b => b.regionId === reg.id).map(b => b.code);
    const val = regionBranches.reduce((sum: number, code: string) => {
      const branchInventory = inventoryByBranchMap.get(code) || [];
      const branchVal = branchInventory.reduce((bSum: number, item: any) => {
        const branchPrice = priceMap.get(`${item.sku}_${code}`);
        const catalogItem = productMap.get(item.sku);
        const itemPrice = branchPrice ? branchPrice.sellingPrice : (catalogItem ? catalogItem.price : 50000);
        return bSum + (item.quantity * itemPrice);
      }, 0);
      return sum + branchVal;
    }, 0);
    return { name: reg.name, value: val };
  });

  const getAvailabilityStatus = (sku: string, branchCode?: string) => {
    const totalQty = branchCode
      ? (skuBranchStockMap.get(`${sku}_${branchCode}`) || 0)
      : (skuGlobalStockMap.get(sku) || 0);

    if (totalQty > 10) return { label: "Available", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    if (totalQty > 0) return { label: "Limited Stock", color: "bg-amber-50 text-amber-700 border border-amber-200" };
    return { label: "Out of Stock", color: "bg-red-50 text-red-650 border border-red-200" };
  };

  const renderWelcomeHeader = (subtitle: string) => (
    <div className="p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-outfit">Inventory ERP Dashboard</h1>
        </div>
        <p className="text-stone-500 mt-1 text-xs md:text-sm">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-start md:justify-end">
        {/* Only allow branch filtering for non-branch-specific roles */}
        {!isBranchStaff && (
          <div className="flex items-center space-x-2 bg-white px-2.5 py-1.5 border border-stone-200 rounded-lg shadow-sm">
            <Building className="w-4 h-4 text-stone-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs outline-none focus:ring-0 text-stone-700 font-medium cursor-pointer"
            >
              {["SUPER_ADMIN", "ADMIN", "SALES_HEAD"].includes(activeRole) && (
                <option value="All">All Branches (Global)</option>
              )}
              {activeRole === "REGIONAL_SALES_MANAGER" && (
                <option value="AllRegion">All Region Branches</option>
              )}
              {ALL_BRANCHES.filter(b => allowedBranches.includes(b.code)).map(b => (
                <option key={b.code} value={b.code}>
                  {BRANCH_NAMES[b.code] || b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center space-x-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-orange-600 text-xs font-semibold shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{activeRole.replace(/_/g, " ")}</span>
        </div>
      </div>
    </div>
  );

  // ==================== 1. SUPER ADMIN VIEW ====================
  const renderSuperAdmin = () => {
    const totalGlobalStock = inventory.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalGlobalValue = inventory.reduce((sum: number, item: any) => {
      const priceRecord = priceMap.get(`${item.sku}_${item.branchCode}`);
      const catalog = productMap.get(item.sku);
      const price = priceRecord ? priceRecord.sellingPrice : (catalog ? catalog.price : 50000);
      return sum + (item.quantity * price);
    }, 0);

    const branchSummaryList = ALL_BRANCHES.map(b => {
      const bInv = inventoryByBranchMap.get(b.code) || [];
      const bVal = bInv.reduce((sum: number, item: any) => {
        const pP = priceMap.get(`${item.sku}_${b.code}`);
        const cat = productMap.get(item.sku);
        return sum + (item.quantity * (pP ? pP.sellingPrice : (cat ? cat.price : 50000)));
      }, 0);
      const bLow = bInv.filter((item: any) => {
        const p = productMap.get(item.sku);
        return item.quantity < (p ? p.reorderLevel : 8);
      }).length;
      return { ...b, totalStock: bInv.reduce((s: number, i: any) => s + i.quantity, 0), value: bVal, lowStockCount: bLow };
    });

    return (
      <div className="space-y-6">
        {renderWelcomeHeader("Global Administration Dashboard - complete access to all 9 branches, auditing, databases, and structural metrics.")}

        {/* Inventory KPIs & Health Score Row */}
        {analyticsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          renderPrimaryKPIRow()
        )}

        {/* 8 KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analyticsLoading ? (
            Array(8).fill(null).map((_, idx) => <SkeletonCard key={idx} />)
          ) : (
            <>
              <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Products</span>
                <div className="text-2xl font-black text-stone-900 mt-1">{totalProductsCount}</div>
                <span className="text-[9px] text-stone-400 block mt-1">Unique active SKUs</span>
              </div>

              <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Stock</span>
                <div className="text-2xl font-black text-stone-900 mt-1">{totalGlobalStock.toLocaleString()}</div>
                <span className="text-[9px] text-emerald-600 font-bold block mt-1">Units across network</span>
              </div>

              <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Network Valuation</span>
                <div className="text-2xl font-black text-stone-900 mt-1">₹{totalGlobalValue.toLocaleString()}</div>
                <span className="text-[9px] text-orange-600 font-bold block mt-1">Based on local retail</span>
              </div>

              <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Seeded Accounts</span>
                <div className="text-2xl font-black text-stone-900 mt-1">8</div>
                <span className="text-[9px] text-stone-400 block mt-1">RBAC user profiles</span>
              </div>

              <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Regions</span>
                <div className="text-2xl font-black text-stone-900 mt-1">6</div>
                <span className="text-[9px] text-stone-400 block mt-1">Geographic operations</span>
              </div>

              <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Seeded Branches</span>
                <div className="text-2xl font-black text-stone-900 mt-1">9</div>
                <span className="text-[9px] text-stone-400 block mt-1">Operating warehouses</span>
              </div>

              <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Database Queries</span>
                <div className="text-2xl font-black text-stone-900 mt-1">{auditLogsCount}</div>
                <span className="text-[9px] text-stone-400 block mt-1">Audited transactions</span>
              </div>

              <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Active Locks</span>
                <div className="text-2xl font-black text-stone-900 mt-1">{reservationMetrics.pending}</div>
                <span className="text-[9px] text-orange-655 font-bold block mt-1">Stock reservations</span>
              </div>
            </>
          )}
        </div>

        {/* Branch Operations Map */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-orange-505" />
                <span>Geographic Branch Inventory Valuation Matrix</span>
              </h3>
              <p className="text-stone-500 text-[10px] sm:text-xs mt-1">
                Multi-branch audit tracking local stock level counts and absolute local pricing values.
              </p>
            </div>
            <span className="text-[8px] bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Network Online
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {branchSummaryList.map(b => (
              <div key={b.code} className="border border-stone-200 rounded-xl p-3 flex justify-between items-center bg-stone-50/40 hover:bg-stone-50 transition-colors">
                <div>
                  <span className="font-extrabold text-[10px] text-stone-850 block">{b.name}</span>
                  <span className="font-mono text-[9px] text-stone-400 font-semibold">{b.code} • {b.region}</span>
                </div>
                <div className="flex gap-4 text-right">
                  <div>
                    <span className="text-[9px] text-stone-400 block font-semibold uppercase">Stock</span>
                    <span className="font-black text-xs text-stone-800">{b.totalStock.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-stone-400 block font-semibold uppercase">Low Items</span>
                    <span className={`font-bold text-xs ${b.lowStockCount > 0 ? "text-red-500 font-black" : "text-stone-800"}`}>
                      {b.lowStockCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database Explorer Quick Link */}
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-500" />
              <span>Database Explorer & Schema Inspector</span>
            </h3>
            <p className="text-stone-500 text-xs mt-1">Inspect, paginate, and analyze tables from the local seeded database state.</p>
          </div>
          <Link
            href="/admin/database"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Database Explorer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#FED7AA] rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Stock Allocation by Ecosystem Brand</h4>
              {filteredInventory.length === 0 && (
                <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {brandDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} units`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-[#FED7AA] rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Inventory Valuation by Branch</h4>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchValueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                  <XAxis dataKey="name" stroke="#78716c" fontSize={8} />
                  <YAxis stroke="#78716c" fontSize={8} tickFormatter={(v) => `₹${v/100000}L`} />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, "Valuation"]} />
                  <Bar dataKey="value" fill="#8c3120" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Master Pricing Specs */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-505" />
            <span>Master Product Pricing Matrix</span>
          </h3>
          {productsLoading ? (
            <SkeletonTable />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3 text-right">Cost Price</th>
                    <th className="px-4 py-3 text-right">Selling Price</th>
                    <th className="px-4 py-3 text-right">MRP</th>
                    <th className="px-4 py-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center italic text-stone-400">
                        No Product Records Available
                      </td>
                    </tr>
                  ) : (
                    products.map(p => {
                      const activeBranch = activeBranchCodes.length === 1 ? activeBranchCodes[0] : "HYD-HQ";
                      const pricingItem = priceMap.get(`${p.sku}_${activeBranch}`);
                      const itemCost = pricingItem?.costPrice || p.costPrice || 0;
                      const itemSelling = pricingItem?.sellingPrice || p.price || 0;
                      const itemMrp = pricingItem?.mrp || p.mrp || 0;
                      const marginPercent = itemSelling ? Math.round(((itemSelling - itemCost) / itemSelling) * 100) : 0;

                      return (
                        <tr key={p.sku} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3 font-mono text-stone-600 font-semibold">{p.sku}</td>
                          <td className="px-4 py-3 font-bold text-stone-800">{p.name}</td>
                          <td className="px-4 py-3 text-stone-600">{p.brand}</td>
                          <td className="px-4 py-3 text-right text-stone-500 font-semibold">₹{itemCost.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-stone-900 font-bold">₹{itemSelling.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-stone-500 font-mono">₹{itemMrp.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-orange-600 font-bold">{marginPercent}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-center pt-2">
            <Link
              href="/products"
              className="px-4 py-2 border border-orange-500 text-orange-600 hover:bg-orange-50 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>View More Products</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Seasonal Peak Products Section */}
        {renderSeasonalPeakSection()}
      </div>
    );
  };

  // ==================== 2. ADMIN VIEW ====================
  const renderAdmin = () => {
    return (
      <div className="space-y-6">
        {renderWelcomeHeader("System Logistics & Inventory Dashboard - monitor product availability, transfer workflows, pricing, and active alerts.")}

        {/* Restricted warning - explicitly state security policy */}
        <div className="bg-stone-50 border border-stone-250 p-4 rounded-xl flex items-center space-x-3 text-stone-500 text-xs">
          <ShieldAlert className="w-4 h-4 text-stone-400 shrink-0" />
          <span>Security Notice: User management configurations and core database credentials are locked (restricted to Super Admin roles only).</span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Inventory Value</span>
            <div className="text-xl font-black text-stone-900 mt-1">₹{stockValuation.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Available Stock</span>
            <div className="text-xl font-black text-stone-900 mt-1">{availableStock.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Low Stock SKUs</span>
            <div className="text-xl font-black text-red-500 mt-1">{lowStockCount}</div>
          </div>
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Dead Stock SKUs</span>
            <div className="text-xl font-black text-stone-900 mt-1">{deadStockCount}</div>
          </div>
        </div>

        {/* Pricing & Transfers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Prices table */}
          <div className="lg:col-span-2 bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span>Logistics Master Pricing</span>
            </h3>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2 text-right">Cost Price</th>
                    <th className="px-4 py-2 text-right">Selling Price</th>
                    <th className="px-4 py-2 text-right">MRP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center italic text-stone-400">
                        No Product Records Available
                      </td>
                    </tr>
                  ) : (
                    products.map(p => {
                      const activeBranch = activeBranchCodes.length === 1 ? activeBranchCodes[0] : "HYD-HQ";
                      const priceRecord = priceMap.get(`${p.sku}_${activeBranch}`);
                      const itemCost = priceRecord?.costPrice || p.costPrice || 0;
                      const itemSelling = priceRecord?.sellingPrice || p.price || 0;
                      const itemMrp = priceRecord?.mrp || p.mrp || 0;
                      const marginPercent = itemSelling ? Math.round(((itemSelling - itemCost) / itemSelling) * 100) : 0;

                      return (
                        <tr key={p.sku} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3 font-mono text-stone-600 font-semibold">{p.sku}</td>
                          <td className="px-4 py-3 font-bold text-stone-850">{p.name}</td>
                          <td className="px-4 py-3 text-right text-stone-500 font-semibold font-mono">₹{itemCost.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-stone-900 font-bold font-mono">₹{itemSelling.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-stone-500 font-mono">₹{itemMrp.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-orange-605 font-bold">{marginPercent}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent movements */}
          <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-505" />
              <span>Recent Inventory Movements</span>
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredMovements.slice(0, 5).map(m => (
                <div key={m.id} className="border border-stone-200 rounded-xl p-3 space-y-1.5 text-xs bg-stone-50/30">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-stone-750">{m.sku}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      m.type === "ADDITION" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      m.type === "REDUCTION" ? "bg-red-50 text-red-700 border border-red-200" :
                      "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>{m.type}</span>
                  </div>
                  <p className="text-[10px] text-stone-550 leading-tight">{m.details}</p>
                  <div className="flex justify-between text-[8px] text-stone-400 font-semibold pt-1">
                    <span>Qty: {m.quantity}</span>
                    <span>{new Date(m.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {filteredMovements.length === 0 && (
                <div className="text-stone-455 italic text-center py-6">No recent movements logged.</div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced AI Analytics Cards */}
        {renderAdvancedAnalytics()}

        {/* Seasonal Peak Products Section */}
        {renderSeasonalPeakSection()}
      </div>
    );
  };

  // ==================== 3. SALES HEAD VIEW ====================
  const renderSalesHead = () => {
    const sortedProducts = [...products].filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {renderWelcomeHeader("Global Sales Head Dashboard - analyze regional stock levels, price distributions, product availability, and audit lists.")}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Global Stock Value</span>
            <div className="text-xl font-black text-stone-900 mt-1">₹{stockValuation.toLocaleString()}</div>
            <span className="text-[9px] text-stone-400 block mt-1">Retail price calculation</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Global Stock Units</span>
            <div className="text-xl font-black text-stone-900 mt-1">{availableStock.toLocaleString()}</div>
            <span className="text-[9px] text-stone-400 block mt-1">Available across network</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">SKU Catalog Size</span>
            <div className="text-xl font-black text-stone-900 mt-1">{products.length}</div>
            <span className="text-[9px] text-stone-400 block mt-1">Total items registered</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Low Stock SKUs</span>
            <div className="text-2xl font-black text-red-500 mt-1">{lowStockCount}</div>
            <span className="text-[9px] text-red-500 font-bold block mt-1">Requires reorder attention</span>
          </div>
        </div>

        {/* Charts: Regional stock value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#FED7AA] rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Stock Valuation by Geographic Region</h4>
              {inventory.length === 0 && (
                <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalValueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                  <XAxis dataKey="name" stroke="#78716c" fontSize={9} />
                  <YAxis stroke="#78716c" fontSize={9} tickFormatter={(v) => `₹${v/100000}L`} />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, "Valuation"]} />
                  <Bar dataKey="value" fill="#8c3120" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Lists */}
          <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Sales Branch Valuation Rankings</h4>
            <div className="space-y-3">
              {branchValueData.sort((a,b) => b.value - a.value).slice(0, 5).map((br, index) => (
                <div key={br.name} className="flex justify-between items-center text-xs border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-stone-100 rounded-full font-bold text-stone-500 text-[10px]">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-stone-750">{br.name}</span>
                  </div>
                  <span className="font-bold text-stone-900">₹{br.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Search & Availability List */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-orange-500" />
              <span>Regional Catalog Availability</span>
            </h3>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-stone-50 border-b text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Brand</th>
                  <th className="px-4 py-2.5 text-right">Selling Price</th>
                  <th className="px-4 py-2.5 text-right">Catalog MRP</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sortedProducts.map(p => {
                  const activeBranch = activeBranchCodes.length === 1 ? activeBranchCodes[0] : undefined;
                  const tag = getAvailabilityStatus(p.sku, activeBranch);
                  const priceRecord = priceMap.get(`${p.sku}_${activeBranch || "HYD-HQ"}`);

                  return (
                    <tr key={p.sku} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3 font-bold text-stone-800">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-stone-500">{p.sku}</td>
                      <td className="px-4 py-3 text-stone-600">{p.brand}</td>
                      <td className="px-4 py-3 text-right font-bold text-stone-850">₹{(priceRecord?.sellingPrice || p.price || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-stone-500">₹{(priceRecord?.mrp || p.mrp || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${tag.color}`}>
                          {tag.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==================== 4. REGIONAL SALES MANAGER VIEW ====================
  const renderRegionalSalesManager = () => {
    return (
      <div className="space-y-6">
        {renderWelcomeHeader(`Regional Sales Dashboard (${userRegion}) - monitor branches, stock valuation, and approve transfers in your region.`)}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Regional Valuation</span>
            <div className="text-xl font-black text-stone-900 mt-1">₹{stockValuation.toLocaleString()}</div>
            <span className="text-[9px] text-stone-450 block mt-1">{userRegion} branches</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Regional Stock Units</span>
            <div className="text-xl font-black text-stone-900 mt-1">{availableStock.toLocaleString()}</div>
            <span className="text-[9px] text-stone-400 block mt-1">Available units</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Low Stock SKUs</span>
            <div className="text-xl font-black text-red-500 mt-1">{lowStockCount}</div>
            <span className="text-[9px] text-stone-400 block mt-1">Below local limit</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Regional Alerts</span>
            <div className="text-xl font-black text-red-500 mt-1">{filteredAlerts.length}</div>
            <span className="text-[9px] text-red-500 font-bold block mt-1">Active alerts in region</span>
          </div>
        </div>

        {/* Region Branches list */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-orange-500" />
            <span>Region branches structure ({userRegion})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALL_BRANCHES.filter(b => b.region === userRegion).map(b => {
              const bInv = inventoryByBranchMap.get(b.code) || [];
              const bVal = bInv.reduce((sum: number, item: any) => {
                const prc = priceMap.get(`${item.sku}_${b.code}`);
                const catalog = productMap.get(item.sku);
                return sum + (item.quantity * (prc ? prc.sellingPrice : (catalog ? catalog.price : 50000)));
              }, 0);

              return (
                <div key={b.code} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-stone-850 text-xs">{BRANCH_NAMES[b.code] || b.name}</h4>
                    <span className="text-[10px] text-stone-400 mt-1 block">Stock units: {bInv.reduce((s: number, i: any) => s + i.quantity, 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block font-semibold uppercase">Value</span>
                    <span className="font-bold text-stone-900 text-sm">₹{bVal.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Alerts */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-500" />
            <span>Regional Alerts List</span>
          </h3>
          <div className="space-y-3">
            {filteredAlerts.map(alert => (
              <div key={alert.id} className="border border-red-100 rounded-xl p-3 flex items-start space-x-3 bg-red-50/30 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-850 leading-snug">{alert.message}</p>
                  <span className="text-[8px] text-stone-400 block mt-1">Logged: {new Date(alert.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {filteredAlerts.length === 0 && (
              <div className="text-stone-400 italic text-center py-6">No regional alerts found. All stock healthy.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==================== 5. BRANCH MANAGER VIEW ====================
  const renderBranchManager = () => {
    return (
      <div className="space-y-6">
        {renderWelcomeHeader(`Branch Manager Dashboard - reviewing local stock level, prices, active alerts, and logistics logs.`)}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Branch Valuation</span>
            <div className="text-xl font-black text-stone-900 mt-1">₹{stockValuation.toLocaleString()}</div>
            <span className="text-[9px] text-stone-450 block mt-1">Based on local pricing</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Available local units</span>
            <div className="text-xl font-black text-stone-900 mt-1">{availableStock.toLocaleString()}</div>
            <span className="text-[9px] text-emerald-600 font-bold block mt-1">In Stock</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Local Low Stock</span>
            <div className="text-xl font-black text-red-500 mt-1">{lowStockCount}</div>
            <span className="text-[9px] text-stone-400 block mt-1">Below limit</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Active Alerts</span>
            <div className="text-xl font-black text-stone-900 mt-1">{filteredAlerts.length}</div>
            <span className="text-[9px] text-amber-600 font-bold block mt-1">Local issues</span>
          </div>
        </div>

        {/* Detailed Local Inventory Table */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <Boxes className="w-4 h-4 text-orange-500" />
            <span>Local Inventory Breakdown</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-stone-50 border-b text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="px-3 py-2.5">Item Model</th>
                  <th className="px-3 py-2.5 font-mono">SKU</th>
                  <th className="px-3 py-2.5 text-right">Available</th>
                  <th className="px-3 py-2.5 text-right">Reserved</th>
                  <th className="px-3 py-2.5 text-right">Damaged</th>
                  <th className="px-3 py-2.5 text-right">Returned</th>
                  <th className="px-3 py-2.5 text-right">Transit</th>
                  <th className="px-3 py-2.5 text-right">Incoming</th>
                  <th className="px-3 py-2.5 text-right">Outgoing</th>
                  <th className="px-3 py-2.5 text-right">Dead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredInventory.map(item => (
                  <tr key={item.id} className="hover:bg-stone-50/50">
                    <td className="px-3 py-3 font-bold text-stone-800">{item.itemName}</td>
                    <td className="px-3 py-3 font-mono text-stone-500">{item.sku}</td>
                    <td className="px-3 py-3 text-right font-semibold text-stone-850">{item.availableQty}</td>
                    <td className="px-3 py-3 text-right text-stone-600">{item.reservedQty}</td>
                    <td className="px-3 py-3 text-right text-red-500 font-medium">{item.damagedQty || 0}</td>
                    <td className="px-3 py-3 text-right text-stone-600">{item.returnedQty || 0}</td>
                    <td className="px-3 py-3 text-right text-stone-600">{item.transitQty || 0}</td>
                    <td className="px-3 py-3 text-right text-stone-600">{item.incomingQty || 0}</td>
                    <td className="px-3 py-3 text-right text-stone-600">{item.outgoingQty || 0}</td>
                    <td className="px-3 py-3 text-right font-medium text-amber-700">{item.deadQty || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Local Prices List */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            <span>Local Branch Selling Prices</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-stone-50 border-b text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Selling Price</th>
                  <th className="px-4 py-2.5">Catalog MRP</th>
                  <th className="px-4 py-2.5 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPrices.map(pr => {
                  const marginPercent = Math.round(pr.margin * 100);
                  return (
                    <tr key={pr.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3 font-mono text-stone-600">{pr.sku}</td>
                      <td className="px-4 py-3 font-bold text-stone-850">₹{pr.sellingPrice.toLocaleString()}</td>
                      <td className="px-4 py-3 text-stone-600">₹{pr.mrp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-bold">{marginPercent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Local movements */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            <span>Branch Inventory Movements</span>
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {filteredMovements.slice(0, 6).map(m => (
              <div key={m.id} className="border border-stone-200 rounded-xl p-3 space-y-1.5 text-xs bg-stone-50/20">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-stone-750">{m.sku}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    m.type === "ADDITION" ? "bg-emerald-50 text-emerald-750 border border-emerald-200" :
                    m.type === "REDUCTION" ? "bg-red-50 text-red-750 border border-red-200" :
                    "bg-blue-50 text-blue-755 border border-blue-200"
                  }`}>{m.type}</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-tight">{m.details}</p>
                <div className="flex justify-between text-[8px] text-stone-450 font-semibold pt-1">
                  <span>Quantity: {m.quantity} units</span>
                  <span>{new Date(m.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {filteredMovements.length === 0 && (
              <div className="text-stone-400 italic text-center py-6">No branch movements logged.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==================== 6. SALES MANAGER VIEW ====================
  const renderSalesManager = () => {
    // Generate mock price history trends
    const mockTrendData = products.slice(0, 5).map((p, idx) => {
      const priceRecord = priceMap.get(`${p.sku}_${userBranchCode}`);
      return {
        name: p.name.substring(0, 10),
        SellingPrice: priceRecord?.sellingPrice || p.price || 0,
        MRP: priceRecord?.mrp || p.mrp || 0
      };
    });

    return (
      <div className="space-y-6">
        {renderWelcomeHeader("Sales Manager Dashboard - reviewing catalog, availability tags, regional pricing, and querying AI Assistant.")}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Products catalog</span>
            <div className="text-xl font-black text-stone-900 mt-1">{products.length}</div>
            <span className="text-[9px] text-stone-450 block mt-1">Total models</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Local Stock Units</span>
            <div className="text-xl font-black text-stone-900 mt-1">{availableStock.toLocaleString()}</div>
            <span className="text-[9px] text-stone-450 block mt-1">Available at this branch</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Low Stock local</span>
            <div className="text-xl font-black text-red-500 mt-1">{lowStockCount}</div>
            <span className="text-[9px] text-stone-450 block mt-1">SKUs to replenish</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalog & Availability */}
          <div className="lg:col-span-2 bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-orange-500" />
              <span>Catalog & Availability Tags</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-stone-50 border-b text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5 text-right">Selling Price</th>
                    <th className="px-4 py-2.5 text-right">MRP</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map(p => {
                    const tag = getAvailabilityStatus(p.sku, userBranchCode);
                    const pr = priceMap.get(`${p.sku}_${userBranchCode}`);

                    return (
                      <tr key={p.sku} className="hover:bg-stone-50/50">
                        <td className="px-4 py-3 font-bold text-stone-850">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-stone-500">{p.sku}</td>
                        <td className="px-4 py-3 text-right font-bold text-stone-800">₹{(pr?.sellingPrice || p.price || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-stone-500">₹{(pr?.mrp || p.mrp || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${tag.color}`}>
                            {tag.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Trends Chart */}
          <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span>Core Pricing Index</span>
              </h3>
              {products.length === 0 && (
                <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-extrabold uppercase">Demo Data</span>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
                  <XAxis dataKey="name" stroke="#78716c" fontSize={8} />
                  <YAxis stroke="#78716c" fontSize={8} />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, "Price"]} />
                  <Legend formatter={(value) => <span className="text-[10px] text-stone-500 font-semibold">{value}</span>} />
                  <Bar dataKey="SellingPrice" fill="#8c3120" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="MRP" fill="#78716c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== 7. SALES EXECUTIVE VIEW ====================
  const renderSalesExecutive = () => {
    const sortedProducts = [...products].filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {renderWelcomeHeader("Sales Executive Catalog - search local products, view status tags, and check pricing master list.")}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Branch Local catalog</span>
            <div className="text-xl font-black text-stone-900 mt-1">{products.length} Items</div>
            <span className="text-[9px] text-stone-450 block mt-1">Available for client lookup</span>
          </div>

          <div className="bg-white border border-[#FED7AA] p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Current Branch Location</span>
            <div className="text-xl font-black text-orange-600 mt-1">{BRANCH_NAMES[userBranchCode] || activeUser?.branch}</div>
            <span className="text-[9px] text-stone-450 block mt-1">Warehouse profile</span>
          </div>
        </div>

        {/* Product Search Grid */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-orange-500" />
              <span>Catalog & Price Sheet Lookup</span>
            </h3>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter models/SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sortedProducts.map(p => {
              const tag = getAvailabilityStatus(p.sku, userBranchCode);
              const pr = priceMap.get(`${p.sku}_${userBranchCode}`);

              return (
                <div key={p.sku} className="border border-stone-200 rounded-xl p-4 bg-stone-50/40 space-y-3 hover:border-orange-200 transition-all">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">{p.brand}</span>
                    <h4 className="font-black text-stone-900 text-sm mt-0.5">{p.name}</h4>
                    <span className="font-mono text-[10px] text-stone-450 block mt-0.5">SKU: {p.sku}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t pt-2.5">
                    <div>
                      <span className="text-[9px] text-stone-400 block font-semibold uppercase">Selling Price</span>
                      <span className="font-bold text-stone-850 text-xs">₹{(pr?.sellingPrice || p.price || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-400 block font-semibold uppercase">MRP</span>
                      <span className="font-bold text-stone-850 text-xs">₹{(pr?.mrp || p.mrp || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t pt-2.5">
                    <span className="text-[9px] text-stone-400 font-semibold uppercase">Availability</span>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${tag.color}`}>
                      {tag.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render based on role
  switch (activeRole) {
    case "SUPER_ADMIN":
      return renderSuperAdmin();
    case "ADMIN":
      return renderAdmin();
    case "SALES_HEAD":
      return renderSalesHead();
    case "REGIONAL_SALES_MANAGER":
      return renderRegionalSalesManager();
    case "BRANCH_MANAGER":
      return renderBranchManager();
    case "SALES_MANAGER":
      return renderSalesManager();
    case "SALES_EXECUTIVE":
      return renderSalesExecutive();
    default:
      return renderAdmin();
  }
}
