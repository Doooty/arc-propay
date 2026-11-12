import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, SendHorizonal, RefreshCw, Download,
  Activity, BookOpen, Link2, Settings, X, MoreHorizontal,
} from 'lucide-react'
import type { Page } from '@/components/Sidebar'

const TABS: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'home',     label: 'Home',    icon: LayoutDashboard },
  { id: 'send',     label: 'Send',    icon: SendHorizonal   },
  { id: 'swap',     label: 'Swap',    icon: RefreshCw       },
  { id: 'request',  label: 'Request', icon: Download        },
  { id: 'activity', label: 'Activity',icon: Activity        },
]

const MORE_ITEMS: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'contacts',      label: 'Contacts',      icon: BookOpen  },
  { id: 'payment-links', label: 'Payment Links', icon: Link2     },
  { id: 'settings',      label: 'Settings',      icon: Settings  },
]

interface BottomTabBarProps {
  page: Page
  onNavigate: (p: Page) => void
}

export function BottomTabBar({ page, onNavigate }: BottomTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false)

  const handleNav = (p: Page) => {
    setMoreOpen(false)
    onNavigate(p)
  }

  const moreActive = MORE_ITEMS.some((i) => i.id === page)

  return (
    <>
      {/* Bottom tab bar — mobile only */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden"
        style={{
          background: 'var(--sidebar-bg)',
          borderTop: '1px solid var(--sidebar-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = page === id
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors"
                style={{ color: active ? 'var(--accent)' : 'rgba(148,163,184,0.6)', minHeight: '56px' }}
              >
                <Icon
                  className="size-5"
                  style={{ strokeWidth: active ? 2.2 : 1.8 }}
                />
                {label}
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 h-0.5 w-8 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </button>
            )
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: moreActive || moreOpen ? 'var(--accent)' : 'rgba(148,163,184,0.6)', minHeight: '56px' }}
          >
            <MoreHorizontal
              className="size-5"
              style={{ strokeWidth: moreActive || moreOpen ? 2.2 : 1.8 }}
            />
            More
          </button>
        </div>
      </nav>

      {/* More sheet overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="more-backdrop"
              className="fixed inset-0 z-50 md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="more-sheet"
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl md:hidden"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full" style={{ background: 'var(--border)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 pt-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>More</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex size-8 items-center justify-center rounded-full"
                  style={{ background: 'var(--surface-muted)' }}
                >
                  <X className="size-4" style={{ color: 'var(--muted)' }} />
                </button>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-1 px-4 pb-4">
                {MORE_ITEMS.map(({ id, label, icon: Icon }) => {
                  const active = page === id
                  return (
                    <button
                      key={id}
                      onClick={() => handleNav(id)}
                      className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-medium transition-colors"
                      style={{
                        background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--ink)',
                      }}
                    >
                      <div
                        className="flex size-9 items-center justify-center rounded-xl"
                        style={{
                          background: active ? 'rgba(59,130,246,0.15)' : 'var(--surface-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <Icon className="size-4" style={{ color: active ? 'var(--accent)' : 'var(--muted)', strokeWidth: 1.8 }} />
                      </div>
                      {label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
