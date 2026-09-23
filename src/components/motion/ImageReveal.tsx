"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
export function ImageReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return <motion.div className={`image-reveal ${className}`} initial={reduce ? false : { opacity: 0, clipPath: "inset(0 0 100% 0)" }} whileInView={reduce ? undefined : { opacity: 1, clipPath: "inset(0 0 0% 0)" }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
