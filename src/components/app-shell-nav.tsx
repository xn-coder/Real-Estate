
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Home,
  Megaphone,
  Rocket,
  Handshake,
  UserSquare,
  Users,
  Briefcase,
  UserCheck,
  Globe,
  LifeBuoy,
  BookOpen,
  PanelTop,
  Wallet,
  Trophy,
  Calendar,
  Settings,
  User,
  FileText,
  Mail,
  Megaphone as MarketingIcon,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/listings', icon: Home, label: 'Listings' },
  { href: '/deals', icon: Briefcase, label: 'Deals' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/marketing-kit', icon: MarketingIcon, label: 'Marketing Kits' },
]

export function AppShellNav() {
  const pathname = usePathname()
  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} className="block">
            <SidebarMenuButton
              isActive={pathname.startsWith(item.href)}
              tooltip={item.label}
              className="justify-start group-data-[collapsible=icon]:justify-center p-2"
            >
              <item.icon />
              <span className="group-data-[collapsible=icon]:hidden">
                {item.label}
              </span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
