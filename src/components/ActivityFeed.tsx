import { ArrowUpRight, ExternalLink, Inbox } from 'lucide-react'
import { buildTxExplorerUrl } from '@/onchain-facts'

const TARGET_CHAIN_ID = 5042002 // Arc Testnet

export interface TxRecord {
  hash: string
  to: string
  amount: string
  timestamp: number
}

const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
const formatTime = (ts: number) => {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

const row: React.CSSProperties = {
  background: 'var(--surface-muted)',
  border: '1px solid var(--border)',
  borderRadius: '1rem',
}

interface ActivityFeedProps {
  records: TxRecord[]
}

export function ActivityFeed({ records }: ActivityFeedProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div
          className="flex size-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          <Inbox className="size-7" style={{ color: 'var(--subtle)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No transactions yet</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Payments you send will appear here.<br />Use the Send button to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {records.map((tx) => (
        <div
          key={tx.hash}
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-150 hover:-translate-y-px"
          style={row}
        >
          {/* Icon */}
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.15)' }}
          >
            <ArrowUpRight className="size-4" style={{ color: 'var(--accent)' }} />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {formatAddress(tx.to)}
              </span>
              <a
                href={buildTxExplorerUrl(TARGET_CHAIN_ID, tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-40 transition-opacity hover:opacity-80"
                style={{ color: 'var(--muted)' }}
                aria-label="View on explorer"
              >
                <ExternalLink className="size-3" />
              </a>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--subtle)' }}>{formatTime(tx.timestamp)}</p>
          </div>

          {/* Amount */}
          <div className="shrink-0 text-right">
            <p className="display text-sm font-bold tabular-nums" style={{ color: 'var(--danger)' }}>
              −{parseFloat(tx.amount).toFixed(2)}
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>USDC</p>
          </div>
        </div>
      ))}
    </div>
  )
}
