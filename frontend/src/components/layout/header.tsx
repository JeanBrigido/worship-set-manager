"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useMyAssignments } from "@/hooks/use-suggestions";
import { Music, Calendar, Users, Settings, LogOut, User, ListChecks, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearTokenCache } from "@/lib/jwt-bridge";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Extract user roles for easier role checking
  const userRoles = (session?.user as { roles?: string[] })?.roles || [];
  const isAdmin = userRoles.includes('admin');
  const isLeader = userRoles.includes('leader');
  const isMusician = userRoles.includes('musician');

  // Get pending assignments count for badge
  const { data: assignments = [] } = useMyAssignments();
  const pendingCount = assignments.filter((a) => {
    const now = new Date();
    const dueDate = new Date(a.dueAt);
    const isOverdue = now > dueDate && a.status === 'pending';
    return a.status === 'pending' && !isOverdue;
  }).length;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <Music className="h-6 w-6" />
              <span className="text-xl font-bold hidden sm:inline-block">Worship Set Manager</span>
              <span className="text-xl font-bold sm:hidden">WSM</span>
            </Link>

            {session && (
              <NavigationMenu className="hidden lg:flex">
                <NavigationMenuList>
                  {(isAdmin || isLeader) && (
                    <NavigationMenuItem>
                      <NavigationMenuTrigger>Services</NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid gap-3 p-6 w-[400px]">
                          <NavigationMenuLink asChild>
                            <Link
                              href="/services"
                              className="flex items-center space-x-2 p-3 rounded-md hover:bg-accent"
                            >
                              <Calendar className="h-4 w-4" />
                              <div>
                                <div className="text-sm font-medium">All Services</div>
                                <div className="text-xs text-muted-foreground">View and manage worship services</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                          {(isAdmin || isLeader) && (
                            <NavigationMenuLink asChild>
                              <Link
                                href="/services/new"
                                className="flex items-center space-x-2 p-3 rounded-md hover:bg-accent"
                              >
                                <Calendar className="h-4 w-4" />
                                <div>
                                  <div className="text-sm font-medium">Create Service</div>
                                  <div className="text-xs text-muted-foreground">Plan a new worship service</div>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          )}
                          {isAdmin && (
                            <NavigationMenuLink asChild>
                              <Link
                                href="/admin/service-types"
                                className="flex items-center space-x-2 p-3 rounded-md hover:bg-accent"
                              >
                                <Settings className="h-4 w-4" />
                                <div>
                                  <div className="text-sm font-medium">Service Types</div>
                                  <div className="text-xs text-muted-foreground">Manage recurring service templates</div>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          )}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )}

                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Songs</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-3 p-6 w-[400px]">
                        <NavigationMenuLink asChild>
                          <Link
                            href="/songs"
                            className="flex items-center space-x-2 p-3 rounded-md hover:bg-accent"
                          >
                            <Music className="h-4 w-4" />
                            <div>
                              <div className="text-sm font-medium">Song Library</div>
                              <div className="text-xs text-muted-foreground">
                                {isMusician ? "Browse songs" : "Browse and manage songs"}
                              </div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                        {(isAdmin || isLeader) && (
                          <NavigationMenuLink asChild>
                            <Link
                              href="/songs/new"
                              className="flex items-center space-x-2 p-3 rounded-md hover:bg-accent"
                            >
                              <Music className="h-4 w-4" />
                              <div>
                                <div className="text-sm font-medium">Add Song</div>
                                <div className="text-xs text-muted-foreground">Add a new song to the library</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        )}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/assignments"
                        className={cn(
                          "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                          pathname?.startsWith('/assignments') && "bg-accent text-accent-foreground"
                        )}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Assignments
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/suggestions/my-assignments"
                        className={cn(
                          "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                          pathname?.startsWith('/suggestions') && "bg-accent text-accent-foreground"
                        )}
                      >
                        <ListChecks className="h-4 w-4 mr-2" />
                        My Suggestions
                        {pendingCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary rounded-full">
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  {isAdmin && (
                    <>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/admin/dashboard"
                            className={cn(
                              "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                              pathname?.startsWith('/admin') && "bg-accent text-accent-foreground"
                            )}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Dashboard
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                      <NavigationMenuItem>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/users"
                            className={cn(
                              "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                              pathname?.startsWith('/users') && "bg-accent text-accent-foreground"
                            )}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Users
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    </>
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <ThemeToggle />
            {session ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                        <AvatarFallback>
                          {session.user?.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {session.user?.name && (
                          <p className="font-medium">{session.user.name}</p>
                        )}
                        {session.user?.email && (
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
                            {session.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => {
                        clearTokenCache()
                        signOut({ callbackUrl: '/' })
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                    <SheetHeader>
                      <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>
                    <nav className="mt-6 flex flex-col space-y-1">
                      {(isAdmin || isLeader) && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                            SERVICES
                          </div>
                          <Link
                            href="/services"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                              pathname?.startsWith('/services') && "bg-accent"
                            )}
                          >
                            <Calendar className="h-4 w-4" />
                            All Services
                          </Link>
                          <Link
                            href="/services/new"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                          >
                            <Calendar className="h-4 w-4" />
                            Create Service
                          </Link>
                          {isAdmin && (
                            <Link
                              href="/admin/service-types"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                            >
                              <Settings className="h-4 w-4" />
                              Service Types
                            </Link>
                          )}
                        </>
                      )}

                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-4">
                        SONGS
                      </div>
                      <Link
                        href="/songs"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                          pathname?.startsWith('/songs') && "bg-accent"
                        )}
                      >
                        <Music className="h-4 w-4" />
                        Song Library
                      </Link>
                      {(isAdmin || isLeader) && (
                        <Link
                          href="/songs/new"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          <Music className="h-4 w-4" />
                          Add Song
                        </Link>
                      )}

                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-4">
                        ASSIGNMENTS
                      </div>
                      <Link
                        href="/assignments"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                          pathname?.startsWith('/assignments') && "bg-accent"
                        )}
                      >
                        <Users className="h-4 w-4" />
                        Assignments
                      </Link>
                      <Link
                        href="/suggestions/my-assignments"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                          pathname?.startsWith('/suggestions') && "bg-accent"
                        )}
                      >
                        <ListChecks className="h-4 w-4" />
                        My Suggestions
                        {pendingCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary rounded-full">
                            {pendingCount}
                          </span>
                        )}
                      </Link>

                      {isAdmin && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-4">
                            ADMIN
                          </div>
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                              pathname?.startsWith('/admin') && "bg-accent"
                            )}
                          >
                            <Settings className="h-4 w-4" />
                            Dashboard
                          </Link>
                          <Link
                            href="/users"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                              pathname?.startsWith('/users') && "bg-accent"
                            )}
                          >
                            <Users className="h-4 w-4" />
                            Users
                          </Link>
                        </>
                      )}
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <div className="space-x-2">
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}