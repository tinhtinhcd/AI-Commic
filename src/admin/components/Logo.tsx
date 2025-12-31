
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="translate(0, -5)">
        <text x="256" y="295" fontFamily="Impact, sans-serif" fontWeight="900" fontSize="140" fill="#3B82F6" stroke="#000" strokeWidth="4" textAnchor="middle" style={{ letterSpacing: '4px' }}>
            ACS
        </text>
    </g>
  </svg>
);
