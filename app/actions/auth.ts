'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

export async function registerAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = (formData.get('role') as string) || 'customer';

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Auto-login after registration
    return loginAction(email, password);
  } catch (error) {
    throw error;
  }
}

export async function loginAction(email: string, password: string) {
  try {
    console.log('Login action called for:', email);
    
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log('Auth service response:', { ok: response.ok, hasToken: !!data.token });

    if (!response.ok) {
      console.error('Login failed:', data);
      throw new Error(data.error || 'Login failed');
    }

    if (!data.token) {
      console.error('No token in response:', data);
      throw new Error('No token received from auth service');
    }

    // Set cookie with token
    const cookieStore = await cookies();
    cookieStore.set('auth-token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    // Verify cookie was set
    const verifyToken = cookieStore.get('auth-token')?.value;
    console.log('Cookie set verification:', { 
      tokenReceived: !!data.token, 
      cookieSet: !!verifyToken,
      tokenLength: data.token?.length 
    });
    
    if (!verifyToken) {
      console.error('Cookie was not set properly - token exists but cookie does not');
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login action error:', error);
    throw error;
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  redirect('/login');
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    // Verify token and get user info
    // For now, we'll decode it (in production, verify with auth service)
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

