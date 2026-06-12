import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-900'}`}>
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <div className="text-sm text-gray-500">{message}</div>
              </div>
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-4 py-2 font-medium text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`px-4 py-2 font-medium text-white rounded-xl transition-colors ${
                isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-900'
              }`}
            >
              {confirmText}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};
