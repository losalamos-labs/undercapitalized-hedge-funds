import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { PortfolioProvider } from '@/context/PortfolioContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MarketSim — Virtual Investment Simulator',
  description: 'Practice investing with $100,000 virtual cash. Trade global stocks, ETFs, crypto, forex, and commodities.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <PortfolioProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </PortfolioProvider>
      </body>
    </html>
  );
}
