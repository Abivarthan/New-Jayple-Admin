import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Unauthorized } from './pages/Unauthorized';
import { Dashboard } from './pages/Dashboard';
import { PlatformConfig } from './pages/PlatformConfig';
import { Zones } from './pages/Zones';
import { ImageLibrary } from './pages/ImageLibrary';
import { Categories } from './pages/Categories';
import { HomeContent } from './pages/HomeContent';
import { UIConfigEditor } from './pages/UIConfigEditor';
import { Analytics } from './pages/Analytics';
import { AllVendors } from './pages/vendors/AllVendors';
import { VendorApprovals } from './pages/vendors/VendorApprovals';
import { VendorDetail } from './pages/vendors/VendorDetail';
import { Users } from './pages/Users';
import { Settlements } from './pages/Settlements';
import { Waitlist } from './pages/Waitlist';
import { HeroBanners } from './pages/content/HeroBanners';
import { Promotions } from './pages/content/Promotions';
import { StaticPages } from './pages/content/StaticPages';
import { CMSSettings } from './pages/content/CMSSettings';
import { Faqs } from './pages/content/Faqs';
import { Announcements } from './pages/content/Announcements';

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Guarded Admin Dashboard Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Default Index Route */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              <Route path="zones" element={<Zones />} />
              <Route path="ui-config" element={<UIConfigEditor />} />
              <Route path="image-library" element={<ImageLibrary />} />
              <Route path="categories" element={<Categories />} />
              <Route path="home-content" element={<HomeContent />} />
              <Route path="vendors" element={<AllVendors />} />
              <Route path="vendors/approvals" element={<VendorApprovals />} />
              <Route path="vendors/:id" element={<VendorDetail />} />
              <Route path="users" element={<Users />} />
              <Route
                path="bookings"
                element={
                  <div className="p-6 bg-slate-800 rounded-xl border border-slate-600">
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Bookings</h2>
                    <p className="text-slate-400 text-sm">Customer booking management dashboard placeholder. Implementation under construction.</p>
                  </div>
                }
              />
              <Route path="settlements" element={<Settlements />} />
              <Route
                path="promotions"
                element={
                  <div className="p-6 bg-slate-800 rounded-xl border border-slate-600">
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Promotions & Combo Packages</h2>
                    <p className="text-slate-400 text-sm">Voucher and bundle deal configurator placeholder. Implementation under construction.</p>
                  </div>
                }
              />
              <Route path="platform-config" element={<PlatformConfig />} />
              <Route path="analytics" element={<Analytics />} />
              <Route
                path="admin-users"
                element={
                  <div className="p-6 bg-slate-800 rounded-xl border border-slate-600">
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Admin User Management</h2>
                    <p className="text-slate-400 text-sm">Create/Deactivate admin accounts interface. Implementation under construction.</p>
                  </div>
                }
              />
              <Route
                path="audit-log"
                element={
                  <div className="p-6 bg-slate-800 rounded-xl border border-slate-600">
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Audit Logs</h2>
                    <p className="text-slate-400 text-sm">Write-only operation history viewer. Implementation under construction.</p>
                  </div>
                }
              />
              <Route path="waitlist" element={<Waitlist />} />

              {/* CMS Routes */}
              <Route path="content/hero-banners" element={<HeroBanners />} />
              <Route path="content/promotions" element={<Promotions />} />
              <Route path="content/static-pages" element={<StaticPages />} />
              <Route path="content/settings" element={<CMSSettings />} />
              
              <Route path="content/referral-banner" element={
                <div className="p-6 bg-slate-800 rounded-xl border border-slate-600 m-8">
                  <h2 className="text-xl font-bold text-slate-100 mb-2">Referral Banner CMS</h2>
                  <p className="text-slate-400 text-sm">Implementation pending.</p>
                </div>
              } />
              <Route path="content/cashback-banner" element={
                <div className="p-6 bg-slate-800 rounded-xl border border-slate-600 m-8">
                  <h2 className="text-xl font-bold text-slate-100 mb-2">Cashback Banner CMS</h2>
                  <p className="text-slate-400 text-sm">Implementation pending.</p>
                </div>
              } />
              <Route path="content/faqs" element={<Faqs />} />
              <Route path="content/announcements" element={<Announcements />} />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
