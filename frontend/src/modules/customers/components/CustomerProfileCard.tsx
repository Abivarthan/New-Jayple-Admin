import React from 'react';
import type { CustomerDetails } from '../types/customer.types';
import { User, Phone, Mail, MapPin, ShieldCheck, Clock } from 'lucide-react';

interface Props {
  customer: CustomerDetails;
}

export const CustomerProfileCard: React.FC<Props> = ({ customer }) => {
  const isVerified = customer.verificationStatus === 'verified';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 p-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
          customer.status === 'active' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          {customer.status === 'active' ? 'Active Account' : 'Suspended'}
        </span>
      </div>

      <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <User className="w-12 h-12 text-gray-800" />
          </div>
          {isVerified && (
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1 border-2 border-gray-200" title="Verified Customer">
              <ShieldCheck className="w-4 h-4 text-gray-900" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
            {customer.name}
          </h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-gray-500" />
              {customer.phone}
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-gray-500" />
              {customer.email}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-500" />
              {customer.city}, {customer.pincode}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-500" />
              Joined {new Date(customer.joinedAt || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200">
          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wider">Customer ID</div>
          <div className="text-gray-900 font-mono text-sm truncate">{customer.uid}</div>
        </div>
        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200">
          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wider">Referral Code</div>
          <div className="text-black font-semibold font-mono text-sm font-semibold">{customer.referralCode}</div>
        </div>
        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200">
          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wider">Total Referrals</div>
          <div className="text-gray-900 text-lg font-semibold">{customer.referralCount}</div>
        </div>
        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200">
          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wider">Wallet Balance</div>
          <div className="text-emerald-400 text-lg font-semibold">₹{customer.walletBalance.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};
