import React, { useState } from 'react';
import type { CustomerBooking } from '../types/customer.types';
import { Search, Filter, Download, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

interface Props {
  bookings: CustomerBooking[];
}

export const CustomerBookingTable: React.FC<Props> = ({ bookings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredBookings = bookings.filter(b => 
    b.service.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl flex flex-col h-full">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-fuchsia-400" />
          Booking History
        </h3>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-50/50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-violet-500 transition-all w-full sm:w-64"
            />
          </div>
          <button className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 transition-colors" title="Filter">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 transition-colors" title="Export CSV">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/30 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-medium">Booking ID</th>
              <th className="px-6 py-4 font-medium">Service & Vendor</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-white transition-colors">
                  <td className="px-6 py-4 font-mono text-black font-semibold">{booking.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 font-medium">{booking.service}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{booking.vendor}</div>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(booking.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    ₹{booking.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                      booking.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      booking.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-gray-200 mt-auto flex items-center justify-between text-sm text-gray-500">
        <div>Showing 1 to {filteredBookings.length} of {filteredBookings.length} entries</div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50" disabled>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50" disabled>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
