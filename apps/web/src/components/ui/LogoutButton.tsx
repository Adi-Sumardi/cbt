'use client';

import { signOut } from 'next-auth/react';
import { toast } from 'gooey-toast';

interface LogoutButtonProps {
  className?: string;
  label?: string;
}

export function LogoutButton({ className = '', label = 'Keluar' }: LogoutButtonProps) {
  const handleLogout = () => {
    toast.info({ title: 'Keluar dari sistem...', description: 'Sampai jumpa!' });
    setTimeout(() => signOut({ callbackUrl: '/auth/login' }), 800);
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors ${className}`}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
