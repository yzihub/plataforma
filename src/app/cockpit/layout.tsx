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
        <span className="inline-block w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Carregando seu cockpit...</p>
      </div>
    );
  }

  // Network/Supabase error: show warning banner but still render the page
  if (error) {
    return (
      <>
        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs text-yellow-400">
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
        <div className="max-w-lg w-full rounded-2xl border border-gray-800 bg-white/[0.03] p-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-400 text-2xl">
              ⚙
            </span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white/90">
            Configuração Pendente
          </h2>
          <p className="mb-6 text-sm text-gray-400">
            Sua conta ainda não está vinculada a um tenant. Entre em contato
            com o administrador para completar a configuração.
          </p>
          <Link
            href="/signin"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-800 bg-white rounded-lg hover:bg-gray-100 transition-colors"
          >
            Voltar ao Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
        process.env.NODE_ENV !== "production" && (
          <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 font-mono">
            [DEV] tenant_id: {tenant.id} — {tenant.name}
          </div>
        )}
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
