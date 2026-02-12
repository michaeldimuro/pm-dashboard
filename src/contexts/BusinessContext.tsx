import React, { createContext, useContext, useState } from 'react';
import type { Business } from '@/types';

interface BusinessContextType {
  currentBusiness: Business | 'all';
  setCurrentBusiness: (business: Business | 'all') => void;
  businesses: { id: Business; name: string; color: string }[];
  getBusinessName: (id: Business) => string;
  getBusinessColor: (id: Business) => string;
}

const businessDetails: { id: Business; name: string; color: string }[] = [
  { id: 'capture_health', name: 'Capture Health', color: '#22c55e' },
  { id: 'inspectable', name: 'Inspectable', color: '#6366f1' },
  { id: 'synergy', name: 'Synergy', color: '#f59e0b' },
];

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  // Default to 'all' to show aggregated data
  const [currentBusiness, setCurrentBusiness] = useState<Business | 'all'>('all');

  const getBusinessName = (id: Business) => {
    const business = businessDetails.find(b => b.id === id);
    return business?.name || id;
  };

  const getBusinessColor = (id: Business) => {
    const business = businessDetails.find(b => b.id === id);
    return business?.color || '#6366f1';
  };

  return (
    <BusinessContext.Provider
      value={{
        currentBusiness,
        setCurrentBusiness,
        businesses: businessDetails,
        getBusinessName,
        getBusinessColor,
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
