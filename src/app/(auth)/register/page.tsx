'use client';

import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Create your account</h2>
      </div>
      <RegisterForm />
      <div className="text-center text-sm">
        <p className="text-gray-700">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/90"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
} 