import type {
  BlogContent,
  Publisher,
  PublishingCredentials,
  PublishOptions,
  PublishResult,
} from '@/types/publishing';

export class WordPressPublisher implements Publisher {
  id = 'wordpress';
  name = 'WordPress';

  private getApiUrl(siteUrl: string): string {
    const url = siteUrl.replace(/\/$/, '');
    // For self-hosted, the path is standard.
    // WordPress.com uses a different structure which we are not supporting in this MVP.
    return `${url}/wp-json/wp/v2`;
  }

  private getAuthHeaders(credentials: PublishingCredentials): HeadersInit {
    if (credentials.apiKey) {
      // WordPress Application Passwords use a Bearer token format.
      // We are deliberately not supporting basic auth for security reasons.
      return {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      };
    }
    throw new Error('No valid authentication method provided for WordPress. An Application Password is required.');
  }

  async testConnection(credentials: PublishingCredentials): Promise<boolean> {
    if (!credentials.siteUrl) {
      console.error('WordPress connection test failed: Site URL is missing.');
      return false;
    }
    try {
      const response = await fetch(
        `${this.getApiUrl(credentials.siteUrl)}/users/me?context=edit`,
        {
          headers: this.getAuthHeaders(credentials),
        }
      );
      return response.ok;
    } catch (error) {
      console.error('WordPress connection test failed:', error);
      return false;
    }
  }

  async publish(
    content: BlogContent,
    options: PublishOptions,
    credentials: PublishingCredentials
  ): Promise<PublishResult> {
    if (!credentials.siteUrl) {
        return { success: false, error: 'Site URL is missing.' };
    }
    try {
      const apiUrl = this.getApiUrl(credentials.siteUrl);
      
      const wpPost = {
        title: content.title,
        content: content.content,
        status: options.status,
        // In the future, we can map categories, tags, etc.
      };

      const response = await fetch(`${apiUrl}/posts`, {
        method: 'POST',
        headers: this.getAuthHeaders(credentials),
        body: JSON.stringify(wpPost),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to publish to WordPress:', errorData);
        throw new Error(errorData.message || 'Failed to publish to WordPress');
      }

      const result = await response.json();

      return {
        success: true,
        postId: result.id.toString(),
        postUrl: result.link,
        editUrl: `${credentials.siteUrl}/wp-admin/post.php?post=${result.id}&action=edit`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred during publishing.',
      };
    }
  }

  async update(
    postId: string,
    content: BlogContent,
    options: PublishOptions,
    credentials: PublishingCredentials
  ): Promise<PublishResult> {
    // This is out of scope for the MVP, but we include the method to satisfy the interface.
    console.warn('The update feature is not implemented in this version.');
    return Promise.resolve({
      success: false,
      error: 'Update functionality is not yet implemented.',
    });
  }
} 