import { create } from 'zustand';
import type {
  CustomerDetails,
  CustomerStats,
  CustomerBooking,
  CustomerActivity,
  CustomerPayment,
  CustomerSupportTicket,
  CustomerNote
} from '../types/customer.types';

interface CustomerState {
  customer: CustomerDetails | null;
  stats: CustomerStats | null;
  bookings: CustomerBooking[];
  activities: CustomerActivity[];
  payments: CustomerPayment[];
  supportTickets: CustomerSupportTicket[];
  notes: CustomerNote[];
  isLoading: boolean;
  error: string | null;

  setCustomerData: (data: Partial<CustomerState>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addNote: (note: CustomerNote) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customer: null,
  stats: null,
  bookings: [],
  activities: [],
  payments: [],
  supportTickets: [],
  notes: [],
  isLoading: true,
  error: null,

  setCustomerData: (data) => set((state) => ({ ...state, ...data })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNote: (id, content) => set((state) => ({
    notes: state.notes.map(n => n.id === id ? { ...n, content } : n)
  })),
  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter(n => n.id !== id)
  }))
}));
