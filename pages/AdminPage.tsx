import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  saveLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
  saveLocalBundle,
  updateLocalBundle,
  deleteLocalBundle,
  getLocalProducts,
  getLocalBundles,
  exportStoreData,
  importStoreData,
  getTrendingProducts,
  setTrendingProducts,
  getValueBundles,
  setValueBundles
} from '../utils/storage.ts';
import { CAR_PRODUCTS, GADGET_PRODUCTS, BUNDLES, API_BASE_URL, BLOG_CATEGORIES, BLOG_BRANDS } from '../constants.ts';
import { Product, Bundle, Article, Category, Brand } from '../types.ts';
import ProductCard from '../components/ProductCard';
import imageCompression from 'browser-image-compression';
import QuillEditor from '../components/QuillEditor';

const SESSION_TIMEOUT = 1 * 60 * 60 * 1000; // 1 hour
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60000; // 1 minute

// Helper for generating unique IDs
const generateUniqueId = (prefix: string = 'local') => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomPart}`;
};

// Helper for generating slugs
const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

/**
 * Development-mode key validation utility
 * Throws an error if duplicate keys are detected in an array
 * Usage: validateKeys(brand.id, brands, 'Brands')
 */
const validateKeys = <T extends { id: number | string }>(
  keyGetter: (item: T) => number | string,
  items: T[],
  context: string
): void => {
  if (process.env.NODE_ENV === 'development') {
    const keys = items.map(keyGetter);
    const seenKeys = new Set<number | string>();
    const duplicates: (number | string)[] = [];
    
    for (const key of keys) {
      if (seenKeys.has(key)) {
        duplicates.push(key);
      }
      seenKeys.add(key);
    }
    
    if (duplicates.length > 0) {
      console.error(`[KeyValidation] Duplicate keys detected in ${context}:`, duplicates);
      throw new Error(`Duplicate keys found in ${context}: ${duplicates.join(', ')}`);
    }
  }
};

// Helper to get article image URL (converts image name to full URL)
const getArticleImageUrl = (imageName: string) => {
  if (!imageName) return 'https://placehold.co/100x100/374151/FFFFFF/png?text=Article';
  if (imageName.startsWith('data:') || imageName.startsWith('http') || imageName.startsWith('blob:')) return imageName;
  // For server-stored article images, use the article-images path (routed to image-handler.php)
  return `${API_BASE_URL.replace('/api', '')}/article-images/${imageName}`;
};

// Helper to get product image URL
const getProductImageUrl = (imageName: string) => {
  if (!imageName) return 'https://placehold.co/100x100/374151/FFFFFF/png?text=Product';
  if (imageName.startsWith('data:') || imageName.startsWith('http') || imageName.startsWith('blob:')) return imageName;
  // For server-stored product images, use the product-images path
  return `${API_BASE_URL.replace('/api', '')}/product-images/${imageName}`;
};

// Helper to convert data URI to Blob (fixes fetch bug for data URIs)
const dataURItoBlob = (dataURI: string): { blob: Blob; mimeType: string; extension: string } | null => {
  // Split the data URI into parts: data:image/jpeg;base64,/9j/4AAQ...
  const parts = dataURI.split(',');
  if (parts.length !== 2) return null;
  
  const mimeMatch = parts[0].match(/data:([^;]+)/);
  if (!mimeMatch) return null;
  
  const mimeType = mimeMatch[1];
  const base64Data = parts[1];
  
  // Decode base64 to binary
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Determine extension from mime type
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };
  const extension = extensionMap[mimeType] || 'jpg';
  
  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType,
    extension
  };
};

// ============================================
// IMAGE COMPRESSION UTILITIES
// ============================================

// Target maximum file size in bytes (200KB)
const MAX_COMPRESSED_SIZE = 200 * 1024; 

// Compress image to target size using browser-image-compression
const compressImage = async (
  file: File | Blob,
  maxSizeMB: number = MAX_COMPRESSED_SIZE / (1024 * 1024),
  maxWidthOrHeight: number = 1920,
  useWebWorker: boolean = true
): Promise<File> => {
  const options = {
    maxSizeMB: maxSizeMB,
    maxWidthOrHeight: maxWidthOrHeight,
    useWebWorker: useWebWorker,
    initialQuality: 0.9,
    alwaysKeepResolution: false,
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    
    // If still too large, try aggressive compression
    if (compressedFile.size > MAX_COMPRESSED_SIZE) {
      const aggressiveOptions = {
        maxSizeMB: MAX_COMPRESSED_SIZE / (1024 * 1024),
        maxWidthOrHeight: 1200, // Reduce dimensions for aggressive compression
        useWebWorker: useWebWorker,
        initialQuality: 0.7,
        alwaysKeepResolution: false,
      };
      return await imageCompression(file, aggressiveOptions);
    }
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    if (file instanceof File) {
      return file;
    }
    return new File([file], 'image.jpg', { type: 'image/jpeg' });
  }
};

// Check if image needs compression based on size
const shouldCompress = (file: File | Blob): boolean => {
  return file.size > MAX_COMPRESSED_SIZE;
};

// Get file size in human readable format
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const articleImageInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null);
  const [activeArticleUploadIndex, setActiveArticleUploadIndex] = useState<number | null>(null);
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // CSRF Token for secure API requests
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const [activeTab, setActiveTab] = useState<'product' | 'bundle' | 'featured' | 'article'>('product');
  const [status, setStatus] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
  
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [localBundles, setLocalBundles] = useState<Bundle[]>([]);
  const [localArticles, setLocalArticles] = useState<Article[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Featured items state
  const [trendingProductIds, setTrendingProductIds] = useState<string[]>([]);
  const [valueBundleIds, setValueBundleIds] = useState<string[]>([]);
  const [featuredArticleIds, setFeaturedArticleIds] = useState<number[]>([]);
  const [featuredCarArticleIds, setFeaturedCarArticleIds] = useState<number[]>([]);
  const [featuredMobileArticleIds, setFeaturedMobileArticleIds] = useState<number[]>([]);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [imageAltTexts, setImageAltTexts] = useState<string[]>(['']);
  const [deletedProductImages, setDeletedProductImages] = useState<string[]>([]);

  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<'car' | 'gadget'>('car');
  const [stockStatus, setStockStatus] = useState<'in-stock' | 'limited' | 'out-of-stock'>('in-stock');
  const [useWhiteBgs, setUseWhiteBgs] = useState<boolean[]>([]);
  const [savings, setSavings] = useState('');
  const [selectedBundleProductNames, setSelectedBundleProductNames] = useState<string[]>([]);
  const [bundleCategory, setBundleCategory] = useState<'car' | 'gadget'>('car');
  const [hasInstallation, setHasInstallation] = useState(false);

  // Video URLs
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  // Article Form Fields
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleExcerpt, setArticleExcerpt] = useState('');
  const [articleImages, setArticleImages] = useState<string[]>(['']);
  const [articleImageAlts, setArticleImageAlts] = useState<string[]>(['']);
  const [articleCategory, setArticleCategory] = useState('');
  const [articleCategoryId, setArticleCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [articleBrand, setArticleBrand] = useState('');
  const [articleBrandIds, setArticleBrandIds] = useState<(string | number)[]>([]);
  const [newBrandNames, setNewBrandNames] = useState<string[]>([]);
  const [newBrandNameInput, setNewBrandNameInput] = useState('');
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbBrands, setDbBrands] = useState<Brand[]>([]);
  const [articleMetaDescription, setArticleMetaDescription] = useState('');
  const [articleKeywords, setArticleKeywords] = useState('');
  const [selectedRelatedProducts, setSelectedRelatedProducts] = useState<string[]>([]);
  const [selectedRelatedBundles, setSelectedRelatedBundles] = useState<string[]>([]);
  const [articleIsPublished, setArticleIsPublished] = useState(true);
  const [articleIsFeaturedHomepage, setArticleIsFeaturedHomepage] = useState(false);
  const [articleIsFeaturedCar, setArticleIsFeaturedCar] = useState(false);
  const [articleIsFeaturedMobile, setArticleIsFeaturedMobile] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);

  // SEO and Meta Tags Management
  useEffect(() => {
    const metaDescription = document.querySelector('meta[name="description"]');
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }

    const prevTitle = document.title;
    const prevDesc = metaDescription?.getAttribute('content');
    const prevKeywords = metaKeywords?.getAttribute('content');
    const prevOgTitle = ogTitle?.getAttribute('content');
    const prevOgDesc = ogDescription?.getAttribute('content');
    const prevOgUrl = ogUrl?.getAttribute('content');
    const prevRobots = metaRobots.getAttribute('content');

    document.title = `Admin Command Center | AutoGear Ke Security Terminal`;
    
    if (metaDescription) metaDescription.setAttribute('content', 'Secure administrative terminal for AutoGear Ke. Manage store inventory, update product listings, and configure sales bundles.');
    if (metaKeywords) metaKeywords.setAttribute('content', 'admin, dashboard, inventory management, autogear admin, nairobi auto shop backend, secure terminal');
    if (ogTitle) ogTitle.setAttribute('content', 'AutoGear Ke | Secure Admin Terminal');
    if (ogDescription) ogDescription.setAttribute('content', 'Access restricted to authorized personnel. Manage inventory and store assets.');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
    metaRobots.setAttribute('content', 'noindex, nofollow');

    return () => {
      document.title = prevTitle;
      if (metaDescription && prevDesc) metaDescription.setAttribute('content', prevDesc);
      if (metaKeywords && prevKeywords) metaKeywords.setAttribute('content', prevKeywords);
      if (ogTitle && prevOgTitle) ogTitle.setAttribute('content', prevOgTitle);
      if (ogDescription && prevOgDesc) ogDescription.setAttribute('content', prevOgDesc);
      if (ogUrl && prevOgUrl) ogUrl.setAttribute('content', prevOgUrl);
      if (metaRobots && prevRobots) metaRobots.setAttribute('content', prevRobots);
      else if (metaRobots) document.head.removeChild(metaRobots);
    };
  }, []);

  const refreshData = async () => {
    try {
      const [productsRes, bundlesRes, featuredRes, articlesRes, categoriesRes, brandsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/get-products.php`),
        fetch(`${API_BASE_URL}/get-bundles.php`),
        fetch(`${API_BASE_URL}/get-featured.php`),
        fetch(`${API_BASE_URL}/get-articles.php`),
        fetch(`${API_BASE_URL}/get-categories.php`),
        fetch(`${API_BASE_URL}/get-brands.php`)
      ]);
      if (productsRes.ok) {
        const products = await productsRes.json();
        setLocalProducts(products);
      }
      if (bundlesRes.ok) {
        const bundles = await bundlesRes.json();
        setLocalBundles(bundles);
      }
      if (featuredRes.ok) {
        const featured = await featuredRes.json();
        setTrendingProductIds(featured.trending || []);
        setValueBundleIds(featured.valueBundles || []);
      }
      if (articlesRes.ok) {
        const articles = await articlesRes.json();
        setLocalArticles(articles);
        // Set featured article IDs based on is_featured fields
        const featuredHomepageIds = articles.filter((a: Article) => a.is_featured_homepage).map((a: Article) => a.id);
        const featuredCarIds = articles.filter((a: Article) => a.is_featured_car).map((a: Article) => a.id);
        const featuredMobileIds = articles.filter((a: Article) => a.is_featured_mobile).map((a: Article) => a.id);
        setFeaturedArticleIds(featuredHomepageIds);
        setFeaturedCarArticleIds(featuredCarIds);
        setFeaturedMobileArticleIds(featuredMobileIds);
      }
      if (categoriesRes.ok) {
        const categories = await categoriesRes.json();
        setDbCategories(categories);
      }
      if (brandsRes.ok) {
        const brands = await brandsRes.json();
        setDbBrands(brands);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Fallback to local
      setLocalProducts(getLocalProducts());
      setLocalBundles(getLocalBundles());
      setTrendingProductIds(getTrendingProducts());
      setValueBundles(getValueBundles());
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setImageUrls(['']);
    setImageAltTexts(['']);
    setYoutubeUrl('');
    setTiktokUrl('');
    setInstagramUrl('');
    setPrice('');
    setSavings('');
    setSelectedBundleProductNames([]);
    setBundleCategory('car');
    setStockStatus('in-stock');
    setUseWhiteBgs([]);

    setDeletedProductImages([]);
    setHasInstallation(false);
  };

  const resetArticleForm = () => {
    setEditingArticleId(null);
    setArticleTitle('');
    setArticleContent('');
    setArticleExcerpt('');
    setArticleImages(['']);
    setArticleImageAlts(['']);
    setArticleCategory('');
    setArticleCategoryId(null);
    setNewCategoryName('');
    setArticleBrand('');
    setArticleBrandIds([]);
    setNewBrandNames([]);
    setNewBrandNameInput('');
    setArticleMetaDescription('');
    setArticleKeywords('');
    setSelectedRelatedProducts([]);
    setSelectedRelatedBundles([]);
    setArticleIsPublished(true);
    setArticleIsFeaturedHomepage(false);
    setArticleIsFeaturedCar(false);
    setArticleIsFeaturedMobile(false);
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setCsrfToken(null);
    sessionStorage.clear();
    setPasswordInput('');
    resetForm();
    navigate('/');
  };

  useEffect(() => {
    const authStatus = sessionStorage.getItem('autogear_admin_auth');
    if (authStatus === 'true') {
      setIsAuthorized(true);
      // Restore CSRF token from session
      const storedCsrfToken = sessionStorage.getItem('autogear_csrf_token');
      if (storedCsrfToken) {
        setCsrfToken(storedCsrfToken);
      }
      refreshData();
    }
  }, []);

  useEffect(() => {
    let timer: number;
    if (isLockedOut && lockoutTimer > 0) {
      timer = window.setInterval(() => setLockoutTimer(prev => prev - 1000), 1000);
    } else if (lockoutTimer <= 0) {
      setIsLockedOut(false);
      setFailedAttempts(0);
    }
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin-login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: passwordInput })
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthorized(true);
        setPasswordInput('');
        setFailedAttempts(0);
        // Store CSRF token securely
        if (data.csrf_token) {
          setCsrfToken(data.csrf_token);
          sessionStorage.setItem('autogear_csrf_token', data.csrf_token);
        }
        sessionStorage.setItem('autogear_admin_auth', 'true');
        sessionStorage.setItem('autogear_admin_login_time', Date.now().toString());
        requestIdleCallback(() => refreshData());
      } else {
        const newFailedCount = failedAttempts + 1;
        setFailedAttempts(newFailedCount);
        setPasswordInput('');
        if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
          setIsLockedOut(true);
          setLockoutTimer(LOCKOUT_DURATION);
        }
      }
    } catch (error) {
      const newFailedCount = failedAttempts + 1;
      setFailedAttempts(newFailedCount);
      setPasswordInput('');
      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        setIsLockedOut(true);
        setLockoutTimer(LOCKOUT_DURATION);
      }
    }
  };

  const allInventory = useMemo(() => {
    const defaultProds = [...CAR_PRODUCTS, ...GADGET_PRODUCTS];
    const defaultBundles = [...BUNDLES];
    const mergedProds = [...defaultProds];
    localProducts.forEach(lp => {
      const idx = mergedProds.findIndex(dp => dp.id === lp.id);
      if (idx > -1) mergedProds[idx] = lp;
      else mergedProds.push(lp);
    });
    const mergedBundles = [...defaultBundles];
    localBundles.forEach(lb => {
      const idx = mergedBundles.findIndex(db => db.id === lb.id);
      if (idx > -1) mergedBundles[idx] = lb;
      else mergedBundles.push(lb);
    });
    return { products: mergedProds, bundles: mergedBundles };
  }, [localProducts, localBundles]);

  const allItems = useMemo(() => [...allInventory.products, ...allInventory.bundles], [allInventory]);

  // Auto-calculation of savings
  useEffect(() => {
    if (activeTab === 'bundle') {
      const sumOfPrices = selectedBundleProductNames.reduce((acc, name) => {
        const prod = allInventory.products.find(p => p.name === name);
        return acc + (prod?.price || 0);
      }, 0);
      const bundlePrice = parseInt(price) || 0;
      if (sumOfPrices > 0) {
        setSavings((sumOfPrices - bundlePrice).toString());
      } else {
        setSavings('0');
      }
    }
  }, [selectedBundleProductNames, price, activeTab, allInventory.products]);

  const handleEdit = (item: any) => {
    resetForm();
    setEditingId(item.id);
    setName(item.name);
    setHasInstallation(item.hasInstallation || false);
    if (item.products) {
      setActiveTab('bundle');
      setPrice(item.totalPrice.toString());
      setSelectedBundleProductNames(item.products);
      setSavings((item.originalPrice - item.totalPrice).toString());
    } else {
       setActiveTab('product');
       setPrice(item.price.toString());
       setDescription(item.description);
       // Transform image objects to URL strings for form state compatibility
       setImageUrls(item.images && item.images.length > 0 ? item.images.map((img: any) => img.url || img.image_name || img) : ['']);
       setImageAltTexts(item.images && item.images.length > 0 ? item.images.map((img: any) => img.alt_text || '') : ['']);
       setCategory(item.category);
       setStockStatus(item.stockStatus || 'in-stock');
       setUseWhiteBgs(item.useWhiteBg && item.useWhiteBg.length === (item.images?.length || 1) ? item.useWhiteBg : Array(item.images?.length || 1).fill(false));
       setYoutubeUrl(item.youtubeUrl || '');
       setTiktokUrl(item.tiktokUrl || '');
       setInstagramUrl(item.instagramUrl || '');
     }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleArticleSelect = (id: number) => {
    setSelectedArticleIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleArticleSelectAll = () => {
    if (selectedArticleIds.length === localArticles.length) {
      setSelectedArticleIds([]);
    } else {
      setSelectedArticleIds(localArticles.map((a: Article) => a.id));
    }
  };

  const toggleSelectAll = () => {
    const deletableIds = allItems
      .filter(item => !CAR_PRODUCTS.some((cp: Product) => cp.id === item.id) && !BUNDLES.some((cb: Bundle) => cb.id === item.id))
      .map(i => i.id);

    if (selectedIds.length === deletableIds.length) setSelectedIds([]);
    else setSelectedIds(deletableIds);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    
    const confirmed = window.confirm(`⚠️ BULK DELETE WARNING\n\nYou are about to delete ${selectedIds.length} items.\n\nThis action CANNOT be undone!`);
    
    if (!confirmed) return;
    
    const userInput = prompt('Type "DELETE ALL" to confirm:');
    if (userInput !== 'DELETE ALL') {
      setStatus({ message: 'Bulk delete cancelled', type: 'error' });
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const deletePromises = selectedIds.map(async id => {
        const item = allItems.find(i => i.id === id);
        const isBundle = !!(item && 'products' in item);
        const endpoint = isBundle ? `${API_BASE_URL}/delete-bundle.php` : `${API_BASE_URL}/delete-product.php`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || ''
          },
          body: JSON.stringify({ id }),
          credentials: 'include'
        });
        return response.json();
      });
      
      await Promise.all(deletePromises);
      setSelectedIds([]);
      await refreshData();
      setStatus({ message: `Successfully deleted ${selectedIds.length} items`, type: 'success' });
    } catch (error) {
      setStatus({ message: 'Error deleting items', type: 'error' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const deleteItem = async (e: React.MouseEvent, item: any, isBundle: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    const itemType = isBundle ? 'bundle' : 'product';
    const confirmed = window.confirm(`⚠️ PERMANENT DELETE WARNING\n\nYou are about to delete: "${item.name}"\n\nThis will also remove:\n• All associated images\n• Featured placements\n• Article references\n\nThis action CANNOT be undone!\n\nType "DELETE" to confirm:`);
    
    if (!confirmed) return;
    
    const userInput = prompt('Type "DELETE" to confirm:');
    if (userInput !== 'DELETE') {
      setStatus({ message: 'Delete cancelled - confirmation did not match', type: 'error' });
      setTimeout(() => setStatus(null), 5000);
      return;
    }
    
    setIsDeleting(true);
    
    // Ensure ID is valid for server-side deletion
    if (!item.id || (typeof item.id === 'string' && item.id.startsWith('local-'))) {
       // It's a local-only item, just remove it locally
       setStatus({ 
          message: `${itemType === 'bundle' ? 'Bundle' : 'Product'} removed from local listing`, 
          type: 'success' 
        });
        if (isBundle) deleteLocalBundle(item.id);
        else deleteLocalProduct(item.id);
        setIsDeleting(false);
        setTimeout(() => setStatus(null), 3000);
        return;
    }

    const endpoint = isBundle ? `${API_BASE_URL}/delete-bundle.php` : `${API_BASE_URL}/delete-product.php`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || ''
        },
        body: JSON.stringify({ id: item.id }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus({ 
          message: `✅ ${itemType === 'bundle' ? 'Bundle' : 'Product'} "${item.name}" deleted successfully`, 
          type: 'success' 
        });
        
        // Remove from local state
        if (isBundle) {
          deleteLocalBundle(item.id);
        } else {
          deleteLocalProduct(item.id);
        }
        
        // Refresh data from server
        await refreshData();
        
        // Reset form if editing the deleted item
        if (editingId === item.id) {
          resetForm();
        }
      } else {
        setStatus({ message: data.message || `Error deleting ${itemType}`, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: `Network error while deleting ${itemType}`, type: 'error' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  // Delete article function with comprehensive cleanup
  const deleteArticle = async (e: React.MouseEvent, article: Article) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmed = window.confirm(`⚠️ PERMANENT ARTICLE DELETE WARNING\n\nYou are about to delete: "${article.title}"\n\nThis will also remove:\n• Featured image from filesystem\n• Featured placements across all pages\n• All article content and metadata\n\nThis action CANNOT be undone!\n\nType "DELETE" to confirm:`);
    
    if (!confirmed) return;
    
    const userInput = prompt('Type "DELETE" to confirm:');
    if (userInput !== 'DELETE') {
      setStatus({ message: 'Delete cancelled - confirmation did not match', type: 'error' });
      setTimeout(() => setStatus(null), 5000);
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/delete-article.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus({ 
          message: `✅ Article "${article.title}" deleted successfully`, 
          type: 'success' 
        });
        
        // Refresh data from server
        await refreshData();
        
        // Reset form if editing the deleted article
        if (editingArticleId === article.id) {
          resetArticleForm();
        }
      } else {
        setStatus({ message: data.message || 'Error deleting article', type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Network error while deleting article', type: 'error' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  // Bulk delete articles
  const handleBulkArticleDelete = async () => {
    if (!selectedArticleIds.length) return;
    
    const confirmed = window.confirm(`⚠️ BULK DELETE WARNING\n\nYou are about to delete ${selectedArticleIds.length} articles.\n\nThis action CANNOT be undone!`);
    
    if (!confirmed) return;
    
    const userInput = prompt('Type "DELETE ALL" to confirm:');
    if (userInput !== 'DELETE ALL') {
      setStatus({ message: 'Bulk delete cancelled', type: 'error' });
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const deletePromises = selectedArticleIds.map(async (id) => {
        const article = localArticles.find((a: Article) => a.id === id);
        if (!article) return null;
        
        const response = await fetch(`${API_BASE_URL}/delete-article.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
          credentials: 'include'
        });
        return response.json();
      });
      
      await Promise.all(deletePromises);
      setSelectedArticleIds([]);
      await refreshData();
      setStatus({ message: `Successfully deleted ${selectedArticleIds.length} articles`, type: 'success' });
    } catch (error) {
      setStatus({ message: 'Error deleting articles', type: 'error' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeUploadIndex === null) return;
    
    try {
      // Compress image if needed (target: 200KB max)
      let processedFile = file;
      if (shouldCompress(file)) {
        console.log(`[ImageUpload] Compressing image: ${formatFileSize(file.size)} -> target: 200KB`);
        processedFile = await compressImage(file);
        console.log(`[ImageUpload] Compressed to: ${formatFileSize(processedFile.size)}`);
      }
      
      // Create local preview immediately using URL.createObjectURL
      const localPreviewUrl = URL.createObjectURL(processedFile);
      const newUrls = [...imageUrls];
      newUrls[activeUploadIndex] = localPreviewUrl;
      setImageUrls(newUrls);
      setActiveUploadIndex(null);
      
    } catch (error) {
      console.error('Error processing image:', error);
      // Fallback to original behavior
      const localPreviewUrl = URL.createObjectURL(file);
      const newUrls = [...imageUrls];
      newUrls[activeUploadIndex] = localPreviewUrl;
      setImageUrls(newUrls);
      setActiveUploadIndex(null);
    }
  };

  // Article image upload with live preview using URL.createObjectURL and compression
  const handleArticleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image if needed (target: 200KB max)
      let processedFile = file;
      if (shouldCompress(file)) {
        console.log(`[ArticleImageUpload] Compressing image: ${formatFileSize(file.size)} -> target: 200KB`);
        processedFile = await compressImage(file);
        console.log(`[ArticleImageUpload] Compressed to: ${formatFileSize(processedFile.size)}`);
      }
      
      // Create local preview immediately using URL.createObjectURL
      const localPreviewUrl = URL.createObjectURL(processedFile);
      const newUrls = [...articleImages];
      newUrls[index] = localPreviewUrl;
      setArticleImages(newUrls);
    } catch (error) {
      console.error('Error processing article image:', error);
      // Fallback to original behavior
      const localPreviewUrl = URL.createObjectURL(file);
      const newUrls = [...articleImages];
      newUrls[index] = localPreviewUrl;
      setArticleImages(newUrls);
    }
  };

  // Handle image URL paste with compression
  const handleImageUrlPaste = async (url: string, isArticle: boolean, index: number): Promise<void> => {
    try {
      console.log(`[ImageUrlPaste] Processing image URL: ${url}`);
      
      // For blob: URLs, use directly
      if (url.startsWith('blob:')) {
        if (isArticle) {
          const newUrls = [...articleImages];
          newUrls[index] = url;
          setArticleImages(newUrls);
        } else {
          const newUrls = [...imageUrls];
          newUrls[index] = url;
          setImageUrls(newUrls);
        }
        return;
      }
      
      // Try to fetch and compress the image
try {
  console.log(`[ImageUrlPaste] Fetching image from URL: ${url}`);
  
  // Use backend proxy to avoid CSP issues
  const proxyUrl = `${API_BASE_URL}/fetch-image.php?url=${encodeURIComponent(url)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  const response = await fetch(proxyUrl, { 
    method: 'GET',
    credentials: 'include',
    signal: controller.signal 
  });
  clearTimeout(timeoutId);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch image');
  }
  
  // Convert base64 back to blob for compression
  const base64Response = await fetch(data.data);
  const blob = await base64Response.blob();
  console.log(`[ImageUrlPaste] Fetched: ${formatFileSize(blob.size)}`);
  
  // Compress if needed
  let processedBlob = blob;
  if (shouldCompress(blob)) {
    console.log(`[ImageUrlPaste] Compressing: ${formatFileSize(blob.size)} -> target: 200KB`);
    processedBlob = await compressImage(blob);
    console.log(`[ImageUrlPaste] Compressed to: ${formatFileSize(processedBlob.size)}`);
  }
  
  // Create preview URL
  const previewUrl = URL.createObjectURL(processedBlob);
  
  if (isArticle) {
    const newUrls = [...articleImages];
    newUrls[index] = previewUrl;
    setArticleImages(newUrls);
  } else {
    const newUrls = [...imageUrls];
    newUrls[index] = previewUrl;
    setImageUrls(newUrls);
  }
} catch (fetchError: any) {
  // If fetch fails (CSP, CORS, network issues), use the URL directly
  console.warn(`[ImageUrlPaste] Could not fetch image, using URL directly: ${fetchError.message}`);
  
  if (isArticle) {
    const newUrls = [...articleImages];
    newUrls[index] = url;
    setArticleImages(newUrls);
  } else {
    const newUrls = [...imageUrls];
    newUrls[index] = url;
    setImageUrls(newUrls);
  }
}
      
    } catch (error: any) {
      console.error('Error processing pasted image URL:', error);
      // Fallback: use original URL
      if (isArticle) {
        const newUrls = [...articleImages];
        newUrls[index] = url;
        setArticleImages(newUrls);
      } else {
        const newUrls = [...imageUrls];
        newUrls[index] = url;
        setImageUrls(newUrls);
      }
    }
  };

  const uploadImages = async (productId: string, productName: string): Promise<string[]> => {
    // Early return if no valid images to upload
    const validUrls = imageUrls.filter(url => url && url.trim() !== '');
    if (validUrls.length === 0) {
      console.log('[UploadImages] No images to upload, returning empty array');
      return [];
    }

    const uploadPromises: Promise<any>[] = [];
    const imageIndexMap: number[] = []; // Track which image index each promise corresponds to
    
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const altText = imageAltTexts[i] || productName;
      const useWhiteBg = useWhiteBgs[i] || false;
      if (!url || !url.toString().trim()) continue;

      // Skip if it's already a server image name (not base64, http, or blob)
      if (!url.startsWith('data:') && !url.startsWith('http') && !url.startsWith('blob:')) {
        imageIndexMap.push(i);
        uploadPromises.push(Promise.resolve({ image_name: url, alt_text: altText, success: true }));
        continue;
      }

      // Use FormData for file upload
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('productName', productName);
      formData.append('altText', altText);
      formData.append('useWhiteBg', useWhiteBg ? '1' : '0');
      formData.append('type', 'product');

      if (url.startsWith('blob:')) {
        try {
          // Fetch the blob URL and compress if not already compressed
          const blob = await fetch(url).then(r => r.blob());
          
          // Compress blob if needed (ensure 200KB max)
          let fileToUpload = blob;
          if (shouldCompress(blob)) {
            console.log(`[UploadImages] Compressing blob: ${formatFileSize(blob.size)} -> target: 200KB`);
            fileToUpload = await compressImage(blob);
            console.log(`[UploadImages] Compressed to: ${formatFileSize(fileToUpload.size)}`);
          }
          
          // Determine file extension from blob type
          const mimeType = fileToUpload.type || 'image/jpeg';
          const extension = mimeType.split('/')[1] || 'jpg';
          formData.append('image', fileToUpload, `image.${extension}`);
        } catch (error) {
          console.error(`[UploadImages] Error fetching blob for upload at index ${i}:`, error);
          continue;
        }
      } else if (url.startsWith('data:')) {
        const blobData = dataURItoBlob(url);
        if (blobData) {
          // Compress if needed
          let fileToUpload = blobData.blob;
          if (shouldCompress(blobData.blob)) {
            console.log(`[UploadImages] Compressing base64: ${formatFileSize(blobData.blob.size)} -> target: 200KB`);
            fileToUpload = await compressImage(blobData.blob);
            console.log(`[UploadImages] Compressed to: ${formatFileSize(fileToUpload.size)}`);
          }
          formData.append('image', fileToUpload, `image.${blobData.extension}`);
        } else {
           // Fallback to base64 string if conversion fails
           formData.append('base64', url);
        }
      } else {
        formData.append('imageUrl', url);
      }

      imageIndexMap.push(i);
      uploadPromises.push(
        fetch(`${API_BASE_URL}/upload.php`, {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || ''
          },
          body: formData,
          credentials: 'include'
        }).then(async res => {
          if (res.ok) {
            const data = await res.json();
            console.log(`[UploadImages] Upload SUCCESS for image ${i}:`, data);
            return { ...data, success: true, index: i };
          } else {
            const errorText = await res.text();
            console.error(`[UploadImages] Upload FAILED for image ${i}:`, {
              status: res.status,
              statusText: res.statusText,
              error: errorText
            });
            return { success: false, index: i, error: errorText };
          }
        }).catch(err => {
          console.error(`[UploadImages] Network ERROR for image ${i}:`, err);
          return { success: false, index: i, error: err.message };
        })
      );
    }
    
    const results = await Promise.all(uploadPromises);
    
    // Filter out failed uploads and log them
    const successfulUploads = results.filter(r => {
      if (!r || !r.success) {
        console.warn(`[UploadImages] Skipping failed upload at index ${r?.index}:`, r?.error);
        return false;
      }
      if (!r.image_name || r.image_name.startsWith('blob:')) {
        console.warn(`[UploadImages] Skipping invalid image_name at index ${r?.index}:`, r.image_name);
        return false;
      }
      return true;
    });
    
    console.log(`[UploadImages] Successfully uploaded ${successfulUploads.length} out of ${results.length} images`);
    
    return successfulUploads.map(r => r.image_name);
  };

  // Upload article images through server (uses same upload.php as products)
  const uploadArticleImages = async (articleId: number, articleTitle: string, images: string[], alts: string[]): Promise<string[]> => {
    const uploadPromises: Promise<any>[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      if (!url || !url.toString().trim()) continue;

      // Skip if it's already a server image name (not base64, http, or blob)
      if (!url.startsWith('data:') && !url.startsWith('http') && !url.startsWith('blob:')) {
        uploadPromises.push(Promise.resolve({ image_name: url, alt_text: alts[i] || articleTitle }));
        continue;
      }

      // Use FormData for file upload
      const formData = new FormData();
      formData.append('articleId', articleId.toString());
      formData.append('productName', articleTitle); // upload.php expects productName or articleTitle
      formData.append('altText', alts[i] || articleTitle);
      formData.append('type', 'article');

      if (url.startsWith('blob:')) {
        try {
          // Fetch the blob URL and compress if not already compressed
          const blob = await fetch(url).then(r => r.blob());
          
          // Compress blob if needed (ensure 200KB max)
          let fileToUpload = blob;
          if (shouldCompress(blob)) {
            console.log(`[UploadArticleImages] Compressing blob: ${formatFileSize(blob.size)} -> target: 200KB`);
            fileToUpload = await compressImage(blob);
            console.log(`[UploadArticleImages] Compressed to: ${formatFileSize(fileToUpload.size)}`);
          }
          
          // Determine file extension from blob type
          const mimeType = fileToUpload.type || 'image/jpeg';
          const extension = mimeType.split('/')[1] || 'jpg';
          formData.append('image', fileToUpload, `article-image.${extension}`);
        } catch (error) {
          console.error('Error fetching blob for upload:', error);
          continue;
        }
      } else if (url.startsWith('data:')) {
         const blobData = dataURItoBlob(url);
         if (blobData) {
           // Compress if needed
           let fileToUpload = blobData.blob;
           if (shouldCompress(blobData.blob)) {
             console.log(`[UploadArticleImages] Compressing base64: ${formatFileSize(blobData.blob.size)} -> target: 200KB`);
             fileToUpload = await compressImage(blobData.blob);
             console.log(`[UploadArticleImages] Compressed to: ${formatFileSize(fileToUpload.size)}`);
           }
           const mimeType = fileToUpload.type || blobData.mimeType;
           const extension = mimeType.split('/')[1] || blobData.extension;
           formData.append('image', fileToUpload, `article-image.${extension}`);
         } else {
            formData.append('base64', url);
         }
      } else {
        formData.append('imageUrl', url);
      }

      uploadPromises.push(
        fetch(`${API_BASE_URL}/upload.php`, {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || ''
          },
          body: formData,
          credentials: 'include'
        }).then(res => res.ok ? res.json() : null)
      );
    }
    
    const results = await Promise.all(uploadPromises);
    return results.filter(r => r && r.image_name).map(r => r.image_name);
  };

  // Toggle brand selection in Article Creator
  const toggleArticleBrand = (brandId: string | number) => {
    setArticleBrandIds(prev =>
      prev.includes(brandId)
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  // Add a new brand via API and add to dbBrands + auto-select
  const addNewBrand = async () => {
    const trimmedName = newBrandNameInput.trim();
    if (!trimmedName) return;
    // Prevent duplicates in the pending new brand names list
    if (newBrandNames.includes(trimmedName)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/add-brand.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
        body: JSON.stringify({ name: trimmedName }),
        credentials: 'include'
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          const brandName = result.name || trimmedName;
          const brandSlug = result.slug || trimmedName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-|-$/g, '');
          const brandId = typeof result.id === 'number' ? result.id : parseInt(result.id);
          // Add to dbBrands if not already there
          setDbBrands((prev: Brand[]) => {
            const exists = prev.some((b: Brand) => b.id === brandId);
            if (exists) return prev;
            return [...prev, { id: brandId, name: brandName, slug: brandSlug }];
          });
          // Auto-select the newly added brand
          setArticleBrandIds(prev => prev.includes(brandId) ? prev : [...prev, brandId]);
          setNewBrandNameInput('');
          setStatus({ message: `Brand "${brandName}" added and selected`, type: 'success' });
          setTimeout(() => setStatus(null), 3000);
        } else {
          setStatus({ message: result.error || 'Failed to add brand', type: 'error' });
          setTimeout(() => setStatus(null), 3000);
        }
      } else {
        const errData = await res.json().catch(() => ({ error: 'Server error' }));
        setStatus({ message: errData.error || 'Failed to add brand', type: 'error' });
        setTimeout(() => setStatus(null), 3000);
      }
    } catch (err) {
      console.error('Error adding brand:', err);
      setStatus({ message: 'Network error adding brand', type: 'error' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // Remove a brand from the pending new brand names list
  const removeNewBrand = (name: string) => {
    setNewBrandNames(prev => prev.filter(n => n !== name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (activeTab === 'featured') {
        const res = await fetch(`${API_BASE_URL}/update-featured.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
          body: JSON.stringify({ trending: trendingProductIds, valueBundles: valueBundleIds }),
          credentials: 'include'
        });
        if (res.ok) {
          setStatus({ message: 'Featured items updated successfully', type: 'success' });
          setTrendingProducts(trendingProductIds);
          setValueBundles(valueBundleIds);
        } else {
          setStatus({ message: 'Error updating featured items', type: 'error' });
        }
        setTimeout(() => setStatus(null), 3000);
      } else if (activeTab === 'article') {
        // Save article with image upload handling
        const validImages = articleImages.filter(url => url.trim() !== '');
        const validAlts = articleImageAlts.filter((_, idx) => articleImages[idx]?.trim() !== '');
        
        let articleId = editingArticleId;
        let featuredImageName = '';
        
        // First, create/update the article to get an ID (if new)
        const articleData = {
          title: articleTitle.trim(),
          featuredImage: '', // Will be set after upload
          content: articleContent,
          excerpt: articleExcerpt.trim(),
          metaDescription: articleMetaDescription.trim(),
          seoKeywords: articleKeywords.trim(),
          category: articleCategory,
          categoryId: articleCategoryId,
          brands: articleBrandIds,
          brandNames: newBrandNames,
          relatedProducts: selectedRelatedProducts,
          relatedBundles: selectedRelatedBundles,
          isPublished: articleIsPublished,
          isFeaturedHomepage: articleIsFeaturedHomepage,
          isFeaturedCar: articleIsFeaturedCar,
          isFeaturedMobile: articleIsFeaturedMobile
        };

        let res;
        if (editingArticleId) {
          res = await fetch(`${API_BASE_URL}/update-article.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
            body: JSON.stringify({ id: editingArticleId, ...articleData }),
            credentials: 'include'
          });
        } else {
          res = await fetch(`${API_BASE_URL}/add-article.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
            body: JSON.stringify(articleData),
            credentials: 'include'
          });
        }

        if (res.ok) {
          const result = await res.json();
          articleId = result.id;
          
          // Validate articleId is a valid number
          if (typeof articleId !== 'number' || !Number.isFinite(articleId)) {
            setStatus({ message: 'Error: Invalid article ID received', type: 'error' });
            setTimeout(() => setStatus(null), 3000);
            return;
          }
          
          // Auto-select newly created category if one was created
          if (result.category && result.category.id) {
            setArticleCategory(result.category.name);
            setArticleCategoryId(result.category.id);
            // Also add to dbCategories for future use (avoid duplicates)
            setDbCategories(prev => {
              const exists = prev.some(cat => cat.id === result.category.id);
              if (exists) return prev;
              return [...prev, { id: result.category.id, name: result.category.name, slug: result.category.slug }];
            });
          }
          
          // Now upload article images through server
          if (validImages.length > 0) {
            const uploadedImageNames = await uploadArticleImages(articleId, articleTitle.trim(), validImages, validAlts);
            if (uploadedImageNames.length > 0) {
              featuredImageName = uploadedImageNames[0];
              const galleryString = uploadedImageNames.map((name, i) => {
                const alt = validAlts[i] || articleTitle.trim();
                return `${name}|||${alt}`;
              }).join(';;;');

              // Update article with featured image name and gallery string
              await fetch(`${API_BASE_URL}/update-article.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
                body: JSON.stringify({ 
                  id: articleId, 
                  featuredImage: featuredImageName,
                  images: galleryString,
                  title: articleTitle.trim(),
                  content: articleContent,
                  excerpt: articleExcerpt.trim(),
                  metaDescription: articleMetaDescription.trim(),
                  seoKeywords: articleKeywords.trim(),
                  category: articleCategory,
                  categoryId: articleCategoryId,
                  brands: articleBrandIds,
                  brandNames: newBrandNames,
                  relatedProducts: selectedRelatedProducts,
                  relatedBundles: selectedRelatedBundles,
                  isPublished: articleIsPublished,
                  isFeaturedHomepage: articleIsFeaturedHomepage,
                  isFeaturedCar: articleIsFeaturedCar,
                  isFeaturedMobile: articleIsFeaturedMobile
                }),
                credentials: 'include'
              });
           }
          }
          // Clean up blob URLs to prevent memory leaks
          validImages.forEach(url => {
            if (url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
          
          setStatus({ message: `Article "${articleTitle}" saved successfully`, type: 'success' });
          await refreshData(); // Refresh to get server image paths
          resetArticleForm();
        } else {
          const error = await res.json();
          setStatus({ message: error.error || 'Error saving article', type: 'error' });
        }
        setTimeout(() => setStatus(null), 3000);
      } else if (activeTab === 'product') {
        // Save product with image upload handling (same pattern as articles)
        const validImages = imageUrls.filter(url => url.trim() !== '');
        
        // First, create/update the product to get an ID (if new)
        const productData: any = {
          slug: generateSlug(name.trim()),
          name: name.trim(),
          description: description.trim(),
          images: [], // Will be set after upload (same as article featuredImage)
          price: parseInt(price),
          category: category,
          stockStatus,
          hasInstallation: hasInstallation,
          isNew: !editingId,
          youtubeUrl: youtubeUrl.trim() || undefined,
          tiktokUrl: tiktokUrl.trim() || undefined,
          instagramUrl: instagramUrl.trim() || undefined,
          videoUrl: '',
          useWhiteBg: useWhiteBgs,
        };

        console.log('[ProductSave] Product data prepared:', {
          name: productData.name,
          pendingImageCount: validImages.length
        });

        let res;
        let productIdToUse: string | number | null = editingId;

        if (editingId) {
          // Update product first
          res = await fetch(`${API_BASE_URL}/update-product.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
            body: JSON.stringify({ id: editingId, ...productData, deletedImages: deletedProductImages }),
            credentials: 'include'
          });
        } else {
          // Add product first to get ID
          res = await fetch(`${API_BASE_URL}/add-product.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
            body: JSON.stringify(productData),
            credentials: 'include'
          });
        }

        if (res.ok) {
          const result = await res.json();
          console.log('[ProductSave] Server response:', result);
          
          productIdToUse = result.id || editingId;
          
          // Convert to number and validate
          const numericId = typeof productIdToUse === 'string' ? parseInt(productIdToUse, 10) : productIdToUse;
          
          if (!numericId || isNaN(numericId) || numericId < 1) {
            console.error('[ProductSave] Invalid product ID:', { productIdToUse, numericId, result });
            setStatus({ message: 'Error: Invalid product ID received from server', type: 'error' });
            setTimeout(() => setStatus(null), 3000);
            return;
          }
          
          productIdToUse = numericId;
          console.log('[ProductSave] Product created/updated with ID:', productIdToUse);
          
          // Now upload product images through server (same pattern as articles)
          if (validImages.length > 0) {
            console.log('[ProductSave] Starting image upload for', validImages.length, 'images');
            
            try {
              const uploadedImageNames = await uploadImages(String(productIdToUse), name.trim());
              console.log('[ProductSave] Upload completed. Result:', uploadedImageNames);
              
              if (uploadedImageNames && uploadedImageNames.length > 0) {
                console.log('[ProductSave] Successfully uploaded', uploadedImageNames.length, 'images:', uploadedImageNames);
                
                // Update product with uploaded image filenames
                const updateResponse = await fetch(`${API_BASE_URL}/update-product.php`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json', 
                    'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' 
                  },
                  body: JSON.stringify({ 
                    id: productIdToUse, 
                    images: uploadedImageNames
                  }),
                  credentials: 'include'
                });
                
                if (updateResponse.ok) {
                  console.log('[ProductSave] Successfully linked', uploadedImageNames.length, 'images to product');
                  setStatus({ message: `Product "${name}" saved with ${uploadedImageNames.length} image(s)`, type: 'success' });
                } else {
                  const updateError = await updateResponse.text();
                  console.error('[ProductSave] Failed to link images:', updateError);
                  setStatus({ message: 'Product saved but failed to link images', type: 'warning' });
                }
              } else {
                console.warn('[ProductSave] No images were uploaded');
                setStatus({ message: 'Product saved but no images uploaded', type: 'warning' });
              }
            } catch (uploadError) {
              console.error('[ProductSave] Error during image upload:', uploadError);
              setStatus({ message: 'Product saved but image upload failed', type: 'warning' });
            }
          } else {
            console.log('[ProductSave] No images to upload');
            setStatus({ message: `Product "${name}" saved successfully`, type: 'success' });
          }
          
          // Clean up blob URLs to prevent memory leaks
          validImages.forEach(url => {
            if (url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
          
          setTimeout(() => setStatus(null), 3000);
          await refreshData();
          resetForm();
        } else {
          const error = await res.json();
          setStatus({ message: error.error || 'Error saving product', type: 'error' });
        }
      } else {
        const sumOfOriginalPrices = selectedBundleProductNames.reduce((acc, pName) => {
          const prod = allInventory.products.find(p => p.name === pName);
          return acc + (prod?.price || 0);
        }, 0);

        const bundleData = {
          name: name.trim(),
          products: selectedBundleProductNames,
          totalPrice: parseInt(price),
          originalPrice: sumOfOriginalPrices,
          category: bundleCategory,
          hasInstallation: hasInstallation,
        };
        let res;
        if (editingId) {
          res = await fetch(`${API_BASE_URL}/update-bundle.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
            body: JSON.stringify({ id: editingId, ...bundleData }),
            credentials: 'include'
          });
        } else {
          res = await fetch(`${API_BASE_URL}/add-bundle.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
            body: JSON.stringify(bundleData),
            credentials: 'include'
          });
        }
        if (res.ok) {
          const result = await res.json();
          setStatus({ message: `Bundle saved`, type: 'success' });
          resetForm();
          refreshData();
        } else {
          const error = await res.json();
          setStatus({ message: error.error || 'Error saving bundle', type: 'error' });
        }
      }
    } catch (err) {
      setStatus({ message: "Error saving data.", type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const toggleBundleProduct = (productName: string) => {
    setSelectedBundleProductNames(prev => 
      prev.includes(productName) 
        ? prev.filter(n => n !== productName) 
        : [...prev, productName]
    );
  };

  const toggleRelatedProduct = (productId: string) => {
    setSelectedRelatedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleRelatedBundle = (bundleId: string) => {
    setSelectedRelatedBundles(prev =>
      prev.includes(bundleId)
        ? prev.filter(id => id !== bundleId)
        : [...prev, bundleId]
    );
  };


  const previewProduct: Product = useMemo(() => ({
    id: editingId || 'preview',
    slug: generateSlug(name || 'live-preview'),
    name: name || 'Live Preview',
    description: description || 'No description yet...',
    price: parseInt(price) || 0,
    images: imageUrls.filter(u => u.trim() !== '').length > 0 
      ? imageUrls.filter(u => u.trim() !== '').map(url => ({ image_name: url, alt_text: name || 'Product image' })) 
      : [{ image_name: 'https://placehold.co/800x600/374151/FFFFFF/png?text=No+Image', alt_text: 'No image available' }],
    hasInstallation: hasInstallation,
    category,
    stockStatus,
    useWhiteBg: useWhiteBgs,
    youtubeUrl,
    tiktokUrl,
    instagramUrl
  }), [name, description, price, imageUrls, hasInstallation, category, stockStatus, useWhiteBgs, youtubeUrl, tiktokUrl, instagramUrl, editingId]);

  const getStockBadgeClass = (status: string) => {
    switch(status) {
      case 'in-stock': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'limited': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'out-of-stock': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-800 text-slate-500 border-slate-700';
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-300" style={{ width: `${(failedAttempts / MAX_FAILED_ATTEMPTS) * 100}%` }}></div>
          <h2 className="text-2xl font-black text-white uppercase mb-8 tracking-tighter">Admin Gateway</h2>
          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-4">Access Key</label>
              <input id="admin-password" name="adminPassword" type="password" required disabled={isLockedOut} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder={isLockedOut ? "Access Terminated" : "••••••••"} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white text-center text-xl outline-none focus:border-blue-600 transition-all" aria-label="Admin password" />
            </div>
            <button type="submit" disabled={isLockedOut} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white font-black py-5 rounded-2xl uppercase tracking-[0.4em] text-[11px] transition-all shadow-xl shadow-blue-900/20 active:scale-95">
              {isLockedOut ? `Locked (${Math.ceil(lockoutTimer/1000)}s)` : 'Unlock Terminal'}
            </button>
          </form>
          <div className="mt-8">
            <Link to="/" className="text-slate-600 hover:text-slate-400 text-[10px] font-black uppercase tracking-widest transition-colors">&larr; Return to Store</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto px-6 py-6">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" title="Upload product image file" />
      <input type="file" ref={importInputRef} onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (importStoreData(ev.target?.result as string)) {
              setStatus({ message: "Store Restored", type: 'success' });
              refreshData();
            }
          };
          reader.readAsText(file);
        }
      } } accept=".json" className="hidden" title="Import store data from JSON file" />
      <input type="file" ref={articleImageInputRef} onChange={e => activeArticleUploadIndex !== null && handleArticleImageUpload(e, activeArticleUploadIndex)} accept="image/*" className="hidden" title="Upload article featured image" />

      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Command Center</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Editing Authorized
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => exportStoreData()} title="Download backup of all store data" className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all">Download Backup</button>
          <button onClick={() => importInputRef.current?.click()} title="Restore store data from a JSON backup file" className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all">Restore Data</button>
          <button onClick={handleLogout} title="Log out from admin terminal" className="text-red-500 font-black text-[10px] uppercase tracking-widest ml-4 hover:underline">Log Out</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          {status && (
            <div className={`mb-6 p-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] animate-in fade-in slide-in-from-top-4 ${
              status.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : status.type === 'warning'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {isDeleting && (
                <svg className="inline-block w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {status.message}
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl mb-12">
            <div className="flex border-b border-slate-800 flex-wrap">
              <button onClick={() => { setActiveTab('product'); resetForm(); } } className={`flex-1 py-6 font-black text-[11px] uppercase tracking-[0.2em] transition-all ${activeTab === 'product' ? 'text-blue-500 bg-slate-950/40 border-b-2 border-blue-600' : 'text-slate-600'}`}>Product Editor</button>
              <button onClick={() => { setActiveTab('bundle'); resetForm(); } } className={`flex-1 py-6 font-black text-[11px] uppercase tracking-[0.2em] transition-all ${activeTab === 'bundle' ? 'text-blue-500 bg-slate-950/40 border-b-2 border-blue-600' : 'text-slate-600'}`}>Bundle Manager</button>
              <button onClick={() => { setActiveTab('featured'); resetForm(); } } className={`flex-1 py-6 font-black text-[11px] uppercase tracking-[0.2em] transition-all ${activeTab === 'featured' ? 'text-blue-500 bg-slate-950/40 border-b-2 border-blue-600' : 'text-slate-600'}`}>Featured Items</button>
              <button onClick={() => { setActiveTab('article'); resetArticleForm(); } } className={`flex-1 py-6 font-black text-[11px] uppercase tracking-[0.2em] transition-all ${activeTab === 'article' ? 'text-blue-500 bg-slate-950/40 border-b-2 border-blue-600' : 'text-slate-600'}`}>Article Creator</button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${editingId ? 'bg-amber-500' : 'bg-blue-600'}`}></span>
                  <h2 className="text-white font-black text-xs uppercase tracking-[0.2em]">
                    {activeTab === 'article' 
                      ? (editingArticleId ? 'Updating Article' : 'Create New Article')
                      : (editingId ? 'Updating Existing Entry' : 'Creating New Entry')}
                  </h2>
                </div>
                {!editingId && activeTab !== 'article' && <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">ID: Auto-Generated</span>}
                {editingId && activeTab !== 'article' && <button type="button" onClick={resetForm} className="text-blue-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors">Switch to New Entry &rarr;</button>}
              </div>

              {(() => {
                if (activeTab === 'article') return (
                  <div className="space-y-8">
                    {/* Article Title */}
                    <div className="space-y-2">
                      <label htmlFor="article-title" className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Article Title</label>
                      <input id="article-title" name="articleTitle" required value={articleTitle} onChange={e => setArticleTitle(e.target.value)} placeholder="Enter article title..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" aria-label="Article title" />
                    </div>

                    {/* Featured Images */}
                    <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Featured Images (Auto-compressed to 200KB)</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {articleImages.map((url, idx) => (
                          <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 group">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Slot #{idx + 1}</span>
                              <button type="button" onClick={() => {
                                const n = [...articleImages]; n.splice(idx, 1); setArticleImages(n.length ? n : ['']);
                                const a = [...articleImageAlts]; a.splice(idx, 1); setArticleImageAlts(a.length ? a : ['']);
                              } } className="text-red-500 hover:text-white transition-colors" title="Remove image slot">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <input id={`article-image-url-${idx}`} name={`articleImageUrl-${idx}`} value={url} onChange={e => {
                              const n = [...articleImages]; n[idx] = e.target.value; setArticleImages(n);
                            }} onPaste={async (e) => {
                              const pasteData = e.clipboardData.getData('text');
                              // Check if pasted content is an image URL
                              if (pasteData.startsWith('http') && (pasteData.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i) || pasteData.includes('images') || pasteData.includes('img') || pasteData.includes('cdn'))) {
                                e.preventDefault();
                                console.log(`[ArticleImagePaste] Detected image URL: ${pasteData}`);
                                await handleImageUrlPaste(pasteData, true, idx);
                              }
                            }} placeholder="Paste image link here..." className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-[10px] font-mono outline-none focus:border-blue-500 transition-all" aria-label={`Article image URL ${idx + 1}`} />
                            <input id={`article-image-alt-${idx}`} name={`articleImageAlt-${idx}`} value={articleImageAlts[idx] || ''} onChange={e => {
                              const a = [...articleImageAlts]; a[idx] = e.target.value; setArticleImageAlts(a);
                            } } placeholder="Alt text (optional, defaults to article title)" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-[10px] font-mono outline-none focus:border-blue-500 transition-all" />
                            <button type="button" onClick={() => { setActiveArticleUploadIndex(idx); articleImageInputRef.current?.click(); } } className="w-full bg-slate-800 hover:bg-blue-600 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Upload New File</button>
                            {url && (
                              <div className="relative">
                                <img src={url.startsWith('data:') || url.startsWith('http') ? url : getArticleImageUrl(url)} alt={`Featured ${idx + 1}`} className="w-full h-24 object-cover rounded-xl mt-2" onError={(e) => {(e.target as HTMLImageElement).src = 'https://placehold.co/400x200/374151/FFFFFF/png?text=No+Image';}} />
                              </div>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => { setArticleImages([...articleImages, '']); setArticleImageAlts([...articleImageAlts, '']); } } title="Add another image slot" className="border-2 border-dashed border-slate-800 hover:border-blue-600 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-600 hover:text-blue-500 transition-all group">
                          <span className="text-2xl mb-1 group-hover:scale-125 transition-transform">+</span>
                          <span className="text-[9px] font-black uppercase tracking-widest">Add Image Slot</span>
                        </button>
                      </div>
                    </div>

                    {/* Category and Brand */}
                    <div className="space-y-8">
                      {/* Category Selection with New Category Input */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Category</label>
                          <select 
                            id="article-category"
                            name="articleCategory"
                            required 
                            value={articleCategory} 
                            onChange={e => {
                              const val = e.target.value;
                              setArticleCategory(val);
                              // Find ID if it exists in DB categories
                              const existing = dbCategories.find(c => c.name === val);
                              setArticleCategoryId(existing ? existing.id : null);
                              setNewCategoryName('');
                            }} 
                            title="Select article category" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 appearance-none"
                          >
                            <option value="">Select Category</option>
                            {dbCategories.length > 0 ? (
                              dbCategories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))
                            ) : (
                              BLOG_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))
                            )}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Or Add New Category</label>
                          <div className="flex gap-2">
                            <input 
                              id="new-category-name"
                              name="newCategoryName"
                              value={newCategoryName} 
                              onChange={e => setNewCategoryName(e.target.value)}
                              placeholder="Enter new category name..." 
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" 
                              aria-label="New category name"
                            />
                            <button 
                              type="button"
                              onClick={async () => {
                                const trimmedName = newCategoryName.trim();
                                if (!trimmedName) return;
                                try {
                                  const res = await fetch(`${API_BASE_URL}/add-category.php`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken || sessionStorage.getItem('autogear_csrf_token') || '' },
                                    body: JSON.stringify({ name: trimmedName }),
                                    credentials: 'include'
                                  });
                                  if (res.ok) {
                                    const result = await res.json();
                                    if (result.success) {
                                      // Add to dbCategories if not already there
                                      const catName = result.name || trimmedName;
                                      const catSlug = result.slug || trimmedName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-|-$/g, '');
                                      const catId = typeof result.id === 'number' ? result.id : parseInt(result.id);
                                      setDbCategories((prev: Category[]) => {
                                        const exists = prev.some((cat: Category) => cat.id === catId);
                                        if (exists) return prev;
                                        return [...prev, { id: catId, name: catName, slug: catSlug }];
                                      });
                                      // Select the newly created/found category
                                      setArticleCategory(catName);
                                      setArticleCategoryId(catId);
                                      setNewCategoryName('');
                                      setStatus({ message: `Category "${catName}" added and selected`, type: 'success' });
                                      setTimeout(() => setStatus(null), 3000);
                                    } else {
                                      setStatus({ message: result.error || 'Failed to add category', type: 'error' });
                                      setTimeout(() => setStatus(null), 3000);
                                    }
                                  } else {
                                    const errData = await res.json().catch(() => ({ error: 'Server error' }));
                                    setStatus({ message: errData.error || 'Failed to add category', type: 'error' });
                                    setTimeout(() => setStatus(null), 3000);
                                  }
                                } catch (err) {
                                  console.error('Error adding category:', err);
                                  setStatus({ message: 'Network error adding category', type: 'error' });
                                  setTimeout(() => setStatus(null), 3000);
                                }
                              }}
                              disabled={!newCategoryName.trim()}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Brand Selection with Checkboxes and New Brand Input */}
                      <div className="space-y-4">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Brands (for filtering - select multiple)</label>
                        
                        {/* Existing Brands Checkboxes */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar border border-slate-800 bg-slate-950/50 p-4 rounded-2xl">
                          {(dbBrands.length > 0 ? dbBrands : BLOG_BRANDS.filter(b => b !== 'All').map(b => ({ id: b, name: b, slug: b.toLowerCase() }))).map((brand, index) => {
                            // Generate a unique composite key to prevent duplicate key errors
                            // Using type prefix ('db-' or 'blog-') + id + index ensures uniqueness
                            const sourcePrefix = dbBrands.length > 0 ? 'db' : 'blog';
                            const uniqueKey = `${sourcePrefix}-${brand.id}-${index}`;
                            return (
                              <button
                                key={uniqueKey}
                                type="button"
                                onClick={() => toggleArticleBrand(brand.id)}
                                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${articleBrandIds.includes(brand.id) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${articleBrandIds.includes(brand.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                                  {articleBrandIds.includes(brand.id) && (
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                  )}
                                </div>
                                <span className={`text-[10px] font-bold ${articleBrandIds.includes(brand.id) ? 'text-blue-400' : 'text-slate-300'}`}>{brand.name}</span>
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* New Brand Input */}
                        <div className="flex gap-2">
                          <input 
                            id="new-brand-name"
                            name="newBrandName"
                            value={newBrandNameInput} 
                            onChange={e => setNewBrandNameInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addNewBrand())}
                            placeholder="Enter new brand name..." 
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" 
                            aria-label="New brand name"
                          />
                          <button 
                            type="button"
                            onClick={addNewBrand}
                            disabled={!newBrandNameInput.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Add Brand
                          </button>
                        </div>
                        
                        {/* New Brands List */}
                        {newBrandNames.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {newBrandNames.map(name => (
                              <span key={name} className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">
                                {name}
                                <button type="button" onClick={() => removeNewBrand(name)} aria-label={`Remove brand ${name}`} title={`Remove ${name}`} className="hover:text-white">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {articleBrandIds.length > 0 && (
                          <p className="text-blue-400 text-[10px] font-bold">{articleBrandIds.length} brands selected</p>
                        )}
                      </div>
                    </div>

                    {/* Excerpt */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Excerpt (Short Description)</label>
                      <textarea id="article-excerpt" name="articleExcerpt" value={articleExcerpt} onChange={e => setArticleExcerpt(e.target.value)} placeholder="Brief description for article card preview..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white h-24 resize-none outline-none focus:border-blue-500 transition-all" />
                    </div>

                    {/* Rich Text Editor */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Article Content</label>
                      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                        <QuillEditor value={articleContent} onChange={setArticleContent} className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden" />
                      </div>
                    </div>

                    {/* SEO Fields */}
                    <div className="pt-8 border-t border-slate-800">
                      <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">SEO & Metadata</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Meta Description</label>
                          <textarea id="article-meta-description" name="articleMetaDescription" value={articleMetaDescription} onChange={e => setArticleMetaDescription(e.target.value)} placeholder="SEO meta description (150-160 characters)..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white h-24 resize-none outline-none focus:border-blue-500 transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">SEO Keywords</label>
                          <textarea id="article-seo-keywords" name="articleKeywords" value={articleKeywords} onChange={e => setArticleKeywords(e.target.value)} placeholder="car accessories, smart tech, Kenya..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white h-24 resize-none outline-none focus:border-blue-500 transition-all" />
                        </div>
                      </div>
                    </div>

                    {/* Related Products Selection */}
                    <div className="pt-8 border-t border-slate-800">
                      <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">Link Related Products</h3>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Select Products to Display at Bottom of Article</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar border border-slate-800 bg-slate-950/50 p-4 rounded-2xl">
                          {allInventory.products.map(prod => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => toggleRelatedProduct(prod.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedRelatedProducts.includes(prod.id) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedRelatedProducts.includes(prod.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                                {selectedRelatedProducts.includes(prod.id) && (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                )}
                              </div>
                              <div className="overflow-hidden">
                                <p className={`text-[11px] font-bold truncate ${selectedRelatedProducts.includes(prod.id) ? 'text-blue-400' : 'text-slate-300'}`}>{prod.name}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        {selectedRelatedProducts.length > 0 && (
                          <p className="text-blue-400 text-[10px] font-bold">{selectedRelatedProducts.length} products selected</p>
                        )}
                      </div>
                    </div>

                    {/* Related Bundles Selection */}
                    <div className="pt-8 border-t border-slate-800">
                      <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">Link Related Bundles</h3>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Select Bundles to Display at Bottom of Article</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar border border-slate-800 bg-slate-950/50 p-4 rounded-2xl">
                          {allInventory.bundles.map(bundle => (
                            <button
                              key={bundle.id}
                              type="button"
                              onClick={() => toggleRelatedBundle(bundle.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedRelatedBundles.includes(bundle.id) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedRelatedBundles.includes(bundle.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                                {selectedRelatedBundles.includes(bundle.id) && (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                )}
                              </div>
                              <div className="overflow-hidden">
                                <p className={`text-[11px] font-bold truncate ${selectedRelatedBundles.includes(bundle.id) ? 'text-blue-400' : 'text-slate-300'}`}>{bundle.name}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        {selectedRelatedBundles.length > 0 && (
                          <p className="text-blue-400 text-[10px] font-bold">{selectedRelatedBundles.length} bundles selected</p>
                        )}
                      </div>
                    </div>

                    {/* Publish Toggle */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        <input type="checkbox" checked={articleIsPublished} onChange={e => setArticleIsPublished(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900" />
                        Publish Immediately (Uncheck to save as draft)
                      </label>
                    </div>

                    {/* Featured Blog Visibility Controls */}
                    <div className="pt-6 border-t border-slate-800">
                      <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-4">Featured Blog Placement</h3>
                      
                      {/* Master "Show in all pages" checkbox */}
                      <div className="mb-4">
                        <label className="flex items-center gap-2 text-[10px] text-blue-400 font-black uppercase tracking-widest cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={articleIsFeaturedHomepage && articleIsFeaturedCar && articleIsFeaturedMobile}
                            onChange={e => {
                              const checked = e.target.checked;
                              setArticleIsFeaturedHomepage(checked);
                              setArticleIsFeaturedCar(checked);
                              setArticleIsFeaturedMobile(checked);
                            }}
                            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-blue-600 focus:ring-offset-slate-900" 
                          />
                          Show in ALL pages (Master Control)
                        </label>
                        <p className="text-slate-600 text-[9px] ml-6 mt-1">Enable to show this article on Homepage, Car Accessories, and Mobile Accessories pages</p>
                      </div>

                      {/* Individual page checkboxes */}
                      <div className="space-y-3 ml-6">
                        <label className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={articleIsFeaturedHomepage}
                            onChange={e => setArticleIsFeaturedHomepage(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-blue-600 focus:ring-offset-slate-900" 
                          />
                          Homepage - "Latest Insights" section
                        </label>
                        <label className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={articleIsFeaturedCar}
                            onChange={e => setArticleIsFeaturedCar(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-blue-600 focus:ring-offset-slate-900" 
                          />
                          Car Accessories Page - "AutoGear Drive Guides"
                        </label>
                        <label className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={articleIsFeaturedMobile}
                            onChange={e => setArticleIsFeaturedMobile(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-blue-600 focus:ring-offset-slate-900" 
                          />
                          Mobile Accessories Page - "Tech & Charging Tips"
                        </label>
                      </div>
                    </div>
                  </div>
                );
                if (activeTab === 'product') return (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Public Product Name</label>
                        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Enter product name" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Price in KSh</label>
                        <input required type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Enter price in KSh" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Sales Copy / Description</label>
                      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                        <QuillEditor value={description} onChange={setDescription} className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Gallery Assets (Direct URL Edit)</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {imageUrls.map((url, idx) => (
                          <div key={idx} className={`p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 group transition-colors ${useWhiteBgs[idx] ? 'bg-white' : 'bg-slate-950'}`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-black uppercase tracking-widest ${useWhiteBgs[idx] ? 'text-slate-400' : 'text-slate-600'}`}>Slot #{idx + 1}</span>
                              <button type="button" onClick={() => {
                                const n = [...imageUrls]; 
                                const removed = n.splice(idx, 1)[0];
                                setImageUrls(n.length ? n : ['']);
                                
                                const a = [...imageAltTexts]; 
                                a.splice(idx, 1); 
                                setImageAltTexts(a.length ? a : ['']);

                                const w = [...useWhiteBgs];
                                w.splice(idx, 1);
                                setUseWhiteBgs(w);

                                if (removed && !removed.startsWith('data:') && !removed.startsWith('blob:')) {
                                  setDeletedProductImages(prev => [...prev, removed]);
                                }
                              } } className="text-red-500 hover:text-red-600 transition-colors" title="Remove image slot">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            
                            {/* Image Preview */}
                            {(url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) && (
                              <div className="w-full h-48 bg-gray-100/5 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/50">
                                <img src={url} alt="Preview" className="w-full h-full object-contain" />
                              </div>
                            )}

                            <input id={`product-image-url-${idx}`} name={`productImageUrl-${idx}`} value={url} onChange={e => {
                              const n = [...imageUrls]; n[idx] = e.target.value; setImageUrls(n);
                            }} onPaste={async (e) => {
                              const pasteData = e.clipboardData.getData('text');
                              // Check if pasted content is an image URL
                              if (pasteData.startsWith('http') && (pasteData.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i) || pasteData.includes('images') || pasteData.includes('img') || pasteData.includes('cdn'))) {
                                e.preventDefault();
                                console.log(`[ProductImagePaste] Detected image URL: ${pasteData}`);
                                await handleImageUrlPaste(pasteData, false, idx);
                              }
                            }} placeholder="Paste image link here..." className={`w-full border rounded-xl px-4 py-3 text-[10px] font-mono outline-none focus:border-blue-500 transition-all ${useWhiteBgs[idx] ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'}`} aria-label={`Product image URL ${idx + 1}`} />
                            
                            <input id={`product-image-alt-${idx}`} name={`productImageAlt-${idx}`} value={imageAltTexts[idx] || ''} onChange={e => {
                              const a = [...imageAltTexts]; a[idx] = e.target.value; setImageAltTexts(a);
                            } } placeholder="Alt text (optional)" className={`w-full border rounded-xl px-4 py-3 text-[10px] font-mono outline-none focus:border-blue-500 transition-all ${useWhiteBgs[idx] ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'}`} aria-label={`Product image alt text ${idx + 1}`} />
                            
                            <label className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${useWhiteBgs[idx] ? 'text-slate-500' : 'text-slate-500'}`}>
                              <input type="checkbox" checked={useWhiteBgs[idx] || false} onChange={e => {
                                const n = [...useWhiteBgs]; n[idx] = e.target.checked; setUseWhiteBgs(n);
                              } } className="w-3 h-3 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900" />
                              Use White Background (Full Container)
                            </label>
                            
                            <button type="button" onClick={() => { setActiveUploadIndex(idx); fileInputRef.current?.click(); } } className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${useWhiteBgs[idx] ? 'bg-slate-200 hover:bg-blue-600 text-slate-600 hover:text-white' : 'bg-slate-800 hover:bg-blue-600 text-white'}`}>Upload New File</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => { setImageUrls([...imageUrls, '']); setImageAltTexts([...imageAltTexts, '']); setUseWhiteBgs([...useWhiteBgs, false]); } } title="Add another product image slot" className="border-2 border-dashed border-slate-800 hover:border-blue-600 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-600 hover:text-blue-500 transition-all group">
                          <span className="text-2xl mb-1 group-hover:scale-125 transition-transform">+</span>
                          <span className="text-[9px] font-black uppercase tracking-widest">Add Image Slot</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">YouTube URL</label>
                        <input id="product-youtube-url" name="productYoutubeUrl" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white text-xs outline-none focus:border-blue-500" aria-label="YouTube URL" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">TikTok Reel</label>
                        <input id="product-tiktok-url" name="productTiktokUrl" value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white text-xs outline-none focus:border-blue-500" aria-label="TikTok URL" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Instagram Reel</label>
                        <input id="product-instagram-url" name="productInstagramUrl" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white text-xs outline-none focus:border-blue-500" aria-label="Instagram URL" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label htmlFor="product-category" className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Store Collection</label>
                        <select id="product-category" value={category} onChange={e => setCategory(e.target.value as any)} title="Select product store collection category" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 appearance-none">
                          <option value="car">Car Accessories</option>
                          <option value="gadget">Mobile Accessories</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="stock-status" className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Availability Status</label>
                        <select id="stock-status" value={stockStatus} onChange={e => setStockStatus(e.target.value as any)} title="Select product availability status" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 appearance-none">
                          <option value="in-stock">🟢 In Stock (Active)</option>
                          <option value="limited">🟡 Limited Units Left</option>
                          <option value="out-of-stock">🔴 Sold Out (Disabled)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        <input type="checkbox" checked={hasInstallation} onChange={e => setHasInstallation(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900" />
                        Expert Installation Available
                      </label>
                    </div>

                  </div>
                );
                if (activeTab === 'bundle') return (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Bundle Title</label>
                        <input id="bundle-title" name="bundleTitle" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Interior Transformation Kit" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500" aria-label="Bundle title" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Special Sale Price (KSh)</label>
                        <input id="bundle-price" name="bundlePrice" required type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Enter bundle sale price" title="Enter the special sale price for this bundle in Kenyan Shillings" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500" aria-label="Bundle sale price in Kenyan Shillings" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="bundle-category" className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Bundle Category</label>
                      <select id="bundle-category" value={bundleCategory} onChange={e => setBundleCategory(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 appearance-none">
                        <option value="car">Car Accessories</option>
                        <option value="gadget">Mobile Accessories</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        <input type="checkbox" checked={hasInstallation} onChange={e => setHasInstallation(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900" />
                        Expert Installation Available
                      </label>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Select Products to Include</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar border border-slate-800 bg-slate-950/50 p-4 rounded-2xl">
                        {(allInventory?.products || []).map(prod => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => toggleBundleProduct(prod.name)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${selectedBundleProductNames.includes(prod.name) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedBundleProductNames.includes(prod.name) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                              {selectedBundleProductNames.includes(prod.name) && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <p className={`text-[11px] font-bold truncate ${selectedBundleProductNames.includes(prod.name) ? 'text-blue-400' : 'text-slate-300'}`}>{prod.name}</p>
                              <p className="text-[9px] text-slate-500 font-medium">KSh {prod.price.toLocaleString()}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6">
                      <div className="text-center sm:text-left">
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Items Total Value</p>
                        <p className="text-white font-black text-xl">
                          KSh {selectedBundleProductNames.reduce((acc, n) => acc + ((allInventory?.products || []).find(p => p.name === n)?.price || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="h-px sm:h-8 w-12 sm:w-px bg-slate-800"></div>
                      <div className="text-center sm:text-left">
                        <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest mb-1">Customer Savings</p>
                        <p className="text-emerald-400 font-black text-xl">KSh {(parseInt(savings) || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                        <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                          {(() => {
                            const s = parseInt(savings) || 0;
                            const p = parseInt(price) || 0;
                            const total = s + p;
                            return total ? Math.round((s / total) * 100) : 0;
                          })()}% OFF
                        </span>
                      </div>
                    </div>
                  </div>
                );
                if (activeTab === 'featured') return (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Select Products for "TRENDING NOW!!" Section</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar border border-slate-800 bg-slate-950/50 p-4 rounded-2xl">
                        {(allInventory?.products || []).map(prod => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              setTrendingProductIds(prev => prev.includes(prod.id)
                                ? prev.filter(id => id !== prod.id)
                                : [...prev, prod.id]
                              );
                            } }
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${trendingProductIds.includes(prod.id) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${trendingProductIds.includes(prod.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                              {trendingProductIds.includes(prod.id) && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <p className={`text-[11px] font-bold truncate ${trendingProductIds.includes(prod.id) ? 'text-blue-400' : 'text-slate-300'}`}>{prod.name}</p>
                              <p className="text-[9px] text-slate-500 font-medium">KSh {prod.price.toLocaleString()}</p>
                            </div>
                            {trendingProductIds.includes(prod.id) && (
                              <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setTrendingProductIds(prev => prev.filter(id => id !== prod.id)); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setTrendingProductIds(prev => prev.filter(id => id !== prod.id)); } }} className="ml-2 text-red-500 hover:text-red-400 text-sm cursor-pointer" aria-label="Remove from trending">×</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Select Bundles for "Value Bundles" Section</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar border border-slate-800 bg-slate-950/50 p-4 rounded-2xl">
                        {(allInventory?.bundles || []).map(bundle => (
                          <button
                            key={bundle.id}
                            type="button"
                            onClick={() => {
                              setValueBundleIds(prev => prev.includes(bundle.id)
                                ? prev.filter(id => id !== bundle.id)
                                : [...prev, bundle.id]
                              );
                            } }
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${valueBundleIds.includes(bundle.id) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${valueBundleIds.includes(bundle.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                              {valueBundleIds.includes(bundle.id) && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <p className={`text-[11px] font-bold truncate ${valueBundleIds.includes(bundle.id) ? 'text-blue-400' : 'text-slate-300'}`}>{bundle.name}</p>
                              <p className="text-[9px] text-slate-500 font-medium">KSh {bundle.totalPrice.toLocaleString()}</p>
                            </div>
                            {valueBundleIds.includes(bundle.id) && (
                              <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setValueBundleIds(prev => prev.filter(id => id !== bundle.id)); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setValueBundleIds(prev => prev.filter(id => id !== bundle.id)); } }} className="ml-2 text-red-500 hover:text-red-400 text-sm cursor-pointer" aria-label="Remove from value bundles">×</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Global Featured Blogs Section - Three Separate Selectors */}
                    <div className="pt-8 border-t border-slate-800">
                      <div className="mb-6">
                        <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-2">Global Featured Blogs</h3>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest">Select articles to appear in featured sections across all pages</p>
                      </div>
                      
                      <div className="space-y-6">
                        {/* Homepage - Latest Insights */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Homepage</span>
                            <span className="text-slate-600 text-[9px]">Latest Insights (Max 2)</span>
                          </div>
                          {localArticles.length === 0 ? (
                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-center">
                              <p className="text-slate-500 text-[10px] uppercase tracking-widest">No articles found</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar bg-slate-950/30 p-3 rounded-xl">
                              {localArticles.map((article: Article) => (
                                <button
                                  key={`home-${article.id}`}
                                  type="button"
                                  onClick={() => {
                                    setFeaturedArticleIds(prev => prev.includes(article.id)
                                      ? prev.filter(id => id !== article.id)
                                      : [...prev, article.id]
                                    );
                                  }}
                                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${featuredArticleIds.includes(article.id) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${featuredArticleIds.includes(article.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                                    {featuredArticleIds.includes(article.id) && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-medium truncate ${featuredArticleIds.includes(article.id) ? 'text-blue-400' : 'text-slate-400'}`}>{article.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-blue-500 text-[9px]">{featuredArticleIds.length}/2 selected</p>
                        </div>

                        {/* Car Accessories - AutoGear Drive Guides */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Car Accessories</span>
                            <span className="text-slate-600 text-[9px]">AutoGear Drive Guides (Max 1)</span>
                          </div>
                          {localArticles.length === 0 ? (
                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-center">
                              <p className="text-slate-500 text-[10px] uppercase tracking-widest">No articles found</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar bg-slate-950/30 p-3 rounded-xl">
                              {localArticles.map((article: Article) => (
                                <button
                                  key={`car-${article.id}`}
                                  type="button"
                                  onClick={() => {
                                    setFeaturedCarArticleIds(prev => prev.includes(article.id)
                                      ? prev.filter(id => id !== article.id)
                                      : [article.id]
                                    );
                                  }}
                                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${featuredCarArticleIds.includes(article.id) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${featuredCarArticleIds.includes(article.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                                    {featuredCarArticleIds.includes(article.id) && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-medium truncate ${featuredCarArticleIds.includes(article.id) ? 'text-blue-400' : 'text-slate-400'}`}>{article.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-blue-500 text-[9px]">{featuredCarArticleIds.length}/1 selected</p>
                        </div>

                        {/* Mobile Accessories - Tech & Charging Tips */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Mobile Accessories</span>
                            <span className="text-slate-600 text-[9px]">Tech & Charging Tips (Max 1)</span>
                          </div>
                          {localArticles.length === 0 ? (
                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-center">
                              <p className="text-slate-500 text-[10px] uppercase tracking-widest">No articles found</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar bg-slate-950/30 p-3 rounded-xl">
                              {localArticles.map((article: Article) => (
                                <button
                                  key={`mobile-${article.id}`}
                                  type="button"
                                  onClick={() => {
                                    setFeaturedMobileArticleIds(prev => prev.includes(article.id)
                                      ? prev.filter(id => id !== article.id)
                                      : [article.id]
                                    );
                                  }}
                                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${featuredMobileArticleIds.includes(article.id) ? 'bg-blue-600/10 border-blue-600/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${featuredMobileArticleIds.includes(article.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700'}`}>
                                    {featuredMobileArticleIds.includes(article.id) && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-medium truncate ${featuredMobileArticleIds.includes(article.id) ? 'text-blue-400' : 'text-slate-400'}`}>{article.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-blue-500 text-[9px]">{featuredMobileArticleIds.length}/1 selected</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                return null;
              })()}

                <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-slate-800">
              <button type="submit" disabled={isSaving} title={isSaving ? 'Saving changes...' : activeTab === 'featured' ? 'Save featured items selection' : activeTab === 'article' ? (editingArticleId ? 'Save article changes' : 'Publish new article') : (editingId ? 'Save product changes' : 'Create new product')} className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-blue-900/40 active:scale-95 transition-all">
                {isSaving ? 'Processing System Update...' : activeTab === 'featured' ? 'Update Featured Items' : activeTab === 'article' ? (editingArticleId ? 'Update Article' : 'Publish Article') : (editingId ? 'Push Changes to Store' : 'Add New Entry to Catalog')}
              </button>
              {editingId && activeTab !== 'article' && <button type="button" onClick={resetForm} title="Cancel editing and clear form" className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-black px-10 py-5 rounded-2xl uppercase tracking-widest text-[10px] transition-all">Cancel Edit</button>}
              {editingArticleId && activeTab === 'article' && <button type="button" onClick={resetArticleForm} title="Cancel editing article" className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-black px-10 py-5 rounded-2xl uppercase tracking-widest text-[10px] transition-all">Cancel</button>}
            </div>
            </form>  
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
  <div className="lg:col-span-11">
    <h3 className="text-white font-black uppercase text-[10px] tracking-[0.4em] ml-2 flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Live Store Preview</h3>
    <div className="bg-slate-950 p-0 rounded-[3.5rem] border border-slate-800 shadow-2xl">
      <ProductCard product={previewProduct} />
    </div>
  </div>
</div>

      </div>
    </div><div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
          <div className="flex items-center gap-6">
            <h3 className="text-white font-black uppercase text-sm tracking-widest">Master Inventory</h3>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4">
                <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{selectedIds.length} Selected</span>
                <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-900/20">Delete Selected</button>
                <button onClick={() => setSelectedIds([])} className="text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest">Clear</button>
              </div>
            )}
          </div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{allItems.length} Items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 py-5 w-10">
                  <div className="flex items-center justify-center">
                    <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === allItems.filter(i => i.id.startsWith('local') || localProducts.some((p: Product) => p.id === i.id) || localBundles.some((b: Bundle) => b.id === i.id)).length} title="Select all items" className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900" />
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Asset</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Price</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Stock</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {allItems.map((item: any, index: number) => {
                const isBundle = !!item.products;
                const isDeletable = !CAR_PRODUCTS.some((cp: Product) => cp.id === item.id) && !BUNDLES.some((cb: Bundle) => cb.id === item.id);
                // Generate unique composite key to prevent duplicates
                const itemType = isBundle ? 'bundle' : 'product';
                const uniqueKey = `${itemType}-${item.id}-${index}`;

                return (
                  <tr key={uniqueKey} id={`item-${item.uuid}`} className={`hover:bg-slate-950/40 transition-colors group ${editingId === item.id ? 'bg-blue-600/5' : ''} ${selectedIds.includes(item.id) ? 'bg-blue-600/10' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {isDeletable ? (
                          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} title="Select item for bulk deletion" className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900" />
                        ) : (
                          <div className="w-4 h-4 rounded border border-slate-800/50 bg-slate-800/20" title="Core systems cannot be mass-selected"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`w-12 h-12 rounded-xl border border-slate-800 overflow-hidden ${item.useWhiteBg && item.useWhiteBg[0] ? 'bg-white' : 'bg-slate-950'}`}>
                        <img src={item.images && item.images[0] ? item.images[0].url || item.images[0].image_name : 'https://placehold.co/100x100/374151/FFFFFF/png?text=Bundle'} className="w-full h-full object-contain" alt="" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm mb-1">{item.name}</span>
                        <div className="flex gap-2 items-center">
                          {!isNaN(Number(item.id)) && <span className="text-[7px] font-black px-1 py-0.5 rounded border bg-green-600/10 text-green-500 border-green-500/20 uppercase">Database</span>}
                          {isNaN(Number(item.id)) && <span className="text-[7px] font-black px-1 py-0.5 rounded border bg-slate-800/50 text-slate-600 border-slate-700 uppercase">Core System</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{isBundle ? 'Package' : (item.category === 'car' ? 'Car Tech' : 'Mobile')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-black text-xs">KSh {(item.price || item.totalPrice).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border tracking-widest ${getStockBadgeClass(item.stockStatus || 'in-stock')}`}>{item.stockStatus || 'In Stock'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => handleEdit(item)} title="Edit item" className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white transition-all border border-slate-700 hover:border-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        {isDeletable && (
                          <button 
                          type="button" 
                          className="btn-delete w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/50 hover:bg-red-600 text-red-500/50 hover:text-white transition-all border border-slate-800 hover:border-red-500" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteItem(e, item, isBundle);
                          }} 
                          title="Delete or reset item"
                        ><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Articles Management Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
          <div className="flex items-center gap-6">
            <h3 className="text-white font-black uppercase text-sm tracking-widest">Blog Articles</h3>
            {selectedArticleIds.length > 0 && (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4">
                <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{selectedArticleIds.length} Selected</span>
                <button 
                  onClick={handleBulkArticleDelete} 
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-slate-700 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-900/20"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Selected'}
                </button>
                <button 
                  onClick={() => setSelectedArticleIds([])} 
                  className="text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{localArticles.length} Articles</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 py-5 w-10">
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      onChange={toggleArticleSelectAll} 
                      checked={selectedArticleIds.length > 0 && selectedArticleIds.length === localArticles.length} 
                      title="Select all articles"
                      className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900" 
                    />
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Image</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Title</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Brand</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Featured</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {localArticles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                      <div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">No Articles Found</p>
                        <p className="text-slate-600 text-[10px] mt-1">Create your first article using the Article Creator tab above</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                localArticles.map((article: Article) => (
                  <tr 
                    key={article.id} 
                    id={`article-${article.id}`} 
                    className={`hover:bg-slate-950/40 transition-colors group ${editingArticleId === article.id ? 'bg-blue-600/5' : ''} ${selectedArticleIds.includes(article.id) ? 'bg-blue-600/10' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={selectedArticleIds.includes(article.id)} 
                          onChange={() => toggleArticleSelect(article.id)} 
                          title="Select article for bulk deletion"
                          className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900" 
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                        <img 
                          src={getArticleImageUrl(article.featured_image || article.featuredImage || '')} 
                          className="w-full h-full object-cover" 
                          alt={article.title} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/374151/FFFFFF/png?text=Article';
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-xs">
                        <span className="text-white font-bold text-sm truncate" title={article.title}>{article.title}</span>
                        <span className="text-slate-600 text-[7px] font-mono mt-1">/blogs/{article.slug}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{article.category || 'Uncategorized'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{article.brand || 'General'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border tracking-widest ${
                        article.is_published 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {article.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {article.is_featured_homepage && (
                          <span className="text-[6px] px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-500 border border-blue-500/20 font-black uppercase">Home</span>
                        )}
                        {article.is_featured_car && (
                          <span className="text-[6px] px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-500 border border-blue-500/20 font-black uppercase">Car</span>
                        )}
                        {article.is_featured_mobile && (
                          <span className="text-[6px] px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-500 border border-blue-500/20 font-black uppercase">Mobile</span>
                        )}
                        {!article.is_featured_homepage && !article.is_featured_car && !article.is_featured_mobile && (
                          <span className="text-slate-600 text-[8px] font-black uppercase tracking-widest">No</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          type="button" 
                          onClick={() => {
                            setActiveTab('article');
                            setEditingArticleId(article.id);
                            setArticleTitle(article.title);
                            setArticleContent(article.content || '');
                            setArticleExcerpt(article.excerpt || '');
                            setArticleImages(article.featuredImage ? [article.featuredImage] : ['']);
                            setArticleCategory(article.category || '');
                            setArticleBrand(article.brand || '');
                            setArticleMetaDescription(article.meta_description || '');
                            setArticleKeywords(article.seo_keywords || '');
                            setSelectedRelatedProducts(Array.isArray(article.related_products) ? article.related_products : []);
                            setSelectedRelatedBundles(Array.isArray(article.related_bundles) ? article.related_bundles : []);
                            setArticleIsPublished(Boolean(article.is_published));
                            setArticleIsFeaturedHomepage(Boolean(article.is_featured_homepage));
                            setArticleIsFeaturedCar(Boolean(article.is_featured_car));
                            setArticleIsFeaturedMobile(Boolean(article.is_featured_mobile));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          title="Edit article"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white transition-all border border-slate-700 hover:border-blue-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button 
                          type="button" 
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/50 hover:bg-red-600 text-red-500/50 hover:text-white transition-all border border-slate-800 hover:border-red-500" 
                          onClick={(e) => deleteArticle(e, article)} 
                          title="Delete article"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="lg:col-span-2 space-y-12">
          <div className="space-y-8">
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="text-white font-black uppercase text-[10px] tracking-widest mb-6">Recent Feed</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                {allItems.slice(0, 5).map((item: any, index: number) => {
                  const isBundle = !!item.products;
                  const itemType = isBundle ? 'bundle' : 'product';
                  const uniqueKey = `${itemType}-${item.id}-${index}`;
                  return (
                    <div key={uniqueKey} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-800">
                        <img src={item.images && item.images[0] ? item.images[0].url || item.images[0].image_name : 'https://placehold.co/50x50/374151/FFFFFF/png?text=?'} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-white font-bold text-[10px] truncate">{item.name}</p>
                        <p className="text-blue-500 text-[8px] font-black uppercase">KSh {(item.price || item.totalPrice).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </>
  );
};

export default AdminPage;