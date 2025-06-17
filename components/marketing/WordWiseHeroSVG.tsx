export function WordWiseHeroSVG() {
  return (
    <svg 
      viewBox="0 0 700 500" 
      xmlns="http://www.w3.org/2000/svg" 
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
    >
      {/* Defs for gradients, filters, and reusable icons */}
      <defs>
        <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: "#6366f1"}} />
          <stop offset="100%" style={{stopColor: "#818cf8"}} />
        </linearGradient>
        <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor: "#10b981"}} />
          <stop offset="100%" style={{stopColor: "#34d399"}} />
        </linearGradient>
        <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor: "#f59e0b"}} />
          <stop offset="100%" style={{stopColor: "#fcd34d"}} />
        </linearGradient>
        <filter id="shadow-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#4c51bf" floodOpacity="0.15" />
        </filter>
        <filter id="shadow-strong" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#1f2937" floodOpacity="0.1" />
        </filter>

        {/* AI Robot Icon with a common face */}
        <g id="ai-robot-icon">
          <rect x="-20" y="-20" width="40" height="35" rx="10" fill="url(#grad-purple)"/>
          <rect x="-14" y="-12" width="28" height="18" rx="5" fill="#c7d2fe"/>
          <circle cx="-7" cy="-3" r="3" fill="#6366f1"/>
          <circle cx="7" cy="-3" r="3" fill="#6366f1"/>
          <line x1="0" y1="-20" x2="0" y2="-25" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="0" cy="-28" r="3" fill="#a5b4fc"/>
        </g>
      </defs>

      {/* Left Side: Document */}
      <g transform="translate(40, 50)" filter="url(#shadow-strong)">
        <rect x="0" y="0" width="380" height="400" rx="15" ry="15" fill="white"></rect>
        
        {/* Placeholder Image */}
        <rect x="20" y="20" width="340" height="130" rx="8" fill="#e5e7eb"></rect>
        <path d="M 50 120 l 60 -40 l 70 25 l 50 -30 l 80 20" stroke="#a5b4fc" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="80" cy="70" r="10" fill="#a5b4fc" />

        {/* Heading */}
        <rect x="20" y="170" width="260" height="12" rx="6" fill="#d1d5db"></rect>

        {/* Body Content */}
        <rect x="20" y="200" width="340" height="8" rx="4" fill="#e5e7eb"></rect>
        <rect x="20" y="218" width="340" height="8" rx="4" fill="#e5e7eb"></rect>
        <rect x="20" y="236" width="310" height="8" rx="4" fill="#e5e7eb"></rect>
        <rect x="20" y="264" width="340" height="8" rx="4" fill="#e5e7eb"></rect>
        <rect x="20" y="282" width="290" height="8" rx="4" fill="#e5e7eb"></rect>
        <rect x="20" y="310" width="340" height="8" rx="4" fill="#e5e7eb"></rect>
        <rect x="20" y="328" width="340" height="8" rx="4" fill="#e5e7eb"></rect>
        <rect x="20" y="346" width="220" height="8" rx="4" fill="#e5e7eb"></rect>
      </g>

      {/* Connecting lines from a single point under the bot */}
      <g>
        <circle cx="420" cy="250" r="4" fill="#d1d5db" />
        <path d="M 420 250 C 430 250, 440 125, 460 125" stroke="#d1d5db" strokeWidth="2.5" fill="none"/>
        <path d="M 420 250 C 440 250, 440 250, 460 250" stroke="#d1d5db" strokeWidth="2.5" fill="none"/>
        <path d="M 420 250 C 430 250, 440 375, 460 375" stroke="#d1d5db" strokeWidth="2.5" fill="none"/>
      </g>

      {/* AI Robot on top of the connection point */}
      <g transform="translate(420, 250) scale(1.4)" filter="url(#shadow-soft)">
        <use href="#ai-robot-icon" />
      </g>

      {/* Right Side: Metrics (Symmetrical & Spaced) */}
      <g transform="translate(470, 70)">
        {/* Metric Card 1: SEO */}
        <g filter="url(#shadow-soft)">
          <rect x="0" y="0" width="180" height="110" rx="12" fill="white"></rect>
          <text x="15" y="25" fontFamily="Inter, sans-serif" fontSize="14" fill="#374151" fontWeight="600">SEO Score</text>
          <path d="M 20 90 l 25-20 l 30 10 l 25-30 l 30 5" stroke="url(#grad-green)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="130" cy="50" r="5" fill="#10b981"/>
        </g>

        {/* Metric Card 2: Readability */}
        <g transform="translate(0, 125)" filter="url(#shadow-soft)">
          <rect x="0" y="0" width="180" height="110" rx="12" fill="white"></rect>
          <text x="15" y="25" fontFamily="Inter, sans-serif" fontSize="14" fill="#374151" fontWeight="600">Readability</text>
          <text x="90" y="75" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="48" fill="#f59e0b" fontWeight="800">A+</text>
        </g>

        {/* Metric Card 3: Grammar */}
        <g transform="translate(0, 250)" filter="url(#shadow-soft)">
          <rect x="0" y="0" width="180" height="110" rx="12" fill="white"></rect>
          <text x="15" y="25" fontFamily="Inter, sans-serif" fontSize="14" fill="#374151" fontWeight="600">Grammar</text>
          <circle cx="90" cy="70" r="28" fill="#d1fae5"></circle>
          <path d="M 78 70 l 8 8 l 14 -14" stroke="#10b981" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"></path>
        </g>
      </g>
    </svg>
  );
} 