import React from 'react';
import { FileBarChart } from 'lucide-react';

const mkPlaceholder = (title: string, desc: string) => {
  const P: React.FC = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
      <div className="p-8 bg-white rounded-2xl border border-gray-200 flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-700 flex items-center justify-center">
          <FileBarChart className="h-8 w-8 text-gray-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-800 font-semibold">{title}</p>
          <p className="text-gray-500 text-sm mt-2">Detailed reports with charts and CSV export. Coming soon.</p>
        </div>
      </div>
    </div>
  );
  return P;
};

export const BookingReports = mkPlaceholder('Booking Reports', 'Detailed booking stats by date, zone, category, and vendor.');
export const VendorReports = mkPlaceholder('Vendor Reports', 'Vendor performance, earnings, and activity reports.');
export const CustomerReports = mkPlaceholder('Customer Reports', 'Customer acquisition, retention, and spending analytics.');

export default BookingReports;
