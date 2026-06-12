import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Save } from 'lucide-react';
import type { AdminBooking } from '../../../services/adminDataService';

interface RescheduleDrawerProps {
  booking: AdminBooking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string, note?: string) => Promise<void>;
}

const AVAILABLE_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

export const RescheduleDrawer: React.FC<RescheduleDrawerProps> = ({ booking, isOpen, onClose, onConfirm }) => {
  const [date, setDate] = useState(booking?.slotDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(booking?.slotTime || '10:00');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if booking changes
  React.useEffect(() => {
    if (booking) {
      setDate(booking.slotDate || new Date().toISOString().split('T')[0]);
      setTime(booking.slotTime || '10:00');
      setNote('');
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(date, time, note);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-white shadow-2xl flex flex-col transition-transform transform border-l border-gray-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reschedule Booking</h2>
            <p className="text-sm text-gray-500 font-medium">ID: #{booking.id.slice(-6).toUpperCase()}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Current Details */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Booking</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Customer:</span>
              <span className="text-gray-900 font-semibold">{booking.customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Vendor:</span>
              <span className="text-gray-900 font-semibold">{booking.vendorName}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-3 mt-1">
              <span className="text-gray-500 font-medium">Scheduled For:</span>
              <span className="text-gray-900 font-semibold">{booking.slotDate} at {booking.slotTime}</span>
            </div>
          </div>

          {/* New Date */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CalendarIcon size={16} className="text-gray-500" /> New Date
            </label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* New Time Slots */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={16} className="text-gray-500" /> Available Time Slots
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {AVAILABLE_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => setTime(slot)}
                  className={`py-2 px-3 text-sm font-medium rounded-xl border transition-all ${
                    time === slot 
                      ? 'bg-black text-white border-black shadow-sm' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900">Reason for Reschedule</label>
            <textarea 
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Customer requested a later time..."
              className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 bg-white border border-gray-300 text-gray-900 font-semibold rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !date || !time}
            className="flex-1 bg-black text-white font-semibold rounded-xl py-2.5 hover:bg-gray-900 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} /> Confirm Reschedule
              </>
            )}
          </button>
        </div>

      </div>
    </>
  );
};
