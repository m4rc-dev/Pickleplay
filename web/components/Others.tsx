import React from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, Globe } from 'lucide-react';

const tiles = [
  {
    to: '/partners',
    title: 'Find Partners',
    desc: 'Search players and send match requests',
    icon: <Users className="w-6 h-6" />,
    bg: 'bg-blue-50',
  },
  {
    to: '/coaches',
    title: 'Find a Coach',
    desc: 'Browse certified coaches and lessons',
    icon: <GraduationCap className="w-6 h-6" />,
    bg: 'bg-emerald-50',
  },
  {
    to: '/community',
    title: 'Community Hub',
    desc: 'Groups, posts, and local events',
    icon: <Globe className="w-6 h-6" />,
    bg: 'bg-violet-50',
  },
];

const Others: React.FC = () => {
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">More</h1>
          <p className="text-gray-600">Coaching and community features</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiles.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`block rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden ${t.bg}`}
            >
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-700 shadow-sm">
                  {t.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t.title}</h3>
                  <p className="text-sm text-gray-600">{t.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Others;
