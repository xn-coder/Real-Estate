
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
  Users,
  Home,
  Briefcase,
  Calendar,
  Settings,
  Megaphone,
  Rocket,
  Handshake,
  UserSquare,
  UserCheck,
  Globe,
  LifeBuoy,
  BookOpen,
  PanelTop,
  Wallet,
  Trophy,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/properties', icon: Home, label: 'Properties' },
  { href: '/marketing-kits', icon: Megaphone, label: 'Marketing Kits' },
  { href: '/onboarding', icon: Rocket, label: 'Onboarding' },
  { href: '/manage-partner', icon: Handshake, label: 'Manage Partner' },
  { href: '/manage-seller', icon: UserSquare, label: 'Manage Seller' },
  { href: '/manage-lead', icon: Users, label: 'Manage Lead' },
  { href: '/manage-deals', icon: Briefcase, label: 'Manage Deals' },
  { href: '/manage-customer', icon: UserCheck, label: 'Manage Customer' },
  { href: '/manage-visitor', icon: Globe, label: 'Manage Visitor' },
  { href: '/manage-support', icon: LifeBuoy, label: 'Manage Support' },
  { href: '/resource-center', icon: BookOpen, label: 'Resource Center' },
  { href: '/website-panel', icon: PanelTop, label: 'Website Panel' },
  { href: '/wallet-billing', icon: Wallet, label: 'Wallet & Billing' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
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
              className="group-data-[collapsible=icon]:justify-center p-2"
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
