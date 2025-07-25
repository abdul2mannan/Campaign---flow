import type { Metadata } from 'next';
import './globals.css';

import Navbar from '@/components/navbar';
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Flow Builder Playground',
  description: 'Lemlist‑style campaign flow editor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        {/* Outer flex column to keep nav fixed at top */}
        <div className="flex h-full flex-col">
          {/* Persistent top navbar */}
          <Navbar />

          {/* Main content wrapped with vertical borders */}
          <main className="grow border-x-2 border-gray-200 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
