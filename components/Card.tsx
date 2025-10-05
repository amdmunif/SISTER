import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  // FIX: Changed JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  icon?: React.ReactElement;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', icon }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
};

export default Card;
