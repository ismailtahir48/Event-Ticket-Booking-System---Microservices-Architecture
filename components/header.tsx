'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Search, User, Menu, LogOut } from 'lucide-react'
import { UserMenu } from '@/components/user-menu'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[hsl(var(--background))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">TicketSystem</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-[hsl(var(--foreground))]/80">
              Events
            </Link>
            <Link href="/orders" className="transition-colors hover:text-[hsl(var(--foreground))]/80">
              My Orders
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Search className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex items-center space-x-2">
            <UserMenu />
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}

