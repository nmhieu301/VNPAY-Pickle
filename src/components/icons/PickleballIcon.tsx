// ═══════════════════════════════════════════
// Pickleball SVG Icon Component
// Vợt Pickleball + bóng wiffle ball
// ═══════════════════════════════════════════

interface PickleballIconProps {
  size?: number;
  className?: string;
}

export function PickleballIcon({ size = 24, className = '' }: PickleballIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      {/* Paddle handle */}
      <rect x="27" y="40" width="10" height="18" rx="3" fill="#8B4513" stroke="#6B3410" strokeWidth="1.5" />
      <rect x="29" y="42" width="6" height="14" rx="2" fill="#A0522D" />
      
      {/* Paddle face */}
      <ellipse cx="32" cy="28" rx="18" ry="20" fill="#005BAA" stroke="#004080" strokeWidth="2" />
      <ellipse cx="32" cy="28" rx="15" ry="17" fill="#0070CC" />
      
      {/* Paddle holes pattern */}
      <circle cx="26" cy="20" r="2" fill="#005BAA" />
      <circle cx="32" cy="18" r="2" fill="#005BAA" />
      <circle cx="38" cy="20" r="2" fill="#005BAA" />
      <circle cx="24" cy="26" r="2" fill="#005BAA" />
      <circle cx="30" cy="24" r="2" fill="#005BAA" />
      <circle cx="36" cy="24" r="2" fill="#005BAA" />
      <circle cx="40" cy="26" r="2" fill="#005BAA" />
      <circle cx="26" cy="32" r="2" fill="#005BAA" />
      <circle cx="32" cy="30" r="2" fill="#005BAA" />
      <circle cx="38" cy="32" r="2" fill="#005BAA" />
      <circle cx="30" cy="36" r="2" fill="#005BAA" />
      <circle cx="36" cy="36" r="2" fill="#005BAA" />
      
      {/* Wiffle ball */}
      <circle cx="50" cy="14" r="10" fill="#CCFF00" stroke="#99CC00" strokeWidth="1.5" />
      <circle cx="47" cy="11" r="1.5" fill="#99CC00" />
      <circle cx="52" cy="10" r="1.5" fill="#99CC00" />
      <circle cx="49" cy="16" r="1.5" fill="#99CC00" />
      <circle cx="54" cy="14" r="1.5" fill="#99CC00" />
      <circle cx="46" cy="16" r="1.2" fill="#99CC00" />
      <circle cx="51" cy="19" r="1.2" fill="#99CC00" />
    </svg>
  );
}

// Simple inline pickleball emoji replacement — use in text contexts
export function PickleballEmoji({ size = 20 }: { size?: number }) {
  return (
    <span className="inline-flex items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
        <ellipse cx="32" cy="30" rx="16" ry="18" fill="#005BAA" />
        <ellipse cx="32" cy="30" rx="13" ry="15" fill="#0070CC" />
        <circle cx="27" cy="24" r="2" fill="#005BAA" />
        <circle cx="33" cy="22" r="2" fill="#005BAA" />
        <circle cx="37" cy="26" r="2" fill="#005BAA" />
        <circle cx="29" cy="30" r="2" fill="#005BAA" />
        <circle cx="35" cy="30" r="2" fill="#005BAA" />
        <circle cx="31" cy="36" r="2" fill="#005BAA" />
        <rect x="28" y="44" width="8" height="14" rx="2.5" fill="#A0522D" stroke="#8B4513" strokeWidth="1" />
        <circle cx="48" cy="16" r="8" fill="#CCFF00" stroke="#99CC00" strokeWidth="1" />
        <circle cx="46" cy="14" r="1.3" fill="#99CC00" />
        <circle cx="50" cy="13" r="1.3" fill="#99CC00" />
        <circle cx="48" cy="18" r="1.3" fill="#99CC00" />
        <circle cx="44" cy="17" r="1" fill="#99CC00" />
        <circle cx="51" cy="17" r="1" fill="#99CC00" />
      </svg>
    </span>
  );
}
