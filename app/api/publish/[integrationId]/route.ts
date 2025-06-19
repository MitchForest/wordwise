import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decryptForUser } from '@/lib/security/credentials';
import { WordPressPublisher } from '@/services/publishers/wordpress';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import type { BlogContent, PublishOptions } from '@/types/publishing';

async function getUserId(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user?.id ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { integrationId } = await params;

  if (!integrationId) {
    return NextResponse.json({ error: 'Integration ID is required.' }, { status: 400 });
  }

  let documentId: string | null = null;
  try {
    const body = await req.json();
    documentId = body.documentId;
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
    }

    const [integration, document] = await Promise.all([
      db.query.publishingIntegrations.findFirst({
        where: (table) => and(
          eq(table.id, integrationId),
          eq(table.userId, userId)
        ),
      }),
      db.query.documents.findFirst({
        where: (table) => and(
          eq(table.id, documentId!),
          eq(table.userId, userId)
        ),
      }),
    ]);

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found or you do not have permission to use it.' }, { status: 404 });
    }
    if (!document) {
      return NextResponse.json({ error: 'Document not found or you do not have permission to access it.' }, { status: 404 });
    }

    const credentialsString = (integration.credentials as { data: string }).data;
    const decryptedCredentials = JSON.parse(decryptForUser(credentialsString, userId));

    const blogContent: BlogContent = {
      title: document.title,
      content: document.plainText ?? '',
      metaDescription: document.metaDescription ?? '',
      targetKeyword: document.targetKeyword ?? '',
    };
    
    const publishOptions: PublishOptions = {
      status: 'draft',
    };

    const publisher = new WordPressPublisher();
    const result = await publisher.publish(blogContent, publishOptions, {
      ...decryptedCredentials,
      platformId: integration.platformId,
    });
    
    if (!result.success) {
        return NextResponse.json({ error: result.error || 'Publishing failed.' }, { status: 500 });
    }
    
    return NextResponse.json(result);

  } catch (error) {
    console.error(`Failed to publish document ${documentId || 'unknown'} to integration ${integrationId}:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 