import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/customers"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
      </div>
      <div className="p-8 bg-slate-800/60 rounded-2xl border border-slate-700 flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center">
          <User className="h-8 w-8 text-slate-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100">Customer Detail</h2>
          <p className="text-sm text-slate-400 mt-1">Customer ID: <code className="text-violet-400">{id}</code></p>
          <p className="text-slate-500 text-sm mt-4">
            Full customer detail page — booking history, wallet transactions, support tools.
            <br />Implementation coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
