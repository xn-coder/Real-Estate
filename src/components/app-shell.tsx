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
  Mountain,
} from "lucide-react"

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/leads", icon: Users, label: "Leads" },
  { href: "/listings", icon: Home, label: "Listings" },
  { href: "/deals", icon: Briefcase, label: "Deals" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Mountain className="size-6 text-primary" />
            <h1 className="text-xl font-bold font-headline text-primary group-data-[collapsible=icon]:hidden">DealFlow</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
                <Link href="#">
                  <SidebarMenuButton tooltip="Settings">
                    <Settings />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          </SidebarMenu>
          <div className="p-2 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="justify-start w-full h-auto p-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="user avatar" />
                        <AvatarFallback>AE</AvatarFallback>
                      </Avatar>
                      <div className="text-left group-data-[collapsible=icon]:hidden">
                        <p className="font-medium text-sm">Alex Estate</p>
                        <p className="text-xs text-muted-foreground">alex@dealflow.com</p>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-2 border-b h-14">
            <SidebarTrigger />
        </header>
        {children}
        </SidebarInset>
    </SidebarProvider>
  )
}
