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
      // /api/exams/all = seluruh ujian dari semua guru (admin), bukan milik admin sendiri
      fetch(`${API_URL}/api/exams/all`, { headers, cache: 'no-store' }),
    ]);

    const users: any[] = usersRes.ok ? await usersRes.json() : [];
    const exams: any[] = examsRes.ok ? await examsRes.json() : [];

    const teachers = users.filter((u) => u.role === 'TEACHER').length;
    const students = users.filter((u) => u.role === 'STUDENT').length;
    const activeExams = exams.filter((e) => e.status === 'ACTIVE').length;
    const draftExams = exams.filter((e) => e.status === 'DRAFT').length;
    const finishedExams = exams.filter((e) => e.status === 'FINISHED').length;
    const totalQuestions = exams.reduce((acc, e) => acc + (e._count?.questions ?? 0), 0);
    const totalSessions = exams.reduce((acc, e) => acc + (e._count?.sessions ?? 0), 0);

    return {
      totalUsers: users.length,
      teachers,
      students,
      totalExams: exams.length,
      activeExams,
      draftExams,
      finishedExams,
      totalQuestions,
      totalSessions,
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
      draftExams: 0,
      finishedExams: 0,
      totalQuestions: 0,
      totalSessions: 0,
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

      {/* Aksi cepat + rincian ujian */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Aksi cepat */}
        <div className="bg-white rounded-xl border border-blue-100 p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/admin/users/new', label: 'Tambah Pengguna', d: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
              { href: '/admin/users', label: 'Kelola Pengguna', d: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-6a4 4 0 11-8 0 4 4 0 018 0z' },
              { href: '/admin/reports', label: 'Lihat Laporan', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { href: '/admin/settings', label: 'Pengaturan', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
            ].map((a) => (
              <a key={a.href} href={a.href} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition text-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={a.d} />
                </svg>
                <span className="text-xs font-medium text-gray-700">{a.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Rincian status ujian */}
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Rincian Ujian</h2>
          <div className="space-y-2.5">
            {[
              { label: 'Draf', value: stats.draftExams, color: 'bg-gray-100 text-gray-600' },
              { label: 'Aktif', value: stats.activeExams, color: 'bg-blue-100 text-blue-700' },
              { label: 'Selesai', value: stats.finishedExams, color: 'bg-green-100 text-green-700' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${s.color}`}>{s.label}</span>
                <span className="text-sm font-semibold text-gray-900">{s.value}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">Total Bank Soal</span>
              <span className="text-sm font-semibold text-gray-900">{stats.totalQuestions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total Sesi Ujian</span>
              <span className="text-sm font-semibold text-gray-900">{stats.totalSessions}</span>
            </div>
          </div>
        </div>
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
