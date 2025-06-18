'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, FileText, Globe, CreditCard, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const [activeTab, setActiveTab] = useState('account');

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <AppLayout>
      <div className="h-full bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account, writing preferences, and integrations</p>
          </div>

          <div className="bg-white rounded-lg shadow">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
                <TabsTrigger 
                  value="account" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-4"
                >
                  <User className="h-4 w-4 mr-2" />
                  Account
                </TabsTrigger>
                <TabsTrigger 
                  value="writing" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-4"
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Writing Preferences
                </TabsTrigger>
                <TabsTrigger 
                  value="templates" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-4"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Content Templates
                </TabsTrigger>
                <TabsTrigger 
                  value="integrations" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-4"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Publishing
                </TabsTrigger>
                <TabsTrigger 
                  value="billing" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-4"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="account" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Account Information</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Name</label>
                          <p className="mt-1 text-gray-900">{session.user?.name || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email</label>
                          <p className="mt-1 text-gray-900">{session.user?.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="writing" className="mt-0">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Writing Preferences</h2>
                    <p className="text-gray-600">Configure your default writing style and preferences.</p>
                    {/* Writing preferences form will go here */}
                    <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                      Writing preferences coming soon...
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="mt-0">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Content Templates</h2>
                    <p className="text-gray-600">Create and manage templates for different content types.</p>
                    {/* Template manager will go here */}
                    <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                      Content templates coming soon...
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="integrations" className="mt-0">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Publishing Integrations</h2>
                    <p className="text-gray-600">Connect your WordPress sites and other publishing platforms.</p>
                    {/* Integration manager will go here */}
                    <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                      Publishing integrations coming soon...
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="billing" className="mt-0">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Billing & Subscription</h2>
                    <p className="text-gray-600">Manage your subscription and payment methods.</p>
                    {/* Billing info will go here */}
                    <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                      Billing management coming soon...
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 