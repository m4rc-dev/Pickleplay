import React from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Shield, UserPlus } from 'lucide-react';

interface CommunityGuidelinesNoticeProps {
  isOpen: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}

const guidelines = [
  {
    title: 'Follow with intent',
    description: 'Use follows to keep track of players you genuinely want to play with.',
    icon: UserPlus,
  },
  {
    title: 'Keep it respectful',
    description: 'Messages and match requests should stay friendly, clear, and on-topic.',
    icon: MessageCircle,
  },
  {
    title: 'Match your level',
    description: 'Similar skill ranges usually lead to better games and better follow-through.',
    icon: Shield,
  },
];

export const CommunityGuidelinesNotice: React.FC<CommunityGuidelinesNoticeProps> = ({
  isOpen,
  onToggle,
  onDismiss,
}) => {
  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/70">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-700">Community guidelines</p>
          <p className="text-sm text-slate-600">
            Keep discovery friendly, fair, and local-first.
          </p>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="shrink-0 text-blue-500" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-blue-500" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-blue-100 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-3">
            {guidelines.map((guideline) => {
              const Icon = guideline.icon;
              return (
                <div key={guideline.title} className="rounded-xl border border-white/70 bg-white/70 p-3">
                  <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Icon size={14} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-800">
                    {guideline.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {guideline.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onDismiss}
              className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500 transition-colors hover:text-blue-700"
            >
              Hide guidelines
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
