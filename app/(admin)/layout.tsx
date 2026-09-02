import type { Metadata } from "next";

import { ToastProvider } from "@/components/ui/toast";

/**
 * The (admin) route group.
 *
 * Deliberately thin: the auth check, the shell and the data it needs live in
 * `admin/layout.tsx`, one level down, so `/admin/login` — which must render for
 * a signed-out visitor — does not inherit them.
 *
 * force-dynamic because every admin page reads the session cookie; a cached
 * admin page is a cached admin page for somebody else.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · The House Boss admin" },
  robots: { index: false, follow: false },
};

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
