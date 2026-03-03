'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '@/context/PortfolioContext';
import { formatCurrency } from '@/lib/format';
import { PiggyBank, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/trade', label: 'Trade' },
  { href: '/history', label: 'History' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { portfolio, totalValue } = usePortfolio();
  const { data: session } = useSession();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <PiggyBank className="w-6 h-6 text-amber-400" />
            <span className="text-amber-400 sm:hidden">UHF</span>
            <span className="text-amber-400 hidden sm:inline">Undercapitalized Hedge Funds</span>
          </Link>

          {/* Nav links - hidden on mobile */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: portfolio info + user */}
          <div className="flex items-center gap-4">
            {portfolio && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400 leading-none">{portfolio.name}</p>
                <p className="text-sm font-semibold text-white leading-none mt-1">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            )}

            {session?.user && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                  <User className="w-3.5 h-3.5" />
                  <span>{session.user.name}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden gap-4 pb-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-xs font-medium transition-colors',
                pathname === link.href ? 'text-white' : 'text-gray-400'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
