"use client";

import { useSidebar } from "@/context/SidebarContext";
import { TenantProvider } from "@/context/TenantContext";
import AppHeader from "@/layout/AppHeader";
import ControlSidebar from "@/layout/ControlSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <TenantProvider>
      <div className="min-h-screen xl:flex">
        <ControlSidebar />
        <Backdrop />
        <div
          className={`flex-1 transition-all duration-300 ease-in-out overflow-x-hidden ${mainContentMargin}`}
        >
          <AppHeader />
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
            {children}
          </div>
        </div>
      </div>
    </TenantProvider>
  );
}
