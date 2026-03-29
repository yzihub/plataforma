"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { createClient } from "@/lib/supabase/client";
import {
  GridIcon,
  GroupIcon,
  BoxCubeIcon,
  CalenderIcon,
  TaskIcon,
  ChatIcon,
  ShootingStarIcon,
  PaperPlaneIcon,
  PieChartIcon,
  BoltIcon,
  DollarLineIcon,
  ListIcon,
  TableIcon,
  UserCircleIcon,
  BoxIcon,
  PlugInIcon,
  DocsIcon,
  HorizontaLDots,
  ChevronDownIcon,
} from "../icons/index";

// ── Settings icon (inline, no SVG file exists) ────────────────────────────────
const SettingsIcon = ({ className }: { className?: string }) => (
  <svg
    className={className ?? "size-5"}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  module?: string;   // required module key — omit = always visible
  adminOnly?: true;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// ── Hook: tenant modules + role ───────────────────────────────────────────────
function useTenantModules() {
  const [modules, setModules] = useState<string[]>([]);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const admin = user.user_metadata?.role === "global_admin";
      setIsGlobalAdmin(admin);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profile?.tenant_id && !cancelled) {
        const { data: projects } = await supabase
          .from("projects")
          .select("type")
          .eq("tenant_id", profile.tenant_id)
          .eq("status", "active");

        if (projects && !cancelled) {
          setModules(projects.map((p) => p.type as string));
        }
      }

      if (!cancelled) setReady(true);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { modules, isGlobalAdmin, ready };
}

// ── Menu definition ───────────────────────────────────────────────────────────
const SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      { name: "Dashboard",       icon: <GridIcon />,         path: "/cockpit" },
      { name: "Leads",           icon: <GroupIcon />,        path: "/cockpit/leads" },
      { name: "CRM / Pipeline",  icon: <BoxCubeIcon />,      path: "/cockpit/crm" },
      { name: "Calendar",        icon: <CalenderIcon />,     path: "/calendar" },
      { name: "Tasks",           icon: <TaskIcon />,         path: "/cockpit/tasks" },
      { name: "Chat",            icon: <ChatIcon />,         path: "/cockpit/chat" },
    ],
  },
  {
    label: "Módulos",
    items: [
      { name: "Radar",           icon: <ShootingStarIcon />, path: "/cockpit/radar",   module: "radar" },
      { name: "Social",          icon: <PaperPlaneIcon />,   path: "/cockpit/social",  module: "social" },
      { name: "Tráfego Pago",    icon: <PieChartIcon />,     path: "/cockpit/traffic", module: "paid_traffic" },
      { name: "AI Assistant",    icon: <BoltIcon />,         path: "/cockpit/ai",      module: "ia_onboarding" },
      { name: "E-commerce",      icon: <DollarLineIcon />,   path: "/cockpit/ecommerce", module: "ecommerce" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { name: "Forms",           icon: <ListIcon />,         path: "/form-elements" },
      { name: "Tables",          icon: <TableIcon />,        path: "/basic-tables" },
      { name: "Perfil",          icon: <UserCircleIcon />,   path: "/profile" },
      { name: "Configurações",   icon: <SettingsIcon />,     path: "/settings" },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "YZI CONTROL",     icon: <BoxIcon />,          path: "/control",         adminOnly: true },
      { name: "YZI FACTORY",     icon: <PlugInIcon />,       path: "/factory",         adminOnly: true },
      { name: "Action Logs",     icon: <DocsIcon />,         path: "/control/logs",    adminOnly: true },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { modules, isGlobalAdmin, ready } = useTenantModules();

  const isActive = useCallback(
    (path: string) => pathname === path || (path !== "/cockpit" && pathname.startsWith(path)),
    [pathname]
  );

  const isVisible = useCallback(
    (item: NavItem) => {
      if (item.adminOnly && !isGlobalAdmin) return false;
      if (item.module && !modules.includes(item.module)) return false;
      return true;
    },
    [isGlobalAdmin, modules]
  );

  const showLabel = isExpanded || isHovered || isMobileOpen;

  // Filter sections — hide "Módulos" section entirely if none are active
  // Hide "Admin" section entirely if not global_admin
  const visibleSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(isVisible),
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
            {(!ready ? SECTIONS : visibleSections).map((section) => {
              const sectionItems = ready ? section.items : section.items.filter((i) => !i.module && !i.adminOnly);
              if (sectionItems.length === 0) return null;
              return (
                <div key={section.label}>
                  <h2
                    className={`mb-3 text-xs uppercase leading-[20px] text-gray-400 flex ${
                      !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                    }`}
                  >
                    {showLabel ? section.label : <HorizontaLDots />}
                  </h2>
                  <ul className="flex flex-col gap-1">
                    {sectionItems.map((item) => (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          className={`menu-item group ${
                            isActive(item.path) ? "menu-item-active" : "menu-item-inactive"
                          } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                        >
                          <span
                            className={
                              isActive(item.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                            }
                          >
                            {item.icon}
                          </span>
                          {showLabel && (
                            <span className="menu-item-text">{item.name}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
