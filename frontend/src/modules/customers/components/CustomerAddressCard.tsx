import React from 'react';
import type { CustomerAddress } from '../types/customer.types';
import { Home, Briefcase, MapPin, ExternalLink } from 'lucide-react';

interface Props {
  addresses: CustomerAddress[];
}

export const CustomerAddressCard: React.FC<Props> = ({ addresses }) => {
  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home': return <Home className="w-5 h-5 text-blue-400" />;
      case 'work': return <Briefcase className="w-5 h-5 text-emerald-400" />;
      default: return <MapPin className="w-5 h-5 text-black font-semibold" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-gray-500" />
        Saved Locations
      </h3>

      {addresses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No saved locations found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div key={address.id} className="p-4 rounded-xl bg-gray-50/50 border border-gray-200 hover:border-gray-200 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white border border-gray-200">
                    {getIcon(address.type)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{address.type}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{address.city}, {address.pincode}</div>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-black font-semibold opacity-0 group-hover:opacity-100 transition-opacity" title="View on Map">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                {address.addressLine}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
