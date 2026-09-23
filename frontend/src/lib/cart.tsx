import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  image: string;
  category: string;
  qty: number;
};

type CartValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "qty">) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartValue>(() => {
    const add: CartValue["add"] = (item) =>
      setItems((prev) => {
        const found = prev.find((p) => p.slug === item.slug);
        if (found) return prev.map((p) => (p.slug === item.slug ? { ...p, qty: p.qty + 1 } : p));
        return [...prev, { ...item, qty: 1 }];
      });

    const setQty: CartValue["setQty"] = (slug, qty) =>
      setItems((prev) =>
        qty <= 0 ? prev.filter((p) => p.slug !== slug) : prev.map((p) => (p.slug === slug ? { ...p, qty } : p)),
      );

    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.qty * i.price, 0),
      add,
      setQty,
      remove: (slug) => setItems((prev) => prev.filter((p) => p.slug !== slug)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
