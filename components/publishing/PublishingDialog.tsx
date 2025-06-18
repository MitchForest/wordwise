'use client';

import { useState } from 'react';
import { usePublishing } from '@/hooks/usePublishing';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WordPressIntegrationSetup } from './WordPressIntegrationSetup';
import { Skeleton } from '@/components/ui/skeleton';

interface PublishingDialogProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PublishingDialog({ documentId, isOpen, onClose }: PublishingDialogProps) {
  const { integrations, isLoadingIntegrations, isPublishing, publish, addIntegration } = usePublishing(documentId);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showAddIntegration, setShowAddIntegration] = useState(false);

  const handlePublish = () => {
    if (selectedIntegration) {
      publish(selectedIntegration);
      onClose();
    }
  };

  const handleAddIntegrationSuccess = () => {
    setShowAddIntegration(false);
  };
  
  const hasIntegrations = integrations.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{showAddIntegration ? 'Connect to WordPress' : 'Publish Document'}</DialogTitle>
          {!showAddIntegration && <DialogDescription>Select a destination to publish this document as a draft.</DialogDescription>}
        </DialogHeader>

        {isLoadingIntegrations ? (
            <div className="space-y-4 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : (
            <>
            {showAddIntegration || !hasIntegrations ? (
                <WordPressIntegrationSetup onSave={addIntegration} onAddSuccess={handleAddIntegrationSuccess} />
            ) : (
                <div className="py-4 space-y-4">
                    <Select onValueChange={setSelectedIntegration} defaultValue={selectedIntegration ?? undefined}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a destination..." />
                    </SelectTrigger>
                    <SelectContent>
                        {integrations.map(int => (
                        <SelectItem key={int.id} value={int.id}>
                            {int.name} ({int.platformId})
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <Button onClick={() => setShowAddIntegration(true)} variant="outline" className="w-full">
                        Add New Integration
                    </Button>
                </div>
            )}
            </>
        )}
        
        {!showAddIntegration && hasIntegrations && (
            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={handlePublish} disabled={!selectedIntegration || isPublishing}>
                    {isPublishing ? 'Publishing...' : 'Publish to Draft'}
                </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
} 