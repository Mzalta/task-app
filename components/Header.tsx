"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle, CheckSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Header = () => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link 
            href="/dashboard" 
            className="flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <CheckSquare2 className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Tasks
            </span>
          </Link>

          <nav className="flex items-center gap-1">
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
