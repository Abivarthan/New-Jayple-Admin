import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { AdminUser } from '../../../shared/src/types';
import type { AdminPermission } from '../shared/constants/permissions';

interface AuthContextType {
  user: User | null;
  adminProfile: AdminUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  hasPermission: (permission: AdminPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setAdminProfile(null);
  };

  const hasPermission = (permission: AdminPermission): boolean => {
    if (!adminProfile) return false;
    if (adminProfile.role === 'superadmin') return true;
    return (adminProfile.permissions as string[]).includes(permission);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        try {
          setUser(currentUser);
          
          // Fetch admin profile
          const adminDocRef = doc(db, 'adminUsers', currentUser.uid);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            const profile = adminDocSnap.data() as AdminUser;
            
            if (profile.isActive) {
              setAdminProfile(profile);
            } else {
              // Deactivated admin -> sign out
              console.error('Admin account is inactive');
              await logout();
            }
          } else {
            // Not a registered admin -> sign out
            console.error('User is not a registered admin');
            await logout();
          }
        } catch (error) {
          console.error('Error fetching admin profile:', error);
          await logout();
        }
      } else {
        setUser(null);
        setAdminProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, adminProfile, loading, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
