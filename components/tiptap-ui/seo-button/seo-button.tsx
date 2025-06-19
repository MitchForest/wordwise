'use client';

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
          className="text-primary hover:bg-primary/10 px-3 py-1 rounded-full bg-primary/5 font-medium text-sm"
        >
          SEO
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        SEO Settings - Keywords, Meta Description
      </TooltipContent>
    </Tooltip>
  );
} 