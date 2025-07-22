'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

function LoginFormWithSuspense() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Sign in to your account</h2>
      </div>
      <LoginFormWithSuspense />
      <div className="text-center text-sm">
        <p className="text-gray-700">Don&apos;t have an account? <a
          className="font-medium text-primary hover:text-primary/90"
          href="/register"
        >
          Create one
        </a></p>
      </div>
    </div>
  );
} 