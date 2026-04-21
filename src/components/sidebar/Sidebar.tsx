"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Sun,
  MessageSquare,
  Lightbulb,
  Video,
  AlertTriangle,
  Target,
  Settings,
  Building2,
  ChevronDown,
  Wrench,
  BookOpen,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject, PROJECTS } from "@/lib/project-context";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/briefing", label: "Briefing", icon: Sun },
  { href: "/chat", label: "Company Chat", icon: MessageSquare },
  { href: "/ideas", label: "Idea Vault", icon: Lightbulb },
  { href: "/videos", label: "Video Intel", icon: Video },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/problems", label: "Problems", icon: AlertTriangle },
  { href: "/strategy", label: "Strategy", icon: Target },
  { href: "/tools", label: "Tool Runner", icon: Wrench },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { projectSlug, setProjectSlug } = useProject();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentProject = PROJECTS.find((p) => p.slug === projectSlug) || PROJECTS[0];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">AI Company</span>
        </div>

        {/* Project Selector */}
        <div className="px-3 py-3 border-b border-border relative">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
            Proiect activ
          </p>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors text-sm font-medium"
          >
            <span>{currentProject.emoji}</span>
            <span className="flex-1 text-left truncate">{currentProject.name}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                dropdownOpen && "rotate-180"
              )}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
              {PROJECTS.map((project) => (
                <button
                  key={project.slug}
                  onClick={() => {
                    setProjectSlug(project.slug);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left",
                    project.slug === projectSlug && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <span>{project.emoji}</span>
                  <span>{project.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDropdownOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors min-w-[56px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
