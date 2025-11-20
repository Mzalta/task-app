"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Header = () => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link 
            href="/dashboard" 
            className="flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">
              Task App
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            {pathname !== "/dashboard" && (
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="hidden sm:flex"
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              asChild
              className="h-9 w-9"
            >
              <Link 
                href="/profile"
                className="relative"
                aria-label="Profile"
              >
                <UserCircle className="h-5 w-5" />
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
