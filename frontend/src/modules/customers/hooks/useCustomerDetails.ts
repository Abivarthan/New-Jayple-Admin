import { useEffect } from 'react';
import { useCustomerStore } from '../store/useCustomerStore';
import type { CustomerNote } from '../types/customer.types';

// Mock Data Generator
const generateMockData = (id: string) => {
  return {
    customer: {
      uid: id,
      name: 'John Doe',
      phone: '+91 98765 43210',
      email: 'john.doe@example.com',
      city: 'Mumbai',
      pincode: '400001',
      walletBalance: 2500,
      bookingsCount: 12,
      status: 'active' as const,
      referralCode: 'JOHND123',
      referralCount: 4,
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 365, // 1 year ago
      verificationStatus: 'verified' as const,
      lifetimeValue: 15400,
      averageOrderValue: 1280,
      addresses: [
        { id: '1', type: 'Home' as const, addressLine: '123, Sea View Apartments, Bandra West', city: 'Mumbai', pincode: '400050' },
        { id: '2', type: 'Work' as const, addressLine: '45, Tech Park, Andheri East', city: 'Mumbai', pincode: '400093' }
      ]
    },
    stats: {
      totalBookings: 12,
      completedBookings: 10,
      cancelledBookings: 2,
      totalSpend: 15400,
      lifetimeValue: 15400,
      averageOrderValue: 1280
    },
    bookings: [
      { id: 'BKG-001', service: 'AC Repair', vendor: 'Cool Breeze Services', date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'COMPLETED' as const, amount: 1500 },
      { id: 'BKG-002', service: 'Plumbing', vendor: 'Quick Fix Plumbers', date: new Date(Date.now() - 86400000 * 15).toISOString(), status: 'COMPLETED' as const, amount: 800 },
      { id: 'BKG-003', service: 'Deep Cleaning', vendor: 'Sparkle Clean', date: new Date(Date.now() - 86400000 * 40).toISOString(), status: 'CANCELLED' as const, amount: 3500 },
    ],
    activities: [
      { id: 'ACT-1', type: 'booking_created' as const, title: 'Booking Created', description: 'AC Repair with Cool Breeze', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 'ACT-2', type: 'payment' as const, title: 'Wallet Topup', description: 'Added ₹2000 to wallet', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'ACT-3', type: 'profile_update' as const, title: 'Address Added', description: 'Added Work address', timestamp: new Date(Date.now() - 86400000 * 30).toISOString() },
      { id: 'ACT-4', type: 'registration' as const, title: 'Registered', description: 'Account created via Mobile', timestamp: new Date(Date.now() - 86400000 * 365).toISOString() },
    ],
    payments: [
      { id: 'TXN-101', dateTime: new Date(Date.now() - 86400000 * 2).toISOString(), amount: -1500, type: 'DEBIT' as const, description: 'Payment for BKG-001', status: 'SUCCESS' as const },
      { id: 'TXN-102', dateTime: new Date(Date.now() - 86400000 * 5).toISOString(), amount: 2000, type: 'CREDIT' as const, description: 'Wallet Topup', status: 'SUCCESS' as const },
      { id: 'TXN-103', dateTime: new Date(Date.now() - 86400000 * 40).toISOString(), amount: 3500, type: 'CREDIT' as const, description: 'Refund for BKG-003', status: 'SUCCESS' as const },
    ],
    supportTickets: [
      { id: 'TKT-991', subject: 'Service Professional was late', status: 'CLOSED' as const, createdAt: new Date(Date.now() - 86400000 * 16).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 15).toISOString() }
    ],
    notes: [
      { id: 'NOTE-1', content: 'Customer prefers morning slots for AC servicing.', author: 'Admin Sarah', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() }
    ]
  };
};

export const useCustomerDetails = (customerId: string | undefined) => {
  const store = useCustomerStore();

  useEffect(() => {
    if (!customerId) return;

    let isMounted = true;
    store.setLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (isMounted) {
        const mockData = generateMockData(customerId);
        store.setCustomerData(mockData);
        store.setLoading(false);
      }
    }, 800);

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  const handleAddNote = async (content: string) => {
    // Simulate API
    const newNote: CustomerNote = {
      id: `NOTE-${Date.now()}`,
      content,
      author: 'Current Admin', // Should come from auth context
      createdAt: new Date().toISOString()
    };
    store.addNote(newNote);
  };

  const handleUpdateStatus = async (status: 'active' | 'locked') => {
    if (store.customer) {
      store.setCustomerData({ customer: { ...store.customer, status } });
    }
  };

  return {
    ...store,
    handleAddNote,
    handleUpdateStatus
  };
};
