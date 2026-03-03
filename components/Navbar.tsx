'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '@/context/PortfolioContext';
import { formatCurrency } from '@/lib/format';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/trade', label: 'Trade' },
  { href: '/history', label: 'History' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { portfolio, totalValue } = usePortfolio();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <span className="text-green-400">MarketSim</span>
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

          {/* Portfolio info */}
          {portfolio && (
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-xs text-gray-400 leading-none">{portfolio.name}</p>
                <p className="text-sm font-semibold text-white leading-none mt-1">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            </div>
          )}
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
