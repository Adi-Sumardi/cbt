type BadgeColor = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';

const colors: Record<BadgeColor, string> = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: BadgeColor }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export const examStatusColor: Record<string, BadgeColor> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  FINISHED: 'blue',
  ARCHIVED: 'yellow',
};

export const roleColor: Record<string, BadgeColor> = {
  ADMIN: 'purple',
  TEACHER: 'blue',
  STUDENT: 'green',
};

export const roleLabel: Record<string, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Guru',
  STUDENT: 'Siswa',
};

export const examStatusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  FINISHED: 'Selesai',
  ARCHIVED: 'Diarsipkan',
};
