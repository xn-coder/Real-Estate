
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
import { Settings } from "lucide-react"
import Image from "next/image"
import { AppShellNav } from "./app-shell-nav"
import { useIsMobile } from "@/hooks/use-mobile"

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  
  if (isMobile === undefined) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center p-2 justify-center h-14">
            <div className="group-data-[collapsible=icon]:hidden">
              <Image src="/logo-name.png" alt="DealFlow" width={120} height={40} />
            </div>
             <div className="hidden group-data-[collapsible=icon]:block">
              <Image src="/logo.png" alt="DealFlow" width={40} height={40} />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <AppShellNav />
        </SidebarContent>
        <SidebarFooter>
           <Link href="#" className="block">
              <Button variant="ghost" className="w-full group-data-[collapsible=icon]:justify-center p-2">
                <Settings />
                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
              </Button>
            </Link>
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
