'use client';

import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Sign in to your account</h2>
      </div>
      <LoginForm />
      <div className="text-center text-sm">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-primary/90"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
} 