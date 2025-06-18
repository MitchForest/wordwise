export interface PublishingPlatform {
  id: string;
  name: string;
  icon: string;
  type: 'wordpress' | 'medium' | 'ghost' | 'custom';
}

export interface PublishingCredentials {
  platformId: string;
  siteUrl?: string;
  apiKey?: string; // For WordPress Application Passwords or other API keys
  username?: string;
  password?: string;
  accessToken?: string;
}

export interface PublishOptions {
  status: 'draft' | 'publish' | 'private' | 'future';
  scheduledDate?: Date;
  categories?: string[];
  tags?: string[];
  featuredImage?: string;
  excerpt?: string;
  customFields?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  editUrl?: string;
  error?: string;
}

// Base interface all publishers must implement
export interface Publisher {
  id: string;
  name: string;
  
  // Connection management
  testConnection(credentials: PublishingCredentials): Promise<boolean>;
  
  // Publishing operations
  publish(
    content: BlogContent,
    options: PublishOptions,
    credentials: PublishingCredentials
  ): Promise<PublishResult>;
  
  update(
    postId: string,
    content: BlogContent,
    options: PublishOptions,
    credentials: PublishingCredentials
  ): Promise<PublishResult>;
}

export interface BlogContent {
  title: string;
  content: string; // HTML content
  metaDescription?: string;
  targetKeyword?: string;
  author?: string;
} 