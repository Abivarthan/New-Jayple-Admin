"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCmsVersion = exports.publishCms = exports.deleteAnnouncement = exports.updateAnnouncement = exports.createAnnouncement = exports.deleteFaq = exports.updateFaq = exports.createFaq = exports.updateStaticPage = exports.updateCashbackBanner = exports.updateReferralBanner = exports.reorderPromotionalBanners = exports.deletePromotionalBanner = exports.updatePromotionalBanner = exports.createPromotionalBanner = exports.reorderHeroBanners = exports.deleteHeroBanner = exports.updateHeroBanner = exports.createHeroBanner = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const index_1 = require("./index");
const db = admin.firestore();
// Helper to increment CMS version
async function incrementCmsVersion(adminUid) {
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
async function logCmsAction(adminInfo, action, targetType, targetId, before, after) {
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
exports.createHeroBanner = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
    const schema = zod_1.z.object({
        title: zod_1.z.string(),
        subtitle: zod_1.z.string(),
        imageUrl: zod_1.z.string().url(),
        gifUrl: zod_1.z.string().url().nullable().optional(),
        ctaText: zod_1.z.string(),
        ctaAction: zod_1.z.string(),
        genderTarget: zod_1.z.enum(['all', 'men', 'women']),
        zones: zod_1.z.array(zod_1.z.string()),
        isActive: zod_1.z.boolean()
    });
    const parsed = schema.safeParse(request.data);
    if (!parsed.success)
        throw new https_1.HttpsError('invalid-argument', parsed.error.issues[0].message);
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
exports.updateHeroBanner = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
    const { id, ...updateData } = request.data;
    if (!id)
        throw new https_1.HttpsError('invalid-argument', 'Missing banner ID');
    const bannerRef = db.collection('cms').doc('heroBanners').collection('items').doc(id);
    const currentSnap = await bannerRef.get();
    if (!currentSnap.exists)
        throw new https_1.HttpsError('not-found', 'Banner not found');
    const finalUpdate = {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminProfile.uid
    };
    await bannerRef.update(finalUpdate);
    await logCmsAction(adminProfile, 'update_hero_banner', 'cms_hero', id, currentSnap.data(), finalUpdate);
    return { success: true };
});
exports.deleteHeroBanner = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
    const { id } = request.data;
    if (!id)
        throw new https_1.HttpsError('invalid-argument', 'Missing banner ID');
    const bannerRef = db.collection('cms').doc('heroBanners').collection('items').doc(id);
    const currentSnap = await bannerRef.get();
    if (!currentSnap.exists)
        throw new https_1.HttpsError('not-found', 'Banner not found');
    await bannerRef.delete();
    await logCmsAction(adminProfile, 'delete_hero_banner', 'cms_hero', id, currentSnap.data(), null);
    return { success: true };
});
exports.reorderHeroBanners = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
    const { orders } = request.data; // Array of { id: string, sortOrder: number }
    if (!Array.isArray(orders))
        throw new https_1.HttpsError('invalid-argument', 'orders must be an array');
    const batch = db.batch();
    orders.forEach((item) => {
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
exports.createPromotionalBanner = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.updatePromotionalBanner = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.deletePromotionalBanner = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
    const { id } = request.data;
    const ref = db.collection('cms').doc('promotionalBanners').collection('items').doc(id);
    const oldSnap = await ref.get();
    await ref.delete();
    await logCmsAction(adminProfile, 'delete_promo_banner', 'cms_promo', id, oldSnap.data() || null, null);
    return { success: true };
});
exports.reorderPromotionalBanners = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
    const { orders } = request.data;
    const batch = db.batch();
    orders.forEach((item) => {
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
exports.updateReferralBanner = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.updateCashbackBanner = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.updateStaticPage = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
    const { slug, title, content } = request.data;
    if (!slug || !title || !content)
        throw new https_1.HttpsError('invalid-argument', 'Missing fields');
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
exports.createFaq = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.updateFaq = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.deleteFaq = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.createAnnouncement = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.updateAnnouncement = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.deleteAnnouncement = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
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
exports.publishCms = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Auth required.');
    const adminProfile = await (0, index_1.verifyAdminPermission)(request.auth.uid, 'content');
    await incrementCmsVersion(adminProfile.uid);
    await logCmsAction(adminProfile, 'publish_cms', 'cms_settings', 'global', null, { published: true });
    return { success: true };
});
exports.getCmsVersion = (0, https_1.onCall)({ region: 'asia-south1' }, async () => {
    const settingsRef = db.collection('cms').doc('settings');
    const globalRef = settingsRef.collection('global').doc('config');
    const docSnap = await globalRef.get();
    let currentVersion = 0;
    if (docSnap.exists) {
        currentVersion = docSnap.data()?.version || 0;
    }
    return { version: currentVersion };
});
//# sourceMappingURL=cms.js.map