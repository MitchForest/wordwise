'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddIntegrationPayload {
  name: string;
  siteUrl: string;
  apiKey: string;
}

interface WordPressIntegrationSetupProps {
  onSave: (payload: AddIntegrationPayload) => Promise<boolean>;
  onAddSuccess: () => void;
}

export function WordPressIntegrationSetup({ onSave, onAddSuccess }: WordPressIntegrationSetupProps) {
  const [name, setName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSave({ name, siteUrl, apiKey });
    if (success) {
      onAddSuccess();
    }
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Site Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My Personal Blog"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="siteUrl">WordPress Site URL</Label>
        <Input
          id="siteUrl"
          type="url"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          placeholder="https://example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">Application Password</Label>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Generate this in your WordPress admin panel under Users &rarr; Profile.
        </p>
      </div>
      <Button type="submit" disabled={isSaving} className="w-full">
        {isSaving ? 'Connecting...' : 'Save & Connect'}
      </Button>
    </form>
  );
} 