import React from 'react';
import { Calendar, Users, CheckCircle, XCircle } from 'lucide-react';
import { type MatchRequest } from '../../services/matchRequests';

interface MatchRequestCardProps {
  request: MatchRequest;
  type: 'received' | 'sent';
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export const MatchRequestCard: React.FC<MatchRequestCardProps> = ({
  request,
  type,
  onAccept,
  onDecline,
  onCancel,
}) => {
  const user = type === 'received' ? request.sender : request.receiver;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start gap-4">
        <img
          src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}`}
          alt={user?.full_name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{user?.full_name}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[request.status] || 'bg-gray-100 text-gray-800'}`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1 mb-3">
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(request.proposed_date).toLocaleDateString()}
              {request.proposed_time && ` at ${request.proposed_time}`}
            </p>
            <p className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {request.game_type.replace('_', ' ')}
            </p>
          </div>
          {request.message && (
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.message}</p>
          )}

          {/* Received: Accept / Decline */}
          {type === 'received' && request.status === 'pending' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onAccept?.(request.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={() => onDecline?.(request.id)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Decline
              </button>
            </div>
          )}

          {/* Sent: Cancel */}
          {type === 'sent' && request.status === 'pending' && (
            <button
              onClick={() => onCancel?.(request.id)}
              className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchRequestCard;
