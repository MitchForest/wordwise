import { useState, useEffect } from 'react';
import type { PublishResult } from '@/types/publishing';
import { toast } from 'sonner';

interface Integration {
    id: string;
    name: string;
    platformId: string;
}

interface AddIntegrationPayload {
    name: string;
    siteUrl: string;
    apiKey: string;
}

export function usePublishing(documentId: string) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);

  const fetchIntegrations = async () => {
    try {
      setIsLoadingIntegrations(true);
      const response = await fetch('/api/integrations/wordpress');
      if (!response.ok) throw new Error('Failed to fetch integrations.');
      const data = await response.json();
      setIntegrations(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load integrations.');
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const addIntegration = async (payload: AddIntegrationPayload): Promise<boolean> => {
    try {
      const response = await fetch('/api/integrations/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to add integration.');
      }
      
      const newIntegration = await response.json();
      setIntegrations(prev => [...prev, newIntegration]);
      toast.success(`Successfully connected to ${newIntegration.name}!`);
      return true;

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add integration.');
      return false;
    }
  };

  const publish = async (integrationId: string) => {
    setIsPublishing(true);
    try {
      const response = await fetch(`/api/publish/${integrationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to publish.');
      }
      
      const result: PublishResult = await response.json();
      toast.success('Successfully published draft!', {
        action: {
          label: 'View Post',
          onClick: () => window.open(result.postUrl, '_blank'),
        },
      });

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish document.');
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    isPublishing,
    publish,
    integrations,
    isLoadingIntegrations,
    addIntegration,
  };
} 