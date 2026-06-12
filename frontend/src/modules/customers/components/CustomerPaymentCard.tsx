import React from 'react';
import type { CustomerPayment } from '../types/customer.types';
import { Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface Props {
  payments: CustomerPayment[];
}

export const CustomerPaymentCard: React.FC<Props> = ({ payments }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          Recent Transactions
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No recent transactions found.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {payments.map((payment) => (
              <div key={payment.id} className="p-4 hover:bg-white transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    payment.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {payment.type === 'CREDIT' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{payment.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(payment.dateTime).toLocaleDateString()} • {payment.id}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${payment.type === 'CREDIT' ? 'text-emerald-400' : 'text-gray-900'}`}>
                    {payment.type === 'CREDIT' ? '+' : ''}₹{Math.abs(payment.amount).toLocaleString()}
                  </div>
                  <div className={`text-[10px] mt-1 uppercase tracking-wider font-medium ${
                    payment.status === 'SUCCESS' ? 'text-emerald-500' : 
                    payment.status === 'FAILED' ? 'text-rose-500' : 'text-amber-500'
                  }`}>
                    {payment.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
