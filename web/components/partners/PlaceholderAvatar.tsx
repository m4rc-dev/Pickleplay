import React, { useEffect, useState } from 'react';
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

interface AvatarImgProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  placeholderIconSize?: number;
  placeholderBgClassName?: string;
  placeholderIconClassName?: string;
}

/**
 * `<img>` with automatic fallback to PlaceholderAvatar when the URL is falsy
 * or the image fails to load (404, timeout, etc.).
 */
export const AvatarImg: React.FC<AvatarImgProps> = ({
  src,
  alt = 'User',
  className = '',
  placeholderClassName,
  placeholderIconSize,
  placeholderBgClassName,
  placeholderIconClassName,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) {
    return (
      <PlaceholderAvatar
        className={placeholderClassName ?? className}
        iconSize={placeholderIconSize}
        bgClassName={placeholderBgClassName}
        iconClassName={placeholderIconClassName}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};
