import { Coins, LogIn, LogOut } from 'lucide-react';
import type { AppSection } from '../types/arena';

interface TopBarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  playerHandle: string;
  coins: number;
  inActiveMatch: boolean;
  isSignedIn: boolean;
  authBusy: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function TopBar({
  activeSection,
  onNavigate,
  playerHandle,
  coins,
  inActiveMatch,
  isSignedIn,
  authBusy,
  onSignIn,
  onSignOut,
}: TopBarProps) {
  const navItems: Array<{ id: AppSection; label: string }> = [
    { id: 'lobby', label: 'Lobby' },
    { id: 'arena', label: 'Arena' },
    { id: 'standings', label: 'Standings' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#26262E] bg-[#121212]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('lobby')}
          className="shrink-0 whitespace-nowrap rounded-sm font-['Outfit'] text-lg font-bold tracking-tight text-[#F4F4F5] transition-colors hover:text-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
        >
          Tech-Leveling
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary navigation" className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative shrink-0 whitespace-nowrap rounded-sm py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                  isActive ? 'text-[#FACC15]' : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#FACC15]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Profile / Coins + Firebase Google Auth action */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('standings')}
            aria-label={`${playerHandle}, ${coins} coins`}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-[#2A2A32] bg-[#18181B] px-3 py-2 text-xs font-medium text-[#F4F4F5] transition-colors hover:border-[#FACC15]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            <Coins className="h-3.5 w-3.5 text-[#FACC15]" aria-hidden="true" />
            <span className="font-mono font-semibold tabular-nums text-[#FACC15]">{coins}</span>
            <span className="hidden text-[#52525B] sm:inline" aria-hidden="true">
              /
            </span>
            <span className="hidden max-w-[110px] truncate text-[#D4D4D8] sm:inline">
              {inActiveMatch ? `${playerHandle} · Live` : playerHandle}
            </span>
          </button>

          {isSignedIn ? (
            <button
              type="button"
              disabled={authBusy}
              onClick={onSignOut}
              aria-label="Sign out"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#2A2A32] bg-[#18181B] px-3 py-2 text-xs font-medium text-[#A1A1AA] transition-colors hover:border-[#F87171]/60 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={authBusy}
              onClick={onSignIn}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-[#FACC15] px-3 py-2 text-xs font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{authBusy ? 'Signing In...' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
