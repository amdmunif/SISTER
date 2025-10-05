
import React from 'react';

interface BadgeProps {
    color: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
    children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ color, children }) => {
    const colorClasses = {
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        blue: 'bg-blue-100 text-blue-800',
        gray: 'bg-gray-100 text-gray-800',
    };

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[color]}`}>
            {children}
        </span>
    );
};

export default Badge;
