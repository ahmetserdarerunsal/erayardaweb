"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function BiographyReveal({
  children,
  className = "",
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  immediate?: boolean;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate);

  useEffect(() => {
    if (immediate) return;

    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [immediate]);

  return (
    <div
      ref={elementRef}
      className={`biography-reveal${visible ? " biography-reveal--visible" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
