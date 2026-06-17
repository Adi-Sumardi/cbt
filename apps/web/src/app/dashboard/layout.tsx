import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TeacherSidebar } from '@/components/layout/TeacherSidebar';
import { SidebarLayout } from '@/components/layout/SidebarLayout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const role = (session.user as any).role;

  if (role === 'STUDENT') {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <SidebarLayout sidebar={<TeacherSidebar />}>
      {children}
    </SidebarLayout>
  );
}
