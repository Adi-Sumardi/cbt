import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes: hanya ADMIN
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Dashboard teacher routes: hanya TEACHER/ADMIN
    if (
      path.startsWith('/dashboard/exams') &&
      token?.role === 'STUDENT'
    ) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Exam routes: hanya STUDENT
    if (path.startsWith('/exam') && token?.role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/exam/:path*'],
};
