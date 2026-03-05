import React from 'react';

const SvgWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: '100%', height: '100%' }}
  >
    {children}
  </svg>
);

export const NoTeamsIllustration = () => (
  <SvgWrapper>
    {/* Background elements */}
    <circle cx="100" cy="100" r="70" fill="currentColor" fillOpacity="0.03" />
    <circle cx="150" cy="60" r="20" fill="currentColor" fillOpacity="0.05" />
    
    {/* Abstract Team representation */}
    <rect x="60" y="110" width="30" height="40" rx="4" stroke="currentColor" strokeWidth="6" strokeOpacity="0.3" />
    <circle cx="75" cy="95" r="10" stroke="currentColor" strokeWidth="6" strokeOpacity="0.3" />
    
    <rect x="110" y="110" width="30" height="40" rx="4" stroke="currentColor" strokeWidth="6" strokeOpacity="0.3" />
    <circle cx="125" cy="95" r="10" stroke="currentColor" strokeWidth="6" strokeOpacity="0.3" />
    
    {/* The "lonely" user */}
    <path
      d="M80 160C80 140 90 130 100 130C110 130 120 140 120 160"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <circle cx="100" cy="110" r="15" stroke="currentColor" strokeWidth="8" />
    
    {/* Decorative floating dots */}
    <circle cx="40" cy="80" r="4" fill="currentColor" fillOpacity="0.2" />
    <circle cx="160" cy="140" r="4" fill="currentColor" fillOpacity="0.2" />
  </SvgWrapper>
);

export const NoAssignmentsIllustration = () => (
  <SvgWrapper>
    <circle cx="100" cy="100" r="80" fill="currentColor" fillOpacity="0.03" />
    
    {/* Document/Roster background */}
    <rect x="60" y="50" width="80" height="100" rx="8" stroke="currentColor" strokeWidth="6" />
    
    {/* Empty lines */}
    <path d="M80 80H120" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.2" />
    <path d="M80 105H120" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.2" />
    <path d="M80 130H100" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.2" />
    
    {/* Floating "Empty" indicator */}
    <circle cx="140" cy="140" r="25" fill="var(--background-body)" stroke="currentColor" strokeWidth="6" />
    <path d="M130 140H150" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
  </SvgWrapper>
);

export const AllExpiredIllustration = () => (
  <SvgWrapper>
    <circle cx="100" cy="100" r="75" fill="currentColor" fillOpacity="0.03" />
    
    {/* Sunset/End of day clock */}
    <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="8" />
    <path d="M100 60V100L130 120" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4" />
    
    {/* Zzz floating symbols */}
    <path d="M140 50L155 50L140 65L155 65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M165 30L175 30L165 40L175 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" />
  </SvgWrapper>
);

export const NoFutureDataIllustration = () => (
  <SvgWrapper>
    <circle cx="100" cy="100" r="80" fill="currentColor" fillOpacity="0.03" />
    
    {/* Calendar representation */}
    <rect x="50" y="60" width="100" height="90" rx="8" stroke="currentColor" strokeWidth="8" />
    <path d="M50 90H150" stroke="currentColor" strokeWidth="8" />
    <path d="M80 45V75" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M120 45V75" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    
    {/* Empty road/path to the future */}
    <path d="M80 150L60 190" stroke="currentColor" strokeWidth="4" strokeOpacity="0.2" />
    <path d="M120 150L140 190" stroke="currentColor" strokeWidth="4" strokeOpacity="0.2" />
  </SvgWrapper>
);

export const NoUsersIllustration = () => (
  <SvgWrapper>
    {/* Large soft background */}
    <circle cx="100" cy="100" r="85" fill="currentColor" fillOpacity="0.03" />
    
    {/* Group of people silhouette */}
    <g opacity="0.4">
      <circle cx="65" cy="85" r="15" stroke="currentColor" strokeWidth="6" />
      <path d="M40 130C40 115 50 105 65 105C80 105 90 115 90 130" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      
      <circle cx="135" cy="85" r="15" stroke="currentColor" strokeWidth="6" />
      <path d="M110 130C110 115 120 105 135 105C150 105 160 115 160 130" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </g>
    
    {/* Focal point - The missing role/badge */}
    <rect x="80" y="130" width="40" height="12" rx="6" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="4" />
    <circle cx="100" cy="136" r="25" fill="var(--background-body)" stroke="currentColor" strokeWidth="6" />
    <path d="M90 136H110" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.6" />
    
    {/* Sparkles or decorative dots */}
    <circle cx="100" cy="40" r="3" fill="currentColor" />
    <circle cx="160" cy="70" r="2" fill="currentColor" fillOpacity="0.5" />
    <circle cx="40" cy="70" r="2" fill="currentColor" fillOpacity="0.5" />
  </SvgWrapper>
);
