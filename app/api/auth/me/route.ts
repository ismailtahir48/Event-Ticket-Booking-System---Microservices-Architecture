import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-use-rsa-keys';

// Debug: Log JWT_SECRET (first 10 chars only for security)
console.log('Gateway - JWT_SECRET loaded:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NOT SET');

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    console.log('Auth me endpoint - Token exists:', !!token);
    console.log('Auth me endpoint - All cookies:', cookieStore.getAll().map(c => c.name));

    if (!token) {
      console.log('Auth me endpoint - No token found');
      return NextResponse.json({ error: 'No token found in cookies' }, { status: 401 });
    }

    // Verify and decode token
    console.log('🔍 TOKEN VERIFICATION:');
    console.log('  - Token received (first 50 chars):', token.substring(0, 50) + '...');
    console.log('  - Token length:', token.length);
    console.log('  - JWT_SECRET used (first 10 chars):', JWT_SECRET.substring(0, 10) + '...');
    console.log('  - JWT_SECRET length:', JWT_SECRET.length);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        email: string;
        role: string;
        orgId?: string;
      };

      console.log('✅ TOKEN VERIFIED SUCCESSFULLY:');
      console.log('  - User ID:', decoded.sub);
      console.log('  - Email:', decoded.email);
      console.log('  - Role:', decoded.role);

      return NextResponse.json({
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        orgId: decoded.orgId,
      });
    } catch (jwtError: any) {
      // More specific error handling
      console.error('❌ TOKEN VERIFICATION FAILED:');
      console.error('  - Error type:', jwtError.name);
      console.error('  - Error message:', jwtError.message);
      console.error('  - Token (first 50 chars):', token.substring(0, 50) + '...');
      console.error('  - JWT_SECRET (first 10 chars):', JWT_SECRET.substring(0, 10) + '...');
      console.error('  - JWT_SECRET lengths - Token signed with:', '?', 'Verified with:', JWT_SECRET.length);
      
      return NextResponse.json({ 
        error: 'Invalid token', 
        details: jwtError.message,
        hint: 'Check if JWT_SECRET matches between Auth Service and Gateway'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 401 });
  }
}

