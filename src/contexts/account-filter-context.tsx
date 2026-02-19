"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type AccountFilter = "pessoal" | "pj";

interface AccountFilterContextType {
  filter: AccountFilter;
  changeFilter: (filter: AccountFilter) => void;
  isPessoal: boolean;
  isPJ: boolean;
  ready: boolean;
}

const AccountFilterContext = createContext<AccountFilterContextType | undefined>(undefined);

export function AccountFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<AccountFilter>("pessoal");
  const [ready, setReady] = useState(false);

  // Restaurar filtro do localStorage após montagem para evitar hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem('account_filter') as AccountFilter;
    if (saved && ['pessoal', 'pj'].includes(saved)) {
      setFilter(saved);
    }
    setReady(true);
  }, []);

  const changeFilter = (newFilter: AccountFilter) => {
    setFilter(newFilter);
    localStorage.setItem('account_filter', newFilter);
    
    // Disparar evento para compatibilidade com código legado que possa ouvir o evento
    // (embora devêssemos migrar tudo para o contexto)
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('accountFilterChange', { detail: newFilter }));
    }
  };

  return (
    <AccountFilterContext.Provider 
      value={{ 
        filter, 
        changeFilter,
        isPessoal: filter === "pessoal",
        isPJ: filter === "pj",
        ready
      }}
    >
      {children}
    </AccountFilterContext.Provider>
  );
}

export function useAccountFilterContext() {
  const context = useContext(AccountFilterContext);
  if (context === undefined) {
    throw new Error("useAccountFilterContext must be used within a AccountFilterProvider");
  }
  return context;
}
