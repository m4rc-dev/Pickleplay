import React from 'react';

interface CourtManagerHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
}

const CourtManagerHeader: React.FC<CourtManagerHeaderProps> = ({
  eyebrow = 'Court Manager',
  title,
  description,
}) => (
  <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
      {eyebrow}
    </p>
    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
      {title}
    </h1>
    <p className="mt-3 max-w-3xl text-sm font-medium text-slate-500">
      {description}
    </p>
  </div>
);

export default CourtManagerHeader;
