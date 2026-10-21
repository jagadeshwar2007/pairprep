'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  className?: string;
}

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || '?').trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
}

/** Profile picture with an initials fallback (also used if the image fails to load). */
export function Avatar({ name, email, src, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-xs font-bold text-white',
        className,
      )}
    >
      {showImage ? (
        // Google avatars are remote URLs validated as https in the database; referrer is withheld.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name, email)}</span>
      )}
    </span>
  );
}
