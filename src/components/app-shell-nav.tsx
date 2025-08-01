
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
  Users,
  Briefcase,
  UserPlus,
  Handshake,
  UserSquare,
  UserRound,
  Smile,
  UserCheck,
  LifeBuoy,
  Book,
  Laptop,
  Wallet,
  Trophy,
  Megaphone as MarketingIcon,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/properties', icon: Home, label: 'Properties' },
  { href: '/marketing-kits', icon: MarketingIcon, label: 'Marketing Kits' },
  { href: '/onboarding', icon: UserPlus, label: 'Onboarding' },
  { href: '/manage-partner', icon: Handshake, label: 'Manage Partner' },
  { href: '/manage-seller', icon: UserSquare, label: 'Manage Seller' },
  { href: '/manage-lead', icon: UserRound, label: 'Manage Lead' },
  { href: '/manage-deals', icon: Briefcase, label: 'Manage Deals' },
  { href: '/manage-customer', icon: Smile, label: 'Manage Customer' },
  { href: '/manage-visitor', icon: UserCheck, label: 'Manage Visitor' },
  { href: '/manage-support', icon: LifeBuoy, label: 'Manage Support' },
  { href: '/resource-center', icon: Book, label: 'Resource Center' },
  { href: '/website-panel', icon: Laptop, label: 'Website Panel' },
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
