export function DocumentSkeleton() {
  return (
    <div className="p-2">
      <div className="flex items-center gap-2 p-2">
        <div className="h-4 w-4 bg-neutral-200 rounded animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="max-w-[80%]">
        <div className="bg-neutral-100 rounded-lg p-4">
          <div className="h-4 bg-neutral-200 rounded w-full animate-pulse mb-2" />
          <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ContentBriefSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-6 bg-neutral-200 rounded w-1/2 animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-neutral-200 rounded animate-pulse" />
        <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 bg-neutral-200 rounded animate-pulse" />
        <div className="h-16 bg-neutral-200 rounded animate-pulse" />
        <div className="h-16 bg-neutral-200 rounded animate-pulse" />
        <div className="h-16 bg-neutral-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="h-8 bg-neutral-200 rounded w-1/3 animate-pulse" />
        <div className="h-8 bg-neutral-200 rounded w-24 animate-pulse" />
      </div>
      <div className="flex-1 p-6 space-y-4">
        <div className="h-4 bg-neutral-200 rounded animate-pulse" />
        <div className="h-4 bg-neutral-200 rounded w-5/6 animate-pulse" />
        <div className="h-4 bg-neutral-200 rounded w-4/5 animate-pulse" />
        <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
      </div>
    </div>
  );
} 