import React, { createContext, useContext, useState, ReactNode } from "react";

interface AdminContextType {
  showAdminView: boolean;
  setShowAdminView: (value: boolean) => void;
  currentAdminPage: string;
  setCurrentAdminPage: (page: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [showAdminView, setShowAdminView] = useState(false);
  const [currentAdminPage, setCurrentAdminPage] = useState("dashboard");

  return (
    <AdminContext.Provider value={{ showAdminView, setShowAdminView, currentAdminPage, setCurrentAdminPage }}>
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
