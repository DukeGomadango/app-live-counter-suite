"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LP_FAQ_GROUPED } from "@/lib/lp-faq";

interface LpFaqProps {
  sectionOpen: boolean;
  onSectionToggle: () => void;
  categoryOpenIndex: number | null;
  onCategoryToggle: (index: number | null) => void;
  questionOpenKey: string | null;
  onQuestionToggle: (key: string | null) => void;
  effectiveLight: boolean;
  panelBg: string;
  panelBorder: string;
  panelShadow: string;
  accentColor: string;
}

export function LpFaq({
  sectionOpen,
  onSectionToggle,
  categoryOpenIndex,
  onCategoryToggle,
  questionOpenKey,
  onQuestionToggle,
  effectiveLight,
  panelBg,
  panelBorder,
  panelShadow,
  accentColor,
}: LpFaqProps) {
  return (
    <section
      className="w-full max-w-2xl mx-auto mt-2 rounded-2xl overflow-hidden shrink-0"
      style={{
        background: panelBg,
        backdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
        WebkitBackdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
        border: panelBorder,
        boxShadow: panelShadow,
      }}
      aria-labelledby="lp-faq-heading"
    >
      <div className="h-[2px] opacity-60" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} aria-hidden />
      <button
        type="button"
        onClick={onSectionToggle}
        className={`w-full flex items-center gap-2 px-4 py-3 text-left ${effectiveLight ? "text-neutral-800 hover:bg-black/5" : "text-white hover:bg-white/5"}`}
        aria-expanded={sectionOpen}
        aria-controls="lp-faq-body"
      >
        {sectionOpen ? <ChevronDown size={18} className="shrink-0" /> : <ChevronRight size={18} className="shrink-0" />}
        <h2 id="lp-faq-heading" className="text-base font-bold" style={{ color: accentColor }}>よくある質問</h2>
      </button>
      <motion.div
        id="lp-faq-body" initial={false} animate={{ height: sectionOpen ? "auto" : 0, opacity: sectionOpen ? 1 : 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"
      >
        <div className="px-4 pb-4">
          {LP_FAQ_GROUPED.map((group, catIdx) => {
            const isCategoryOpen = categoryOpenIndex === catIdx;
            return (
              <div key={catIdx} className={`rounded-xl border overflow-hidden mt-2 first:mt-0 ${effectiveLight ? "border-black/8" : "border-white/10"}`}>
                <button
                  type="button" onClick={() => onCategoryToggle(isCategoryOpen ? null : catIdx)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${effectiveLight ? "text-neutral-800 hover:bg-black/5" : "text-white hover:bg-white/5"}`}
                  aria-expanded={isCategoryOpen} aria-controls={`lp-faq-cat-${catIdx}`}
                >
                  {isCategoryOpen ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
                  <span>{group.category}</span>
                </button>
                <motion.div id={`lp-faq-cat-${catIdx}`} initial={false} animate={{ height: isCategoryOpen ? "auto" : 0, opacity: isCategoryOpen ? 1 : 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div>
                    {group.items.map((item, qIdx) => {
                      const questionKey = `${catIdx}-${qIdx}`;
                      const isQuestionOpen = questionOpenKey === questionKey;
                      return (
                        <div key={qIdx} className={qIdx === 0 ? "" : effectiveLight ? "border-t border-black/8" : "border-t border-white/10"}>
                          <button
                            type="button" onClick={() => onQuestionToggle(isQuestionOpen ? null : questionKey)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${effectiveLight ? "text-neutral-700 hover:bg-black/5" : "text-white/90 hover:bg-white/5"}`}
                            style={{ paddingLeft: "calc(0.75rem + 16px + 0.5rem)" }} aria-expanded={isQuestionOpen} aria-controls={`lp-faq-answer-${questionKey}`} id={`lp-faq-question-${questionKey}`}
                          >
                            {isQuestionOpen ? <ChevronDown size={14} className="shrink-0 opacity-70" /> : <ChevronRight size={14} className="shrink-0 opacity-70" />}
                            <span>{item.q}</span>
                          </button>
                          <motion.div id={`lp-faq-answer-${questionKey}`} role="region" aria-labelledby={`lp-faq-question-${questionKey}`} initial={false} animate={{ height: isQuestionOpen ? "auto" : 0, opacity: isQuestionOpen ? 1 : 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <p className={`px-3 pb-3 pt-0 text-sm leading-relaxed ${effectiveLight ? "text-neutral-600" : "text-white/70"}`} style={{ paddingLeft: "calc(0.75rem + 16px + 0.5rem + 14px + 0.5rem)" }}>{item.a}</p>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
