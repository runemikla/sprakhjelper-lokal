'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  AudioLines,
  ChevronsUpDown,
  Cpu,
  FileText,
  Gauge,
  LogOut,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { logout } from '@/app/auth/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { badgeText, newUsersLabel, useNewUsersCount } from '@/lib/admin/use-new-users'

// The admin area, built on the shadcnblocks «Dashboard 5» layout: a sidebar
// with one link per admin page, and the page in an inset panel. New admin
// pages go in ADMIN_NAV and under app/admin/.

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

// The users page; opening it marks the new users as seen.
const USERS_HREF = '/admin/brukere'

export const ADMIN_NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Oversikt',
    items: [
      { href: '/admin/forbruk', label: 'Forbruk', icon: Gauge },
      { href: USERS_HREF, label: 'Brukere', icon: Users },
    ],
  },
  {
    title: 'KI-innstillinger',
    items: [
      { href: '/admin/sprakmodell', label: 'Språkmodell', icon: Cpu },
      { href: '/admin/instrukser', label: 'Instrukser', icon: FileText },
      { href: '/admin/stemmer', label: 'Stemmer', icon: AudioLines },
    ],
  },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild tooltip="Språkhjelp admin">
          <Link href="/admin">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg" />
            <span className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold">Språkhjelp</span>
              <span className="text-xs text-vlfk-ink-muted">Admin</span>
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavUser({ email }: { email: string }) {
  const initial = email.slice(0, 1).toUpperCase()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-vlfk-lyseblaa text-sm font-semibold text-vlfk-ink">
                {initial}
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Administrator</span>
                <span className="truncate text-xs text-vlfk-ink-muted">{email}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56 rounded-lg" side="top" align="end" sideOffset={4}>
            <DropdownMenuLabel className="truncate text-xs font-normal text-vlfk-ink-muted">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Tilbake til Språkhjelp
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button type="button" className="w-full" onClick={() => void logout()}>
                <LogOut className="size-4" aria-hidden="true" />
                Logg ut
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function AdminSidebar({ email, newUsers }: { email: string; newUsers: number }) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
          <SidebarLogo />
          <SidebarTrigger className="ml-auto hidden md:inline-flex group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {ADMIN_NAV.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, label, icon: Icon }) => {
                  const badge = href === USERS_HREF ? newUsers : 0
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(pathname, href)}
                        tooltip={badge > 0 ? `${label} (${newUsersLabel(badge)})` : label}
                      >
                        <Link href={href} onClick={() => isMobile && setOpenMobile(false)}>
                          <span className="relative">
                            <Icon className="size-4" aria-hidden="true" />
                            {badge > 0 && (
                              // Shows on the icon when the menu is folded in.
                              <span
                                aria-hidden="true"
                                className="absolute -right-1 -top-1 hidden size-2 rounded-full bg-vlfk-rod-oransje group-data-[collapsible=icon]:block"
                              />
                            )}
                          </span>
                          <span>{label}</span>
                          {badge > 0 && <span className="sr-only">({newUsersLabel(badge)})</span>}
                        </Link>
                      </SidebarMenuButton>
                      {badge > 0 && (
                        <SidebarMenuBadge
                          aria-hidden="true"
                          className="rounded-full bg-vlfk-rod-oransje font-semibold text-vlfk-ink peer-hover/menu-button:text-vlfk-ink peer-data-[active=true]/menu-button:text-vlfk-ink"
                        >
                          {badgeText(badge)}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function AdminHeader({ newUsers }: { newUsers: number }) {
  const pathname = usePathname()
  const current = ADMIN_NAV.flatMap((g) => g.items).find((item) => isActive(pathname, item.href))
  const Icon = current?.icon ?? Gauge
  return (
    <header className="flex w-full items-center gap-3 border-b bg-white px-4 py-3 sm:px-6 sm:py-4">
      <span className="relative md:hidden">
        <SidebarTrigger aria-label={newUsers > 0 ? `Vis menyen (${newUsersLabel(newUsers)})` : 'Vis menyen'} />
        {newUsers > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0.5 top-0.5 size-2.5 rounded-full bg-vlfk-rod-oransje ring-2 ring-white"
          />
        )}
      </span>
      <Icon className="size-5 text-vlfk-ink" aria-hidden="true" />
      <h1 className="text-base font-medium text-vlfk-ink">{current?.label ?? 'Admin'}</h1>
      <Link
        href="/"
        className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-vlfk-ink-muted hover:text-vlfk-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Til Språkhjelp</span>
      </Link>
    </header>
  )
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname()
  // Fetched again on every page, so the badge goes away once Brukere is open.
  const fetched = useNewUsersCount(true, pathname)
  const newUsers = isActive(pathname, USERS_HREF) ? 0 : fetched
  return (
    <TooltipProvider>
      <SidebarProvider className="bg-sidebar">
        <a
          href="#admin-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-vlfk-ink"
        >
          Hopp til innholdet
        </a>
        <AdminSidebar email={email} newUsers={newUsers} />
        <div className="h-svh w-full min-w-0 overflow-hidden md:p-2">
          <div className="flex h-full w-full flex-col overflow-hidden bg-white md:rounded-xl md:border">
            <AdminHeader newUsers={newUsers} />
            <main
              id="admin-main"
              tabIndex={-1}
              className="w-full flex-1 overflow-auto bg-white p-3 focus:outline-none sm:p-4 md:p-6"
            >
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
