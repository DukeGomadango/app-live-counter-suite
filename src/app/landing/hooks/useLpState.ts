"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type LayoutMode = "cards" | "strip";

export function useLpState() {
  const [layoutMode, setLayoutMode] = useLocalStorage<LayoutMode>("lp-layout-mode", "cards");
  const [mounted, setMounted] = useState(false);
  const [faqSectionOpen, setFaqSectionOpen] = useState(false);
  const [faqCategoryOpenIndex, setFaqCategoryOpenIndex] = useState<number | null>(null);
  const [faqQuestionOpenKey, setFaqQuestionOpenKey] = useState<string | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [showHeaderCta, setShowHeaderCta] = useState(false);
  const [dataLinkOpen, setDataLinkOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowHeaderCta(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const effectiveLayout = mounted ? layoutMode : "cards";

  return {
    layoutMode, setLayoutMode,
    mounted,
    faqSectionOpen, setFaqSectionOpen,
    faqCategoryOpenIndex, setFaqCategoryOpenIndex,
    faqQuestionOpenKey, setFaqQuestionOpenKey,
    changelogOpen, setChangelogOpen,
    showHeaderCta,
    dataLinkOpen, setDataLinkOpen,
    effectiveLayout
  };
}
