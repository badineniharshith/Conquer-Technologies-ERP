"use client";

import { motion, AnimatePresence, type Variants, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

// ─── Easing Curves ───────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

// ─── AnimatedPage ─────────────────────────────────────────────────
// Wraps an entire page with fade + slide-up entry animation.
// Use with AnimatePresence in AppLayout keyed by pathname.

const pageVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(2px)" },
};

export function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: EASE_OUT_EXPO as any }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerContainer / StaggerItem ───────────────────────────────
// Wrap a list/grid parent in StaggerContainer, each child in StaggerItem.
// Children animate in sequence with a configurable stagger delay.

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT_EXPO as any },
  },
};

export function StaggerContainer({
  children,
  className,
  delay = 0.1,
  stagger = 0.06,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ─── AnimatedCard ──────────────────────────────────────────────────
// Glassmorphic card with hover lift + glow. Use as a drop-in card wrapper.

export function AnimatedCard({
  children,
  className = "",
  hoverLift = true,
}: {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
}) {
  return (
    <motion.div
      variants={staggerItemVariants}
      whileHover={
        hoverLift
          ? {
              y: -2,
              boxShadow:
                "0 12px 28px -8px rgba(140, 49, 32, 0.08), 0 8px 16px -8px rgba(140, 49, 32, 0.06)",
              transition: { duration: 0.25, ease: EASE_OUT_QUART as any },
            }
          : undefined
      }
      className={`glass-card ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedModal ─────────────────────────────────────────────────
// Overlay backdrop + scale-in content panel. Wrap with AnimatePresence.

export function AnimatedModal({
  open,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO as any }}
            className={`relative w-full ${maxWidth} z-10`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── AnimatedDropdown ──────────────────────────────────────────────
// Scale-from-top dropdown. Use with AnimatePresence.

export function AnimatedDropdown({
  open,
  children,
  className = "",
  origin = "top-right",
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  origin?: "top-right" | "top-left" | "top-center";
}) {
  const originMap = {
    "top-right": "origin-top-right",
    "top-left": "origin-top-left",
    "top-center": "origin-top",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -2 }}
          transition={{ duration: 0.18, ease: EASE_OUT_EXPO as any }}
          className={`${originMap[origin]} ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── SkeletonPulse ─────────────────────────────────────────────────
// Premium shimmer skeleton loader. Replaces jarring loading spinners.

export function SkeletonPulse({
  className = "",
  lines = 3,
  compact = false,
}: {
  className?: string;
  lines?: number;
  compact?: boolean;
}) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`animate-shimmer rounded-lg bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 bg-[length:200%_100%] ${
            compact ? "h-3" : "h-4"
          }`}
          style={{ width: `${85 - i * 12}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

// Full-page skeleton for page loading states
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="h-20 rounded-2xl animate-shimmer bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 bg-[length:200%_100%]" />
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl animate-shimmer bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 bg-[length:200%_100%]"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="h-64 rounded-2xl animate-shimmer bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 bg-[length:200%_100%]"
          style={{ animationDelay: "0.4s" }}
        />
        <div
          className="h-64 rounded-2xl animate-shimmer bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 bg-[length:200%_100%]"
          style={{ animationDelay: "0.5s" }}
        />
      </div>
    </div>
  );
}

// ─── AnimatedTableRow ──────────────────────────────────────────────
// Use inside <tbody> for staggered table row animations.
// Note: motion.tr requires careful handling — use CSS animation fallback.

export function AnimatedTableRow({
  children,
  className = "",
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <tr
      className={`animate-fade-in-up ${className}`}
      style={{ animationDelay: `${index * 0.04}s`, animationFillMode: "both" }}
    >
      {children}
    </tr>
  );
}

// ─── Re-exports ────────────────────────────────────────────────────
export { motion, AnimatePresence };
