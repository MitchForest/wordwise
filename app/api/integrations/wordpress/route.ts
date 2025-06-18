import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { publishingIntegrations } from '@/lib/db/schema';
import { encryptForUser } from '@/lib/security/credentials';
import { WordPressPublisher } from '@/services/publishers/wordpress';
import { auth } from '@/lib/auth';

// The getSession method on the auth.api object is the correct way to get the session on the server.
async function getUserId(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  if (!session || !session.user || !session.user.id) {
    return null;
  }
  return session.user.id;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, siteUrl, apiKey } = await req.json();

    if (!name || !siteUrl || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields: name, siteUrl, apiKey' }, { status: 400 });
    }

    const publisher = new WordPressPublisher();
    const testCredentials = { platformId: 'wordpress', siteUrl, apiKey };
    const isConnectionValid = await publisher.testConnection(testCredentials);

    if (!isConnectionValid) {
      return NextResponse.json({ error: 'Connection failed. Please check your Site URL and Application Password.' }, { status: 400 });
    }

    // Use user-specific encryption
    const encryptedCredentials = encryptForUser(JSON.stringify({ apiKey, siteUrl }), userId);

    const [newIntegration] = await db
      .insert(publishingIntegrations)
      .values({
        userId,
        platformId: 'wordpress',
        name,
        credentials: { data: encryptedCredentials }, // Store the encrypted string within a JSON object
      })
      .returning();

    return NextResponse.json({
        id: newIntegration.id,
        name: newIntegration.name,
        platformId: newIntegration.platformId,
    });
  } catch (error) {
    console.error('Failed to create WordPress integration:', error);
    return NextResponse.json({ error: 'Failed to create integration.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      const integrations = await db.query.publishingIntegrations.findMany({
        where: (integrations, { eq }) => eq(integrations.userId, userId),
        columns: {
          id: true,
          name: true,
          platformId: true,
        },
      });
  
      return NextResponse.json(integrations);
    } catch (error) {
      console.error('Failed to retrieve integrations:', error);
      return NextResponse.json({ error: 'Failed to retrieve integrations.' }, { status: 500 });
    }
} 