
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
import { Settings, LogOut, LifeBuoy, Bell, Search, User, MessageSquare, BookUser, Contact } from "lucide-react"
import Image from "next/image"
import { AppShellNav } from "./app-shell-nav"
import Link from "next/link"
import { Input } from "./ui/input"

const user = {
    name: "Admin User",
    email: "admin@estateflow.com",
    avatar: ""
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isClient, setIsClient] = React.useState(false)

    React.useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) {
        return null
    }
  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-0">
          <div className="flex items-center justify-center h-16">
            <div className="group-data-[collapsible=icon]:hidden">
               <Image src="/logo-name.png" alt="DealFlow" width={120} height={30} />
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
        <header className="sticky top-0 z-10 flex items-center justify-between p-2 pr-4 border-b h-16 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
              />
            </div>
          </div>
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
              </Button>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                       <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Edit Profile</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Send Message</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem>
                      <BookUser className="mr-2 h-4 w-4" />
                      <span>Contact Book</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
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
