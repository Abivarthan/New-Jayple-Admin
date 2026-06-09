import { httpsCallable, getFunctions } from 'firebase/functions';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, app } from './firebase';

const functions = getFunctions(app, 'asia-south1');

// ── Types (mirror the customer ThemeConfig + UiConfig schema) ──────────────
export type ThemeMap = Record<string, unknown>;

export interface UiSection {
  type: string;
  enabled?: boolean;
  data?: Record<string, unknown>;
}

/// v3 SDUI: one ordered, targetable, parameterized section descriptor in the
/// explicit `feed[]`. Field names MUST match the Flutter `HomeSection.fromMap`
/// contract exactly (type/id/order/visible/themed/layout/targeting/data).
export interface FeedSection {
  type: string;
  id?: string;
  order?: number;
  visible?: boolean;
  themed?: boolean;
  layout?: Record<string, unknown>;
  targeting?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface UiConfigDoc {
  version?: number;
  theme?: ThemeMap;
  // v2 template model:
  templateId?: string;
  sectionVisibility?: Record<string, boolean>;
  sectionData?: Record<string, Record<string, unknown>>;
  // global default hero (applies to all zones unless a zone overrides):
  globalHero?: Record<string, unknown>;
  // per-gender override blocks:
  men?: Record<string, unknown>;
  women?: Record<string, unknown>;
  // v3 SDUI explicit ordered feed (source of truth when non-empty):
  feed?: FeedSection[];
  // legacy freeform:
  sections?: UiSection[];
  themeOverride?: ThemeMap;
}

export interface VersionInfo {
  version: number;
  publishedAt: number | null;
  publishedBy: string | null;
  archivedAt: number | null;
}

/** Default theme — ONE seed colour drives the whole top zone (the app derives
 *  header/search/chips/CTA from it). MUST match functions/admin-ui-config.js
 *  DEFAULT_THEME and the Flutter ThemeConfig.defaults. */
export const DEFAULT_THEME: ThemeMap = {
  seed: '#0E7490',
  accent: '#22D3EE',
  sheetBg: '#F8FAFC',
};

// ── Reads (direct Firestore — admin-gated by rules) ────────────────────────
export const fetchPublishedUiConfig = async (target: string): Promise<UiConfigDoc | null> => {
  const snap = await getDoc(doc(db, 'uiConfigs', target));
  return snap.exists() ? (snap.data() as UiConfigDoc) : null;
};

export const fetchDraftUiConfig = async (target: string): Promise<UiConfigDoc | null> => {
  const snap = await getDoc(doc(db, 'uiConfigDrafts', target));
  return snap.exists() ? (snap.data() as UiConfigDoc) : null;
};

export const fetchZones = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const snap = await getDocs(collection(db, 'serviceZones'));
    return snap.docs.map((d) => ({
      id: d.id,
      name: ((d.data() as Record<string, unknown>).name as string) || d.id,
    }));
  } catch {
    return [];
  }
};

// ── Media upload ───────────────────────────────────────────────────────────
// Images / GIF go through the CF (base64 → Storage). Video + Lottie-JSON exceed
// the callable base64 limit / aren't images, so they upload DIRECTLY via the
// Storage SDK to `ui-config/` and we store the download URL.
export const uploadCmsImage = httpsCallable<
  { fileBase64: string; contentType: string; folder?: string },
  { url: string }
>(functions, 'uploadCmsImage');

/** Upload any file (video / Lottie JSON / image) directly to Storage; return URL. */
export const uploadUiConfigFile = async (file: File): Promise<string> => {
  const storage = getStorage(app);
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');
  const path = `ui-config/${Date.now()}_${safeName}`;
  const r = storageRef(storage, path);
  await uploadBytes(r, file, { contentType: file.type || 'application/octet-stream' });
  return await getDownloadURL(r);
};

// ── Mutations (admin Cloud Functions — the only write path) ────────────────
export const saveUiConfigDraft = httpsCallable<
  {
    target: string;
    theme?: ThemeMap;
    templateId?: string;
    sectionVisibility?: Record<string, boolean>;
    sectionData?: Record<string, Record<string, unknown>>;
    globalHero?: Record<string, unknown>;
    men?: Record<string, unknown>;
    women?: Record<string, unknown>;
    feed?: FeedSection[];
    sections?: UiSection[];
    themeOverride?: ThemeMap;
  },
  { ok: boolean }
>(functions, 'saveUiConfigDraft');

export const publishUiConfig = httpsCallable<{ target: string }, { ok: boolean; version: number }>(
  functions,
  'publishUiConfig',
);

export const getUiConfigVersions = httpsCallable<{ target: string }, { versions: VersionInfo[] }>(
  functions,
  'getUiConfigVersions',
);

export const rollbackUiConfig = httpsCallable<
  { target: string; version: number },
  { ok: boolean; version: number }
>(functions, 'rollbackUiConfig');

export const seedGlobalUiTheme = httpsCallable<{ force?: boolean }, { ok: boolean }>(
  functions,
  'seedGlobalUiTheme',
);

export const backfillVendorOffers = httpsCallable<
  Record<string, never>,
  { ok: boolean; vendorsUpdated: number }
>(functions, 'backfillVendorOffers');
