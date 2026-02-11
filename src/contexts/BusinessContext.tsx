import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Business } from '@/types';

interface BusinessContextType {
  currentBusiness: Business;
  setCurrentBusiness: (business: Business) => void;
  businesses: { id: Business; name: string; color: string }[];
}

const businessDetails: { id: Business; name: string; color: string }[] = [
  { id: 'capture_health', name: 'Capture Health', color: '#22c55e' },
  { id: 'inspectable', name: 'Inspectable', color: '#6366f1' },
  { id: 'synergy', name: 'Synergy Property', color: '#f59e0b' },
];

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [currentBusiness, setCurrentBusiness] = useState<Business>(() => {
    const stored = localStorage.getItem('currentBusiness');
    return (stored as Business) || 'capture_health';
  });

  useEffect(() => {
    localStorage.setItem('currentBusiness', currentBusiness);
  }, [currentBusiness]);

  return (
    <BusinessContext.Provider
      value={{
        currentBusiness,
        setCurrentBusiness,
        businesses: businessDetails,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
