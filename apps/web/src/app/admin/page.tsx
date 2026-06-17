import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, examStatusColor, examStatusLabel, roleColor, roleLabel } from '@/components/ui/Badge';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getStats(token: string) {
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [usersRes, examsRes] = await Promise.all([
      fetch(`${API_URL}/api/users`, { headers, cache: 'no-store' }),
      fetch(`${API_URL}/api/exams`, { headers, cache: 'no-store' }),
    ]);

    const users: any[] = usersRes.ok ? await usersRes.json() : [];
    const exams: any[] = examsRes.ok ? await examsRes.json() : [];

    const teachers = users.filter((u) => u.role === 'TEACHER').length;
    const students = users.filter((u) => u.role === 'STUDENT').length;
    const activeExams = exams.filter((e) => e.status === 'ACTIVE').length;
    const finishedExams = exams.filter((e) => e.status === 'FINISHED').length;

    return {
      totalUsers: users.length,
      teachers,
      students,
      totalExams: exams.length,
      activeExams,
      finishedExams,
      recentExams: exams.slice(0, 5),
      recentUsers: users.slice(0, 5),
    };
  } catch {
    return {
      totalUsers: 0,
      teachers: 0,
      students: 0,
      totalExams: 0,
      activeExams: 0,
      finishedExams: 0,
      recentExams: [] as any[],
      recentUsers: [] as any[],
    };
  }
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken ?? '';
  const stats = await getStats(token);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Dashboard Administrator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ringkasan sistem CBT</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Guru"
          value={stats.teachers}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          label="Total Siswa"
          value={stats.students}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Ujian Aktif"
          value={stats.activeExams}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Ujian"
          value={stats.totalExams}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent exams */}
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Ujian Terbaru</h2>
            <a href="/admin/exams" className="text-xs text-blue-600 hover:underline">Lihat semua</a>
          </div>
          {stats.recentExams.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada ujian</p>
          ) : (
            <div className="space-y-3">
              {stats.recentExams.map((exam: any) => (
                <div key={exam.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                    <p className="text-xs text-gray-400">{exam.teacher?.name}</p>
                  </div>
                  <Badge color={examStatusColor[exam.status]}>{examStatusLabel[exam.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent users */}
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pengguna Terbaru</h2>
            <a href="/admin/users" className="text-xs text-blue-600 hover:underline">Lihat semua</a>
          </div>
          {stats.recentUsers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada pengguna</p>
          ) : (
            <div className="space-y-3">
              {stats.recentUsers.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  <Badge color={roleColor[user.role]}>{roleLabel[user.role]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
