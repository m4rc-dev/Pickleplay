import React from 'react';
import { MapPin, Award, MessageCircle } from 'lucide-react';

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
  skill_level?: string;
  location?: string;
  bio?: string;
  player_stats?: any;
}

interface PlayerCardProps {
  player: Player;
  onSendRequest: (player: Player) => void;
  onMessage: (userId: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onSendRequest, onMessage }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <img
          src={player.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}`}
          alt={player.full_name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">{player.full_name}</h3>
          {player.skill_level && (
            <span className="inline-flex items-center gap-1 text-sm text-blue-600">
              <Award className="w-4 h-4" />
              {player.skill_level}
            </span>
          )}
          {player.location && (
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {player.location}
            </p>
          )}
        </div>
      </div>
      
      {player.bio && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{player.bio}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onSendRequest(player)}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Send Request
        </button>
        <button
          onClick={() => onMessage(player.id)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PlayerCard;
