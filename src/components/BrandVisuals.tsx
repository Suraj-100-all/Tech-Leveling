import { useState } from 'react';
import { Braces, Cpu, Gauge, GitBranch, Terminal } from 'lucide-react';
import type { PartNumber, ProgrammingLanguage } from '../types/arena';

export const HERO_STAGE_IMAGE = '/src/assets/images/arena_esports_stage_1795190440750.jpg';
export const AI_MENTOR_EMBLEM_IMAGE = '/src/assets/images/ai_mentor_emblem_1795221264856.jpg';

export const PART_ARTWORK: Record<PartNumber, { src: string; alt: string }> = {
  1: {
    src: '/src/assets/images/part1_basics_visual_1795221267302.jpg',
    alt: 'Dark obsidian data registers with illuminated electric yellow and acid green I/O channels',
  },
  2: {
    src: '/src/assets/images/part2_control_flow_visual_1795221266064.jpg',
    alt: 'Dark anodized circuit pathways with glowing yellow and green kinetic control-flow loop rings',
  },
  3: {
    src: '/src/assets/images/part3_arrays_strings_visual_1795221267014.jpg',
    alt: 'Aligned carbon array memory blocks and luminous neon green character cells',
  },
  4: {
    src: '/src/assets/images/part4_memory_oop_visual_1795221265668.jpg',
    alt: 'Interlocking matte-black object-oriented architecture modules linked by electric yellow pointer beams',
  },
  5: {
    src: '/src/assets/images/part5_bigo_optimization_visual_1795221266897.jpg',
    alt: 'Sculpted dark logarithmic Big-O performance curve illuminated with electric yellow and neon green rim lights',
  },
};

interface LanguageLogoProps {
  language: ProgrammingLanguage;
  className?: string;
}

/**
 * Crisp geometric SVG brand emblems for C, C++, Java, and Python.
 */
export function LanguageLogo({ language, className = 'h-7 w-7' }: LanguageLogoProps) {
  if (language === 'c') {
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
      >
        <path
          d="M20 3L34.7 11.5V28.5L20 37L5.3 28.5V11.5L20 3Z"
          fill="#1D4ED8"
          fillOpacity="0.22"
          stroke="#60A5FA"
          strokeWidth="1.8"
        />
        <path
          d="M20 3L34.7 11.5V28.5L20 37V3Z"
          fill="#2563EB"
          fillOpacity="0.18"
        />
        <path
          d="M25.6 16.4C24.5 14.3 22.4 13 20 13C16.1 13 13 16.1 13 20C13 23.9 16.1 27 20 27C22.4 27 24.5 25.7 25.6 23.6"
          stroke="#93C5FD"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (language === 'cpp') {
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
      >
        <path
          d="M20 3L34.7 11.5V28.5L20 37L5.3 28.5V11.5L20 3Z"
          fill="#1E3A8A"
          fillOpacity="0.32"
          stroke="#38BDF8"
          strokeWidth="1.8"
        />
        <path
          d="M21.8 16.2C20.9 14.4 19 13.2 16.8 13.2C13.5 13.2 10.8 16.2 10.8 20C10.8 23.8 13.5 26.8 16.8 26.8C19 26.8 20.9 25.6 21.8 23.8"
          stroke="#7DD3FC"
          strokeWidth="3.1"
          strokeLinecap="round"
        />
        <path
          d="M24.2 17.6V22.4M21.8 20H26.6M29.8 17.6V22.4M27.4 20H32.2"
          stroke="#FACC15"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (language === 'java') {
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="34"
          height="34"
          rx="9"
          fill="#431407"
          fillOpacity="0.45"
          stroke="#FB923C"
          strokeWidth="1.6"
        />
        {/* Rising steam wisps */}
        <path
          d="M17.5 15.5C15.8 13.6 19.6 12.2 18.2 9.5M22.2 15C20.8 13.4 24 12.1 22.8 10"
          stroke="#FB923C"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        {/* Cup body & handle */}
        <path
          d="M11.5 18.5H26.5V23.5C26.5 26.8 23.8 29.2 19 29.2C14.2 29.2 11.5 26.8 11.5 23.5V18.5Z"
          fill="#38BDF8"
          fillOpacity="0.2"
          stroke="#38BDF8"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M26.5 19.8H28.8C30.2 19.8 31.2 20.8 31.2 22.1C31.2 23.5 30.2 24.5 28.8 24.5H26.5"
          stroke="#38BDF8"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M11 31.8C15.5 33.2 22.5 33.2 27.5 31.8"
          stroke="#FB923C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Python interlocking blue + electric yellow emblem
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="34"
        height="34"
        rx="9"
        fill="#172554"
        fillOpacity="0.35"
        stroke="#3B82F6"
        strokeOpacity="0.65"
        strokeWidth="1.5"
      />
      {/* Upper blue python */}
      <path
        d="M19.8 9.5C15.4 9.5 15.7 11.4 15.7 11.4V14.4H20.1V15.5H13.4C13.4 15.5 10 15.1 10 19.9C10 24.7 12.9 24.5 12.9 24.5H14.8V21.7C14.8 21.7 14.7 18.8 17.6 18.8H22.2C22.2 18.8 24.8 18.9 24.8 16.3V12.1C24.8 12.1 25.2 9.5 19.8 9.5Z"
        fill="#3B82F6"
      />
      <circle cx="17.6" cy="12" r="1.15" fill="#121212" />
      {/* Lower yellow python */}
      <path
        d="M20.2 30.5C24.6 30.5 24.3 28.6 24.3 28.6V25.6H19.9V24.5H26.6C26.6 24.5 30 24.9 30 20.1C30 15.3 27.1 15.5 27.1 15.5H25.2V18.3C25.2 18.3 25.3 21.2 22.4 21.2H17.8C17.8 21.2 15.2 21.1 15.2 23.7V27.9C15.2 27.9 14.8 30.5 20.2 30.5Z"
        fill="#FACC15"
      />
      <circle cx="22.4" cy="28" r="1.15" fill="#121212" />
    </svg>
  );
}

interface PartIconProps {
  part: PartNumber;
  className?: string;
}

export function PartIcon({ part, className = 'h-4 w-4' }: PartIconProps) {
  switch (part) {
    case 1:
      return <Terminal className={className} aria-hidden="true" />;
    case 2:
      return <GitBranch className={className} aria-hidden="true" />;
    case 3:
      return <Braces className={className} aria-hidden="true" />;
    case 4:
      return <Cpu className={className} aria-hidden="true" />;
    case 5:
      return <Gauge className={className} aria-hidden="true" />;
  }
}

export function GeminiSparkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id="tl-gemini-spark" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="55%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <path
        d="M14 2C14.8 8.6 19.4 13.2 26 14C19.4 14.8 14.8 19.4 14 26C13.2 19.4 8.6 14.8 2 14C8.6 13.2 13.2 8.6 14 2Z"
        fill="url(#tl-gemini-spark)"
      />
    </svg>
  );
}

interface GeminiMentorAvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

export function GeminiMentorAvatar({ size = 'md' }: GeminiMentorAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const dim =
    size === 'sm' ? 'h-7 w-7 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-xl' : 'h-9 w-9 rounded-lg';

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-[#FACC15]/35 bg-[#121212] ${dim}`}
    >
      {!imgFailed ? (
        <img
          src={AI_MENTOR_EMBLEM_IMAGE}
          alt="Gemini AI Mentor emblem"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <GeminiSparkIcon className={size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
      )}
    </div>
  );
}
