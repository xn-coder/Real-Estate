
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  LayoutDashboard,
  Building,
  UserPlus,
  Handshake,
  UserSquare,
  UserRound,
  Briefcase,
  Smile,
  UserCheck,
  LifeBuoy,
  Book,
  Laptop,
  Wallet,
  Trophy,
  ShoppingBag,
  ChevronDown,
  UserX,
  UserCog,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/properties', icon: Building, label: 'Properties' },
  { href: '/marketing-kit', icon: ShoppingBag, label: 'Marketing Kits' },
  { href: '/onboarding', icon: UserPlus, label: 'Onboarding' },
]

const bottomNavItems = [
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
  const { state: sidebarState, setOpen: setSidebarOpen } = useSidebar();
  const [isPartnerMenuOpen, setIsPartnerMenuOpen] = React.useState(false);

  const handlePartnerMenuClick = () => {
    if (sidebarState === 'collapsed') {
      setSidebarOpen(true);
    }
  };

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

      <Collapsible open={isPartnerMenuOpen} onOpenChange={setIsPartnerMenuOpen} className="w-full">
         <SidebarMenuItem>
            <CollapsibleTrigger asChild>
                <SidebarMenuButton
                    isActive={pathname.startsWith('/manage-partner')}
                    tooltip="Manage Partner"
                    className="justify-start group-data-[collapsible=icon]:justify-center p-2"
                    onClick={handlePartnerMenuClick}
                >
                    <Handshake />
                    <span className="group-data-[collapsible=icon]:hidden flex-1 text-left">Manage Partner</span>
                    <ChevronDown className={`h-4 w-4 group-data-[collapsible=icon]:hidden transition-transform ${isPartnerMenuOpen ? 'rotate-180' : ''}`} />
                </SidebarMenuButton>
            </CollapsibleTrigger>
        </SidebarMenuItem>
        <CollapsibleContent>
            <SidebarMenuSub>
                <SidebarMenuSubItem>
                    <SidebarMenuSubButton href="/manage-partner" isActive={pathname === '/manage-partner'}>
                        Manage Partner
                    </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                    <SidebarMenuSubButton href="/manage-partner/activation" isActive={pathname === '/manage-partner/activation'}>
                       Partner Activation
                    </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                 <SidebarMenuSubItem>
                    <SidebarMenuSubButton href="/manage-partner/deactivated" isActive={pathname === '/manage-partner/deactivated'}>
                       Deactivated Partners
                    </SidebarMenuSubButton>
                </SidebarMenuSubItem>
            </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>


      {bottomNavItems.map((item) => (
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
