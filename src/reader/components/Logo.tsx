
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="comic-shadow-reader">
        <feDropShadow dx="8" dy="8" stdDeviation="0" floodColor="#000" floodOpacity="1"/>
      </filter>
    </defs>
    <g transform="translate(0, -5)">
        <text x="256" y="295" fontFamily="Impact, sans-serif" fontWeight="900" fontSize="140" fill="#EC4899" stroke="#000" strokeWidth="4" textAnchor="middle" style={{ letterSpacing: '4px' }}>
            ACS
        </text>
    </g>
  </svg>
);
