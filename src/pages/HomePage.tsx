import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import {
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  BookOpen, Wallet, TrendingUp, Zap, QrCode, Link2,
} from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import { TokenUSDC, TokenEURC } from '@web3icons/react'
import { getUsdc, requireChain } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { ActivityFeed, type TxRecord } from '@/components/ActivityFeed'
import type { Page } from '@/components/Sidebar'

const TARGET_CHAIN_ID = 5042002
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as const
const EURC_DECIMALS = 6
const usdcFact = getUsdc(TARGET_CHAIN_ID)!
const chainFact = requireChain(TARGET_CHAIN_ID)

interface HomePageProps {
  onNavigate: (p: Page) => void
  recentTx: TxRecord[]
}

const FEATURES = [
  {
    icon: QrCode,
    title: 'QR Payments',
    desc: 'Generate & scan QR codes for instant payments — no address typing needed.',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.10)',
  },
  {
    icon: Link2,
    title: 'Smart Payment Links',
    desc: 'Create payment links with optional amounts, expiry, and status tracking.',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.10)',
  },
  {
    icon: BookOpen,
    title: 'Saved Contacts',
    desc: 'Save frequent recipients and send with one tap — no more copy-pasting.',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.10)',
  },
]

const ACTIONS: { label: string; page: Page; Icon: React.ElementType; accent?: boolean }[] = [
  { label: 'Send',     page: 'send',     Icon: ArrowUpRight,  accent: true },
  { label: 'Request',  page: 'request',  Icon: ArrowDownLeft               },
  { label: 'Swap',     page: 'swap',     Icon: ArrowLeftRight               },
  { label: 'Contacts', page: 'contacts', Icon: BookOpen                    },
]

/* ── Disconnected hero ── */
function DisconnectedHero() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {/* Logo */}
      <div
        className="mb-5 flex size-20 items-center justify-center rounded-3xl shadow-xl"
        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
      >
        <Zap className="size-10 text-white" strokeWidth={2.5} />
      </div>

      <h1
        className="display mb-3 text-3xl font-bold"
        style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}
      >
        Arc ProPay
      </h1>
      <p className="mb-8 max-w-xs text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
        Fast USDC &amp; EURC payments on Arc — send, receive, and swap stablecoins in seconds.
      </p>

      {/* Connect button */}
      <div className="mb-12">
        <ConnectKitButton />
      </div>

      {/* Feature cards */}
      <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
          <div
            key={title}
            className="rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <div
              className="mb-3 flex size-9 items-center justify-center rounded-xl"
              style={{ background: bg }}
            >
              <Icon className="size-4" style={{ color }} />
            </div>
            <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Connected dashboard ── */
function ConnectedDashboard({ address, onNavigate, recentTx }: {
  address: `0x${string}`
  onNavigate: (p: Page) => void
  recentTx: TxRecord[]
}) {
  const { chainId } = useAccount()
  const wrongChain = chainId !== TARGET_CHAIN_ID

  const { data: rawUsdc, isLoading: usdcLoading } = useReadContract({
    address: usdcFact.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    chainId: TARGET_CHAIN_ID,
    query: { refetchInterval: 10_000 },
  })

  const { data: rawEurc, isLoading: eurcLoading } = useReadContract({
    address: EURC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    chainId: TARGET_CHAIN_ID,
    query: { refetchInterval: 10_000 },
  })

  const loading = usdcLoading || eurcLoading
  const usdcBal = rawUsdc != null ? Amount.fromRaw(rawUsdc, usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2) : null
  const eurcBal = rawEurc != null ? Amount.fromRaw(rawEurc, EURC_DECIMALS).toFixed(2) : null

  return (
    <div className="flex flex-col gap-5">

      {/* Wrong chain banner */}
      {wrongChain && (
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--danger)' }}
        >
          <TrendingUp className="size-4 shrink-0" />
          Switch to {chainFact.name} to see live balances
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* USDC */}
        <div
          className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #1a2d48 100%)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Subtle glow */}
          <div
            className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }}
          />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <TokenUSDC variant="branded" size={20} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>USDC</span>
            </div>
            <p
              className="display mb-0.5 text-3xl font-bold tabular-nums"
              style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}
            >
              {wrongChain ? '—' : loading ? '…' : usdcBal ?? '0.00'}
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{chainFact.name}</p>
          </div>
          <button
            onClick={() => onNavigate('send')}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--accent)' }}
          >
            <ArrowUpRight className="size-3.5" />
            Send USDC
          </button>
        </div>

        {/* EURC */}
        <div
          className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #1e2840 100%)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }}
          />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <TokenEURC variant="branded" size={20} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>EURC</span>
            </div>
            <p
              className="display mb-0.5 text-3xl font-bold tabular-nums"
              style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}
            >
              {wrongChain ? '—' : loading ? '…' : eurcBal ?? '0.00'}
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{chainFact.name}</p>
          </div>
          <button
            onClick={() => onNavigate('swap')}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'rgba(139,92,246,0.18)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <ArrowLeftRight className="size-3.5" />
            Swap to USDC
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Quick Actions
        </p>
        <div className="grid grid-cols-4 gap-2">
          {ACTIONS.map(({ label, page, Icon, accent }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="flex flex-col items-center gap-2.5 rounded-2xl py-4 text-xs font-semibold transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]"
              style={{
                background: accent ? 'var(--accent)' : 'var(--surface-muted)',
                color: accent ? '#fff' : 'var(--ink)',
                border: accent ? 'none' : '1px solid var(--border)',
              }}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex size-6 items-center justify-center rounded-lg"
              style={{ background: 'rgba(59,130,246,0.12)' }}
            >
              <Wallet className="size-3.5" style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Recent Activity</p>
          </div>
          {recentTx.length > 0 && (
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent-hover)' }}
            >
              View all →
            </button>
          )}
        </div>

        {recentTx.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <div
              className="flex size-12 items-center justify-center rounded-2xl"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
            >
              <ArrowUpRight className="size-6" style={{ color: 'var(--subtle)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No transactions yet</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Send USDC or EURC to see activity here</p>
            <button
              onClick={() => onNavigate('send')}
              className="mt-2 rounded-xl px-5 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Send now
            </button>
          </div>
        ) : (
          <ActivityFeed records={recentTx.slice(0, 5)} />
        )}
      </div>

    </div>
  )
}

/* ── Main export ── */
export function HomePage({ onNavigate, recentTx }: HomePageProps) {
  const { address, isConnected } = useAccount()

  if (!isConnected || !address) {
    return <DisconnectedHero />
  }

  return <ConnectedDashboard address={address} onNavigate={onNavigate} recentTx={recentTx} />
}
