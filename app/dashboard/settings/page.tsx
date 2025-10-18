'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and system settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-sm text-slate-600">Full Name:</span>
            <p className="font-medium">{profile?.full_name}</p>
          </div>
          <div>
            <span className="text-sm text-slate-600">Email:</span>
            <p className="font-medium">{profile?.email}</p>
          </div>
          <div>
            <span className="text-sm text-slate-600">Role:</span>
            <p className="font-medium">{profile?.role}</p>
          </div>
          {profile?.phone && (
            <div>
              <span className="text-sm text-slate-600">Phone:</span>
              <p className="font-medium">{profile.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-center py-12">
          <Settings className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Additional settings coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
