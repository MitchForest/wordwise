'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/tiptap-ui-primitive/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/tiptap-ui-primitive/tooltip';

interface SEOButtonProps {
  onClick: () => void;
}

export function SEOButton({ onClick }: SEOButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onClick}
          className="text-primary hover:bg-primary/10"
        >
          <Search className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        SEO Settings
      </TooltipContent>
    </Tooltip>
  );
} 