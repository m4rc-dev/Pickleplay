import React from 'react';

export const formatContent = (content: string) => {
  if (!content) return null;
  return content.split(/(\s+)/).map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <span key={i} className="text-blue-600 font-bold hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    return part;
  });
};
