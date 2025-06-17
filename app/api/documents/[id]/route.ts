import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    const document = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, id),
        eq(documents.userId, session.user.id)
      ))
      .limit(1);
    
    if (document.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ document: document[0] });
  } catch (error) {
    console.error('Failed to fetch document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    
    const { content, plainText, title, metaDescription, starred } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      lastSavedAt: new Date(),
    };

    if (content !== undefined) updateData.content = content;
    if (plainText !== undefined) updateData.plainText = plainText;
    if (title !== undefined) updateData.title = title;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (starred !== undefined) updateData.starred = starred;

    const updatedDocument = await db
      .update(documents)
      .set(updateData)
      .where(and(
        eq(documents.id, id),
        eq(documents.userId, session.user.id)
      ))
      .returning();

    if (updatedDocument.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      document: updatedDocument[0] 
    });
  } catch (error) {
    console.error('Failed to update document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;

    const deletedDocument = await db
      .delete(documents)
      .where(and(
        eq(documents.id, id),
        eq(documents.userId, session.user.id)
      ))
      .returning();

    if (deletedDocument.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Document deleted successfully' 
    });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
} 