import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  X, Copy, Check, Link2, Download, QrCode,
  CalendarDays, ArrowLeft, CheckCircle2,
} from 'lucide-react'
import { TokenUSDC, TokenEURC } from '@web3icons/react'
import { QRCodeSVG } from 'qrcode.react'
import { saveInvoice, type Invoice } from '@/hooks/usePaymentStatus'

type Token = 'USDC' | 'EURC'
type View = 'form' | 'qr'

const springs = { sheet: { type: 'spring' as const, stiffness: 380, damping: 40 } }
const spectral = 'linear-gradient(90deg, #7c3aed, #2563eb, #0891b2, #059669)'

const inner: React.CSSProperties = {
  background: 'var(--surface-muted)',
  border: '1px solid var(--border)',
  borderRadius: '1rem',
}

const TOKEN_CONFIG: Record<Token, {
  symbol: string
  currencySign: string
  qrLogo: string
  icon: (size: number) => React.ReactNode
}> = {
  USDC: {
    symbol: 'USDC',
    currencySign: '$',
    qrLogo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040',
    icon: (s) => <TokenUSDC variant="branded" size={s} />,
  },
  EURC: {
    symbol: 'EURC',
    currencySign: '€',
    qrLogo: 'https://cryptologos.cc/logos/euro-coin-eurc-logo.svg?v=040',
    icon: (s) => <TokenEURC variant="branded" size={s} />,
  },
}

const EXPIRY_OPTIONS = [
  { label: 'None', sublabel: '', value: null },
  { label: '1d', sublabel: '1 day', value: 1 },
  { label: '3d', sublabel: '3 days', value: 3 },
  { label: '7d', sublabel: '7 days', value: 7 },
  { label: '30d', sublabel: '30 days', value: 30 },
]

interface RequestSheetProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function RequestSheet({ open, onClose, onSaved }: RequestSheetProps) {
  const [token, setToken] = useState<Token>('USDC')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [expiryDays, setExpiryDays] = useState<number | null>(null)
  const [view, setView] = useState<View>('form')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const [linkCreatedAt, setLinkCreatedAt] = useState(() => Date.now())

  const { address } = useAccount()
  const cfg = TOKEN_CONFIG[token]

  const generateLink = () => {
    if (!address) return ''
    const base = window.location.origin
    const params = new URLSearchParams({ to: address, amount: amount || '0', token })
    if (memo) params.set('memo', memo)
    if (expiryDays) params.set('expires', String(linkCreatedAt + expiryDays * 86_400_000))
    return `${base}?${params.toString()}`
  }

  const paymentLink = address && amount && parseFloat(amount) > 0 ? generateLink() : ''
  const hasLink = !!paymentLink

  const handleCopy = () => {
    if (!paymentLink) return
    void navigator.clipboard.writeText(paymentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSaveInvoice = () => {
    if (!paymentLink || !address) return
    const inv: Invoice = {
      id: `inv-${linkCreatedAt}-${Math.random().toString(36).slice(2, 8)}`,
      token, amount, memo,
      to: address,
      link: paymentLink,
      createdAt: linkCreatedAt,
      expiresAt: expiryDays ? linkCreatedAt + expiryDays * 86_400_000 : null,
    }
    saveInvoice(inv)
    setSaved(true)
    setLinkCreatedAt(Date.now())
    onSaved?.()
  }

  const handleDownloadQr = () => {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return
    const clone = svgEl.cloneNode(true) as SVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const svgData = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arc-propay-qr-${token.toLowerCase()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleTokenChange = (t: Token) => {
    setToken(t); setAmount(''); setView('form'); setSaved(false)
  }

  const handleClose = () => {
    setView('form'); setSaved(false); setCopied(false); onClose()
  }

  const expiryDate = expiryDays
    ? new Date(linkCreatedAt + expiryDays * 86_400_000).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.section
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl"
            style={{ background: 'var(--card-bg)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.sheet}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spectral accent bar */}
            <div className="h-1" style={{ background: spectral }} />
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            <AnimatePresence mode="wait">
              {/* ── FORM VIEW ── */}
              {view === 'form' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="max-h-[85dvh] overflow-y-auto px-5 pb-8 pt-2"
                >
                  {/* Header */}
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>
                        Request Payment
                      </h2>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                        Generate a smart payment link or QR code
                      </p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
                      style={{ color: 'var(--subtle)' }}
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Token selector */}
                    <div
                      className="flex gap-2 rounded-2xl p-1"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                    >
                      {(['USDC', 'EURC'] as Token[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleTokenChange(t)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all"
                          style={{
                            background: token === t ? 'var(--card-bg)' : 'transparent',
                            color: token === t ? 'var(--ink)' : 'var(--subtle)',
                            boxShadow: token === t ? '0 1px 6px rgba(0,0,0,0.18)' : 'none',
                          }}
                        >
                          {TOKEN_CONFIG[t].icon(16)}
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Amount */}
                    <div className="rounded-2xl p-4" style={inner}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                          Amount
                        </label>
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>optional</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="display text-3xl font-bold" style={{ color: 'var(--subtle)' }}>
                          {cfg.currencySign}
                        </span>
                        <input
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9.]/g, '')
                            if (v === '' || /^\d*\.?\d*$/.test(v)) {
                              setAmount(v); setSaved(false)
                            }
                          }}
                          placeholder="0.00"
                          className="display min-w-0 flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-30"
                          style={{ color: 'var(--ink)' }}
                        />
                        <div
                          className="flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5"
                          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                        >
                          {cfg.icon(16)}
                          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{cfg.symbol}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        {['5', '10', '25', '50', '100'].map((v) => (
                          <button
                            key={v}
                            onClick={() => { setAmount(v); setSaved(false) }}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all"
                            style={{
                              background: amount === v ? 'var(--accent)' : 'var(--surface-muted)',
                              color: amount === v ? '#fff' : 'var(--ink-2)',
                              border: amount === v ? 'none' : '1px solid var(--border)',
                              transform: amount === v ? 'scale(1.05)' : 'scale(1)',
                            }}
                          >
                            {cfg.currencySign}{v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Note */}
                    <div className="rounded-2xl p-4" style={inner}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Note</label>
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>optional</span>
                      </div>
                      <input
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="Invoice #001 · Design work · etc."
                        className="w-full bg-transparent text-sm outline-none placeholder:opacity-40"
                        style={{ color: 'var(--ink)' }}
                      />
                    </div>

                    {/* Expiry */}
                    <div className="rounded-2xl p-4" style={inner}>
                      <div className="mb-2.5 flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" style={{ color: 'var(--muted)' }} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                          Link expiry
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {EXPIRY_OPTIONS.map((opt) => {
                          const active = expiryDays === opt.value
                          return (
                            <button
                              key={String(opt.value)}
                              onClick={() => setExpiryDays(opt.value)}
                              className="flex flex-1 flex-col items-center rounded-xl py-2 text-xs font-semibold transition-all"
                              style={{
                                background: active ? 'var(--accent)' : 'var(--surface-muted)',
                                color: active ? '#fff' : 'var(--ink-2)',
                                border: active ? '2px solid var(--accent)' : '2px solid transparent',
                                outline: active ? '2px solid rgba(59,130,246,0.25)' : 'none',
                                outlineOffset: '2px',
                              }}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                      {expiryDate && (
                        <p className="mt-2.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                          <CalendarDays className="size-3" />
                          Expires {expiryDate}
                        </p>
                      )}
                    </div>

                    {/* Wallet not connected */}
                    {!address && (
                      <div
                        className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm"
                        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                      >
                        Connect your wallet to generate a link
                      </div>
                    )}

                    {/* Action buttons — shown once link is ready */}
                    {hasLink && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-2"
                      >
                        {/* Primary actions side by side */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleCopy}
                            className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                            style={{
                              background: copied ? 'rgba(52,211,153,0.12)' : 'var(--surface-muted)',
                              color: copied ? 'var(--success)' : 'var(--ink)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                            {copied ? 'Copied!' : 'Copy Link'}
                          </button>
                          <button
                            onClick={() => setView('qr')}
                            className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                            style={{ background: 'var(--accent)' }}
                          >
                            <QrCode className="size-4" />
                            Show QR Code
                          </button>
                        </div>

                        {/* Save to Payment Links */}
                        <button
                          onClick={handleSaveInvoice}
                          disabled={saved}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-default"
                          style={{
                            background: saved ? 'rgba(52,211,153,0.12)' : 'transparent',
                            color: saved ? 'var(--success)' : 'var(--muted)',
                            border: `1px solid ${saved ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                          }}
                        >
                          {saved
                            ? <><CheckCircle2 className="size-4" /> Saved to Payment Links</>
                            : <><Link2 className="size-4" /> Save to Payment Links</>}
                        </button>
                      </motion.div>
                    )}

                    {/* Disabled CTA when no link yet */}
                    {!hasLink && address && (
                      <button
                        disabled
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                      >
                        <Link2 className="size-4" />
                        Enter an amount to generate
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── QR VIEW ── */}
              {view === 'qr' && (
                <motion.div
                  key="qr"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col px-5 pb-8 pt-2"
                >
                  {/* Header */}
                  <div className="mb-5 flex items-center gap-3">
                    <button
                      onClick={() => setView('form')}
                      className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
                      style={{ color: 'var(--subtle)' }}
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                    <div className="flex-1">
                      <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>QR Code</h2>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                        Scan to open the payment link
                      </p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
                      style={{ color: 'var(--subtle)' }}
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* QR card — large, centered */}
                  <div
                    className="flex flex-col items-center gap-4 rounded-3xl p-6 mb-4"
                    style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                  >
                    {/* QR with token logo embedded */}
                    <div
                      ref={qrRef}
                      className="rounded-2xl p-4"
                      style={{
                        background: '#ffffff',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
                      }}
                    >
                      <QRCodeSVG
                        value={paymentLink}
                        size={240}
                        level="M"
                        marginSize={1}
                        imageSettings={{
                          src: cfg.qrLogo,
                          height: 44,
                          width: 44,
                          excavate: true,
                        }}
                      />
                    </div>

                    {/* Amount summary */}
                    <div className="text-center">
                      <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                        {amount
                          ? `${cfg.currencySign}${parseFloat(amount).toFixed(2)}`
                          : 'Any amount'}
                        {' '}<span style={{ color: 'var(--muted)' }}>{cfg.symbol}</span>
                      </p>
                      {memo && (
                        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{memo}</p>
                      )}
                      <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                        Arc Testnet{expiryDate ? ` · Expires ${expiryDate}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleDownloadQr}
                        className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                      >
                        <Download className="size-4" />
                        Download SVG
                      </button>
                      <button
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{
                          background: copied ? 'rgba(52,211,153,0.12)' : 'var(--accent)',
                          color: copied ? 'var(--success)' : '#fff',
                          border: 'none',
                        }}
                      >
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>

                    {/* Save to Payment Links */}
                    <button
                      onClick={handleSaveInvoice}
                      disabled={saved}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-default"
                      style={{
                        background: saved ? 'rgba(52,211,153,0.12)' : 'transparent',
                        color: saved ? 'var(--success)' : 'var(--muted)',
                        border: `1px solid ${saved ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                      }}
                    >
                      {saved
                        ? <><CheckCircle2 className="size-4" /> Saved to Payment Links</>
                        : <><Link2 className="size-4" /> Save to Payment Links</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
