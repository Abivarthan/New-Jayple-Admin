import React from 'react';
import type { CustomerSupportTicket } from '../types/customer.types';
import { HeadphonesIcon, ExternalLink } from 'lucide-react';

interface Props {
  tickets: CustomerSupportTicket[];
}

export const CustomerSupportCard: React.FC<Props> = ({ tickets }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <HeadphonesIcon className="w-5 h-5 text-amber-400" />
          Support Tickets
        </h3>
        <button className="text-xs text-black font-semibold hover:text-black font-semibold font-medium transition-colors">
          View All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {tickets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No support tickets.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-4 rounded-xl bg-gray-50/50 border border-gray-200 hover:border-gray-200 transition-colors group">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900 line-clamp-1 pr-4">
                    {ticket.subject}
                  </div>
                  <button className="text-gray-500 hover:text-black font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                    ticket.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    ticket.status === 'ESCALATED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-slate-700 text-gray-800 border border-gray-200'
                  }`}>
                    {ticket.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
