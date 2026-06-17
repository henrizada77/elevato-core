import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { mark: 24, text: "text-base" },
  md: { mark: 32, text: "text-xl" },
  lg: { mark: 48, text: "text-3xl" },
};

export function Logo({ className, showWordmark = true, size = "md" }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Elevo"
      >
        <defs>
          <linearGradient id="elevo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="oklch(0.62 0.22 250)" />
            <stop offset="50%" stopColor="oklch(0.55 0.24 275)" />
            <stop offset="100%" stopColor="oklch(0.52 0.22 305)" />
          </linearGradient>
        </defs>
        {/* Stylized "E" / ascending bars */}
        <path
          d="M14 8 L34 8 Q38 8 36 12 L30 18 L16 18 Q12 18 14 14 Z"
          fill="url(#elevo-grad)"
        />
        <path
          d="M14 21 L30 21 Q34 21 32 25 L28 30 L16 30 Q12 30 14 26 Z"
          fill="url(#elevo-grad)"
          opacity="0.92"
        />
        <path
          d="M14 33 L34 33 Q38 33 36 37 L32 42 Q31 44 28 44 L12 44 Q10 40 14 36 Z"
          fill="url(#elevo-grad)"
          opacity="0.85"
        />
      </svg>
      {showWordmark && (
        <span className={cn("font-semibold tracking-tight", s.text)}>Elevo</span>
      )}
    </div>
  );
}
