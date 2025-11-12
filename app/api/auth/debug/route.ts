import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Debug endpoint to check if cookie exists
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');
    
    return NextResponse.json({
      hasCookie: !!token,
      cookieValue: token ? `${token.value.substring(0, 20)}...` : null,
      allCookies: Object.fromEntries(
        cookieStore.getAll().map(c => [c.name, c.value.substring(0, 20) + '...'])
      ),
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to read cookies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

