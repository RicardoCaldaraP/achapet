/**
 * Mascotes do AchaPet em SVG. As animações (rabo abanando, piscar, respirar)
 * ficam no app.css e são desligadas para quem prefere menos movimento.
 */

export function Pata({ className = "" }) {
  return (
    <svg className={`pata-icone ${className}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <ellipse cx="32" cy="42" rx="15" ry="13" fill="currentColor" />
      <ellipse cx="14" cy="27" rx="6.5" ry="8.5" fill="currentColor" transform="rotate(-18 14 27)" />
      <ellipse cx="25" cy="16" rx="6.5" ry="8.5" fill="currentColor" transform="rotate(-6 25 16)" />
      <ellipse cx="39" cy="16" rx="6.5" ry="8.5" fill="currentColor" transform="rotate(6 39 16)" />
      <ellipse cx="50" cy="27" rx="6.5" ry="8.5" fill="currentColor" transform="rotate(18 50 27)" />
    </svg>
  );
}

export function TrilhaPatas() {
  return (
    <div className="trilha-patas" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} style={{ "--i": i }}>
          <Pata />
        </span>
      ))}
    </div>
  );
}

export function Cachorro({ className = "" }) {
  return (
    <svg className={`pet pet-cachorro ${className}`} viewBox="0 0 240 260" aria-hidden="true" focusable="false">
      <g className="rabo"><path d="M172 205 C 206 196, 222 165, 212 134" fill="none" stroke="#E8A055" strokeWidth="17" strokeLinecap="round" /></g>
      <ellipse cx="72" cy="238" rx="24" ry="14" fill="#D98A3D" />
      <ellipse cx="168" cy="238" rx="24" ry="14" fill="#D98A3D" />
      <ellipse cx="120" cy="196" rx="62" ry="56" fill="#E8A055" />
      <ellipse cx="120" cy="208" rx="30" ry="38" fill="#FBE3BD" />
      <rect x="94" y="196" width="21" height="54" rx="10" fill="#E8A055" />
      <rect x="125" y="196" width="21" height="54" rx="10" fill="#E8A055" />
      <ellipse cx="104" cy="250" rx="14" ry="8" fill="#FBE3BD" />
      <ellipse cx="136" cy="250" rx="14" ry="8" fill="#FBE3BD" />
      <rect x="82" y="146" width="76" height="13" rx="6.5" fill="#FF5A5F" />
      <circle cx="120" cy="166" r="8.5" fill="#FFD166" stroke="#D98A3D" strokeWidth="2" />
      <g className="cabeca">
        <path d="M74 64 C 48 76, 42 124, 60 142 C 76 132, 84 100, 88 76 Z" fill="#B96E2C" />
        <path d="M166 64 C 192 76, 198 124, 180 142 C 164 132, 156 100, 152 76 Z" fill="#B96E2C" />
        <circle cx="120" cy="100" r="57" fill="#E8A055" />
        <ellipse cx="120" cy="70" rx="9" ry="18" fill="#FBE3BD" />
        <ellipse cx="120" cy="126" rx="33" ry="25" fill="#FBE3BD" />
        <g className="olhos">
          <circle cx="97" cy="93" r="7.5" fill="#3B2A20" /><circle cx="99.5" cy="90.5" r="2.4" fill="#fff" />
          <circle cx="143" cy="93" r="7.5" fill="#3B2A20" /><circle cx="145.5" cy="90.5" r="2.4" fill="#fff" />
        </g>
        <ellipse cx="84" cy="112" rx="8" ry="5" fill="#FF9DB0" opacity=".55" />
        <ellipse cx="156" cy="112" rx="8" ry="5" fill="#FF9DB0" opacity=".55" />
        <ellipse cx="120" cy="112" rx="11.5" ry="8.5" fill="#3B2A20" />
        <path d="M115 134 q5 16 11 0 Z" fill="#FF7A8A" />
        <path d="M120 121 v8 M120 129 q-9 8 -16 2 M120 129 q9 8 16 2" fill="none" stroke="#3B2A20" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Gato({ className = "" }) {
  return (
    <svg className={`pet pet-gato ${className}`} viewBox="0 0 200 240" aria-hidden="true" focusable="false">
      <g className="rabo-gato"><path d="M138 214 C 186 214, 192 168, 168 146" fill="none" stroke="#2E2A33" strokeWidth="15" strokeLinecap="round" /></g>
      <ellipse cx="100" cy="176" rx="52" ry="56" fill="#2E2A33" />
      <ellipse cx="100" cy="188" rx="26" ry="40" fill="#fff" />
      <ellipse cx="84" cy="229" rx="14" ry="8.5" fill="#fff" />
      <ellipse cx="116" cy="229" rx="14" ry="8.5" fill="#fff" />
      <g>
        <path d="M58 76 L54 24 L94 52 Z" fill="#2E2A33" />
        <path d="M142 76 L146 24 L106 52 Z" fill="#2E2A33" />
        <path d="M64 64 L62 38 L84 54 Z" fill="#FF9DB0" />
        <path d="M136 64 L138 38 L116 54 Z" fill="#FF9DB0" />
        <circle cx="100" cy="96" r="49" fill="#2E2A33" />
        <path d="M100 74 C 90 92, 72 104, 74 122 C 80 140, 120 140, 126 122 C 128 104, 110 92, 100 74 Z" fill="#fff" />
        <g className="olhos">
          <ellipse cx="80" cy="92" rx="9" ry="11" fill="#9BE15D" /><ellipse cx="80" cy="93" rx="3.2" ry="8.5" fill="#1C1A20" />
          <ellipse cx="120" cy="92" rx="9" ry="11" fill="#9BE15D" /><ellipse cx="120" cy="93" rx="3.2" ry="8.5" fill="#1C1A20" />
        </g>
        <path d="M95 110 L105 110 L100 116 Z" fill="#FF7A8A" />
        <path d="M100 116 q-6 6 -11 2 M100 116 q6 6 11 2" fill="none" stroke="#2E2A33" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M76 116 L44 110 M76 121 L44 124 M124 116 L156 110 M124 121 L156 124" stroke="#C9C4D3" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function GatoEspiando() {
  return (
    <svg className="gato-espiando" viewBox="0 0 130 74" aria-hidden="true" focusable="false">
      <path d="M30 40 L26 4 L56 24 Z" fill="#2E2A33" /><path d="M100 40 L104 4 L74 24 Z" fill="#2E2A33" />
      <path d="M35 32 L33 14 L50 25 Z" fill="#FF9DB0" /><path d="M95 32 L97 14 L80 25 Z" fill="#FF9DB0" />
      <path d="M20 74 C 20 38, 40 18, 65 18 C 90 18, 110 38, 110 74 Z" fill="#2E2A33" />
      <g className="olhos">
        <ellipse cx="50" cy="50" rx="8" ry="9" fill="#9BE15D" /><ellipse cx="50" cy="51" rx="3" ry="7" fill="#1C1A20" />
        <ellipse cx="80" cy="50" rx="8" ry="9" fill="#9BE15D" /><ellipse cx="80" cy="51" rx="3" ry="7" fill="#1C1A20" />
      </g>
      <path d="M61 63 L69 63 L65 68 Z" fill="#FF7A8A" />
      <ellipse cx="34" cy="72" rx="15" ry="8" fill="#fff" /><ellipse cx="96" cy="72" rx="15" ry="8" fill="#fff" />
    </svg>
  );
}

export function CachorroDormindo({ className = "" }) {
  return (
    <svg className={`pet-dormindo ${className}`} viewBox="0 0 220 130" aria-hidden="true" focusable="false">
      <text className="zz z1" x="150" y="38" fontFamily="Fredoka Variable, sans-serif" fontWeight="700" fontSize="20" fill="#7A6355">z</text>
      <text className="zz z2" x="166" y="24" fontFamily="Fredoka Variable, sans-serif" fontWeight="700" fontSize="15" fill="#7A6355">z</text>
      <ellipse cx="110" cy="122" rx="92" ry="8" fill="#3B2A20" opacity=".08" />
      <path d="M30 112 C 22 92, 40 66, 80 64 C 128 60, 182 72, 190 104 C 192 116, 180 120, 160 120 L 50 120 C 38 120, 32 118, 30 112 Z" fill="#E8A055" />
      <path d="M168 112 C 196 112, 204 96, 196 86" fill="none" stroke="#E8A055" strokeWidth="12" strokeLinecap="round" />
      <g className="respira">
        <ellipse cx="70" cy="92" rx="38" ry="30" fill="#E8A055" />
        <path d="M44 70 C 28 72, 22 100, 36 112 C 46 104, 50 88, 54 76 Z" fill="#B96E2C" />
        <ellipse cx="74" cy="104" rx="22" ry="14" fill="#FBE3BD" />
        <ellipse cx="88" cy="98" rx="7" ry="5" fill="#3B2A20" />
        <path d="M58 86 q6 5 12 0 M80 82 q6 5 12 0" fill="none" stroke="#3B2A20" strokeWidth="3" strokeLinecap="round" />
      </g>
      <ellipse cx="110" cy="118" rx="16" ry="7" fill="#FBE3BD" />
    </svg>
  );
}
