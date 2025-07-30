
"use client"

import * as React from "react"
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
import { Settings, LogOut, LifeBuoy } from "lucide-react"
import Image from "next/image"
import { AppShellNav } from "./app-shell-nav"
import { useIsMobile } from "@/hooks/use-mobile"
import Link from "next/link"

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  
  if (isMobile === undefined) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-0">
          <div className="flex items-center justify-center h-16">
            <div className="group-data-[collapsible=icon]:hidden flex items-center gap-2">
              <Image src="/logo.png" alt="DealFlow" width={32} height={32} />
              <span className="font-bold text-lg font-headline">DealFlow</span>
            </div>
             <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <Image src="/logo.png" alt="DealFlow" width={40} height={40} />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <AppShellNav />
        </SidebarContent>
        <SidebarFooter className="p-2">
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-2 pr-4 border-b h-16">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                       <Avatar className="h-10 w-10">
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="user avatar" />
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      <span>Support</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <Link href="/">
                        <DropdownMenuItem>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                      </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        </SidebarInset>
    </SidebarProvider>
  )
}
