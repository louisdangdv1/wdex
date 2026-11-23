// WPEPE mascot: an original cartoon frog drawn in SVG.
// moods: happy | rekt | moon | diamond | wise
export const MOODS = ['happy', 'moon', 'diamond', 'wise', 'rekt'];

export default function Frog({ mood = 'happy', size = 200, className = '', look = 0 }) {
  const px = Math.max(-5, Math.min(5, look)); // pupils follow (-5..5)
  const sad = mood === 'rekt';
  return (
    <svg className={`frog ${className}`} width={size} height={size * 1.09} viewBox="0 -34 200 218" role="img" aria-label={`WPEPE frog (${mood})`}>
      {/* shadow */}
      <ellipse cx="100" cy="176" rx="64" ry="7" fill="rgba(0,0,0,.25)" />
      {/* legs */}
      <ellipse cx="45" cy="160" rx="26" ry="12" fill="#3fa34d" stroke="#1d5a28" strokeWidth="4" />
      <ellipse cx="155" cy="160" rx="26" ry="12" fill="#3fa34d" stroke="#1d5a28" strokeWidth="4" />
      {/* body / head */}
      <path d="M18 112 C18 64 52 52 100 52 C148 52 182 64 182 112 C182 152 146 170 100 170 C54 170 18 152 18 112 Z" fill="#5fd068" stroke="#1d5a28" strokeWidth="5" />
      {/* belly */}
      <ellipse cx="100" cy="138" rx="50" ry="26" fill="#b8f5a8" />
      {/* eye bumps */}
      <circle cx="62" cy="52" r="32" fill="#5fd068" stroke="#1d5a28" strokeWidth="5" />
      <circle cx="138" cy="52" r="32" fill="#5fd068" stroke="#1d5a28" strokeWidth="5" />
      <path d="M33 66 Q100 80 167 66" stroke="#5fd068" strokeWidth="12" fill="none" />

      {mood === 'moon' ? (
        <g>
          {/* shades */}
          <rect x="30" y="38" width="62" height="30" rx="10" fill="#111" />
          <rect x="108" y="38" width="62" height="30" rx="10" fill="#111" />
          <rect x="90" y="46" width="20" height="6" fill="#111" />
          <path d="M38 44 L56 44" stroke="#7CFC00" strokeWidth="4" strokeLinecap="round" opacity=".8" />
          <path d="M116 44 L134 44" stroke="#7CFC00" strokeWidth="4" strokeLinecap="round" opacity=".8" />
        </g>
      ) : mood === 'diamond' ? (
        <g>
          <circle cx="62" cy="52" r="22" fill="#fff" />
          <circle cx="138" cy="52" r="22" fill="#fff" />
          {[62, 138].map((x) => (
            <path key={x} d={`M${x - 12} ${48} L${x - 6} ${40} L${x + 6} ${40} L${x + 12} ${48} L${x} ${64} Z`} fill="#6fe3ff" stroke="#0a7ea4" strokeWidth="2.5" />
          ))}
        </g>
      ) : (
        <g>
          <circle cx="62" cy="52" r="22" fill="#fff" />
          <circle cx="138" cy="52" r="22" fill="#fff" />
          <circle cx={62 + px} cy={sad ? 58 : 54} r="10" fill="#111" />
          <circle cx={138 + px} cy={sad ? 58 : 54} r="10" fill="#111" />
          <circle cx={66 + px} cy={sad ? 54 : 50} r="3.5" fill="#fff" />
          <circle cx={142 + px} cy={sad ? 54 : 50} r="3.5" fill="#fff" />
          {(sad || mood === 'wise') && (
            <>
              {/* heavy eyelids */}
              <path d="M40 44 Q62 30 84 44 L84 40 Q62 22 40 40 Z" fill="#5fd068" stroke="#1d5a28" strokeWidth="3" />
              <path d="M116 44 Q138 30 160 44 L160 40 Q138 22 116 40 Z" fill="#5fd068" stroke="#1d5a28" strokeWidth="3" />
            </>
          )}
        </g>
      )}

      {/* cheeks */}
      <ellipse cx="42" cy="108" rx="13" ry="7" fill="#ff8fb3" opacity=".75" />
      <ellipse cx="158" cy="108" rx="13" ry="7" fill="#ff8fb3" opacity=".75" />
      {/* nostrils */}
      <circle cx="90" cy="88" r="2.5" fill="#1d5a28" />
      <circle cx="110" cy="88" r="2.5" fill="#1d5a28" />

      {/* mouth */}
      {sad ? (
        <path d="M60 124 Q100 100 140 124" stroke="#1d5a28" strokeWidth="5" fill="none" strokeLinecap="round" />
      ) : (
        <g>
          <path d="M52 104 Q100 146 148 104" stroke="#1d5a28" strokeWidth="5" fill={mood === 'moon' || mood === 'diamond' ? '#c0392b' : 'none'} strokeLinecap="round" />
          {(mood === 'moon' || mood === 'diamond') && <path d="M78 122 Q100 132 122 122" stroke="#ff8fb3" strokeWidth="6" fill="none" strokeLinecap="round" />}
        </g>
      )}

      {/* tears when rekt */}
      {sad && (
        <g fill="#5ec8ff" stroke="#1b7fb3" strokeWidth="1.5">
          <path d="M48 78 q-6 12 0 16 q6 -4 0 -16z" />
          <path d="M152 78 q-6 12 0 16 q6 -4 0 -16z" />
        </g>
      )}

      {/* wizard hat when wise */}
      {mood === 'wise' && (
        <g>
          <path d="M60 22 L100 -38 L140 22 Z" fill="#5b3cc4" stroke="#2a1a6b" strokeWidth="4" transform="translate(0 18)" />
          <ellipse cx="100" cy="40" rx="56" ry="9" fill="#5b3cc4" stroke="#2a1a6b" strokeWidth="4" />
          <text x="92" y="22" fontSize="16" fill="#ffd84d">★</text>
          <text x="106" y="2" fontSize="11" fill="#ffd84d">✦</text>
        </g>
      )}

      {/* gold chain for diamond */}
      {mood === 'diamond' && (
        <g>
          <path d="M60 140 Q100 168 140 140" stroke="#ffd84d" strokeWidth="5" fill="none" strokeDasharray="2 5" strokeLinecap="round" />
          <text x="91" y="166" fontSize="18">💎</text>
        </g>
      )}
    </svg>
  );
}
