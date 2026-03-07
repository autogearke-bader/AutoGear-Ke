
import { Product, Bundle } from '../types';

const PRODUCTS_KEY = 'autogear_local_products';
const BUNDLES_KEY = 'autogear_local_bundles';
const TRENDING_PRODUCTS_KEY = 'autogear_trending_products';
const VALUE_BUNDLES_KEY = 'autogear_value_bundles';

// Simple sanitization to prevent HTML injection
export const sanitize = (str: string): string => {
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// --- Product Logic ---
export const getLocalProducts = (): Product[] => {
  try {
    const data = localStorage.getItem(PRODUCTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse local products", e);
    return [];
  }
};

export const saveLocalProduct = (product: Product) => {
  const existing = getLocalProducts();
  const sanitizedProduct = {
    ...product,
    name: sanitize(product.name),
    description: sanitize(product.description)
  };
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify([...existing, sanitizedProduct]));
};

export const updateLocalProduct = (updatedProduct: Product) => {
  const existing = getLocalProducts();
  const sanitized = {
    ...updatedProduct,
    name: sanitize(updatedProduct.name),
    description: sanitize(updatedProduct.description)
  };
  const updated = existing.map(p => p.id === updatedProduct.id ? sanitized : p);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
};

export const deleteLocalProduct = (id: string) => {
  const existing = getLocalProducts();
  const filtered = existing.filter(p => p.id !== id);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));
};

// --- Bundle Logic ---
export const getLocalBundles = (): Bundle[] => {
  try {
    const data = localStorage.getItem(BUNDLES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse local bundles", e);
    return [];
  }
};

export const saveLocalBundle = (bundle: Bundle) => {
  const existing = getLocalBundles();
  const sanitized = { ...bundle, name: sanitize(bundle.name) };
  localStorage.setItem(BUNDLES_KEY, JSON.stringify([...existing, sanitized]));
};

export const updateLocalBundle = (updatedBundle: Bundle) => {
  const existing = getLocalBundles();
  const sanitized = { ...updatedBundle, name: sanitize(updatedBundle.name) };
  const updated = existing.map(b => b.id === updatedBundle.id ? sanitized : b);
  localStorage.setItem(BUNDLES_KEY, JSON.stringify(updated));
};

export const deleteLocalBundle = (id: string) => {
  const existing = getLocalBundles();
  const filtered = existing.filter(b => b.id !== id);
  localStorage.setItem(BUNDLES_KEY, JSON.stringify(filtered));
};

// --- Export/Import for "Global" feel without a database ---
export const exportStoreData = () => {
  const data = {
    products: getLocalProducts(),
    bundles: getLocalBundles(),
    trendingProducts: getTrendingProducts(),
    valueBundles: getValueBundles()
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `autogear-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
};

export const importStoreData = (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.products) localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data.products));
    if (data.bundles) localStorage.setItem(BUNDLES_KEY, JSON.stringify(data.bundles));
    if (data.trendingProducts) localStorage.setItem(TRENDING_PRODUCTS_KEY, JSON.stringify(data.trendingProducts));
    if (data.valueBundles) localStorage.setItem(VALUE_BUNDLES_KEY, JSON.stringify(data.valueBundles));
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};

// --- Featured Items Logic ---
export const getTrendingProducts = (): string[] => {
  try {
    const data = localStorage.getItem(TRENDING_PRODUCTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse trending products", e);
    return [];
  }
};

export const setTrendingProducts = (productIds: string[]) => {
  localStorage.setItem(TRENDING_PRODUCTS_KEY, JSON.stringify(productIds));
};

export const getValueBundles = (): string[] => {
  try {
    const data = localStorage.getItem(VALUE_BUNDLES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse value bundles", e);
    return [];
  }
};

export const setValueBundles = (bundleIds: string[]) => {
  localStorage.setItem(VALUE_BUNDLES_KEY, JSON.stringify(bundleIds));
};
