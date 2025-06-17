import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    const apiKey = process.env.NEXT_PUBLIC_LANGUAGETOOL_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_LANGUAGETOOL_ENDPOINT || 'https://api.languagetoolplus.com/v2/';
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'LanguageTool API key not configured' },
        { status: 500 }
      );
    }
    
    // Forward the request to LanguageTool
    const response = await fetch(`${apiUrl}check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'X-API-Key': apiKey,
      },
      body: body,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LanguageTool API error:', response.status, errorText);
      return NextResponse.json(
        { error: `LanguageTool API error: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('LanguageTool proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}