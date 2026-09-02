import type { Metadata } from "next";

/**
 * Development-only routes (the styleguide). No marketing chrome, but they
 * still need a `main` landmark — WCAG 1.3.1 / Lighthouse `landmark-one-main`.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex-1">
      {children}
    </main>
  );
}
