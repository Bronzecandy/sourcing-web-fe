import { useEffect } from "react";

export type BrandId = "sourcing" | "tester";

export const BRANDS: Record<BrandId, { title: string; icon: string; word: string; tag: string }> = {
  sourcing: { title: "Sourcing-Game", icon: "/brand/sourcing-icon.svg", word: "SOURCING", tag: "GAME" },
  tester: { title: "Tester Program", icon: "/brand/tester-icon.svg", word: "TESTER", tag: "PROGRAM" },
};

/** Tên tab + favicon theo trang (Sourcing và Tester Program chung một SPA). */
export function applyDocumentBrand(brand: BrandId): void {
  const b = BRANDS[brand];
  if (document.title !== b.title) document.title = b.title;
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link && link.getAttribute("href") !== b.icon) link.setAttribute("href", b.icon);
}

export function useDocumentBrand(brand: BrandId): void {
  useEffect(() => {
    applyDocumentBrand(brand);
  }, [brand]);
}
