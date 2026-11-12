import { Sun, Moon, Zap } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import type { Page } from '@/components/Sidebar'

const PAGE_TITLES: Record<Page, string> = {
  home:            'Home',
  send:            'Send',
  swap:            'Swap',
  request:         'Request',
  contacts:        'Contacts',
  activity:        'Activity',
  'payment-links': 'Payment Links',
  settings:        'Settings',
}

interface TopBarProps {
  page: Page
  dark: boolean
  onToggleDark: () => void
  onLogoClick?: () => void
}

export function TopBar({ page, dark, onToggleDark, onLogoClick }: TopBarProps) {
  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between px-4 md:h-16 md:px-8"
      style={{
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: logo on mobile, page title on desktop */}
      <div className="flex items-center gap-3">
        {/* Mobile logo — visible only on small screens */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 md:hidden"
          aria-label="Go home"
        >
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
          >
            <Zap className="size-4 text-white" style={{ strokeWidth: 2.2 }} />
          </div>
          <span
            className="display text-base font-bold tracking-tight"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            Arc ProPay
          </span>
        </button>

        {/* Desktop page title — hidden on mobile */}
        <h1
          className="display hidden text-lg font-bold md:block"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          {PAGE_TITLES[page]}
        </h1>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDark}
          className="flex size-9 items-center justify-center rounded-xl transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--surface-muted)' }}
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <ConnectKitButton />
      </div>
    </header>
  )
}
