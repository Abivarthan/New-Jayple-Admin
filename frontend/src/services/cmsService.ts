import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { db, app } from './firebase';
import { getFunctions } from 'firebase/functions';

const functions = getFunctions(app, 'asia-south1');

// Queries
export const fetchHeroBanners = async () => {
  const q = query(collection(db, 'cms/heroBanners/items'), orderBy('sortOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const fetchPromotionalBanners = async () => {
  const q = query(collection(db, 'cms/promotionalBanners/items'), orderBy('sortOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const fetchReferralBanner = async () => {
  const snapshot = await getDoc(doc(db, 'cms/referralBanner/config/main'));
  return snapshot.exists() ? snapshot.data() : null;
};

export const fetchCashbackBanner = async () => {
  const snapshot = await getDoc(doc(db, 'cms/cashbackBanner/config/main'));
  return snapshot.exists() ? snapshot.data() : null;
};

export const fetchFaqs = async () => {
  const q = query(collection(db, 'cms/faqs/items'), orderBy('sortOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const fetchAnnouncements = async () => {
  const snapshot = await getDocs(collection(db, 'cms/announcements/items'));
  return snapshot.docs.map(doc => doc.data());
};

export const fetchStaticPages = async () => {
  const snapshot = await getDocs(collection(db, 'cms/staticPages/pages'));
  return snapshot.docs.map(doc => doc.data());
};

export const fetchCmsSettings = async () => {
  const snapshot = await getDoc(doc(db, 'cms/settings/global/config'));
  return snapshot.exists() ? snapshot.data() : { version: 0 };
};

export const fetchExploreDiscovery = async () => {
  const snapshot = await getDoc(doc(db, 'cms/exploreDiscovery/config/main'));
  return snapshot.exists() ? snapshot.data() : null;
};

// Image upload (base64 → Firebase Storage via CF; returns { url })
export const uploadCmsImage = httpsCallable<
  { fileBase64: string; contentType: string; folder?: string },
  { url: string }
>(functions, 'uploadCmsImage');

// Mutations
export const createHeroBanner = httpsCallable(functions, 'createHeroBanner');
export const updateHeroBanner = httpsCallable(functions, 'updateHeroBanner');
export const deleteHeroBanner = httpsCallable(functions, 'deleteHeroBanner');
export const reorderHeroBanners = httpsCallable(functions, 'reorderHeroBanners');

export const createPromotionalBanner = httpsCallable(functions, 'createPromotionalBanner');
export const updatePromotionalBanner = httpsCallable(functions, 'updatePromotionalBanner');
export const deletePromotionalBanner = httpsCallable(functions, 'deletePromotionalBanner');
export const reorderPromotionalBanners = httpsCallable(functions, 'reorderPromotionalBanners');

export const updateReferralBanner = httpsCallable(functions, 'updateReferralBanner');
export const updateCashbackBanner = httpsCallable(functions, 'updateCashbackBanner');

export const createFaq = httpsCallable(functions, 'createFaq');
export const updateFaq = httpsCallable(functions, 'updateFaq');
export const deleteFaq = httpsCallable(functions, 'deleteFaq');

export const createAnnouncement = httpsCallable(functions, 'createAnnouncement');
export const updateAnnouncement = httpsCallable(functions, 'updateAnnouncement');
export const deleteAnnouncement = httpsCallable(functions, 'deleteAnnouncement');

export const updateStaticPage = httpsCallable(functions, 'updateStaticPage');

export const publishCms = httpsCallable(functions, 'publishCms');

export const updateExploreDiscovery = httpsCallable(functions, 'updateExploreDiscovery');
