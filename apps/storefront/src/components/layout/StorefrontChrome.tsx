"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@goshopping/storefront-sdk";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { toCartItemProps } from "@/lib/cart-adapter";
import { CART_DRAWER_OPEN_EVENT } from "@/lib/cart-drawer-events";

interface NavLink {
  label: string;
  href: string;
  children?: Array<{ label: string; href: string }>;
}

interface StorefrontChromeProps {
  storeSlug: string;
  navbarVariant?: "transparent" | "solid" | "floating";
  footerVariant?: "full" | "minimal";
  logo: { src?: string; text: string; href?: string };
  navLinks: NavLink[];
  storeName: string;
  tagline?: string;
  children: React.ReactNode;
}

/**
 * Design decision 12: thin Client Component wrapper around Navbar +
 * children + Footer + CartDrawer. `[storeSlug]/layout.tsx` stays a Server
 * Component (SSR of the branding CSS vars, REQ-RENDER-02) and only
 * instantiates this wrapper for the cart's UI state (drawer open/closed) —
 * cart DATA itself comes straight from `useCart`'s already-global
 * (localStorage-backed) singleton, no provider needed for that part.
 */
export function StorefrontChrome({
  storeSlug,
  navbarVariant,
  footerVariant,
  logo,
  navLinks,
  storeName,
  tagline,
  children,
}: StorefrontChromeProps) {
  const { cart, itemCount, removeItem, updateQuantity } = useCart(storeSlug);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // CART-02: close the drawer whenever the route changes (e.g. after
  // following its own "Ir a pagar" / catalog link).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // PRODUCT-04: lets the product page's "Ver carrito" toast action reopen
  // the drawer without a dedicated context provider — see cart-drawer-events.ts.
  useEffect(() => {
    const openDrawer = () => setDrawerOpen(true);
    window.addEventListener(CART_DRAWER_OPEN_EVENT, openDrawer);
    return () => window.removeEventListener(CART_DRAWER_OPEN_EVENT, openDrawer);
  }, []);

  const handleQuantityChange = (productId: string, quantity: number) => {
    try {
      updateQuantity(productId, quantity);
    } catch {
      // CART-03's stock cap already disables "+" before this can fire in the
      // UI; swallow a race (stock changed elsewhere) rather than crash the
      // drawer over it.
    }
  };

  return (
    <>
      <Navbar
        variant={navbarVariant}
        logo={logo}
        links={navLinks}
        cartCount={itemCount}
        onCartClick={() => setDrawerOpen(true)}
      />
      <main>{children}</main>
      <Footer variant={footerVariant} storeName={storeName} tagline={tagline} />
      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={cart.items.map(toCartItemProps)}
        onQuantityChange={handleQuantityChange}
        onRemove={removeItem}
        storeSlug={storeSlug}
      />
    </>
  );
}
