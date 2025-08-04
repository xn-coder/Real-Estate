
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
  BookOpen,
  History,
  Tag,
  Calendar,
  FileText,
  Users,
  BarChart2,
  Ticket,
  Award,
  Power,
  Home,
  CheckSquare,
  Settings,
  MessageSquare,
  Users2,
  User,
  Plane,
  Headset,
  PanelTop,
} from 'lucide-react'
import { useUser } from '@/hooks/use-user'

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  subItems?: SubNavItem[];
}

type SubNavItem = {
    href: string;
    label: string;
}

const adminNavItems: NavItem[] = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/listings', icon: Building, label: 'Properties' },
    { href: '/marketing-kit', icon: ShoppingBag, label: 'Marketing Kits' },
    // { href: '/onboarding', icon: Plane, label: 'Onboarding' },
    { 
      href: '/manage-partner', 
      icon: Handshake, 
      label: 'Manage Partner',
      subItems: [
          { href: '/manage-partner', label: 'Manage Partner' },
          { href: '/manage-partner/activation', label: 'Partner Activation' },
          { href: '/manage-partner/suspended', label: 'Suspended Partners' },
          { href: '/manage-partner/deactivated', label: 'Deactivated Partners' },
      ]
    },
    // { href: '/manage-seller', icon: UserSquare, label: 'Manage Seller' },
    { href: '/leads', icon: UserPlus, label: 'Manage Lead' },
    { href: '/deals', icon: Handshake, label: 'Manage Deals' },
    // { href: '/manage-customer', icon: Users2, label: 'Manage Customer' },
    // { href: '/manage-visitor', icon: User, label: 'Manage Visitor' },
    // { href: '/support-ticket', icon: Headset, label: 'Manage Support' },
    { href: '/resource-center', icon: BookOpen, label: 'Resource Center' },
    { href: '/website-panel', icon: PanelTop, label: 'Website Panel' },
    { href: '/wallet-billing', icon: Wallet, label: 'Wallet & Billing' },
    // { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
];


const partnerNavItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/listings', icon: Building, label: 'Properties' },
  { href: '/leads', icon: UserRound, label: 'Manage Leads' },
  { href: '/manage-customer', icon: Smile, label: 'Manage Customer' },
  { href: '/schedule', icon: Calendar, label: 'Location Visit Schedule' },
  { href: '/manage-quotation', icon: FileText, label: 'Manage Quotation' },
  { href: '/send-quotation', icon: FileText, label: 'Send Quotation' },
  { href: '/booking-management', icon: CheckSquare, label: 'Booking Management' },
  { href: '/document-management', icon: FileText, label: 'Document Management' },
  { href: '/reports-analytics', icon: BarChart2, label: 'Reports & Analytics' },
  { href: '/team-management', icon: Users, label: 'Team Management' },
  { href: '/marketing-kit', icon: ShoppingBag, label: 'Marketing Kits' },
  { href: '/support-ticket', icon: Ticket, label: 'Support Ticket' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/upgrade', icon: Award, label: 'Upgrade' },
];

const sellerNavItems: NavItem[] = [
    { href: '/listings', icon: Building, label: 'My Listings' },
    { href: '/leads', icon: UserRound, label: 'My Leads' },
    { href: '/schedule', icon: Calendar, label: 'Appointments' },
];

const userNavItems: NavItem[] = [
    { href: '/listings', icon: Home, label: 'Browse Listings' },
];


const NavList = ({ items }: { items: NavItem[] }) => {
    const pathname = usePathname();
    
    return (
        <SidebarMenu>
            {items.map((item) => (
                item.subItems ? (
                    <Collapsible key={`${item.href}-${item.label}`} className="w-full">
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                    size="icon"
                                    isActive={pathname.startsWith(item.href)}
                                    tooltip={item.label}
                                    className="justify-between group-data-[collapsible=icon]:justify-center w-full"
                                >
                                    <div className="flex items-center gap-2">
                                        <item.icon />
                                        <span className="group-data-[collapsible=icon]:hidden flex-1 text-left">{item.label}</span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 group-data-[collapsible=icon]:hidden transition-transform`} />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                        </SidebarMenuItem>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {item.subItems.map(subItem => (
                                     <SidebarMenuSubItem key={`${subItem.href}-${subItem.label}`}>
                                        <SidebarMenuSubButton href={subItem.href} isActive={pathname === subItem.href}>
                                            {subItem.label}
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </Collapsible>
                ) : (
                    <SidebarMenuItem key={`${item.href}-${item.label}`}>
                        <Link href={item.href} className="block">
                            <SidebarMenuButton
                                isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')}
                                tooltip={item.label}
                                className="justify-start group-data-[collapsible=icon]:justify-center"
                            >
                                <item.icon />
                                <span className="group-data-[collapsible=icon]:hidden">
                                    {item.label}
                                </span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                )
            ))}
        </SidebarMenu>
    );
};


export function AppShellNav({role}: {role: string}) {
  let navItems: NavItem[] = [];

  switch (role) {
    case 'admin':
      navItems = adminNavItems;
      break;
    case 'affiliate':
    case 'super_affiliate':
    case 'associate':
    case 'channel':
    case 'franchisee':
      navItems = partnerNavItems;
      break;
    case 'seller':
        navItems = sellerNavItems;
        break;
    default:
        navItems = userNavItems;
        break;
  }
  
  return <NavList items={navItems} />;
}
