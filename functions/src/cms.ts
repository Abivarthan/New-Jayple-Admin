import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { verifyAdminPermission } from './index';

const db = admin.firestore();

// Helper to increment CMS version
async function incrementCmsVersion(adminUid: string) {
  const settingsRef = db.collection('cms').doc('settings');
  const globalRef = settingsRef.collection('global').doc('config');
  
  await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(globalRef);
    let currentVersion = 0;
    
    if (docSnap.exists) {
      currentVersion = docSnap.data()?.version || 0;
    }
    
    transaction.set(globalRef, {
      version: currentVersion + 1,
      lastPublishedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastPublishedBy: adminUid
    }, { merge: true });
  });
}

// Helper for audit logging
async function logCmsAction(adminInfo: any, action: string, targetType: string, targetId: string, before: any, after: any) {
  const auditRef = db.collection('auditLog').doc();
  await auditRef.set({
    logId: auditRef.id,
    adminUid: adminInfo.uid,
    adminName: adminInfo.name,
    adminRole: adminInfo.role,
    action,
    targetType,
    targetId,
    before,
    after,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * ==========================================
 * BANNERS
 * ==========================================
 */

export const createHeroBanner = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const schema = z.object({
    title: z.string(),
    subtitle: z.string(),
    imageUrl: z.string().url(),
    gifUrl: z.string().url().nullable().optional(),
    ctaText: z.string(),
    ctaAction: z.string(),
    genderTarget: z.enum(['all', 'men', 'women']),
    zones: z.array(z.string()),
    isActive: z.boolean()
  });

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.issues[0].message);

  const bannerRef = db.collection('cms').doc('heroBanners').collection('items').doc();
  const newBanner = {
    id: bannerRef.id,
    ...parsed.data,
    sortOrder: Date.now(), // default to end
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  await bannerRef.set(newBanner);
  await logCmsAction(adminProfile, 'create_hero_banner', 'cms_hero', bannerRef.id, null, newBanner);

  return { success: true, id: bannerRef.id };
});

export const updateHeroBanner = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { id, ...updateData } = request.data;
  if (!id) throw new HttpsError('invalid-argument', 'Missing banner ID');

  const bannerRef = db.collection('cms').doc('heroBanners').collection('items').doc(id);
  const currentSnap = await bannerRef.get();
  
  if (!currentSnap.exists) throw new HttpsError('not-found', 'Banner not found');

  const finalUpdate = {
    ...updateData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  await bannerRef.update(finalUpdate);
  await logCmsAction(adminProfile, 'update_hero_banner', 'cms_hero', id, currentSnap.data(), finalUpdate);

  return { success: true };
});

export const deleteHeroBanner = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { id } = request.data;
  if (!id) throw new HttpsError('invalid-argument', 'Missing banner ID');

  const bannerRef = db.collection('cms').doc('heroBanners').collection('items').doc(id);
  const currentSnap = await bannerRef.get();
  
  if (!currentSnap.exists) throw new HttpsError('not-found', 'Banner not found');

  await bannerRef.delete();
  await logCmsAction(adminProfile, 'delete_hero_banner', 'cms_hero', id, currentSnap.data(), null);

  return { success: true };
});

export const reorderHeroBanners = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { orders } = request.data; // Array of { id: string, sortOrder: number }
  if (!Array.isArray(orders)) throw new HttpsError('invalid-argument', 'orders must be an array');

  const batch = db.batch();
  orders.forEach((item: any) => {
    const ref = db.collection('cms').doc('heroBanners').collection('items').doc(item.id);
    batch.update(ref, { 
      sortOrder: item.sortOrder,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: adminProfile.uid
    });
  });

  await batch.commit();
  await logCmsAction(adminProfile, 'reorder_hero_banners', 'cms_hero', 'bulk', null, { orderUpdated: orders.length });

  return { success: true };
});

/**
 * ==========================================
 * PROMOTIONAL BANNERS
 * ==========================================
 */

export const createPromotionalBanner = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const ref = db.collection('cms').doc('promotionalBanners').collection('items').doc();
  const newData = {
    id: ref.id,
    ...request.data,
    sortOrder: Date.now(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  await ref.set(newData);
  await logCmsAction(adminProfile, 'create_promo_banner', 'cms_promo', ref.id, null, newData);

  return { success: true, id: ref.id };
});

export const updatePromotionalBanner = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { id, ...data } = request.data;
  const ref = db.collection('cms').doc('promotionalBanners').collection('items').doc(id);
  const oldSnap = await ref.get();
  
  const finalUpdate = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  await ref.update(finalUpdate);
  await logCmsAction(adminProfile, 'update_promo_banner', 'cms_promo', id, oldSnap.data() || null, finalUpdate);

  return { success: true };
});

export const deletePromotionalBanner = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { id } = request.data;
  const ref = db.collection('cms').doc('promotionalBanners').collection('items').doc(id);
  const oldSnap = await ref.get();

  await ref.delete();
  await logCmsAction(adminProfile, 'delete_promo_banner', 'cms_promo', id, oldSnap.data() || null, null);

  return { success: true };
});

export const reorderPromotionalBanners = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { orders } = request.data;
  const batch = db.batch();
  orders.forEach((item: any) => {
    const ref = db.collection('cms').doc('promotionalBanners').collection('items').doc(item.id);
    batch.update(ref, { 
      sortOrder: item.sortOrder,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: adminProfile.uid
    });
  });

  await batch.commit();
  await logCmsAction(adminProfile, 'reorder_promo_banners', 'cms_promo', 'bulk', null, { orderUpdated: orders.length });

  return { success: true };
});

/**
 * ==========================================
 * REFERRAL & CASHBACK BANNERS
 * ==========================================
 */

export const updateReferralBanner = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const ref = db.collection('cms').doc('referralBanner').collection('config').doc('main');
  const finalUpdate = {
    ...request.data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  const oldSnap = await ref.get();
  await ref.set(finalUpdate, { merge: true });
  await logCmsAction(adminProfile, 'update_referral_banner', 'cms_referral', 'main', oldSnap.data() || null, finalUpdate);

  return { success: true };
});

export const updateCashbackBanner = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const ref = db.collection('cms').doc('cashbackBanner').collection('config').doc('main');
  const finalUpdate = {
    ...request.data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  const oldSnap = await ref.get();
  await ref.set(finalUpdate, { merge: true });
  await logCmsAction(adminProfile, 'update_cashback_banner', 'cms_cashback', 'main', oldSnap.data() || null, finalUpdate);

  return { success: true };
});

/**
 * ==========================================
 * STATIC PAGES
 * ==========================================
 */

export const updateStaticPage = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { slug, title, content } = request.data;
  if (!slug || !title || !content) throw new HttpsError('invalid-argument', 'Missing fields');

  const ref = db.collection('cms').doc('staticPages').collection('pages').doc(slug);
  const finalUpdate = {
    slug,
    title,
    content,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  const oldSnap = await ref.get();
  await ref.set(finalUpdate, { merge: true });
  await logCmsAction(adminProfile, 'update_static_page', 'cms_static_page', slug, oldSnap.data() || null, finalUpdate);

  return { success: true };
});

/**
 * ==========================================
 * FAQs
 * ==========================================
 */

export const createFaq = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const ref = db.collection('cms').doc('faqs').collection('items').doc();
  const newData = {
    id: ref.id,
    ...request.data,
    sortOrder: Date.now(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  await ref.set(newData);
  await logCmsAction(adminProfile, 'create_faq', 'cms_faq', ref.id, null, newData);

  return { success: true, id: ref.id };
});

export const updateFaq = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { id, ...data } = request.data;
  const ref = db.collection('cms').doc('faqs').collection('items').doc(id);
  const oldSnap = await ref.get();
  
  const finalUpdate = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  await ref.update(finalUpdate);
  await logCmsAction(adminProfile, 'update_faq', 'cms_faq', id, oldSnap.data() || null, finalUpdate);

  return { success: true };
});

export const deleteFaq = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { id } = request.data;
  const ref = db.collection('cms').doc('faqs').collection('items').doc(id);
  const oldSnap = await ref.get();

  await ref.delete();
  await logCmsAction(adminProfile, 'delete_faq', 'cms_faq', id, oldSnap.data() || null, null);

  return { success: true };
});

/**
 * ==========================================
 * ANNOUNCEMENTS
 * ==========================================
 */

export const createAnnouncement = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const ref = db.collection('cms').doc('announcements').collection('items').doc();
  const newData = {
    id: ref.id,
    ...request.data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  await ref.set(newData);
  await logCmsAction(adminProfile, 'create_announcement', 'cms_announcement', ref.id, null, newData);

  return { success: true, id: ref.id };
});

export const updateAnnouncement = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { id, ...data } = request.data;
  const ref = db.collection('cms').doc('announcements').collection('items').doc(id);
  const oldSnap = await ref.get();
  
  const finalUpdate = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminProfile.uid
  };

  await ref.update(finalUpdate);
  await logCmsAction(adminProfile, 'update_announcement', 'cms_announcement', id, oldSnap.data() || null, finalUpdate);

  return { success: true };
});

export const deleteAnnouncement = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  const { id } = request.data;
  const ref = db.collection('cms').doc('announcements').collection('items').doc(id);
  const oldSnap = await ref.get();

  await ref.delete();
  await logCmsAction(adminProfile, 'delete_announcement', 'cms_announcement', id, oldSnap.data() || null, null);

  return { success: true };
});

/**
 * ==========================================
 * PUBLISH CMS
 * ==========================================
 */

export const publishCms = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required.');
  const adminProfile = await verifyAdminPermission(request.auth.uid, 'content');

  await incrementCmsVersion(adminProfile.uid);
  await logCmsAction(adminProfile, 'publish_cms', 'cms_settings', 'global', null, { published: true });

  return { success: true };
});

export const getCmsVersion = onCall({ region: 'asia-south1' }, async () => {
  const settingsRef = db.collection('cms').doc('settings');
  const globalRef = settingsRef.collection('global').doc('config');
  
  const docSnap = await globalRef.get();
  let currentVersion = 0;
  
  if (docSnap.exists) {
    currentVersion = docSnap.data()?.version || 0;
  }
  
  return { version: currentVersion };
});
