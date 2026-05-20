"use client";

import { usePathname } from "next/navigation";
import { Topbar } from "@/components/topbar";

const HIDE_TOPBAR_ROUTES = ["/login", "/reset-password"];

export function TopbarWrapper() {
  const pathname = usePathname();

  if (HIDE_TOPBAR_ROUTES.includes(pathname)) return null;

  return <Topbar />;
}
