'use client';                          // interactive → client component
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="h-14 shrink-0 border-b border-gray-200 flex items-center px-4">
      <nav className="flex gap-6 text-sm font-medium">
        <Link href="/">Home</Link>
        <Link href="/flows/new">New Flow</Link>
      </nav>
    </header>
  );
}
