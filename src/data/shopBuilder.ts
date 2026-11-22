import type {
  SupplierLayer,
  SupplierNode,
  SuppliesLink,
  SupplyChainGraph,
} from '../engine/types';
import { getPlaceByCity } from './gazetteer';
import { selectNearestCorridorHub } from './supplyCorridors';

export type ShopCategoryId =
  | 'tea_stall'
  | 'kirana'
  | 'bakery'
  | 'restaurant'
  | 'medical_store'
  | 'hardware_shop'
  | 'sweet_shop'
  | 'cafe'
  | 'electronics'
  | 'garment_shop'
  | 'auto_garage'
  | 'stationery'
  | 'custom';

export type BuilderProductId =
  | 'milk'
  | 'wheat_flour'
  | 'bread'
  | 'lpg'
  | 'sugar'
  | 'tea_powder'
  | 'cooking_oil'
  | 'vegetables'
  | 'medicines'
  | 'packaging'
  | 'butter_ghee'
  | 'spices'
  | 'coffee_beans'
  | 'electrical_parts'
  | 'fabric_thread'
  | 'hardware_tools';

export interface CustomProductSpec {
  id: string;
  label: string;
  group: string;
  defaultStockDays: number;
}

export interface LiveNodeAdjustment {
  nodeId: string;
  name?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  transitDays?: number;
  reliabilityScore?: number;
  onTimeDeliveryPct?: number;
}

export interface ShopCategoryMeta {
  id: ShopCategoryId;
  label: string;
  defaultShopName: string;
  dailyRevenueInr: number;
  dailySalesLostInr: number;
  defaultProducts: BuilderProductId[];
  heroProducts: BuilderProductId[];
  singleSourceProducts?: BuilderProductId[];
  stockDaysOverrides?: Partial<Record<BuilderProductId, number>>;
}

export interface ProductTemplateSpec {
  id: BuilderProductId;
  label: string;
  group: string;
  defaultStockDays: number;
  chainSummary: string;
  layer1Role: string;
  layer1Item: string;
  layer1Desc: string;
  layer1SpendInr: number;
  layer1Importance: number;
  layer1SingleSource: boolean;
  layer2SpendInr: number;
  layer2Importance: number;
  layer2StockDays: number;
  layer3SpendInr: number;
  layer3Importance: number;
  layer3StockDays: number;
  keywords: string[];
}

export interface ShopBuilderConfig {
  shopCategory: ShopCategoryId;
  customCategoryLabel?: string;
  shopName: string;
  shopCity?: string;
  shopState?: string;
  shopLat?: number;
  shopLng?: number;
  selectedProducts: BuilderProductId[];
  customProducts?: CustomProductSpec[];
  stockDaysBySupplierId: Record<string, number>;
  liveNodeAdjustments?: Record<string, LiveNodeAdjustment>;
}

export const QUICK_SHOP_CITIES = [
  'Chennai',
  'Bengaluru',
  'Coimbatore',
  'Hyderabad',
  'Mumbai',
  'Pune',
  'Jaipur',
  'Kochi',
  'Kolkata',
  'Delhi',
  'Ahmedabad',
  'Indore',
] as const;

export const SHOP_CATEGORIES: ShopCategoryMeta[] = [
  {
    id: 'tea_stall',
    label: 'Tea stall',
    defaultShopName: 'My Tea Stall',
    dailyRevenueInr: 11000,
    dailySalesLostInr: 7500,
    defaultProducts: ['milk', 'tea_powder', 'sugar', 'lpg', 'packaging'],
    heroProducts: ['milk', 'tea_powder'],
    stockDaysOverrides: { milk: 1, tea_powder: 3, sugar: 8, lpg: 5, packaging: 9 },
  },
  {
    id: 'bakery',
    label: 'Bakery',
    defaultShopName: 'My Neighbourhood Bakery',
    dailyRevenueInr: 16000,
    dailySalesLostInr: 10500,
    defaultProducts: ['wheat_flour', 'butter_ghee', 'milk', 'bread', 'sugar', 'lpg', 'packaging'],
    heroProducts: ['wheat_flour', 'butter_ghee'],
    singleSourceProducts: ['wheat_flour'],
    stockDaysOverrides: { wheat_flour: 3, butter_ghee: 3, milk: 2, bread: 2, sugar: 7, lpg: 6 },
  },
  {
    id: 'kirana',
    label: 'Kirana store',
    defaultShopName: 'My Kirana Store',
    dailyRevenueInr: 18500,
    dailySalesLostInr: 11000,
    defaultProducts: ['vegetables', 'cooking_oil', 'wheat_flour', 'milk', 'sugar', 'spices', 'packaging'],
    heroProducts: ['vegetables', 'cooking_oil'],
    stockDaysOverrides: { vegetables: 2, cooking_oil: 6, wheat_flour: 5, milk: 1, sugar: 9, spices: 8 },
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    defaultShopName: 'My Tiffin & Meal Hotel',
    dailyRevenueInr: 26000,
    dailySalesLostInr: 16500,
    defaultProducts: ['vegetables', 'cooking_oil', 'milk', 'wheat_flour', 'lpg', 'spices', 'packaging'],
    heroProducts: ['vegetables', 'cooking_oil'],
    singleSourceProducts: ['lpg'],
    stockDaysOverrides: { vegetables: 1, cooking_oil: 5, milk: 2, wheat_flour: 4, lpg: 4, spices: 7 },
  },
  {
    id: 'sweet_shop',
    label: 'Sweets & dairy',
    defaultShopName: 'My Sweet & Dairy Shop',
    dailyRevenueInr: 21000,
    dailySalesLostInr: 13500,
    defaultProducts: ['milk', 'butter_ghee', 'sugar', 'lpg', 'packaging'],
    heroProducts: ['milk', 'butter_ghee'],
    singleSourceProducts: ['milk'],
    stockDaysOverrides: { milk: 1, butter_ghee: 2, sugar: 5, lpg: 6, packaging: 8 },
  },
  {
    id: 'cafe',
    label: 'Cafe & juice bar',
    defaultShopName: 'My Neighbourhood Cafe',
    dailyRevenueInr: 17500,
    dailySalesLostInr: 11200,
    defaultProducts: ['coffee_beans', 'milk', 'sugar', 'bread', 'packaging'],
    heroProducts: ['coffee_beans', 'milk'],
    singleSourceProducts: ['coffee_beans'],
    stockDaysOverrides: { coffee_beans: 4, milk: 1, bread: 2, sugar: 9, packaging: 7 },
  },
  {
    id: 'medical_store',
    label: 'Medical store',
    defaultShopName: 'My Medical Store',
    dailyRevenueInr: 22000,
    dailySalesLostInr: 14000,
    defaultProducts: ['medicines', 'packaging'],
    heroProducts: ['medicines'],
    singleSourceProducts: ['medicines'],
    stockDaysOverrides: { medicines: 5, packaging: 12 },
  },
  {
    id: 'hardware_shop',
    label: 'Hardware shop',
    defaultShopName: 'My Hardware Shop',
    dailyRevenueInr: 24000,
    dailySalesLostInr: 13000,
    defaultProducts: ['hardware_tools', 'electrical_parts', 'packaging'],
    heroProducts: ['hardware_tools', 'electrical_parts'],
    singleSourceProducts: ['hardware_tools'],
    stockDaysOverrides: { hardware_tools: 6, electrical_parts: 7, packaging: 14 },
  },
  {
    id: 'electronics',
    label: 'Electronics & repair',
    defaultShopName: 'My Electronics & Repair',
    dailyRevenueInr: 28000,
    dailySalesLostInr: 15500,
    defaultProducts: ['electrical_parts', 'packaging'],
    heroProducts: ['electrical_parts'],
    singleSourceProducts: ['electrical_parts'],
    stockDaysOverrides: { electrical_parts: 5, packaging: 11 },
  },
  {
    id: 'garment_shop',
    label: 'Garment & tailoring',
    defaultShopName: 'My Boutique & Tailoring',
    dailyRevenueInr: 20000,
    dailySalesLostInr: 12000,
    defaultProducts: ['fabric_thread', 'packaging'],
    heroProducts: ['fabric_thread'],
    singleSourceProducts: ['fabric_thread'],
    stockDaysOverrides: { fabric_thread: 6, packaging: 12 },
  },
  {
    id: 'auto_garage',
    label: 'Auto garage & spares',
    defaultShopName: 'My Auto Spares & Garage',
    dailyRevenueInr: 27000,
    dailySalesLostInr: 15000,
    defaultProducts: ['hardware_tools', 'electrical_parts'],
    heroProducts: ['hardware_tools', 'electrical_parts'],
    singleSourceProducts: ['hardware_tools'],
    stockDaysOverrides: { hardware_tools: 5, electrical_parts: 6 },
  },
  {
    id: 'stationery',
    label: 'Stationery & print',
    defaultShopName: 'My Print & Stationery',
    dailyRevenueInr: 15000,
    dailySalesLostInr: 9500,
    defaultProducts: ['packaging', 'electrical_parts'],
    heroProducts: ['packaging'],
    stockDaysOverrides: { packaging: 5, electrical_parts: 9 },
  },
  {
    id: 'custom',
    label: 'Custom shop',
    defaultShopName: 'My Local Business',
    dailyRevenueInr: 18000,
    dailySalesLostInr: 11500,
    defaultProducts: ['packaging', 'lpg'],
    heroProducts: [],
  },
];

export const PRODUCT_TEMPLATES: ProductTemplateSpec[] = [
  {
    id: 'milk',
    label: 'Milk',
    group: 'milk',
    defaultStockDays: 1,
    chainSummary: 'Local booth -> regional dairy co-op -> cattle feed belt',
    layer1Role: 'Milk & Dairy Booth',
    layer1Item: 'Fresh Daily Milk',
    layer1Desc: 'Delivers fresh milk pouches every morning.',
    layer1SpendInr: 95000,
    layer1Importance: 0.95,
    layer1SingleSource: false,
    layer2SpendInr: 720000,
    layer2Importance: 0.9,
    layer2StockDays: 1,
    layer3SpendInr: 2200000,
    layer3Importance: 0.84,
    layer3StockDays: 3,
    keywords: ['milk', 'dairy', 'paal', 'doodh'],
  },
  {
    id: 'wheat_flour',
    label: 'Wheat flour',
    group: 'flour',
    defaultStockDays: 5,
    chainSummary: 'Flour wholesaler -> regional roller mill -> wheat farm belt',
    layer1Role: 'Atta & Flour Wholesaler',
    layer1Item: 'Wheat Flour Sacks',
    layer1Desc: 'Delivers 50kg sacks of milled wheat flour.',
    layer1SpendInr: 52000,
    layer1Importance: 0.85,
    layer1SingleSource: false,
    layer2SpendInr: 840000,
    layer2Importance: 0.78,
    layer2StockDays: 6,
    layer3SpendInr: 1800000,
    layer3Importance: 0.75,
    layer3StockDays: 8,
    keywords: ['flour', 'wheat', 'atta', 'maida'],
  },
  {
    id: 'bread',
    label: 'Bread & buns',
    group: 'bread',
    defaultStockDays: 2,
    chainSummary: 'Bread van -> flour & yeast mill -> regional grain belt',
    layer1Role: 'Daily Bread & Bun Van',
    layer1Item: 'Fresh Bread & Buns',
    layer1Desc: 'Brings fresh morning loaves and buns every day.',
    layer1SpendInr: 44000,
    layer1Importance: 0.8,
    layer1SingleSource: false,
    layer2SpendInr: 680000,
    layer2Importance: 0.74,
    layer2StockDays: 4,
    layer3SpendInr: 1400000,
    layer3Importance: 0.7,
    layer3StockDays: 6,
    keywords: ['bread', 'bun', 'bakery', 'loaf'],
  },
  {
    id: 'lpg',
    label: 'LPG cylinders',
    group: 'gas',
    defaultStockDays: 6,
    chainSummary: 'Gas agency -> regional bottling plant -> import port terminal',
    layer1Role: 'Commercial LPG Agency',
    layer1Item: '19kg LPG Cylinders',
    layer1Desc: 'Supplies commercial cooking gas cylinders.',
    layer1SpendInr: 36000,
    layer1Importance: 0.78,
    layer1SingleSource: false,
    layer2SpendInr: 1900000,
    layer2Importance: 0.85,
    layer2StockDays: 3,
    layer3SpendInr: 5800000,
    layer3Importance: 0.84,
    layer3StockDays: 4,
    keywords: ['lpg', 'gas', 'cylinder', 'cooking gas'],
  },
  {
    id: 'sugar',
    label: 'Sugar',
    group: 'sugar',
    defaultStockDays: 10,
    chainSummary: 'Wholesale mart -> regional sugar mill -> sugarcane belt',
    layer1Role: 'Wholesale Sugar Mart',
    layer1Item: 'Crystal Sugar Sacks',
    layer1Desc: 'Delivers 50kg sacks of white crystal sugar.',
    layer1SpendInr: 29000,
    layer1Importance: 0.72,
    layer1SingleSource: false,
    layer2SpendInr: 1550000,
    layer2Importance: 0.7,
    layer2StockDays: 7,
    layer3SpendInr: 3600000,
    layer3Importance: 0.68,
    layer3StockDays: 5,
    keywords: ['sugar', 'cheeni'],
  },
  {
    id: 'butter_ghee',
    label: 'Butter & ghee',
    group: 'butter_ghee',
    defaultStockDays: 4,
    chainSummary: 'Dairy dealer -> regional creamery union -> fodder belt',
    layer1Role: 'Butter & Ghee Dealer',
    layer1Item: 'Bakery Butter & Ghee Tins',
    layer1Desc: 'Supplies 15kg cooking butter and pure ghee blocks.',
    layer1SpendInr: 61000,
    layer1Importance: 0.84,
    layer1SingleSource: false,
    layer2SpendInr: 980000,
    layer2Importance: 0.79,
    layer2StockDays: 3,
    layer3SpendInr: 2100000,
    layer3Importance: 0.76,
    layer3StockDays: 4,
    keywords: ['butter', 'ghee', 'cream', 'paneer', 'dairy'],
  },
  {
    id: 'tea_powder',
    label: 'Tea powder',
    group: 'tea',
    defaultStockDays: 4,
    chainSummary: 'Tea agency -> hill tea estate -> fertiliser & port hub',
    layer1Role: 'Tea Leaf & Dust Agency',
    layer1Item: 'CTC Tea Powder',
    layer1Desc: 'Supplies blended tea dust bags every week.',
    layer1SpendInr: 41000,
    layer1Importance: 0.85,
    layer1SingleSource: false,
    layer2SpendInr: 1200000,
    layer2Importance: 0.78,
    layer2StockDays: 5,
    layer3SpendInr: 2400000,
    layer3Importance: 0.72,
    layer3StockDays: 6,
    keywords: ['tea', 'chai', 'dust'],
  },
  {
    id: 'coffee_beans',
    label: 'Coffee beans',
    group: 'coffee',
    defaultStockDays: 7,
    chainSummary: 'Roast trader -> regional coffee roaster -> fertiliser & port',
    layer1Role: 'Coffee Roast Supplier',
    layer1Item: 'Filter & Espresso Beans',
    layer1Desc: 'Supplies roasted coffee powder and beans.',
    layer1SpendInr: 39000,
    layer1Importance: 0.8,
    layer1SingleSource: false,
    layer2SpendInr: 1100000,
    layer2Importance: 0.75,
    layer2StockDays: 6,
    layer3SpendInr: 2100000,
    layer3Importance: 0.7,
    layer3StockDays: 6,
    keywords: ['coffee', 'beans', 'roast'],
  },
  {
    id: 'cooking_oil',
    label: 'Cooking oil',
    group: 'oil',
    defaultStockDays: 8,
    chainSummary: 'Oil wholesaler -> regional refinery -> import port terminal',
    layer1Role: 'Edible Oil Wholesaler',
    layer1Item: '15L Cooking Oil Tins',
    layer1Desc: 'Supplies frying and cooking oil tins.',
    layer1SpendInr: 48000,
    layer1Importance: 0.82,
    layer1SingleSource: false,
    layer2SpendInr: 1950000,
    layer2Importance: 0.8,
    layer2StockDays: 7,
    layer3SpendInr: 5100000,
    layer3Importance: 0.85,
    layer3StockDays: 5,
    keywords: ['oil', 'palm', 'soy', 'mustard', 'cooking'],
  },
  {
    id: 'vegetables',
    label: 'Vegetables',
    group: 'vegetables',
    defaultStockDays: 2,
    chainSummary: 'Daily vendor -> regional APMC mandi -> irrigated farm belt',
    layer1Role: 'Daily Vegetable Vendor',
    layer1Item: 'Fresh Onions, Tomatoes & Greens',
    layer1Desc: 'Delivers fresh daily vegetables at dawn.',
    layer1SpendInr: 55000,
    layer1Importance: 0.88,
    layer1SingleSource: false,
    layer2SpendInr: 950000,
    layer2Importance: 0.84,
    layer2StockDays: 2,
    layer3SpendInr: 2100000,
    layer3Importance: 0.86,
    layer3StockDays: 3,
    keywords: ['vegetables', 'tomato', 'onion', 'greens', 'mandi'],
  },
  {
    id: 'spices',
    label: 'Spices & masala',
    group: 'spices',
    defaultStockDays: 9,
    chainSummary: 'Masala dealer -> regional spice mandi -> chilli & spice belt',
    layer1Role: 'Whole Spice & Masala Dealer',
    layer1Item: 'Chilli, Turmeric & Masala',
    layer1Desc: 'Supplies packed whole spices and ground masala.',
    layer1SpendInr: 34000,
    layer1Importance: 0.76,
    layer1SingleSource: false,
    layer2SpendInr: 820000,
    layer2Importance: 0.72,
    layer2StockDays: 6,
    layer3SpendInr: 1900000,
    layer3Importance: 0.74,
    layer3StockDays: 7,
    keywords: ['spices', 'masala', 'chilli', 'turmeric'],
  },
  {
    id: 'medicines',
    label: 'Medicines',
    group: 'medicines',
    defaultStockDays: 6,
    chainSummary: 'Pharma stockist -> regional depot -> bulk drug API zone',
    layer1Role: 'City Pharma Stockist',
    layer1Item: 'Tablets, Syrups & Strips',
    layer1Desc: 'Restocks daily prescription and fever medicines.',
    layer1SpendInr: 145000,
    layer1Importance: 0.92,
    layer1SingleSource: false,
    layer2SpendInr: 2800000,
    layer2Importance: 0.85,
    layer2StockDays: 8,
    layer3SpendInr: 6200000,
    layer3Importance: 0.88,
    layer3StockDays: 10,
    keywords: ['medicine', 'pharma', 'tablet', 'syrup'],
  },
  {
    id: 'packaging',
    label: 'Packaging & cups',
    group: 'packaging',
    defaultStockDays: 10,
    chainSummary: 'Packaging dealer -> regional paper mill -> pulp/polymer port',
    layer1Role: 'Cups & Parcel Packaging Dealer',
    layer1Item: 'Boxes, Cups & Carry Bags',
    layer1Desc: 'Supplies takeaway boxes, cups, and parcel bags.',
    layer1SpendInr: 22000,
    layer1Importance: 0.68,
    layer1SingleSource: false,
    layer2SpendInr: 1100000,
    layer2Importance: 0.72,
    layer2StockDays: 7,
    layer3SpendInr: 2900000,
    layer3Importance: 0.74,
    layer3StockDays: 8,
    keywords: ['cups', 'packaging', 'paper', 'box', 'parcel'],
  },
  {
    id: 'hardware_tools',
    label: 'Tools & fasteners',
    group: 'hardware',
    defaultStockDays: 8,
    chainSummary: 'Tools dealer -> regional foundry hub -> steel & metal plant',
    layer1Role: 'Tools & Hardware Stockist',
    layer1Item: 'Bolts, Valves & Hand Tools',
    layer1Desc: 'Supplies fasteners, fittings, and repair hardware.',
    layer1SpendInr: 72000,
    layer1Importance: 0.82,
    layer1SingleSource: false,
    layer2SpendInr: 1450000,
    layer2Importance: 0.8,
    layer2StockDays: 7,
    layer3SpendInr: 3900000,
    layer3Importance: 0.78,
    layer3StockDays: 9,
    keywords: ['hardware', 'tools', 'bolts', 'steel', 'spares'],
  },
  {
    id: 'electrical_parts',
    label: 'Electrical & cables',
    group: 'electrical',
    defaultStockDays: 7,
    chainSummary: 'Electrical wholesaler -> industrial hub -> copper/polymer plant',
    layer1Role: 'Electrical & Spares Depot',
    layer1Item: 'Switches, Wire & Adapters',
    layer1Desc: 'Delivers wiring, adapters, and repair components.',
    layer1SpendInr: 68000,
    layer1Importance: 0.84,
    layer1SingleSource: false,
    layer2SpendInr: 1650000,
    layer2Importance: 0.81,
    layer2StockDays: 6,
    layer3SpendInr: 4100000,
    layer3Importance: 0.8,
    layer3StockDays: 8,
    keywords: ['electrical', 'cable', 'wire', 'electronics', 'switch'],
  },
  {
    id: 'fabric_thread',
    label: 'Fabric & thread',
    group: 'fabric',
    defaultStockDays: 8,
    chainSummary: 'Cloth dealer -> regional textile hub -> yarn & polymer plant',
    layer1Role: 'Cloth & Tailoring Wholesaler',
    layer1Item: 'Cotton Fabric & Thread Cones',
    layer1Desc: 'Supplies fabric bolts, linings, and sewing thread.',
    layer1SpendInr: 58000,
    layer1Importance: 0.83,
    layer1SingleSource: false,
    layer2SpendInr: 1350000,
    layer2Importance: 0.78,
    layer2StockDays: 6,
    layer3SpendInr: 3200000,
    layer3Importance: 0.75,
    layer3StockDays: 8,
    keywords: ['fabric', 'cloth', 'thread', 'garment', 'textile'],
  },
];

export function getShopCategoryMeta(id: ShopCategoryId): ShopCategoryMeta {
  return SHOP_CATEGORIES.find((c) => c.id === id) ?? SHOP_CATEGORIES[0];
}

function transitDaysFromKm(km: number): number {
  if (km <= 110) return 1;
  if (km <= 340) return 2;
  if (km <= 700) return 3;
  return 4;
}

export function buildCustomShopGraph(config: ShopBuilderConfig): SupplyChainGraph {
  const category = getShopCategoryMeta(config.shopCategory);
  const categoryLabel =
    config.shopCategory === 'custom' && config.customCategoryLabel?.trim()
      ? config.customCategoryLabel.trim()
      : category.label;

  const requestedCity = (config.shopCity ?? 'Chennai').trim() || 'Chennai';
  const matchedPlace = getPlaceByCity(requestedCity);
  const resolvedCity =
    config.shopLat !== undefined ? requestedCity : (matchedPlace?.name ?? requestedCity);
  const resolvedState =
    config.shopState?.trim() || matchedPlace?.state || 'India';
  const resolvedLat =
    typeof config.shopLat === 'number' && Number.isFinite(config.shopLat)
      ? config.shopLat
      : (matchedPlace?.lat ?? 13.0418);
  const resolvedLng =
    typeof config.shopLng === 'number' && Number.isFinite(config.shopLng)
      ? config.shopLng
      : (matchedPlace?.lng ?? 80.2341);

  const selectedSpecs = PRODUCT_TEMPLATES.filter((p) =>
    config.selectedProducts.includes(p.id),
  );
  const customSpecs: ProductTemplateSpec[] = (config.customProducts ?? []).map((cp) => ({
    id: cp.id as BuilderProductId,
    label: cp.label,
    group: cp.group || cp.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    defaultStockDays: cp.defaultStockDays,
    chainSummary: `${resolvedCity} dealer -> regional processor -> upstream source`,
    layer1Role: `${cp.label} Distributor`,
    layer1Item: cp.label,
    layer1Desc: `Supplies daily stock of ${cp.label.toLowerCase()}.`,
    layer1SpendInr: 62000,
    layer1Importance: 0.9,
    layer1SingleSource: true,
    layer2SpendInr: 1200000,
    layer2Importance: 0.82,
    layer2StockDays: Math.max(2, cp.defaultStockDays + 1),
    layer3SpendInr: 2600000,
    layer3Importance: 0.78,
    layer3StockDays: Math.max(3, cp.defaultStockDays + 2),
    keywords: [cp.label.toLowerCase(), resolvedCity.toLowerCase()],
  }));

  const combinedSpecs = [...selectedSpecs, ...customSpecs];
  const effectiveSpecs =
    combinedSpecs.length > 0
      ? combinedSpecs
      : PRODUCT_TEMPLATES.filter((p) => category.defaultProducts.includes(p.id));

  const suppliers: SupplierNode[] = [];
  const links: SuppliesLink[] = [];
  const adjustments = config.liveNodeAdjustments ?? {};

  effectiveSpecs.forEach((spec, specIdx) => {
    const l1Id = `custom-l1-${spec.id}`;
    const l2Id = `custom-l2-${spec.id}`;
    const l3Id = `custom-l3-${spec.id}`;

    const isHero = category.heroProducts.includes(spec.id) || spec.id.startsWith('custom_');
    const isCatSingleSource =
      category.singleSourceProducts?.includes(spec.id) ?? spec.layer1SingleSource;
    const categoryDefaultStock =
      category.stockDaysOverrides?.[spec.id] ?? spec.defaultStockDays;

    const l1Stock =
      config.stockDaysBySupplierId[l1Id] ?? categoryDefaultStock;
    const l2Stock =
      config.stockDaysBySupplierId[l2Id] ?? spec.layer2StockDays;
    const l3Stock =
      config.stockDaysBySupplierId[l3Id] ?? spec.layer3StockDays;

    const effectiveL1Importance = isHero
      ? Math.min(0.98, Math.max(spec.layer1Importance, 0.92))
      : spec.layer1Importance;

    // Slight radial offset around the user's real city for Layer 1 local distributors
    const angle = (specIdx / Math.max(1, effectiveSpecs.length)) * Math.PI * 2;
    const localOffsetLat = Math.sin(angle) * 0.035;
    const localOffsetLng = Math.cos(angle) * 0.035;

    // Dynamic Layer 2 & Layer 3 resolution around (resolvedLat, resolvedLng, resolvedState)
    const l2Corridor = selectNearestCorridorHub(
      resolvedLat,
      resolvedLng,
      resolvedState,
      spec.group,
      2,
    );
    const l3Corridor = selectNearestCorridorHub(
      l2Corridor.primary.lat,
      l2Corridor.primary.lng,
      l2Corridor.primary.state,
      spec.group,
      3,
      l2Corridor.primary.city,
    );

    const adj1 = adjustments[l1Id];
    const adj2 = adjustments[l2Id];
    const adj3 = adjustments[l3Id];

    const l1City = adj1?.city || resolvedCity;
    const l1State = adj1?.state || resolvedState;
    const l2City = adj2?.city || l2Corridor.primary.city;
    const l2State = adj2?.state || l2Corridor.primary.state;
    const l3City = adj3?.city || l3Corridor.primary.city;
    const l3State = adj3?.state || l3Corridor.primary.state;

    const l2Transit = adj2?.transitDays ?? transitDaysFromKm(l2Corridor.distanceKm);
    const l3Transit = adj3?.transitDays ?? transitDaysFromKm(l3Corridor.distanceKm);

    const makeNode = (params: {
      id: string;
      layer: SupplierLayer;
      name: string;
      itemSupplied: string;
      whatTheySupply: string;
      city: string;
      state: string;
      lat: number;
      lng: number;
      stockDays: number;
      leadTimeDays: number;
      importance: number;
      monthlySpendInr: number;
      isSingleSource: boolean;
      alternateSuppliers: string[];
      verified: boolean;
      discoveredBy: 'user' | 'chain-discovery';
      keywords: string[];
      reliabilityOverride?: number;
      onTimeOverride?: number;
    }): SupplierNode => ({
      id: params.id,
      name: params.name,
      itemSupplied: params.itemSupplied,
      whatTheySupply: params.whatTheySupply,
      group: spec.group,
      layer: params.layer,
      city: params.city,
      state: params.state,
      lat: params.lat,
      lng: params.lng,
      stockDays: params.stockDays,
      leadTimeDays: params.leadTimeDays,
      importance: params.importance,
      monthlySpendInr: params.monthlySpendInr,
      dailyValueInr: Math.round(params.monthlySpendInr / 30),
      alternativesCount: params.isSingleSource ? 0 : params.alternateSuppliers.length,
      alternateSuppliers: params.alternateSuppliers,
      onTimeDeliveryPct:
        params.onTimeOverride ?? (params.isSingleSource ? 86 : 93),
      isSingleSource: params.isSingleSource,
      reliabilityScore:
        params.reliabilityOverride ?? (params.isSingleSource ? 0.81 : 0.89),
      verified: params.verified,
      discoveredBy: params.discoveredBy,
      keywords: Array.from(
        new Set([
          ...params.keywords,
          params.city.toLowerCase(),
          resolvedCity.toLowerCase(),
          spec.group,
        ]),
      ),
    });

    const l1Alternates =
      l2Corridor.alternates.length > 0
        ? l2Corridor.alternates.map((a) => `${a.city} Wholesale Depot`)
        : [`${resolvedCity} Central Market`];

    suppliers.push(
      makeNode({
        id: l1Id,
        layer: 1,
        name: adj1?.name || `${l1City} ${spec.layer1Role}`,
        itemSupplied: spec.layer1Item,
        whatTheySupply: spec.layer1Desc,
        city: l1City,
        state: l1State,
        lat: adj1?.lat ?? resolvedLat + localOffsetLat,
        lng: adj1?.lng ?? resolvedLng + localOffsetLng,
        stockDays: l1Stock,
        leadTimeDays: adj1?.transitDays ?? 1,
        importance: effectiveL1Importance,
        monthlySpendInr: spec.layer1SpendInr,
        isSingleSource: isCatSingleSource,
        alternateSuppliers: l1Alternates,
        verified: true,
        discoveredBy: 'user',
        keywords: spec.keywords,
        reliabilityOverride: adj1?.reliabilityScore,
        onTimeOverride: adj1?.onTimeDeliveryPct,
      }),
      makeNode({
        id: l2Id,
        layer: 2,
        name: adj2?.name || l2Corridor.primary.name,
        itemSupplied: `${spec.label} (Bulk / Processing)`,
        whatTheySupply: l2Corridor.primary.whatTheySupply,
        city: l2City,
        state: l2State,
        lat: adj2?.lat ?? l2Corridor.primary.lat,
        lng: adj2?.lng ?? l2Corridor.primary.lng,
        stockDays: l2Stock,
        leadTimeDays: l2Transit,
        importance: spec.layer2Importance,
        monthlySpendInr: spec.layer2SpendInr,
        isSingleSource: Boolean(l2Corridor.primary.isSingleSource),
        alternateSuppliers: l2Corridor.alternates.map((a) => `${a.name} (${a.city})`),
        verified: true,
        discoveredBy: 'chain-discovery',
        keywords: [...spec.keywords, ...l2Corridor.primary.keywords],
        reliabilityOverride: adj2?.reliabilityScore,
        onTimeOverride: adj2?.onTimeDeliveryPct,
      }),
      makeNode({
        id: l3Id,
        layer: 3,
        name: adj3?.name || l3Corridor.primary.name,
        itemSupplied: `${spec.label} (Upstream Source)`,
        whatTheySupply: l3Corridor.primary.whatTheySupply,
        city: l3City,
        state: l3State,
        lat: adj3?.lat ?? l3Corridor.primary.lat,
        lng: adj3?.lng ?? l3Corridor.primary.lng,
        stockDays: l3Stock,
        leadTimeDays: l3Transit,
        importance: spec.layer3Importance,
        monthlySpendInr: spec.layer3SpendInr,
        isSingleSource: Boolean(l3Corridor.primary.isSingleSource),
        alternateSuppliers: l3Corridor.alternates.map((a) => `${a.name} (${a.city})`),
        verified: true,
        discoveredBy: 'chain-discovery',
        keywords: [...spec.keywords, ...l3Corridor.primary.keywords],
        reliabilityOverride: adj3?.reliabilityScore,
        onTimeOverride: adj3?.onTimeDeliveryPct,
      }),
    );

    links.push(
      {
        id: `cl-1-${spec.id}`,
        fromId: l1Id,
        toId: 'YOU',
        relationship: 'SUPPLIES',
        sharePct: isCatSingleSource ? 100 : 80,
        transitDays: adj1?.transitDays ?? 1,
        substitutable: !isCatSingleSource,
      },
      {
        id: `cl-2-${spec.id}`,
        fromId: l2Id,
        toId: l1Id,
        relationship: 'SUPPLIES',
        sharePct: l2Corridor.primary.isSingleSource ? 100 : 85,
        transitDays: l2Transit,
        substitutable: !l2Corridor.primary.isSingleSource,
      },
      {
        id: `cl-3-${spec.id}`,
        fromId: l3Id,
        toId: l2Id,
        relationship: 'SUPPLIES',
        sharePct: l3Corridor.primary.isSingleSource ? 95 : 75,
        transitDays: l3Transit,
        substitutable: !l3Corridor.primary.isSingleSource,
      },
    );
  });

  return {
    business: {
      id: 'YOU',
      persona: 'shop',
      businessName: config.shopName.trim() || category.defaultShopName,
      businessKind: categoryLabel,
      ownerRole: 'Shop Owner',
      city: resolvedCity,
      state: resolvedState,
      lat: resolvedLat,
      lng: resolvedLng,
      dailyRevenueInr: category.dailyRevenueInr,
      dailySalesLostInr: category.dailySalesLostInr,
      ownStockDays: 1,
      summaryLine: `${categoryLabel} in ${resolvedCity}, ${resolvedState} (${effectiveSpecs.length} chains).`,
    },
    suppliers,
    links,
  };
}
