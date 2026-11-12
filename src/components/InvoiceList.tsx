import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Trash2, Clock, CheckCircle2, XCircle, ExternalLink, FileText } from 'lucide-react'
import { TokenUSDC, TokenEURC } from '@web3icons/react'
import {
  loadInvoices,
  deleteInvoice,
  usePaymentStatus,
  isExpired,
  type Invoice,
} from '@/hooks/usePaymentStatus'
import { arcTestnet } from 'viem/chains'

const EXPLORER_BASE = arcTestnet.blockExplorers?.default.url ?? ''

function InvoiceRow({ invoice, onDelete }: { invoice: Invoice; onDelete: () => void }) {
  const status = usePaymentStatus(invoice, 0n)
  const [copied, setCopied] = useState(false)
  const [nowMs] = useState(() => Date.now())

  const handleCopy = () => {
    void navigator.clipboard.writeText(invoice.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusConfig = {
    pending: { label: 'Pending', color: 'var(--muted)', bg: 'var(--surface-muted)', icon: Clock },
    paid: { label: 'Paid', color: 'var(--success)', bg: 'rgba(26,128,71,0.08)', icon: CheckCircle2 },
    expired: { label: 'Expired', color: 'var(--error, #dc2626)', bg: 'rgba(220,38,38,0.07)', icon: XCircle },
  } as const

  const sc = statusConfig[status]
  const StatusIcon = sc.icon

  const formattedAmount = invoice.amount
    ? `${invoice.token === 'USDC' ? '$' : '€'}${parseFloat(invoice.amount).toFixed(2)}`
    : 'Any amount'

  const alreadyExpired = isExpired(invoice, nowMs)
  const expiryLabel = invoice.expiresAt
    ? alreadyExpired
      ? 'Expired'
      : `Expires ${new Date(invoice.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : 'No expiry'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl p-4 transition-all duration-150 hover:-translate-y-px"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      {/* Top row: token + amount + status */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {invoice.token === 'USDC'
            ? <TokenUSDC variant="branded" size={20} />
            : <TokenEURC variant="branded" size={20} />}
          <div>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{formattedAmount}</p>
            {invoice.memo && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>{invoice.memo}</p>
            )}
          </div>
        </div>
        {/* Status badge */}
        <div
          className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: sc.bg, color: sc.color }}
        >
          <StatusIcon className="size-3" />
          {sc.label}
        </div>
      </div>

      {/* Meta row */}
      <div className="mb-3 flex items-center gap-3 text-xs" style={{ color: 'var(--subtle)' }}>
        <span>{new Date(invoice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span>·</span>
        <span>{expiryLabel}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: copied ? 'rgba(26,128,71,0.1)' : 'var(--surface-muted)',
            color: copied ? 'var(--success)' : 'var(--ink-2)',
            border: '1px solid var(--border)',
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>

        {status === 'paid' && (
          <a
            href={`${EXPLORER_BASE}/address/${invoice.to}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.01]"
            style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
          >
            <ExternalLink className="size-3.5" />
            Explorer
          </a>
        )}

        <button
          onClick={onDelete}
          className="flex items-center justify-center rounded-xl px-3 py-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)' }}
          aria-label="Delete invoice"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

interface InvoiceListProps {
  refreshTrigger?: number
  onCreateLink?: () => void
}

export function InvoiceList({ refreshTrigger, onCreateLink }: InvoiceListProps) {
  // All hooks before any conditional return
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadInvoices())
  const [listNow] = useState(() => Date.now())
  const prevTriggerRef = useRef(refreshTrigger)

  const refresh = useCallback(() => {
    setInvoices(loadInvoices())
  }, [])

  // Sync external trigger without setState-in-effect: use a ref guard so we
  // only call refresh when the trigger actually increments.
  useEffect(() => {
    if (refreshTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = refreshTrigger
      refresh()
    }
  })

  const handleDelete = (id: string) => {
    deleteInvoice(id)
    refresh()
  }

  const activeCount = invoices.filter((i) => !i.expiresAt || i.expiresAt > listNow).length

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div
          className="flex size-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          <FileText className="size-7" style={{ color: 'var(--subtle)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No payment links yet</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Create a smart link to request USDC or EURC.<br />Set an amount, add a note, and track when it's paid.
          </p>
        </div>
        {onCreateLink && (
          <button
            onClick={onCreateLink}
            className="rounded-2xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--accent)' }}
          >
            + Create payment link
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
          Polling chain every 15s
        </p>
        {activeCount > 0 && (
          <p className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
            {activeCount} active
          </p>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {invoices.map((inv) => (
          <InvoiceRow
            key={inv.id}
            invoice={inv}
            onDelete={() => handleDelete(inv.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
