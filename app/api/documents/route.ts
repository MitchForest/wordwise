import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, session.user.id))
      .orderBy(desc(documents.updatedAt));
    
    return NextResponse.json({ documents: userDocuments });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { title = 'Untitled Document' } = body;
    
    const newDocument = await db
      .insert(documents)
      .values({
        userId: session.user.id,
        title,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            }
          ]
        },
      })
      .returning();
    
    return NextResponse.json({ document: newDocument[0] });
  } catch (error) {
    console.error('Failed to create document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
} 