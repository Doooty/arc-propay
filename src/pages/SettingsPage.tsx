import { Moon, Sun, Globe, Shield, Bell } from 'lucide-react'

interface SettingsPageProps {
  dark: boolean
  onToggleDark: () => void
}

const row = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
}

export function SettingsPage({ dark, onToggleDark }: SettingsPageProps) {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      {/* Appearance */}
      <section className="rounded-2xl" style={row}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Appearance</p>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="size-4" style={{ color: 'var(--subtle)' }} /> : <Sun className="size-4" style={{ color: 'var(--subtle)' }} />}
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Dark mode</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Toggle between light and dark theme</p>
            </div>
          </div>
          <button
            onClick={onToggleDark}
            className="relative h-6 w-11 rounded-full transition-colors"
            style={{ background: dark ? 'var(--accent)' : 'var(--border)' }}
            aria-label="Toggle dark mode"
          >
            <span
              className="absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform"
              style={{ left: dark ? '22px' : '2px' }}
            />
          </button>
        </div>
      </section>

      {/* Network */}
      <section className="rounded-2xl" style={row}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Network</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Globe className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Arc Testnet</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Chain ID 5042002 · USDC as native gas</p>
          </div>
          <span className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--success)' }}>
            Testnet
          </span>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-2xl" style={row}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Security</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Shield className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Non-custodial</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Your keys, your funds. Arc ProPay never holds assets.</p>
          </div>
        </div>
      </section>

      {/* Notifications placeholder */}
      <section className="rounded-2xl" style={row}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Notifications</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Bell className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Browser notifications</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Coming soon</p>
          </div>
          <span className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)', border: '1px solid var(--border)' }}>
            Soon
          </span>
        </div>
      </section>

      <p className="text-center text-xs" style={{ color: 'var(--subtle)' }}>
        Arc ProPay · Built on Arc Testnet with USDC
      </p>
    </div>
  )
}
