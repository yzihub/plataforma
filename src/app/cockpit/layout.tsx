"use client";

import { useSidebar } from "@/context/SidebarContext";
import { TenantProvider, useTenantContext } from "@/context/TenantContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import Link from "next/link";
import React from "react";

// ─── Inner component that consumes TenantContext safely ───────────────────────

function CockpitContent({ children }: { children: React.ReactNode }) {
  const { loading, error, tenant } = useTenantContext();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="inline-block w-8 h-8 border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando seu cockpit...</p>
      </div>
    );
  }

  // Network/Supabase error: show warning banner but still render the page
  if (error) {
    return (
      <>
        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 px-4 py-2.5 text-xs text-yellow-700 dark:text-yellow-400">
          Falha ao conectar ao Supabase — {error}
        </div>
        {children}
      </>
    );
  }

  // No tenant linked: block with setup screen
  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-lg w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-2xl">
              ⚙
            </span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Configuração Pendente
          </h2>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Sua conta ainda não está vinculada a um tenant. Entre em contato
            com o administrador para completar a configuração.
          </p>
          <Link
            href="/signin"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            Voltar ao Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function CockpitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <TenantProvider>
      <div className="min-h-screen xl:flex">
        {/* Sidebar and Backdrop */}
        <AppSidebar />
        <Backdrop />
        {/* Main Content Area */}
        <div
          className={`flex-1 transition-all duration-300 ease-in-out overflow-x-hidden ${mainContentMargin}`}
        >
          {/* Header */}
          <AppHeader />
          {/* Page Content */}
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
            <CockpitContent>{children}</CockpitContent>
          </div>
        </div>
      </div>
    </TenantProvider>
  );
}
