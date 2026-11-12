import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSwitchChain } from 'wagmi'
import {
  X, Loader2, ExternalLink, CheckCircle2, ArrowDown,
  RefreshCw, AlertTriangle, ArrowLeftRight, ChevronDown,
  ChevronUp, Settings2, Info, ArrowLeft,
} from 'lucide-react'
import { TokenUSDC, TokenEURC } from '@web3icons/react'
import { AppKit, type SwapEstimate } from '@circle-fin/app-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import type { EIP1193Provider } from 'viem'
import { requireChain } from '@/onchain-facts'

const TARGET_CHAIN_ID = 5042002
const APP_KIT_CHAIN = 'Arc_Testnet' as const
const chainFact = requireChain(TARGET_CHAIN_ID)
const kit = new AppKit()

const springs = { sheet: { type: 'spring' as const, damping: 32, stiffness: 300 } }
const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

type Direction = 'USDC_TO_EURC' | 'EURC_TO_USDC'
type Phase = 'idle' | 'estimating' | 'reviewed' | 'confirming' | 'swapping' | 'success' | 'error'
type SlippageOption = '0.5' | '1' | '3' | 'custom'

const DIRECTION_CONFIG: Record<Direction, { tokenIn: 'USDC' | 'EURC'; tokenOut: 'USDC' | 'EURC' }> = {
  USDC_TO_EURC: { tokenIn: 'USDC', tokenOut: 'EURC' },
  EURC_TO_USDC: { tokenIn: 'EURC', tokenOut: 'USDC' },
}

const SLIPPAGE_OPTIONS: SlippageOption[] = ['0.5', '1', '3', 'custom']

type ReviewedSwap = {
  estimate: SwapEstimate
  direction: Direction
  amount: string
  account: string | undefined
  slippageBps: number
}

function parseSwapError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err)
  if (msg.toLowerCase().includes('user rejected') || msg.includes('4001')) return 'Swap cancelled.'
  if (msg.toLowerCase().includes('no route') || msg.toLowerCase().includes('not supported'))
    return 'No swap route found on Arc Testnet. Liquidity may be limited on this testnet.'
  if (msg.toLowerCase().includes('insufficient')) return 'Insufficient balance.'
  return `Swap failed: ${msg.slice(0, 120)}`
}

function TokenIcon({ token, size = 22 }: { token: 'USDC' | 'EURC'; size?: number }) {
  return token === 'USDC'
    ? <TokenUSDC variant="branded" size={size} />
    : <TokenEURC variant="branded" size={size} />
}

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>
        {value}
        {sub && <span className="ml-1 font-normal" style={{ color: 'var(--subtle)' }}>{sub}</span>}
      </span>
    </div>
  )
}

/* ── Top-level confirmation view (must live outside SwapSheet) ── */
interface ConfirmProps {
  cfg: { tokenIn: 'USDC' | 'EURC'; tokenOut: 'USDC' | 'EURC' }
  amount: string
  estimatedOut: number | null
  rate: string | null
  minReceived: string | null
  slippageLabel: string
  priceImpact: string | null
  reviewed: ReviewedSwap | null
  phase: Phase
  innerBg: React.CSSProperties
  onBack: () => void
  onConfirm: () => void
}

function ConfirmationView({
  cfg, amount, estimatedOut, rate, minReceived, slippageLabel,
  priceImpact, reviewed, phase, innerBg, onBack, onConfirm,
}: ConfirmProps) {
  const swapping = phase === 'swapping'
  return (
    <div className="flex flex-col gap-3">
      {/* Back */}
      <button
        onClick={onBack}
        disabled={swapping}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-70 disabled:opacity-30"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <h3 className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Confirm Swap</h3>

      {/* From → To summary */}
      <div className="rounded-2xl p-4" style={innerBg}>
        <div className="flex items-center gap-2.5">
          <TokenIcon token={cfg.tokenIn} size={32} />
          <div>
            <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{amount}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{cfg.tokenIn} · You pay</p>
          </div>
        </div>

        <div className="my-3 flex items-center gap-2">
          <div className="flex-1" style={{ height: '1px', background: 'var(--border)' }} />
          <div className="flex size-7 items-center justify-center rounded-full" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <ArrowDown className="size-3.5" style={{ color: 'var(--subtle)' }} />
          </div>
          <div className="flex-1" style={{ height: '1px', background: 'var(--border)' }} />
        </div>

        <div className="flex items-center gap-2.5">
          <TokenIcon token={cfg.tokenOut} size={32} />
          <div>
            <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--success)' }}>
              ~{estimatedOut?.toFixed(4)}
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{cfg.tokenOut} · Estimated</p>
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="flex flex-col gap-0.5 rounded-2xl p-4" style={innerBg}>
        {rate && <DetailRow label="Rate" value={`1 ${cfg.tokenIn} ≈ ${rate} ${cfg.tokenOut}`} />}
        {minReceived && <DetailRow label="Minimum received" value={`${minReceived} ${cfg.tokenOut}`} />}
        <DetailRow label="Slippage tolerance" value={slippageLabel} />
        {priceImpact && <DetailRow label="Price impact" value={`~${priceImpact}%`} />}
        {reviewed?.estimate.fees && reviewed.estimate.fees.length > 0
          ? reviewed.estimate.fees.map((fee, i) => (
            <DetailRow key={i} label={`Fee (${fee.type ?? 'network'})`} value={fee.amount ? `${fee.amount} ${fee.token ?? ''}` : '—'} />
          ))
          : <DetailRow label="Network fee" value="~$0.00 (USDC gas)" />
        }
        <div className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
          <Info className="mt-0.5 size-3 shrink-0" />
          <span>Routed via LiFi. Actual output may differ due to on-chain conditions.</span>
        </div>
      </div>

      {/* Confirm button */}
      <button
        disabled={swapping}
        onClick={onConfirm}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)', opacity: 1 }}
      >
        {swapping
          ? <><Loader2 className="size-4 animate-spin" /> Swapping…</>
          : 'Confirm Swap'}
      </button>
      {swapping && (
        <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
          Confirm in your wallet and wait for the transaction…
        </p>
      )}
    </div>
  )
}

/* ──────────────────────────────────────── Main sheet ── */
interface SwapSheetProps {
  open: boolean
  onClose: () => void
}

export function SwapSheet({ open, onClose }: SwapSheetProps) {
  const { connector, address, chainId: walletChainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()

  const [direction, setDirection] = useState<Direction>('USDC_TO_EURC')
  const [amount, setAmount] = useState('200')
  const [phase, setPhase] = useState<Phase>('idle')
  const [reviewed, setReviewed] = useState<ReviewedSwap | null>(null)
  const [amountOut, setAmountOut] = useState<string | null>(null)
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [slippageOption, setSlippageOption] = useState<SlippageOption>('3')
  const [customSlippage, setCustomSlippage] = useState('')
  const [showSlippage, setShowSlippage] = useState(false)
  const abortRef = useRef(false)

  const cfg = DIRECTION_CONFIG[direction]
  const isLoading = phase === 'estimating' || phase === 'swapping'
  const parsedAmount = parseFloat(amount)
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0

  const slippageBps = (() => {
    if (slippageOption === 'custom') {
      const n = parseFloat(customSlippage)
      return isNaN(n) ? 300 : Math.round(n * 100)
    }
    return Math.round(parseFloat(slippageOption) * 100)
  })()

  const slippageLabel = slippageOption === 'custom'
    ? `${customSlippage || '?'}%`
    : `${slippageOption}%`

  const getAdapter = async () => {
    if (!connector) throw new Error('Wallet not connected')
    if (walletChainId !== TARGET_CHAIN_ID) await switchChainAsync({ chainId: TARGET_CHAIN_ID })
    const provider = (await connector.getProvider()) as EIP1193Provider
    return createViemAdapterFromProvider({ provider })
  }

  const handleToggle = () => {
    setDirection((d) => d === 'USDC_TO_EURC' ? 'EURC_TO_USDC' : 'USDC_TO_EURC')
    setReviewed(null)
    setPhase('idle')
    setErrorMsg(null)
    setShowDetails(false)
  }

  const handleAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '')
    if (cleaned === '' || /^\d*\.?\d*$/.test(cleaned)) {
      setAmount(cleaned)
      if (phase === 'reviewed' || phase === 'error' || phase === 'confirming') {
        setPhase('idle'); setReviewed(null); setErrorMsg(null)
      }
    }
  }

  const handleGetQuote = async () => {
    if (!amountValid) return
    abortRef.current = false
    setPhase('estimating'); setErrorMsg(null); setReviewed(null); setShowDetails(false)
    try {
      const adapter = await getAdapter()
      const estimate = await kit.estimateSwap({
        from: { adapter, chain: APP_KIT_CHAIN },
        tokenIn: cfg.tokenIn,
        tokenOut: cfg.tokenOut,
        amountIn: parsedAmount.toFixed(2),
        config: { slippageBps },
      })
      if (abortRef.current) return
      setReviewed({ estimate, direction, amount, account: address, slippageBps })
      setPhase('reviewed')
      setShowDetails(true)
    } catch (err) {
      if (abortRef.current) return
      setErrorMsg(parseSwapError(err)); setPhase('error')
    }
  }

  const handleSwap = async () => {
    if (!reviewed) return
    if (address !== reviewed.account) {
      setErrorMsg('Wallet account changed — please get a new quote.'); setPhase('error'); return
    }
    setPhase('swapping'); setErrorMsg(null)
    try {
      const adapter = await getAdapter()
      const result = await kit.swap({
        from: { adapter, chain: APP_KIT_CHAIN },
        tokenIn: cfg.tokenIn,
        tokenOut: cfg.tokenOut,
        amountIn: parsedAmount.toFixed(2),
        config: { slippageBps: reviewed.slippageBps },
      })
      setAmountOut(result.amountOut ?? null)
      setExplorerUrl(result.explorerUrl ?? null)
      setPhase('success')
    } catch (err) {
      setErrorMsg(parseSwapError(err)); setPhase('error')
    }
  }

  const handleReset = () => {
    abortRef.current = true
    setPhase('idle'); setReviewed(null); setErrorMsg(null); setShowDetails(false)
  }

  const handleClose = () => {
    abortRef.current = true
    if (phase === 'success') {
      setPhase('idle'); setAmountOut(null); setExplorerUrl(null)
      setReviewed(null); setShowDetails(false)
    }
    onClose()
  }

  /* ── Derived quote values ── */
  const estimatedOut = reviewed ? parseFloat(reviewed.estimate.estimatedOutput.amount) : null
  const rate = estimatedOut && parsedAmount > 0 ? (estimatedOut / parsedAmount).toFixed(4) : null
  const minReceived = estimatedOut ? (estimatedOut * (1 - slippageBps / 10_000)).toFixed(4) : null
  const priceImpact = (() => {
    const fees = reviewed?.estimate.fees
    if (!fees || !parsedAmount) return null
    const totalFeeUsd = fees.reduce((sum, f) => sum + parseFloat(f.amount || '0'), 0)
    return ((totalFeeUsd / parsedAmount) * 100).toFixed(2)
  })()

  const innerBg: React.CSSProperties = {
    background: 'var(--surface-muted)',
    border: '1px solid var(--border)',
    borderRadius: '1rem',
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.section
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl"
            style={{ background: 'var(--card-bg)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={springs.sheet}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1" style={{ background: spectral }} />
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: 'var(--border-strong)' }} />
            </div>

            <div className="max-h-[90dvh] overflow-y-auto px-5 pb-8 pt-2">
              {/* ── Header ── */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Swap</h2>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{chainFact.name} · via LiFi</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Slippage pill */}
                  <button
                    onClick={() => setShowSlippage((v) => !v)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                      background: showSlippage ? 'var(--accent)' : 'var(--surface-muted)',
                      color: showSlippage ? '#fff' : 'var(--ink-2)',
                      border: `1px solid ${showSlippage ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                    title="Slippage settings"
                  >
                    <Settings2 className="size-3" />
                    {slippageLabel}
                    {slippageOption !== '3' && !showSlippage && (
                      <span className="inline-block size-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    )}
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
                  >
                    <X className="size-4" style={{ color: 'var(--subtle)' }} />
                  </button>
                </div>
              </div>

              {/* ── Slippage panel ── */}
              <AnimatePresence>
                {showSlippage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden rounded-2xl p-4"
                    style={innerBg}
                  >
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      Slippage tolerance
                    </p>
                    <div className="flex gap-2">
                      {SLIPPAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSlippageOption(opt)}
                          className="flex-1 rounded-xl py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
                          style={{
                            background: slippageOption === opt ? 'var(--accent)' : 'var(--card-bg)',
                            color: slippageOption === opt ? '#fff' : 'var(--ink-2)',
                            border: `1px solid ${slippageOption === opt ? 'var(--accent)' : 'var(--border)'}`,
                            boxShadow: slippageOption === opt ? '0 0 0 3px rgba(59,130,246,0.18)' : 'none',
                          }}
                        >
                          {opt === 'custom' ? 'Custom' : `${opt}%`}
                        </button>
                      ))}
                    </div>
                    {slippageOption === 'custom' && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          inputMode="decimal"
                          value={customSlippage}
                          onChange={(e) => setCustomSlippage(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="e.g. 2.0"
                          className="flex-1 rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
                          style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                        />
                        <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>%</span>
                      </div>
                    )}
                    <p className="mt-2 text-xs" style={{ color: 'var(--subtle)' }}>
                      Transaction reverts if price moves more than {slippageLabel} unfavorably.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Success ── */}
              {phase === 'success' ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex size-16 items-center justify-center rounded-full" style={{ background: 'rgba(52,211,153,0.12)', boxShadow: '0 0 0 8px rgba(52,211,153,0.06)' }}>
                    <CheckCircle2 className="size-8" style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="text-center">
                    <p className="display text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                      {amountOut ? `${parseFloat(amountOut).toFixed(4)} ${cfg.tokenOut}` : 'Swap complete'}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                      {amount} {cfg.tokenIn} → {cfg.tokenOut}
                    </p>
                  </div>
                  {explorerUrl && (
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--accent-hover)' }}
                    >
                      View on explorer <ExternalLink className="size-3" />
                    </a>
                  )}
                  <button onClick={handleClose}
                    className="mt-2 w-full rounded-2xl py-3.5 text-sm font-semibold text-white"
                    style={{ background: 'var(--accent)' }}
                  >Done</button>
                </div>

              ) : (phase === 'confirming' || phase === 'swapping') && reviewed ? (
                /* ── Confirmation screen ── */
                <ConfirmationView
                  cfg={cfg} amount={amount} estimatedOut={estimatedOut} rate={rate}
                  minReceived={minReceived} slippageLabel={slippageLabel} priceImpact={priceImpact}
                  reviewed={reviewed} phase={phase} innerBg={innerBg}
                  onBack={() => setPhase('reviewed')}
                  onConfirm={() => void handleSwap()}
                />

              ) : (
                /* ── Main swap form ── */
                <div className="flex flex-col gap-3">
                  {/* Direction toggle */}
                  <div className="flex items-center gap-2 rounded-2xl p-1" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                    {(['USDC_TO_EURC', 'EURC_TO_USDC'] as Direction[]).map((dir) => (
                      <button
                        key={dir}
                        onClick={() => {
                          setDirection(dir); setReviewed(null)
                          if (phase === 'reviewed' || phase === 'error') { setPhase('idle'); setErrorMsg(null) }
                        }}
                        disabled={isLoading}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: direction === dir ? 'var(--card-bg)' : 'transparent',
                          color: direction === dir ? 'var(--ink)' : 'var(--subtle)',
                          boxShadow: direction === dir ? '0 1px 3px rgba(18,45,69,0.08)' : 'none',
                        }}
                      >
                        <TokenIcon token={DIRECTION_CONFIG[dir].tokenIn} size={16} />
                        <span>{DIRECTION_CONFIG[dir].tokenIn}</span>
                        <ArrowLeftRight className="size-3 opacity-40" />
                        <TokenIcon token={DIRECTION_CONFIG[dir].tokenOut} size={16} />
                        <span>{DIRECTION_CONFIG[dir].tokenOut}</span>
                      </button>
                    ))}
                  </div>

                  {/* You pay */}
                  <div className="rounded-2xl p-4" style={innerBg}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>You pay</label>
                    <div className="flex items-center gap-3">
                      <input
                        inputMode="decimal" value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="0.00" disabled={isLoading}
                        className="display min-w-0 flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-30 disabled:opacity-60"
                        style={{ color: 'var(--ink)' }}
                      />
                      <div className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        <TokenIcon token={cfg.tokenIn} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{cfg.tokenIn}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex gap-1.5">
                      {['10', '50', '100', '500'].map((v) => (
                        <button key={v} onClick={() => handleAmountChange(v)} disabled={isLoading}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40"
                          style={{
                            background: amount === v ? 'var(--accent)' : 'var(--card-bg)',
                            color: amount === v ? '#fff' : 'var(--ink-2)',
                            border: '1px solid var(--border)',
                          }}
                        >{v}</button>
                      ))}
                    </div>
                  </div>

                  {/* Flip arrow */}
                  <div className="flex justify-center">
                    <button onClick={handleToggle} disabled={isLoading}
                      className="flex size-8 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                    >
                      <ArrowDown className="size-4" style={{ color: 'var(--subtle)' }} />
                    </button>
                  </div>

                  {/* You receive */}
                  <div className="rounded-2xl p-4" style={innerBg}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      You receive (estimated)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        {phase === 'estimating' ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="size-5 animate-spin" style={{ color: 'var(--accent)' }} />
                            <span className="text-sm" style={{ color: 'var(--muted)' }}>Fetching quote…</span>
                          </div>
                        ) : (
                          <span className="display text-3xl font-bold tabular-nums"
                            style={{ color: reviewed ? 'var(--success)' : 'var(--subtle)' }}
                          >
                            {reviewed ? estimatedOut?.toFixed(4) : '—'}
                          </span>
                        )}
                        {rate && phase !== 'estimating' && (
                          <p className="mt-1.5 text-xs font-medium">
                            <span style={{ color: 'var(--subtle)' }}>Rate: </span>
                            <span style={{ color: 'var(--ink-2)' }}>1 {cfg.tokenIn} ≈ {rate} {cfg.tokenOut}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        <TokenIcon token={cfg.tokenOut} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{cfg.tokenOut}</span>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible swap details */}
                  {reviewed && (
                    <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border)' }}>
                      <button
                        onClick={() => setShowDetails((v) => !v)}
                        className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold transition-colors hover:bg-white/5"
                        style={{ color: 'var(--muted)' }}
                      >
                        <span>Swap details</span>
                        {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </button>
                      <AnimatePresence>
                        {showDetails && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-0.5 px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                              {minReceived && <DetailRow label="Minimum received" value={`${minReceived} ${cfg.tokenOut}`} />}
                              <DetailRow label="Slippage tolerance" value={slippageLabel} />
                              {priceImpact && <DetailRow label="Price impact" value={`~${priceImpact}%`} />}
                              {reviewed.estimate.fees && reviewed.estimate.fees.length > 0
                                ? reviewed.estimate.fees.map((fee, i) => (
                                  <DetailRow key={i} label={`Fee (${fee.type ?? 'network'})`} value={fee.amount ? `${fee.amount} ${fee.token ?? ''}` : '—'} />
                                ))
                                : <DetailRow label="Network fee" value="~$0.00 (USDC gas)" />
                              }
                              <div className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
                                <Info className="mt-0.5 size-3 shrink-0" />
                                <span>Routed via LiFi aggregator. Actual output may vary.</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Error */}
                  {phase === 'error' && errorMsg && (
                    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)' }}
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--danger)' }} />
                      <p className="text-xs" style={{ color: 'var(--danger)' }}>{errorMsg}</p>
                    </div>
                  )}

                  {/* CTAs */}
                  <div className="flex flex-col gap-2 pt-1">
                    {phase !== 'reviewed' ? (
                      <button
                        disabled={isLoading || !amountValid}
                        onClick={() => void handleGetQuote()}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ background: 'var(--accent)' }}
                      >
                        {phase === 'estimating'
                          ? <><Loader2 className="size-4 animate-spin" /> Getting quote…</>
                          : <><RefreshCw className="size-4" /> Get quote</>}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setPhase('confirming')}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
                          style={{ background: 'var(--accent)' }}
                        >
                          Review Swap →
                        </button>
                        <button onClick={handleReset}
                          className="w-full rounded-2xl py-2.5 text-sm font-medium transition-all hover:bg-white/5"
                          style={{ color: 'var(--muted)' }}
                        >
                          Refresh quote
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
