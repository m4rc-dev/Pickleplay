
import React from 'react';
import { Medal, Search, TrendingUp, UserPlus, Filter, ArrowUp, ArrowDown } from 'lucide-react';

interface PlayerRank {
  rank: number;
  name: string;
  dupr: number;
  winRate: number;
  matches: number;
  trend: 'up' | 'down' | 'stable';
  avatar: string;
}

const LEADERBOARD_DATA: PlayerRank[] = [
  { rank: 1, name: 'David Smith', dupr: 5.12, winRate: 82, matches: 156, trend: 'stable', avatar: 'https://picsum.photos/seed/p3/100/100' },
  { rank: 2, name: 'Marcus Chen', dupr: 4.85, winRate: 75, matches: 210, trend: 'up', avatar: 'https://picsum.photos/seed/p1/100/100' },
  { rank: 3, name: 'Linda Kim', dupr: 4.62, winRate: 68, matches: 124, trend: 'down', avatar: 'https://picsum.photos/seed/p4/100/100' },
  { rank: 4, name: 'Alex Rivera', dupr: 4.25, winRate: 68, matches: 98, trend: 'up', avatar: 'https://picsum.photos/seed/pickle/100/100' },
  { rank: 5, name: 'Sophie Turner', dupr: 4.10, winRate: 62, matches: 84, trend: 'up', avatar: 'https://picsum.photos/seed/p6/100/100' },
  { rank: 6, name: 'Elena Rodriguez', dupr: 3.85, winRate: 59, matches: 112, trend: 'stable', avatar: 'https://picsum.photos/seed/p2/100/100' },
  { rank: 7, name: 'Jordan Hayes', dupr: 3.52, winRate: 51, matches: 45, trend: 'down', avatar: 'https://picsum.photos/seed/p5/100/100' },
];

const Rankings: React.FC = () => {
  const topThree = LEADERBOARD_DATA.slice(0, 3);
  const remaining = LEADERBOARD_DATA.slice(3);

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">LEADERBOARD / 2025</p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">Player Rankings.</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search player..."
              className="bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 shadow-sm"
            />
          </div>
          <button className="bg-white border border-slate-200 px-4 rounded-2xl flex items-center gap-2 text-slate-600 hover:bg-slate-50 transition-all">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {/* Podium Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
        {/* Silver - Rank 2 */}
        <PodiumCard player={topThree[1]} color="slate-300" rankColor="text-slate-500" medalColor="text-slate-400" />

        {/* Gold - Rank 1 */}
        <PodiumCard player={topThree[0]} color="blue-300" rankColor="text-blue-600" medalColor="text-blue-500" isMain />

        {/* Bronze - Rank 3 */}
        <PodiumCard player={topThree[2]} color="lime-300" rankColor="text-lime-700" medalColor="text-lime-600" />
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Rank</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Player</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">DUPR</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Win Rate</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Matches</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {remaining.map((player) => (
                <tr key={player.rank} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">#{player.rank}</span>
                      {player.trend === 'up' && <ArrowUp size={12} className="text-green-500" />}
                      {player.trend === 'down' && <ArrowDown size={12} className="text-red-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm" />
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-sm">
                      {player.dupr.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lime-400 rounded-full"
                          style={{ width: `${player.winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{player.winRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-medium text-slate-500">{player.matches}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1 ml-auto">
                      <UserPlus size={14} />
                      Challenge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PodiumCard: React.FC<{
  player: PlayerRank,
  color: string,
  rankColor: string,
  medalColor: string,
  isMain?: boolean
}> = ({ player, color, rankColor, medalColor, isMain }) => (
  <div className={`relative flex flex-col items-center bg-white rounded-3xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-xl hover:-translate-y-1 ${isMain ? 'pb-10 pt-12 md:scale-110 z-10 border-lime-200' : ''}`}>
    {isMain && (
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-lime-400 text-slate-900 px-6 py-2 rounded-full font-black text-sm shadow-xl shadow-lime-100 uppercase tracking-widest border-4 border-white">
        King of Kitchen
      </div>
    )}

    <div className={`absolute top-4 right-4 ${medalColor}`}>
      <Medal size={isMain ? 32 : 24} strokeWidth={2.5} />
    </div>

    <div className="relative mb-4">
      <img
        src={player.avatar}
        alt={player.name}
        className={`rounded-full border-4 object-cover ${isMain ? 'w-24 h-24 border-lime-400' : 'w-20 h-20 border-slate-100'}`}
      />
      <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-black text-white text-xs ${isMain ? 'bg-blue-500' : 'bg-slate-400'}`}>
        {player.rank}
      </div>
    </div>

    <h3 className={`font-black text-center ${isMain ? 'text-xl' : 'text-lg'} text-slate-900`}>{player.name}</h3>

    <div className="mt-4 flex flex-col items-center gap-1">
      <span className={`text-xs font-bold uppercase tracking-widest ${rankColor}`}>DUPR Rating</span>
      <span className="text-3xl font-black text-slate-900">{player.dupr.toFixed(2)}</span>
    </div>

    <div className="mt-6 grid grid-cols-2 gap-4 w-full pt-4 border-t border-slate-50">
      <div className="text-center">
        <p className="text-[10px] text-slate-400 uppercase font-bold">Win Rate</p>
        <p className="font-bold text-slate-700">{player.winRate}%</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-slate-400 uppercase font-bold">Matches</p>
        <p className="font-bold text-slate-700">{player.matches}</p>
      </div>
    </div>
  </div>
);

export default Rankings;
