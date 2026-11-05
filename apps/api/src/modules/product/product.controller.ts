import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";
import { Product, Warehouse, Category, Brand, Unit, TaxSetting } from "@flowos/shared-types";
import { mockWarehousesStore, seedDefaultWarehouses } from "../inventory/inventory.controller.js";

// In-Memory mock storage fallbacks
export const mockProductsStore = new Map<string, Product[]>();
const mockCategoriesStore = new Map<string, Category[]>();
const mockBrandsStore = new Map<string, Brand[]>();
const mockUnitsStore = new Map<string, Unit[]>();
const mockTaxesStore = new Map<string, TaxSetting[]>();

const seedDefaultProducts = (companyId: string): Product[] => {
  const defaults: Omit<Product, "id" | "companyId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "isDeleted">[] = [
    {
      sku: "PROD-STEEL-001",
      barcode: "89010001",
      hsn: "7214",
      name: "TMT Steel Bar Fe550",
      type: "product",
      categoryId: "cat_seed_1",
      brandId: "br_seed_1",
      unitId: "un_seed_1",
      sellingPrice: 58000,
      purchasePrice: 52000,
      taxRate: 18,
      openingStock: 150,
      minStock: 20,
      maxStock: 500,
      batchTracked: true,
      serialTracked: false,
      expiryTracked: false,
      images: []
    },
    {
      sku: "PROD-COMP-KIT",
      barcode: "89010002",
      hsn: "8471",
      name: "Composite Server Assembly Kit",
      type: "composite",
      categoryId: "cat_seed_2",
      brandId: "br_seed_2",
      unitId: "un_seed_2",
      sellingPrice: 120000,
      purchasePrice: 90000,
      taxRate: 18,
      openingStock: 35,
      minStock: 5,
      maxStock: 100,
      batchTracked: false,
      serialTracked: true,
      expiryTracked: false,
      images: []
    }
  ];

  const seeded: Product[] = defaults.map((p, idx) => ({
    id: idx === 1 ? "prod_composite_kit" : `prod_seed_${idx + 1}`,
    ...p,
    companyId,
    createdAt: new Date(),
    createdBy: "system",
    updatedAt: new Date(),
    updatedBy: "system",
    isDeleted: false
  }));

  mockProductsStore.set(companyId, seeded);
  return seeded;
};

const seedLookupDefaults = (companyId: string) => {
  if (!mockCategoriesStore.has(companyId)) {
    mockCategoriesStore.set(companyId, [
      { id: "cat_seed_1", companyId, name: "Construction Materials", description: "Steel, Cement, and raw construction materials", createdAt: new Date(), createdBy: "system", updatedAt: new Date(), updatedBy: "system", isDeleted: false },
      { id: "cat_seed_2", companyId, name: "IT Hardware", description: "Computers, servers, routers, and components", createdAt: new Date(), createdBy: "system", updatedAt: new Date(), updatedBy: "system", isDeleted: false }
    ]);
  }
  if (!mockBrandsStore.has(companyId)) {
    mockBrandsStore.set(companyId, [
      { id: "br_seed_1", companyId, name: "Tata Steel", description: "Premium Tata structural steel and rebars", createdAt: new Date(), createdBy: "system", updatedAt: new Date(), updatedBy: "system", isDeleted: false },
      { id: "br_seed_2", companyId, name: "Cisco Systems", description: "Networking and server solutions", createdAt: new Date(), createdBy: "system", updatedAt: new Date(), updatedBy: "system", isDeleted: false }
    ]);
  }
  if (!mockUnitsStore.has(companyId)) {
    mockUnitsStore.set(companyId, [
      { id: "un_seed_1", companyId, name: "Metric Tons", abbreviation: "MT", createdAt: new Date(), createdBy: "system", updatedAt: new Date(), updatedBy: "system", isDeleted: false },
      { id: "un_seed_2", companyId, name: "Pieces", abbreviation: "pcs", createdAt: new Date(), createdBy: "system", updatedAt: new Date(), updatedBy: "system", isDeleted: false }
    ]);
  }
  if (!mockTaxesStore.has(companyId)) {
    mockTaxesStore.set(companyId, [
      { id: "tx_seed_1", companyId, name: "GST 18%", rate: 18, type: "igst", createdAt: new Date(), createdBy: "system", updatedAt: new Date(), updatedBy: "system", isDeleted: false },
      { id: "tx_seed_2", companyId, name: "GST 28%", rate: 28, type: "igst", createdAt: new Date(), createdBy: "system", updatedAt: new Date(), updatedBy: "system", isDeleted: false }
    ]);
  }
  if (!mockWarehousesStore.has(companyId)) {
    seedDefaultWarehouses(companyId);
  }
};

// ==========================================
// PRODUCTS
// ==========================================
export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let products: Product[] = [];
    try {
      const snapshot = await db.collection("products").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
      products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching products from mock store.");
      if (!mockProductsStore.has(companyId)) {
        seedDefaultProducts(companyId);
      }
      products = (mockProductsStore.get(companyId) || []).filter(p => !p.isDeleted);
    }

    res.json({ success: true, data: products, meta: { total: products.length }, error: null });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let product: Product | null = null;
    try {
      const doc = await db.collection("products").doc(id).get();
      if (doc.exists && doc.data()?.companyId === companyId && !doc.data()?.isDeleted) {
        product = { id: doc.id, ...doc.data() } as Product;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, fetching product from mock store.");
      if (!mockProductsStore.has(companyId)) {
        seedDefaultProducts(companyId);
      }
      const list = mockProductsStore.get(companyId) || [];
      product = list.find(p => p.id === id && !p.isDeleted) || null;
    }

    if (!product) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Product not found." } });
      return;
    }

    res.json({ success: true, data: product, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const newProductData: Omit<Product, "id"> = {
      ...req.body,
      companyId,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
      isDeleted: false,
    };

    let createdProduct: Product;
    try {
      const docRef = await db.collection("products").add(newProductData);
      createdProduct = { id: docRef.id, ...newProductData } as Product;
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, writing product to mock store.");
      const id = "prod_" + Math.random().toString(36).substring(2, 9);
      createdProduct = { id, ...newProductData } as Product;
      const list = mockProductsStore.get(companyId) || [];
      list.push(createdProduct);
      mockProductsStore.set(companyId, list);
    }

    res.status(201).json({ success: true, data: createdProduct, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    const updates = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: userId
    };

    let updatedProduct: Product | null = null;
    try {
      const docRef = db.collection("products").doc(id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.companyId === companyId) {
        await docRef.update(updates);
        const finalDoc = await docRef.get();
        updatedProduct = { id: finalDoc.id, ...finalDoc.data() } as Product;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, updating product in mock store.");
      const list = mockProductsStore.get(companyId) || [];
      const index = list.findIndex(p => p.id === id && !p.isDeleted);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        updatedProduct = list[index];
        mockProductsStore.set(companyId, list);
      }
    }

    if (!updatedProduct) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Product not found or access denied." } });
      return;
    }

    res.json({ success: true, data: updatedProduct, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.uid || "system";
    const { id } = req.params;
    if (!companyId) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
      return;
    }

    let success = false;
    try {
      const docRef = db.collection("products").doc(id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.companyId === companyId) {
        await docRef.update({ isDeleted: true, updatedAt: new Date(), updatedBy: userId });
        success = true;
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, deleting product in mock store.");
      const list = mockProductsStore.get(companyId) || [];
      const index = list.findIndex(p => p.id === id);
      if (index !== -1) {
        list[index].isDeleted = true;
        mockProductsStore.set(companyId, list);
        success = true;
      }
    }

    if (!success) {
      res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Product not found or access denied." } });
      return;
    }

    res.json({ success: true, data: { id, message: "Product deleted successfully." }, meta: null, error: null });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOOKUPS: WAREHOUSES, CATEGORIES, BRANDS, UNITS, TAXES
// ==========================================

const getLookupHelper = <T>(collectionName: string, mockStore: Map<string, T[]>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
        return;
      }
      let items: T[] = [];
      try {
        const snapshot = await db.collection(collectionName).where("companyId", "==", companyId).where("isDeleted", "==", false).get();
        items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      } catch (e) {
        console.warn(`[FlowOS API] Firestore offline, fetching ${collectionName} from mock store.`);
        seedLookupDefaults(companyId);
        items = (mockStore.get(companyId) || []).filter((x: any) => !x.isDeleted);
      }
      res.json({ success: true, data: items, meta: null, error: null });
    } catch (e) {
      next(e);
    }
  };
};

const createLookupHelper = <T>(collectionName: string, mockStore: Map<string, T[]>, prefix: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.uid || "system";
      if (!companyId) {
        res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
        return;
      }
      const data = {
        ...req.body,
        companyId,
        createdAt: new Date(),
        createdBy: userId,
        updatedAt: new Date(),
        updatedBy: userId,
        isDeleted: false,
      };
      let createdItem: any;
      try {
        const docRef = await db.collection(collectionName).add(data);
        createdItem = { id: docRef.id, ...data };
      } catch (e) {
        console.warn(`[FlowOS API] Firestore offline, writing ${collectionName} lookup to mock store.`);
        const id = prefix + "_" + Math.random().toString(36).substring(2, 9);
        createdItem = { id, ...data };
        const list = mockStore.get(companyId) || [];
        list.push(createdItem);
        mockStore.set(companyId, list);
      }
      res.status(201).json({ success: true, data: createdItem, meta: null, error: null });
    } catch (e) {
      next(e);
    }
  };
};

export const getWarehouses = getLookupHelper("warehouses", mockWarehousesStore);
export const createWarehouse = createLookupHelper("warehouses", mockWarehousesStore, "wh");

export const getCategories = getLookupHelper("categories", mockCategoriesStore);
export const createCategory = createLookupHelper("categories", mockCategoriesStore, "cat");

export const getBrands = getLookupHelper("brands", mockBrandsStore);
export const createBrand = createLookupHelper("brands", mockBrandsStore, "br");

export const getUnits = getLookupHelper("units", mockUnitsStore);
export const createUnit = createLookupHelper("units", mockUnitsStore, "un");

export const getTaxes = getLookupHelper("tax_settings", mockTaxesStore);
export const createTax = createLookupHelper("tax_settings", mockTaxesStore, "tx");
