import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { SidebarLayout } from '@/components/layout/SidebarLayout';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/dashboard');

  return (
    <SidebarLayout sidebar={<AdminSidebar />}>
      {children}
    </SidebarLayout>
  );
}
