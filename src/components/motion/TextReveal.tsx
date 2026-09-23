"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
export function TextReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return <div className="text-reveal"><motion.div className={className} initial={reduce ? false : { y: "105%" }} whileInView={reduce ? undefined : { y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div></div>;
}
