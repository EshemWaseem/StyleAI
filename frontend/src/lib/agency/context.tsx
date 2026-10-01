// lib/agency/context.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { agencyApi } from "@/lib/campaigns";
import type { AgencyClientEntry } from "@/lib/campaigns";

interface AgencyContextValue {
  isAgency: boolean;
  clients: AgencyClientEntry[];
  activeBrandId: string | null;
  activeBrandName: string | null;
  setActiveBrand: (brandId: string | null) => void;
  loading: boolean;
}

const AgencyContext = createContext<AgencyContextValue>({
  isAgency: false,
  clients: [],
  activeBrandId: null,
  activeBrandName: null,
  setActiveBrand: () => {},
  loading: false,
});

export function AgencyProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<AgencyClientEntry[]>([]);
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(
    () => typeof window !== "undefined" ? localStorage.getItem("agency.activeBrand") : null
  );
  const [loading, setLoading] = useState(false);

  // Detect agency — from localStorage user
  const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isAgency = !!user?.roles?.includes("AGENCY");

  useEffect(() => {
    if (!isAgency) return;
    setLoading(true);
    agencyApi.listClients()
      .then((r) => setClients(r.clients || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, [isAgency]);

  function setActiveBrand(brandId: string | null) {
    setActiveBrandIdState(brandId);
    if (typeof window !== "undefined") {
      if (brandId) localStorage.setItem("agency.activeBrand", brandId);
      else localStorage.removeItem("agency.activeBrand");
    }
  }

  const activeBrandName = (() => {
    if (!activeBrandId) return null;
    for (const c of clients) {
      const b = c.brands.find((x) => x.id === activeBrandId);
      if (b) return b.name;
    }
    return null;
  })();

  return (
    <AgencyContext.Provider
      value={{ isAgency, clients, activeBrandId, activeBrandName, setActiveBrand, loading }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  return useContext(AgencyContext);
}