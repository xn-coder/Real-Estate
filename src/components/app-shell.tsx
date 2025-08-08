
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
import { Settings, LogOut, Bell, Search, User, MessageSquare, BookUser, History, Globe, Contact, Wallet, LifeBuoy, Headset, FilePlus, Home, Users, Building } from "lucide-react"
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
    const [searchTerm, setSearchTerm] = React.useState('');

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
    
    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && searchTerm) {
        router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
      }
    };


    const isPartner = user?.role && ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role);
    const isSeller = user?.role === 'seller';
    const isCustomer = user?.role === 'customer';

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
          <div className="flex items-center gap-2 md:gap-4">
            <SidebarTrigger />
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>
            <div className="flex items-center gap-2 md:gap-4">
                {isCustomer && (
                     <Button size="sm">
                        <FilePlus className="mr-0 md:mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Post Requirements</span>
                    </Button>
                )}
               <Button variant="ghost" size="icon" asChild>
                  <Link href="/updates">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Toggle notifications</span>
                  </Link>
               </Button>
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
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                     {user?.role === 'admin' && (
                        <>
                           <DropdownMenuItem asChild>
                            <Link href="/send-message">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>Send Message</span>
                            </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                            <Link href="/contact-book">
                                <BookUser className="mr-2 h-4 w-4" />
                                <span>Contact Book</span>
                            </Link>
                             </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                            <Link href="/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                            </DropdownMenuItem>
                        </>
                     )}
                     {isPartner && (
                        <>
                            <DropdownMenuItem asChild>
                              <Link href="/manage-website">
                                <Globe className="mr-2 h-4 w-4" />
                                <span>Manage Website</span>
                              </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href={`/digital-card/${user.id}`}>
                                    <Contact className="mr-2 h-4 w-4" />
                                    <span>Digital Card</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/wallet">
                                    <Wallet className="mr-2 h-4 w-4" />
                                    <span>Earning & Wallet</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/support">
                                    <LifeBuoy className="mr-2 h-4 w-4" />
                                    <span>Help & Support</span>
                                </Link>
                            </DropdownMenuItem>
                        </>
                     )}
                    {isSeller && (
                        <>
                            <DropdownMenuItem asChild>
                                <Link href="/send-message">
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    <span>Send Message</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/support">
                                    <Headset className="mr-2 h-4 w-4" />
                                    <span>Help & Support</span>
                                </Link>
                            </DropdownMenuItem>
                        </>
                    )}
                    {isCustomer && (
                        <>
                            <DropdownMenuItem asChild>
                                <Link href="/my-properties">
                                    <Building className="mr-2 h-4 w-4" />
                                    <span>My Properties</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/my-consultant">
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>My Consultant</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/support">
                                    <LifeBuoy className="mr-2 h-4 w-4" />
                                    <span>Help & Support</span>
                                </Link>
                            </DropdownMenuItem>
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
