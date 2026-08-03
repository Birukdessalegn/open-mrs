/**
 * Authentication and authorization middleware
 * Provides role-based access control and session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '../config/app';
import { supabase as supabaseClient } from '@/lib/supabase';

// Define route permissions
const routePermissions: Record<string, string[]> = {
  '/dashboard': ['Admin', 'Doctor', 'Lab Tech', 'Pharmacist', 'Receptionist'],
  '/dashboard/patients': ['Admin', 'Doctor', 'Receptionist'],
  '/dashboard/appointments': ['Admin', 'Doctor', 'Receptionist'],
  '/dashboard/visits': ['Admin', 'Doctor'],
  '/dashboard/laboratory': ['Admin', 'Doctor', 'Lab Tech'],
  '/dashboard/billing': ['Admin', 'Doctor', 'Receptionist'],
  '/dashboard/pharmacy': ['Admin', 'Pharmacist'],
  '/dashboard/settings': ['Admin'],
  '/dashboard/audit': ['Admin'],
  '/dashboard/users': ['Admin'],
};

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

// Define API routes that require specific permissions
const apiPermissions: Record<string, string[]> = {
  '/api/admin': ['Admin'],
  '/api/audit': ['Admin'],
  '/api/users': ['Admin'],
};

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Allow static files and API routes (they handle their own auth)
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname.startsWith('/static')) {
    return NextResponse.next();
  }
  
  try {
    // Create Supabase client
    const supabase = supabaseClient;
    
    // Get session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !profile) {
      // Redirect to login if profile not found
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Check route permissions
    const allowedRoles = routePermissions[pathname];
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      // Redirect to dashboard if user doesn't have permission
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', session.user.id);
    response.headers.set('x-user-role', profile.role);
    
    return response;
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export async function apiAuthMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  try {
    // Create Supabase client
    const supabase = supabaseClient;
    
    // Get session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 401 }
      );
    }
    
    // Check API permissions
    const apiPath = Object.keys(apiPermissions).find(path => 
      pathname.startsWith(path)
    );
    
    if (apiPath) {
      const requiredRoles = apiPermissions[apiPath];
      if (!requiredRoles.includes(profile.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }
    
    // Add user info to headers
    const response = NextResponse.next();
    response.headers.set('x-user-id', session.user.id);
    response.headers.set('x-user-role', profile.role);
    
    return response;
    
  } catch (error) {
    console.error('API auth middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Utility functions for permission checking
export function checkPermission(userRole: string, requiredRole: string): boolean {
  return hasPermission(userRole, requiredRole);
}

export function getRequiredRole(route: string): string[] {
  return routePermissions[route] || [];
}

export function isPublicRoute(route: string): boolean {
  return publicRoutes.includes(route);
}

// Higher-order function for API route protection
export function withAuth(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  requiredRole?: string
) {
  return async (request: NextRequest, context: any) => {
    try {
      const supabase = supabaseClient;
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      if (requiredRole) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (!profile || !checkPermission(profile.role, requiredRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }
      
      return handler(request, context);
      
    } catch (error) {
      console.error('Auth wrapper error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
