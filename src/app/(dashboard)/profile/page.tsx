'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ email: string; full_name?: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (!error) setProfile(data);
      setLoading(false);
    }
    fetchProfile();
  }, [user, supabase]);

  return (
    <AuthGuard>
      <div className="max-w-md mx-auto mt-12 bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Profile</h1>
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : profile ? (
          <div className="flex flex-col items-center space-y-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500">
                {profile.full_name ? profile.full_name[0] : (profile.email ? profile.email[0] : '?')}
              </div>
            )}
            <div className="text-lg font-semibold">{profile.full_name || 'No name set'}</div>
            <div className="text-gray-600">{profile.email}</div>
          </div>
        ) : (
          <div className="text-center text-red-500">Profile not found.</div>
        )}
      </div>
    </AuthGuard>
  );
} 