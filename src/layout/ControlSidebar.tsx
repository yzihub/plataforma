"use client";
import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  GridIcon,
  GroupIcon,
  BoxIcon,
  PlugInIcon,
  DocsIcon,
  HorizontaLDots,
  UserCircleIcon,
} from "../icons/index";

// ── Inline icons not in icon set ──────────────────────────────────────────────
const ActivityIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "size-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <polyline strokeLinecap="round" strokeLinejoin="round" points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "size-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// ── Admin menu definition ─────────────────────────────────────────────────────
const CONTROL_SECTIONS: NavSection[] = [
  {
    label: "Visão Geral",
    items: [
      { name: "Dashboard",     icon: <GridIcon />,        path: "/control" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { name: "Tenants",       icon: <GroupIcon />,       path: "/control/tenants" },
      { name: "Usuários",      icon: <UserCircleIcon />,  path: "/control/users" },
      { name: "YZI FACTORY",   icon: <PlugInIcon />,      path: "/factory" },
    ],
  },
  {
    label: "Operações",
    items: [
      { name: "Action Logs",   icon: <DocsIcon />,        path: "/control/logs" },
      { name: "Job Queue",     icon: <ActivityIcon />,    path: "/control/jobs" },
      { name: "Integrações",   icon: <BoxIcon />,         path: "/control/integrations" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { name: "Configurações", icon: <SettingsIcon />,    path: "/settings" },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const ControlSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const isActive = useCallback(
    (path: string) => pathname === path || (path !== "/control" && pathname.startsWith(path)),
    [pathname]
  );

  const showLabel = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-gray-950 dark:bg-gray-950 text-gray-100 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-800
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo + Admin badge */}
      <div className={`py-8 flex flex-col gap-2 ${!isExpanded && !isHovered ? "lg:items-center" : "items-start"}`}>
        <Link href="/control">
          {showLabel ? (
            <>
              <Image className="dark:hidden" src="/images/logo/logo-dark.svg" alt="YZIHUB" width={150} height={40} />
              <Image className="hidden dark:block" src="/images/logo/logo-dark.svg" alt="YZIHUB" width={150} height={40} />
            </>
          ) : (
            <Image src="/images/logo/logo-icon.svg" alt="YZIHUB" width={32} height={32} />
          )}
        </Link>
        {showLabel && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            Admin
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            {CONTROL_SECTIONS.map((section) => (
              <div key={section.label}>
                <h2
                  className={`mb-3 text-xs uppercase leading-[20px] text-gray-500 flex ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                  }`}
                >
                  {showLabel ? section.label : <HorizontaLDots />}
                </h2>
                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          className={`menu-item group ${
                            !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                          } ${
                            active
                              ? "bg-amber-500/10 text-amber-400"
                              : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
                          }`}
                        >
                          <span
                            className={`${
                              active ? "text-amber-400" : "text-gray-500 group-hover:text-gray-300"
                            }`}
                          >
                            {item.icon}
                          </span>
                          {showLabel && (
                            <span className="menu-item-text">{item.name}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </div>

      {/* Back to Cockpit link */}
      {showLabel && (
        <div className="mt-auto pb-6">
          <Link
            href="/cockpit"
            className="flex items-center gap-2 rounded-xl border border-gray-800 px-3 py-2 text-xs text-gray-500 hover:border-gray-700 hover:text-gray-300 transition-colors"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Voltar ao Cockpit
          </Link>
        </div>
      )}
    </aside>
  );
};

export default ControlSidebar;
