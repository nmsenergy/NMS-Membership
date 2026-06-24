import React, { createContext, useContext, useState, ReactNode } from "react";

interface AdminContextType {
  isAdminView: boolean;
  setIsAdminView: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdminView, setIsAdminView] = useState(false);

  return (
    <AdminContext.Provider value={{ isAdminView, setIsAdminView }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminView() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminView must be used within AdminProvider");
  }
  return context;
}
