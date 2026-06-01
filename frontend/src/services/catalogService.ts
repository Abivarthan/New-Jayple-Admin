import { httpsCallable, getFunctions } from 'firebase/functions';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { app, db } from './firebase';

const functions = getFunctions(app, 'asia-south1');

// ── Types ──
export interface Category {
  slug: string;
  name: string;
  imageUrl: string;
  fallbackIcon: string;
  genderTarget: 'unisex' | 'men' | 'women';
  order: number;
  isActive: boolean;
}

export interface LibraryAsset {
  id: string;
  url: string;
  isDefault: boolean;
}

export interface CategoryAssets {
  genderTarget?: string;
  normalAssets: LibraryAsset[];
  premiumAssets: LibraryAsset[];
}

// ── Reads (categories + imageLibrary are public-read) ──
export const fetchCategories = async (): Promise<Category[]> => {
  const snap = await getDocs(collection(db, 'categories'));
  const list = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      slug: (x.slug as string) || d.id,
      name: (x.name as string) || d.id,
      imageUrl: (x.imageUrl as string) || '',
      fallbackIcon: (x.fallbackIcon as string) || 'category',
      genderTarget: (x.genderTarget as Category['genderTarget']) || 'unisex',
      order: typeof x.order === 'number' ? (x.order as number) : 0,
      isActive: x.isActive !== false,
    } as Category;
  });
  return list.sort((a, b) => a.order - b.order);
};

export const fetchImageLibrary = async (): Promise<Record<string, CategoryAssets>> => {
  const snap = await getDocs(collection(db, 'imageLibrary'));
  const out: Record<string, CategoryAssets> = {};
  snap.docs.forEach((d) => {
    const x = d.data() as Record<string, unknown>;
    out[d.id] = {
      genderTarget: x.genderTarget as string | undefined,
      normalAssets: (x.normalAssets as LibraryAsset[]) || [],
      premiumAssets: (x.premiumAssets as LibraryAsset[]) || [],
    };
  });
  return out;
};

// ── Writes (admin-guarded Cloud Functions; Admin SDK bypasses locked rules) ──
const _manageCategory = httpsCallable(functions, 'manageCategory');
const _manageImageLibrary = httpsCallable(functions, 'manageImageLibrary');

export const createCategory = (category: Partial<Category>) =>
  _manageCategory({ action: 'create', category });
export const updateCategory = (category: Partial<Category>) =>
  _manageCategory({ action: 'update', category });
export const deleteCategory = (slug: string) =>
  _manageCategory({ action: 'delete', slug });
export const reorderCategories = (order: { slug: string; order: number }[]) =>
  _manageCategory({ action: 'reorder', order });

/** Add an image to a category by uploading a base64 file to Firebase Storage (CF-side). */
export const addLibraryImage = (category: string, fileBase64: string, contentType: string) =>
  _manageImageLibrary({ action: 'addImage', category, fileBase64, contentType });
export const removeLibraryImage = (category: string, assetId: string) =>
  _manageImageLibrary({ action: 'removeImage', category, assetId });
export const setLibraryDefault = (category: string, assetId: string) =>
  _manageImageLibrary({ action: 'setDefault', category, assetId });

// ── Home content (offer cards + cashback/referral copy) ──
export interface OfferCard { title: string; subtitle: string; route: string }
export interface HomeContent {
  offerCards: OfferCard[];
  cashback: { headline: string; subtext: string };
  referral: { headline: string; subtext: string };
}

const _homeDefaults: HomeContent = {
  offerCards: [
    { title: 'Flat Offer', subtitle: 'Up to 20% OFF', route: '/explore' },
    { title: 'Refer & Earn', subtitle: 'Earn with friends', route: '/refer-earn' },
  ],
  cashback: { headline: '2% Cashback on every booking', subtext: 'Credited instantly to your Jayple Wallet' },
  referral: { headline: 'Refer a friend', subtext: 'They get 3% cashback, you get 2% on their first booking' },
};

export const fetchHomeContent = async (): Promise<HomeContent> => {
  const snap = await getDoc(doc(db, 'appContent', 'home'));
  const d = (snap.exists() ? snap.data() : {}) as Record<string, unknown>;
  const cards = Array.isArray(d.offerCards) ? (d.offerCards as OfferCard[]) : [];
  return {
    offerCards: cards.length >= 2 ? cards : _homeDefaults.offerCards,
    cashback: (d.cashback as HomeContent['cashback']) || _homeDefaults.cashback,
    referral: (d.referral as HomeContent['referral']) || _homeDefaults.referral,
  };
};

const _manageHomeContent = httpsCallable(functions, 'manageHomeContent');
export const saveHomeContent = (content: HomeContent) => _manageHomeContent({ content });

/** Read a File as a bare base64 string (no data: prefix). */
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
