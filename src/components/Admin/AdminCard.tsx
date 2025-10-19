import React, { ReactNode } from 'react';

interface AdminCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export const AdminCard: React.FC<AdminCardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-surface rounded-xl p-6 shadow-xl border border-border ${className}`}>
      <h2 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
};
