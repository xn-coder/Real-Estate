
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "lucide-react"
import Image from "next/image"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/properties", icon: Home, label: "Properties" },
  { href: "/marketing-kits", icon: Megaphone, label: "Marketing Kits" },
  { href: "/onboarding", icon: Rocket, label: "Onboarding" },
  { href: "/manage-partner", icon: Handshake, label: "Manage Partner" },
  { href: "/manage-seller", icon: UserSquare, label: "Manage Seller" },
  { href: "/manage-lead", icon: Users, label: "Manage Lead" },
  { href: "/manage-deals", icon: Briefcase, label: "Manage Deals" },
  { href: "/manage-customer", icon: UserCheck, label: "Manage Customer" },
  { href: "/manage-visitor", icon: Globe, label: "Manage Visitor" },
  { href: "/manage-support", icon: LifeBuoy, label: "Manage Support" },
  { href: "/resource-center", icon: BookOpen, label: "Resource Center" },
  { href: "/website-panel", icon: PanelTop, label: "Website Panel" },
  { href: "/wallet-billing", icon: Wallet, label: "Wallet & Billing" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center p-2 justify-center h-14">
            <div className="group-data-[collapsible=icon]:hidden">
              <Image src="/logo-name.png" alt="DealFlow" width={120} height={40} />
            </div>
             <div className="hidden group-data-[collapsible=icon]:block">
              <Image src="/logo.png" alt="DealFlow" width={32} height={32} />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
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
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
             <SidebarMenuItem>
                <Link href="#" className="block">
                  <SidebarMenuButton tooltip="Settings" className="group-data-[collapsible=icon]:justify-center p-2">
                    <Settings />
                    <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-2 border-b h-14">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                       <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="user avatar" />
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Billing</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <Link href="/">
                        <DropdownMenuItem>
                            Log out
                        </DropdownMenuItem>
                      </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
        {children}
        </SidebarInset>
    </SidebarProvider>
  )
}
