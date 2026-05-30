"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Awwwards-quality custom cursor for LP only.
 * - Small dot follows the mouse with spring-like lag
 * - Expands + shows label when hovering interactive elements
 * - Uses mix-blend-mode: difference for contrast inversion
 * - Automatically disabled on mobile / touch devices
 */
export default function LpCustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const animateRef = useRef<() => void>(() => {});
  const [isMobile, setIsMobile] = useState(true);

  // Detect mobile/touch device
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const update = () => setIsMobile(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Animation loop: smooth lag following the mouse
  useEffect(() => {
    animateRef.current = () => {
      const lerp = 0.15;
      posRef.current.x += (targetRef.current.x - posRef.current.x) * lerp;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * lerp;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${posRef.current.x - dotRef.current.offsetWidth / 2}px, ${posRef.current.y - dotRef.current.offsetHeight / 2}px, 0)`;
      }
      if (labelRef.current) {
        labelRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafRef.current = requestAnimationFrame(animateRef.current);
    };
  }, []);

  useEffect(() => {
    if (isMobile) return;

    // Add cursor-hiding class to body
    document.body.classList.add("lp-custom-cursor-active");

    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!dotRef.current || !labelRef.current) return;

      const interactive = target.closest("a, button, [role='button'], .lp-cursor-expand");
      const cta = target.closest(".lp-cursor-cta");

      if (cta) {
        dotRef.current.classList.add("is-hovering-cta");
        dotRef.current.classList.remove("is-hovering");
        labelRef.current.classList.add("is-visible");
        labelRef.current.textContent = "Explore";
      } else if (interactive) {
        dotRef.current.classList.add("is-hovering");
        dotRef.current.classList.remove("is-hovering-cta");
        labelRef.current.classList.remove("is-visible");
        labelRef.current.textContent = "";
      } else {
        dotRef.current.classList.remove("is-hovering", "is-hovering-cta");
        labelRef.current.classList.remove("is-visible");
        labelRef.current.textContent = "";
      }
    };

    const handleMouseLeave = () => {
      if (!dotRef.current || !labelRef.current) return;
      dotRef.current.classList.remove("is-hovering", "is-hovering-cta");
      labelRef.current.classList.remove("is-visible");
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    rafRef.current = requestAnimationFrame(animateRef.current);

    return () => {
      document.body.classList.remove("lp-custom-cursor-active");
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <>
      <div ref={dotRef} className="lp-cursor-dot" aria-hidden="true" />
      <div ref={labelRef} className="lp-cursor-label" aria-hidden="true" />
    </>
  );
}
