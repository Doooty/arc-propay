import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

import { Sidebar, type Page } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { BottomTabBar } from '@/components/BottomTabBar'
import { SendSheet } from '@/components/SendSheet'
import { RequestSheet } from '@/components/RequestSheet'
import { SwapSheet } from '@/components/SwapSheet'
import { ContactsSheet } from '@/components/ContactsSheet'
import { ActivityFeed, type TxRecord } from '@/components/ActivityFeed'
import { InvoiceList } from '@/components/InvoiceList'
import { HomePage } from '@/pages/HomePage'
import { SettingsPage } from '@/pages/SettingsPage'

/* ─── App ────────────────────────────────────────────────────── */
export default function App() {
  /* dark mode — dark is the default; light is opt-in via .light on <html> */
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('theme')
      // If explicitly set to light, respect it; everything else (including null) = dark
      return saved !== 'light'
    } catch { return true }
  })
  useEffect(() => {
    // Dark = no class; light = add .light class
    document.documentElement.classList.toggle('light', !dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* noop */ }
  }, [dark])

  /* navigation */
  const [page, setPage] = useState<Page>(() => {
    // If URL has prefilled payment params, start on send
    const p = new URLSearchParams(window.location.search)
    return p.get('to') && p.get('amount') ? 'send' : 'home'
  })

  /* sheet open state */
  const [sendOpen,     setSendOpen]     = useState(() => {
    const p = new URLSearchParams(window.location.search)
    return !!(p.get('to') && p.get('amount'))
  })
  const [swapOpen,     setSwapOpen]     = useState(false)
  const [requestOpen,  setRequestOpen]  = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)

  /* data */
  const [txHistory,      setTxHistory]      = useState<TxRecord[]>([])
  const [invoiceRefresh, setInvoiceRefresh] = useState(0)

  useAccount() // ensures wagmi context is initialised for child components

  /* navigate — action pages open their sheet and stay on the last content page */
  const handleNavigate = (p: Page) => {
    if (p === 'send')    { setSendOpen(true);    return }
    if (p === 'swap')    { setSwapOpen(true);    return }
    if (p === 'request') { setRequestOpen(true); return }
    if (p === 'contacts'){ setContactsOpen(true); return }
    setPage(p)
  }

  const handleSendSuccess = (hash: string, to: string, amount: string) => {
    setTxHistory((prev) => [{ hash, to, amount, timestamp: Date.now() }, ...prev])
    setTimeout(() => setSendOpen(false), 2500)
  }

  /* active sidebar highlight:
     action pages (send/swap/request/contacts) don't change `page`,
     so they highlight their own nav item while `page` shows content */
  const sidebarActive: Page =
    sendOpen     ? 'send'     :
    swapOpen     ? 'swap'     :
    requestOpen  ? 'request'  :
    contactsOpen ? 'contacts' :
    page

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-gradient)' }}>
      {/* ── Fixed sidebar ── */}
      <Sidebar page={sidebarActive} onNavigate={handleNavigate} />

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-[250px]">
        {/* Top bar */}
        <TopBar
          page={sidebarActive}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          onLogoClick={() => setPage('home')}
        />

        {/* Scrollable content — extra bottom padding on mobile for tab bar */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-8 md:py-6 md:pb-6">
          {page === 'home' && (
            <HomePage onNavigate={handleNavigate} recentTx={txHistory} />
          )}

          {page === 'activity' && (
            <div className="max-w-xl">
              <ActivityFeed records={txHistory} />
              {txHistory.length === 0 && (
                <div
                  className="mt-6 rounded-2xl p-8 text-center"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                >
                  <p className="font-semibold" style={{ color: 'var(--ink)' }}>No transactions yet</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                    Send USDC or EURC to see activity here
                  </p>
                  <button
                    onClick={() => setSendOpen(true)}
                    className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    Send now
                  </button>
                </div>
              )}
            </div>
          )}

          {page === 'payment-links' && (
            <div className="max-w-xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Create links to request USDC or EURC from anyone
                </p>
                <button
                  onClick={() => setRequestOpen(true)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  + New link
                </button>
              </div>
              <InvoiceList
                refreshTrigger={invoiceRefresh}
                onCreateLink={() => setRequestOpen(true)}
              />
            </div>
          )}

          {page === 'settings' && (
            <SettingsPage dark={dark} onToggleDark={() => setDark((d) => !d)} />
          )}
        </main>
      </div>

      {/* ── Global sheets (portal-rendered, always available) ── */}
      <SendSheet
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSuccess={handleSendSuccess}
      />
      <RequestSheet
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSaved={() => {
          setInvoiceRefresh((n) => n + 1)
          setPage('payment-links')
          setRequestOpen(false)
        }}
      />
      <SwapSheet open={swapOpen} onClose={() => setSwapOpen(false)} />
      <ContactsSheet open={contactsOpen} onClose={() => setContactsOpen(false)} />

      {/* ── Bottom tab bar (mobile only) ── */}
      <BottomTabBar page={sidebarActive} onNavigate={handleNavigate} />
    </div>
  )
}


