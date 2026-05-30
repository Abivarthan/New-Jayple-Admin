import { useQuery } from '@tanstack/react-query';
import { 
  fetchHeroBanners, 
  fetchPromotionalBanners, 
  fetchReferralBanner, 
  fetchCashbackBanner, 
  fetchFaqs, 
  fetchAnnouncements, 
  fetchStaticPages,
  fetchCmsSettings
} from '../services/cmsService';
import type { 
  CMSHeroBanner, 
  CMSPromotionalBanner, 
  CMSReferralConfig, 
  CMSCashbackConfig, 
  CMSFaq, 
  CMSAnnouncement, 
  CMSStaticPage,
  CMSSettings 
} from '../../../shared/src/types';

// CMS queries usually don't change very often, cache for 30 minutes.
const CMS_STALE_TIME = 30 * 60 * 1000;
const SETTINGS_STALE_TIME = 5 * 60 * 1000;

export const useHeroBanners = () => {
  return useQuery<CMSHeroBanner[]>({
    queryKey: ['cms', 'heroBanners'],
    queryFn: fetchHeroBanners as () => Promise<CMSHeroBanner[]>,
    staleTime: CMS_STALE_TIME
  });
};

export const usePromotionalBanners = () => {
  return useQuery<CMSPromotionalBanner[]>({
    queryKey: ['cms', 'promotionalBanners'],
    queryFn: fetchPromotionalBanners as () => Promise<CMSPromotionalBanner[]>,
    staleTime: CMS_STALE_TIME
  });
};

export const useReferralBanner = () => {
  return useQuery<CMSReferralConfig | null>({
    queryKey: ['cms', 'referralBanner'],
    queryFn: fetchReferralBanner as () => Promise<CMSReferralConfig | null>,
    staleTime: CMS_STALE_TIME
  });
};

export const useCashbackBanner = () => {
  return useQuery<CMSCashbackConfig | null>({
    queryKey: ['cms', 'cashbackBanner'],
    queryFn: fetchCashbackBanner as () => Promise<CMSCashbackConfig | null>,
    staleTime: CMS_STALE_TIME
  });
};

export const useFaqs = () => {
  return useQuery<CMSFaq[]>({
    queryKey: ['cms', 'faqs'],
    queryFn: fetchFaqs as () => Promise<CMSFaq[]>,
    staleTime: CMS_STALE_TIME
  });
};

export const useAnnouncements = () => {
  return useQuery<CMSAnnouncement[]>({
    queryKey: ['cms', 'announcements'],
    queryFn: fetchAnnouncements as () => Promise<CMSAnnouncement[]>,
    staleTime: CMS_STALE_TIME
  });
};

export const useStaticPages = () => {
  return useQuery<CMSStaticPage[]>({
    queryKey: ['cms', 'staticPages'],
    queryFn: fetchStaticPages as () => Promise<CMSStaticPage[]>,
    staleTime: CMS_STALE_TIME
  });
};

export const useCmsSettings = () => {
  return useQuery<CMSSettings>({
    queryKey: ['cms', 'settings'],
    queryFn: fetchCmsSettings as () => Promise<CMSSettings>,
    staleTime: SETTINGS_STALE_TIME
  });
};
