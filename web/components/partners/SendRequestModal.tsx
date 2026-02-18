import React from 'react';

interface Player {
  id: string;
  full_name: string;
}

interface SendRequestModalProps {
  player: Player;
  form: {
    proposed_date: string;
    proposed_time: string;
    game_type: 'singles' | 'doubles' | 'mixed_doubles';
    message: string;
  };
  onChange: (form: SendRequestModalProps['form']) => void;
  onSend: () => void;
  onClose: () => void;
}

export const SendRequestModal: React.FC<SendRequestModalProps> = ({
  player,
  form,
  onChange,
  onSend,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Send Match Request</h2>
        <p className="text-gray-600 mb-6">to {player.full_name}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proposed Date *
            </label>
            <input
              type="date"
              value={form.proposed_date}
              onChange={(e) => onChange({ ...form, proposed_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proposed Time
            </label>
            <input
              type="time"
              value={form.proposed_time}
              onChange={(e) => onChange({ ...form, proposed_time: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Game Type *
            </label>
            <select
              value={form.game_type}
              onChange={(e) => onChange({ ...form, game_type: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
              <option value="mixed_doubles">Mixed Doubles</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={form.message}
              onChange={(e) => onChange({ ...form, message: e.target.value })}
              rows={3}
              placeholder="Add a message (optional)"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onSend}
            disabled={!form.proposed_date}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send Request
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendRequestModal;
