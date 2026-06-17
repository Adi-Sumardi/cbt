interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  sub?: string;
}

const colors = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
};

export function StatCard({ label, value, icon, color = 'blue', sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
