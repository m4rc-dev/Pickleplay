import React from 'react';
import { User } from 'lucide-react';

interface PlaceholderAvatarProps {
  className?: string;
  /** Corner style — default circle; use rounded-xl to match squircle cards */
  roundedClassName?: string;
  iconSize?: number;
  iconClassName?: string;
  bgClassName?: string;
}

/** Default avatar when user has no `avatar_url` — person icon, not initials */
export const PlaceholderAvatar: React.FC<PlaceholderAvatarProps> = ({
  className = '',
  roundedClassName = 'rounded-full',
  iconSize = 20,
  iconClassName = 'text-slate-500',
  bgClassName = 'bg-slate-200',
}) => (
  <div
    className={`flex shrink-0 items-center justify-center overflow-hidden ${roundedClassName} ${bgClassName} ${className}`}
    aria-hidden
  >
    <User size={iconSize} className={iconClassName} strokeWidth={2} />
  </div>
);
