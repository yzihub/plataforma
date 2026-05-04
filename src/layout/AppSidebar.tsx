"use client";
import React, { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useTenant } from "@/hooks/useTenant";
import UpgradeCard from "@/components/yzihub/UpgradeCard";
import UpgradeModal from "@/components/yzihub/UpgradeModal";
import type { TenantPlan } from "@/lib/control/types";
import {
  GridIcon,
  GroupIcon,
  BoxCubeIcon,
  ShootingStarIcon,
  PaperPlaneIcon,
  PieChartIcon,
  BoltIcon,
  DollarLineIcon,
  BoxIcon,
  PlugInIcon,
  DocsIcon,
  HorizontaLDots,
  UserIcon,
  CalenderIcon,
  ChatIcon,
} from "../icons/index";

// ── Chevron icon for submenus ──────────────────────────────────────────────────
const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`size-3 ml-auto transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 4l4 4 4-4" />
  </svg>
);

// ── Plan hierarchy ────────────────────────────────────────────────────────────
const PLAN_RANK: Record<TenantPlan, number> = { starter: 0, growth: 1, enterprise: 2 };

// ── Types ─────────────────────────────────────────────────────────────────────
type NavChild = {
  name: string;
  path: string;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;            // optional for parent items with children
  module?: string;          // required module key — omit = always visible
  adminOnly?: true;
  requiredPlan?: 'growth' | 'enterprise';  // two-level plan gating
  children?: NavChild[];    // submenu items
  submenuKey?: string;      // unique key for tracking open state
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// ── Menu definition ───────────────────────────────────────────────────────────
const SECTIONS: NavSection[] = [
  {
    label: "Painel",
    items: [
      { name: "Dashboard", icon: <GridIcon />, path: "/cockpit" },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Corretores",      icon: <UserIcon />,        path: "/cockpit/corretores" },
      {
        name: "Leads",
        icon: <GroupIcon />,
        submenuKey: "leads",
        children: [
          { name: "Lista",        path: "/cockpit/leads" },
          { name: "Kanban Lead",  path: "/cockpit/jurema" },
        ],
      },
      { name: "Evolution",       icon: <ChatIcon />,        path: "/cockpit/evolution" },
      { name: "Calendario",      icon: <CalenderIcon />,    path: "/cockpit/calendario" },
      { name: "CRM / Pipeline",  icon: <BoxCubeIcon />,     path: "/cockpit/crm" },
      {
        name: "Imoveis",
        icon: <BoxIcon />,
        submenuKey: "imoveis",
        children: [
          { name: "Catalogo", path: "/cockpit/imoveis" },
        ],
      },
    ],
  },
  {
    label: "Gestao",
    items: [
      {
        name: "Financeiro",
        icon: <DollarLineIcon />,
        submenuKey: "financeiro",
        children: [
          { name: "Comissoes",  path: "/cockpit/financeiro?tab=comissoes" },
          { name: "Contratos", path: "/cockpit/contratos" },
          { name: "Geral",     path: "/cockpit/financeiro" },
        ],
      },
      { name: "Calendario",  icon: <CalenderIcon />, path: "/cockpit/calendario" },
    ],
  },
  {
    label: "Modulos",
    items: [
      { name: "Radar",           icon: <ShootingStarIcon />, path: "/cockpit/radar",     module: "radar",        requiredPlan: 'growth' },
      { name: "Social",          icon: <PaperPlaneIcon />,   path: "/cockpit/social",    module: "social" },
      { name: "Trafego Pago",    icon: <PieChartIcon />,     path: "/cockpit/traffic",   module: "paid_traffic", requiredPlan: 'growth' },
      { name: "AI Assistant",    icon: <BoltIcon />,         path: "/cockpit/ai",        module: "ia_onboarding" },
      { name: "Conteudo IA",     icon: <DocsIcon />,         path: "/cockpit/conteudo",  module: "ia_content",   requiredPlan: 'enterprise' },
      { name: "E-commerce",      icon: <DollarLineIcon />,   path: "/cockpit/ecommerce", module: "ecommerce" },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "YZI CONTROL",     icon: <BoxIcon />,          path: "/control",                    adminOnly: true },
      { name: "YZI FACTORY",     icon: <PlugInIcon />,       path: "/factory",                    adminOnly: true },
      { name: "Action Logs",     icon: <DocsIcon />,         path: "/control/logs",               adminOnly: true },
      { name: "Observabilidade", icon: <BoltIcon />,         path: "/cockpit/observabilidade",    adminOnly: true },
      { name: "Teste Ju",        icon: <BoltIcon />,         path: "/cockpit/jurema-teste" },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { tenant, isGlobalAdmin, loading } = useTenant();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<'growth' | 'enterprise' | null>(null);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    // Auto-open submenus whose child matches current pathname
    const initial: Record<string, boolean> = {};
    SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (item.submenuKey && item.children) {
          const hasActiveChild = item.children.some((child) =>
            pathname === child.path || pathname.startsWith(child.path.split("?")[0])
          );
          if (hasActiveChild) {
            initial[item.submenuKey] = true;
          }
        }
      });
    });
    return initial;
  });

  const activeModules = tenant?.activeModules ?? [];

  const isActive = useCallback(
    (path: string) => pathname === path || (path !== "/cockpit" && pathname.startsWith(path)),
    [pathname]
  );

  const isChildActive = useCallback(
    (children: NavChild[]) => children.some((c) => {
      const basePath = c.path.split("?")[0];
      return pathname === basePath || (basePath !== "/cockpit" && pathname.startsWith(basePath));
    }),
    [pathname]
  );

  const isLockedForPlan = (item: NavItem): boolean => {
    if (!item.requiredPlan || !tenant) return false;
    return PLAN_RANK[tenant.plan] < PLAN_RANK[item.requiredPlan];
  };

  const isVisible = useCallback(
    (item: NavItem) => {
      if (item.adminOnly && !isGlobalAdmin) return false;
      // requiredPlan items are always visible (shown with tier badge when locked)
      if (item.requiredPlan) return true;
      if (item.module && !activeModules.includes(item.module as import("@/context/TenantContext").ActiveModule)) return false;
      return true;
    },
    [isGlobalAdmin, activeModules]
  );

  const showLabel = isExpanded || isHovered || isMobileOpen;

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // While loading, show non-module, non-admin items only
  const visibleSections = SECTIONS.map((section) => ({
    ...section,
    items: loading
      ? section.items.filter((i) => !i.module && !i.adminOnly)
      : section.items.filter(isVisible),
  })).filter((section) => section.items.length > 0);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/cockpit">
          {showLabel ? (
            <>
              <Image className="dark:hidden" src="/images/logo/logo.svg" alt="YZIHUB" width={150} height={40} />
              <Image className="hidden dark:block" src="/images/logo/logo-dark.svg" alt="YZIHUB" width={150} height={40} />
            </>
          ) : (
            <Image src="/images/logo/logo-icon.svg" alt="YZIHUB" width={32} height={32} />
          )}
        </Link>
      </div>

      {/* Nav */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            {visibleSections.map((section) => (
              <div key={section.label}>
                <h2
                  className={`mb-3 text-xs uppercase leading-[20px] text-gray-400 flex ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                  }`}
                >
                  {showLabel ? section.label : <HorizontaLDots />}
                </h2>
                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    // ── Submenu parent item ──────────────────────────────────
                    if (item.children && item.submenuKey) {
                      const key = item.submenuKey;
                      const isOpen = openSubmenus[key] ?? false;
                      const parentActive = isChildActive(item.children);

                      return (
                        <li key={key}>
                          {/* Parent toggle button */}
                          <button
                            onClick={() => showLabel && toggleSubmenu(key)}
                            className={`menu-item group w-full ${
                              parentActive ? "menu-item-active" : "menu-item-inactive"
                            } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                          >
                            <span
                              className={
                                parentActive ? "menu-item-icon-active" : "menu-item-icon-inactive"
                              }
                              style={parentActive ? { color: "var(--color-brand-500, #465fff)" } : undefined}
                            >
                              {item.icon}
                            </span>
                            {showLabel && (
                              <>
                                <span className="menu-item-text">{item.name}</span>
                                <ChevronDownIcon open={isOpen} />
                              </>
                            )}
                          </button>

                          {/* Submenu children — animated max-height */}
                          {showLabel && (
                            <div
                              className="overflow-hidden transition-all duration-200 ease-in-out"
                              style={{
                                maxHeight: isOpen ? `${item.children.length * 40}px` : "0px",
                              }}
                            >
                              <ul className="mt-0.5 flex flex-col gap-0.5">
                                {item.children.map((child) => {
                                  const basePath = child.path.split("?")[0];
                                  const childActive = pathname === basePath || (basePath !== "/cockpit" && pathname.startsWith(basePath));
                                  return (
                                    <li key={child.path}>
                                      <Link
                                        href={child.path}
                                        className={`flex items-center gap-2 rounded-lg pl-10 pr-3 py-2 text-xs transition-colors ${
                                          childActive
                                            ? "font-medium text-brand-500 bg-brand-500/5"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                                        }`}
                                      >
                                        {child.name}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </li>
                      );
                    }

                    // ── Regular item (flat) ───────────────────────────────────
                    const itemPath = item.path!;
                    return (
                      <li key={itemPath}>
                        {isLockedForPlan(item) ? (
                          <button
                            onClick={() => {
                              setUpgradeTarget(item.requiredPlan!);
                              setUpgradeModalOpen(true);
                            }}
                            className={`menu-item group menu-item-inactive w-full ${
                              !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                            }`}
                          >
                            <span className="menu-item-icon-inactive">
                              {item.icon}
                            </span>
                            {showLabel && (
                              <>
                                <span className="menu-item-text">{item.name}</span>
                                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                                  {item.requiredPlan === 'enterprise' ? 'GROWTH' : 'PRO'}
                                </span>
                              </>
                            )}
                          </button>
                        ) : (
                          <Link
                            href={itemPath}
                            className={`menu-item group ${
                              isActive(itemPath) ? "menu-item-active" : "menu-item-inactive"
                            } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                          >
                            <span
                              className={
                                isActive(itemPath) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                              }
                            >
                              {item.icon}
                            </span>
                            {showLabel && (
                              <span className="menu-item-text">{item.name}</span>
                            )}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </div>

      {/* Upgrade Card — visible for starter and growth plans when sidebar is expanded */}
      {showLabel && tenant && tenant.plan !== 'enterprise' && (
        <div className="mt-auto px-0 pb-3">
          <UpgradeCard
            onUpgradeClick={() => setUpgradeModalOpen(true)}
            tenantPlan={tenant.plan as 'starter' | 'growth'}
          />
        </div>
      )}

      {/* Tenant badge (collapsed = hidden) */}
      {showLabel && tenant && (
        <div className={tenant.plan !== 'enterprise' ? "pb-6" : "mt-auto pb-6"}>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{tenant.name}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-wider">{tenant.plan}</p>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => { setUpgradeModalOpen(false); setUpgradeTarget(null); }}
        requiredPlan={upgradeTarget ?? 'growth'}
      />
    </aside>
  );
};

export default AppSidebar;
