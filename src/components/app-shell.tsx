
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
import { Settings, LogOut, Bell, Search, User, MessageSquare, BookUser, History } from "lucide-react"
import Image from "next/image"
import { AppShellNav } from "./app-shell-nav"
import Link from "next/link"
import { Input } from "./ui/input"
import { useUser } from "@/hooks/use-user"
import { Skeleton } from "./ui/skeleton"
import { useRouter } from "next/navigation"

export function AppShell({ children }: { children: React.ReactNode }) {
    const { user, isLoading, setUser } = useUser();
    const router = useRouter();

    const getInitials = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
        }
        if (user?.name) {
            return user.name.split(' ').map(n => n[0]).join('')
        }
        return 'U'
    }

    const handleLogout = () => {
        localStorage.removeItem("userId");
        setUser(null);
        router.push('/');
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
          {isLoading ? (
            <div className="space-y-2 p-2">
                {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                ))}
            </div>
          ) : (
            <AppShellNav role={user?.role || 'user'} />
          )}
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
               <Link href="/updates">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Toggle notifications</span>
                </Button>
               </Link>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        {isLoading ? (
                            <Skeleton className="h-10 w-10 rounded-full" />
                        ) : (
                           <Avatar className="h-10 w-10">
                            <AvatarImage src={user?.profileImage} alt={user?.name} data-ai-hint="user avatar" />
                            <AvatarFallback>{getInitials()}</AvatarFallback>
                          </Avatar>
                        )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/profile">
                        <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                        </DropdownMenuItem>
                    </Link>
                     {user?.role === 'admin' && (
                        <>
                            <Link href="/send-message">
                                <DropdownMenuItem>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>Send Message</span>
                                </DropdownMenuItem>
                            </Link>
                            <Link href="/contact-book">
                                <DropdownMenuItem>
                                <BookUser className="mr-2 h-4 w-4" />
                                <span>Contact Book</span>
                                </DropdownMenuItem>
                            </Link>
                            <Link href="/settings">
                                <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                                </DropdownMenuItem>
                            </Link>
                        </>
                     )}
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onSelect={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
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
