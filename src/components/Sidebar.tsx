import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  SendHorizonal,
  RefreshCw,
  Download,
  BookOpen,
  Activity,
  Link2,
  Settings,
  Zap,
} from 'lucide-react'

export type Page = 'home' | 'send' | 'swap' | 'request' | 'contacts' | 'activity' | 'payment-links' | 'settings'

interface NavItem {
  id: Page
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',          label: 'Home',          icon: LayoutDashboard },
  { id: 'send',          label: 'Send',          icon: SendHorizonal   },
  { id: 'swap',          label: 'Swap',          icon: RefreshCw       },
  { id: 'request',       label: 'Request',       icon: Download        },
  { id: 'contacts',      label: 'Contacts',      icon: BookOpen        },
  { id: 'activity',      label: 'Activity',      icon: Activity        },
  { id: 'payment-links', label: 'Payment Links', icon: Link2           },
]

interface SidebarProps {
  page: Page
  onNavigate: (p: Page) => void
}

export function Sidebar({ page, onNavigate }: SidebarProps) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[250px] shrink-0 flex-col md:flex"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* ── Logo — clickable → Home ── */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-3 px-5 py-6 transition-opacity hover:opacity-80 active:opacity-60"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
        >
          <Zap className="size-5 text-white" strokeWidth={2.2} />
        </div>
        <span
          className="display text-lg font-bold tracking-tight select-none"
          style={{ color: '#F8FAFC', letterSpacing: '-0.03em' }}
        >
          Arc ProPay
        </span>
      </button>

      {/* ── Section label ── */}
      <p className="mb-1 px-5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.5)' }}>
        Menu
      </p>

      {/* ── Main nav ── */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <NavBtn
            key={id}
            active={page === id}
            icon={Icon}
            label={label}
            onClick={() => onNavigate(id)}
          />
        ))}
      </nav>

      {/* ── Divider before Settings ── */}
      <div className="mx-4 my-3 flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: 'var(--sidebar-border)' }} />
        <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.35)' }}>
          More
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--sidebar-border)' }} />
      </div>

      {/* ── Settings ── */}
      <div className="px-3 pb-6">
        <NavBtn
          active={page === 'settings'}
          icon={Settings}
          label="Settings"
          onClick={() => onNavigate('settings')}
        />
      </div>
    </aside>
  )
}

interface NavBtnProps {
  active: boolean
  icon: React.ElementType
  label: string
  onClick: () => void
}

function NavBtn({ active, icon: Icon, label, onClick }: NavBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all"
      style={{
        background: active ? 'rgba(59,130,246,0.14)' : 'transparent',
        color: active ? '#60a5fa' : 'rgba(148,163,184,0.75)',
        fontWeight: active ? 600 : 500,
      }}
      /* hover handled with inline onMouseEnter/Leave is less crisp than CSS;
         use Tailwind group trick via a data attr instead */
    >
      {/* Active left-border accent */}
      <span
        className="absolute inset-y-1.5 left-0 w-[3px] rounded-full transition-all"
        style={{
          background: active ? 'var(--accent, #3b82f6)' : 'transparent',
          opacity: active ? 1 : 0,
        }}
      />

      {/* Hover overlay (separate element keeps bg transition clean) */}
      <span
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: 'rgba(148,163,184,0.06)' }}
        aria-hidden
      />

      <Icon
        className="relative size-4 shrink-0 transition-colors"
        strokeWidth={active ? 2.2 : 1.8}
      />
      <span className="relative">{label}</span>
    </motion.button>
  )
}
