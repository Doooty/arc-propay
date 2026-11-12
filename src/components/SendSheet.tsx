import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { isAddress, erc20Abi } from 'viem'
import {
  X, Loader2, ExternalLink, CheckCircle2, ArrowUpRight,
  BookUser, UserPlus, ChevronRight, Wallet, AlertCircle,
} from 'lucide-react'
import { TokenUSDC, TokenEURC } from '@web3icons/react'
import { getUsdc, buildTxExplorerUrl, requireChain } from '@/onchain-facts'
import { parseAmount, Amount, usdcDecimalsFor } from '@/onchain-money'
import { toast } from 'sonner'
import { loadContacts, initials, touchContact, type Contact } from '@/utils/contacts'
import { ContactsSheet } from '@/components/ContactsSheet'

const TARGET_CHAIN_ID = 5042002
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as const
const EURC_DECIMALS = 6

const springs = { sheet: { type: 'spring' as const, stiffness: 380, damping: 40 } }
const spectral = 'linear-gradient(90deg, #7c3aed, #2563eb, #0891b2, #059669)'

const AVATAR_COLORS = [
  ['#dbeafe', '#1d4ed8'], ['#dcfce7', '#15803d'], ['#fce7f3', '#9d174d'],
  ['#fef9c3', '#a16207'], ['#f3e8ff', '#7e22ce'], ['#ffedd5', '#c2410c'],
] as const

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const inner: React.CSSProperties = {
  background: 'var(--surface-muted)',
  border: '1px solid var(--border)',
  borderRadius: '1rem',
}

type Token = 'USDC' | 'EURC'

const TOKEN_META: Record<Token, { label: string; decimals: number; Icon: React.ElementType }> = {
  USDC: { label: 'USDC', decimals: 6, Icon: () => <TokenUSDC variant="branded" size={20} /> },
  EURC: { label: 'EURC', decimals: EURC_DECIMALS, Icon: () => <TokenEURC variant="branded" size={20} /> },
}

function parseOnchainError(error: unknown): string {
  const message = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (message.includes('user rejected') || (error as { code?: number })?.code === 4001) return 'Transaction cancelled.'
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) return 'Insufficient balance.'
  if (message.includes('reverted')) {
    const match = message.match(/reason="([^"]+)"/)
    return match ? `Transaction failed: ${match[1]}` : 'Transaction failed. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

interface SendSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: (hash: string, to: string, amount: string) => void
}

export function SendSheet({ open, onClose, onSuccess }: SendSheetProps) {
  const [token, setToken] = useState<Token>(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    return t === 'EURC' ? 'EURC' : 'USDC'
  })
  const [recipient, setRecipient] = useState(() =>
    new URLSearchParams(window.location.search).get('to') ?? ''
  )
  const [amount, setAmount] = useState(() =>
    new URLSearchParams(window.location.search).get('amount') ?? ''
  )
  const [memo, setMemo] = useState('')
  const [contactsOpen, setContactsOpen] = useState(false)
  const [savePromptAddr, setSavePromptAddr] = useState<string | null>(null)
  const [savePromptOpen, setSavePromptOpen] = useState(false)

  const { address, chainId, isConnected } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const usdcFact = getUsdc(TARGET_CHAIN_ID)!
  const chainFact = requireChain(TARGET_CHAIN_ID)

  const tokenAddress = token === 'USDC'
    ? usdcFact.address as `0x${string}`
    : EURC_ADDRESS

  const { data: rawBalance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 10_000 },
  })

  const tokenDecimals = token === 'USDC' ? usdcDecimalsFor(TARGET_CHAIN_ID) : EURC_DECIMALS
  const formattedBalance = rawBalance != null
    ? Amount.fromRaw(rawBalance, tokenDecimals).toFixed(2)
    : null

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const wrongChain = isConnected && chainId !== TARGET_CHAIN_ID
  const validRecipient = isAddress(recipient)
  const validAmount = !!amount && parseFloat(amount) > 0
  const inFlight = isPending || isConfirming
  const ready = isConnected && !wrongChain && validRecipient && validAmount && !inFlight

  const knownContact: Contact | undefined = validRecipient
    ? loadContacts().find((c) => c.address.toLowerCase() === recipient.toLowerCase())
    : undefined

  const handleSend = useCallback(() => {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    try {
      const parsed = parseAmount(TARGET_CHAIN_ID, amount)
      writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, parsed.raw],
        chainId: TARGET_CHAIN_ID,
      })
    } catch (e) {
      toast.error(parseOnchainError(e))
    }
  }, [wrongChain, switchChain, amount, recipient, writeContract, tokenAddress])

  const handleClose = () => {
    if (!inFlight) {
      reset()
      setRecipient('')
      setAmount('')
      setMemo('')
      setSavePromptAddr(null)
      onClose()
    }
  }

  const handleTokenSwitch = (t: Token) => { setToken(t); setAmount(''); reset() }

  const handleSelectContact = (c: Contact) => {
    setRecipient(c.address)
    touchContact(c.id)
    setContactsOpen(false)
  }

  // Notify parent once; offer save-contact if unknown recipient
  const [notified, setNotified] = useState(false)
  if (isSuccess && txHash && !notified) {
    setNotified(true)
    onSuccess(txHash, recipient, amount)
    if (!knownContact && validRecipient) setSavePromptAddr(recipient)
  }
  if (!isSuccess && notified) setNotified(false)

  const txUrl = txHash ? buildTxExplorerUrl(TARGET_CHAIN_ID, txHash) : null
  const quickAmounts = token === 'USDC' ? ['1', '5', '10', '25'] : ['1', '5', '10', '50']

  // Descriptive CTA label + disabled reason
  const ctaContent = () => {
    if (!isConnected) return { label: 'Connect wallet', icon: <Wallet className="size-4" />, reason: true }
    if (wrongChain || isSwitching) return { label: `Switch to ${chainFact.name}`, icon: null, reason: true }
    if (isPending) return { label: 'Confirm in wallet…', icon: <Loader2 className="size-4 animate-spin" />, reason: false }
    if (isConfirming) return { label: 'Confirming…', icon: <Loader2 className="size-4 animate-spin" />, reason: false }
    if (!validAmount && !validRecipient) return { label: 'Enter amount & recipient', icon: <AlertCircle className="size-4" />, reason: true }
    if (!validAmount) return { label: 'Enter an amount', icon: <AlertCircle className="size-4" />, reason: true }
    if (!validRecipient) return { label: 'Select a recipient', icon: <AlertCircle className="size-4" />, reason: true }
    return { label: `Send ${amount} ${token}`, icon: <ArrowUpRight className="size-4" />, reason: false }
  }

  const cta = ctaContent()

  // Avatar for selected contact / raw address
  const recipientAvatar = knownContact
    ? getAvatarColor(knownContact.name)
    : AVATAR_COLORS[0]

  const { Icon: TokenIcon } = TOKEN_META[token]

  return (
    <>
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
              {/* Spectral top bar */}
              <div className="h-1" style={{ background: spectral }} />

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full" style={{ background: 'var(--border-strong)' }} />
              </div>

              <div className="max-h-[88dvh] overflow-y-auto px-5 pb-8 pt-3">

                {/* ── Header ── */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-9 items-center justify-center rounded-xl"
                      style={{ background: 'rgba(59,130,246,0.12)' }}
                    >
                      <ArrowUpRight className="size-4" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <h2 className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>Send</h2>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{chainFact.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
                    style={{ color: 'var(--subtle)', border: '1px solid var(--border)' }}
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* ── Token selector ── */}
                <div className="mb-5 flex gap-1.5 rounded-2xl p-1" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                  {(['USDC', 'EURC'] as Token[]).map((t) => {
                    const { Icon } = TOKEN_META[t]
                    const active = token === t
                    return (
                      <button
                        key={t}
                        onClick={() => handleTokenSwitch(t)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all"
                        style={{
                          background: active ? 'var(--card-bg)' : 'transparent',
                          color: active ? 'var(--ink)' : 'var(--subtle)',
                          boxShadow: active ? '0 1px 6px rgba(0,0,0,0.15)' : 'none',
                        }}
                      >
                        <Icon />
                        {t}
                      </button>
                    )
                  })}
                </div>

                {/* ── Success screen ── */}
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-5 py-4"
                  >
                    {/* Checkmark */}
                    <div
                      className="flex size-16 items-center justify-center rounded-full"
                      style={{ background: 'rgba(52,211,153,0.12)', border: '2px solid rgba(52,211,153,0.3)' }}
                    >
                      <CheckCircle2 className="size-8" style={{ color: 'var(--success)' }} />
                    </div>

                    {/* Amount sent */}
                    <div className="text-center">
                      <p className="display text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
                        {parseFloat(amount || '0').toFixed(2)}
                        <span className="ml-1.5 text-xl" style={{ color: 'var(--muted)' }}>{token}</span>
                      </p>
                      <p className="mt-1 text-sm font-medium" style={{ color: 'var(--success)' }}>Sent successfully</p>
                    </div>

                    {/* Recipient summary */}
                    <div
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                    >
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: recipientAvatar[0], color: recipientAvatar[1] }}
                      >
                        {knownContact ? initials(knownContact.name) : recipient.slice(2, 4).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        {knownContact && (
                          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{knownContact.name}</p>
                        )}
                        <p className="mono text-xs" style={{ color: 'var(--muted)' }}>{shorten(recipient)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <TokenIcon />
                        <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>{token}</span>
                      </div>
                    </div>

                    {/* Explorer link */}
                    {txUrl && (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:opacity-80"
                        style={{ background: 'var(--surface-muted)', color: 'var(--accent-hover)', border: '1px solid var(--border)' }}
                      >
                        <ExternalLink className="size-3.5" />
                        View on explorer
                      </a>
                    )}

                    {/* Save contact prompt */}
                    {savePromptAddr && (
                      <button
                        onClick={() => setSavePromptOpen(true)}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex size-8 items-center justify-center rounded-full"
                            style={{ background: 'rgba(59,130,246,0.12)' }}
                          >
                            <UserPlus className="size-4" style={{ color: 'var(--accent-hover)' }} />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Save as contact</p>
                            <p className="mono text-xs" style={{ color: 'var(--muted)' }}>{shorten(savePromptAddr)}</p>
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
                      </button>
                    )}

                    <button
                      onClick={handleClose}
                      className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                      style={{ background: 'var(--accent)' }}
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (

                  /* ── Form ── */
                  <div className="flex flex-col gap-4">

                    {/* Amount card */}
                    <div className="rounded-2xl p-4" style={inner}>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Amount</label>
                        {isConnected && formattedBalance != null && (
                          <button
                            onClick={() => setAmount(formattedBalance)}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80 active:scale-[0.97]"
                            style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--accent-hover)' }}
                          >
                            Max · {formattedBalance}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9.]/g, '')
                            if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
                          }}
                          placeholder="0.00"
                          className="display min-w-0 flex-1 bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:opacity-20"
                          style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}
                        />
                        <div
                          className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2"
                          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                        >
                          <TokenIcon />
                          <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{token}</span>
                        </div>
                      </div>

                      {/* Quick chips */}
                      <div className="mt-3 flex gap-1.5">
                        {quickAmounts.map((v) => {
                          const active = amount === v
                          return (
                            <button
                              key={v}
                              onClick={() => setAmount(v)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                              style={{
                                background: active ? 'var(--accent)' : 'var(--surface-muted)',
                                color: active ? '#fff' : 'var(--ink-2)',
                                border: active ? 'none' : '1px solid var(--border)',
                              }}
                            >
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Recipient card */}
                    <div className="rounded-2xl p-4" style={inner}>
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>To</label>
                        <button
                          onClick={() => setContactsOpen(true)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80"
                          style={{ background: 'rgba(59,130,246,0.10)', color: 'var(--accent-hover)' }}
                        >
                          <BookUser className="size-3.5" />
                          Contacts
                        </button>
                      </div>

                      {/* Contact chip — shown when a known contact is selected */}
                      {knownContact ? (
                        <div className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5"
                          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                        >
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                            style={{ background: getAvatarColor(knownContact.name)[0], color: getAvatarColor(knownContact.name)[1] }}
                          >
                            {initials(knownContact.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{knownContact.name}</p>
                            <p className="mono text-xs" style={{ color: 'var(--muted)' }}>{shorten(knownContact.address)}</p>
                          </div>
                          <button
                            onClick={() => setRecipient('')}
                            className="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                            style={{ color: 'var(--subtle)' }}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : null}

                      {/* Raw address input — shown when no known contact */}
                      {!knownContact && (
                        <>
                          <input
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value.trim())}
                            placeholder="0x... or pick from contacts"
                            spellCheck={false}
                            className="mono w-full bg-transparent text-sm outline-none placeholder:opacity-40"
                            style={{ color: recipient && !validRecipient ? 'var(--danger)' : 'var(--ink)' }}
                          />
                          {recipient && !validRecipient && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: 'var(--danger)' }}>
                              <AlertCircle className="size-3" />
                              Invalid address
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Note card */}
                    <div className="rounded-2xl p-4" style={inner}>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                        Note <span className="font-normal normal-case" style={{ color: 'var(--subtle)' }}>(optional)</span>
                      </label>
                      <input
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="What's this for?"
                        className="w-full bg-transparent text-sm outline-none placeholder:opacity-40"
                        style={{ color: 'var(--ink)' }}
                      />
                    </div>

                    {/* Error */}
                    {writeError && (
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs" style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        <AlertCircle className="size-3.5 shrink-0" />
                        {parseOnchainError(writeError)}
                      </div>
                    )}

                    {/* Fee row */}
                    {validAmount && validRecipient && (
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>Estimated fee</span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>~$0.00 · USDC gas</span>
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      disabled={!ready}
                      onClick={handleSend}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: cta.reason ? 'var(--surface-muted)' : 'var(--accent)',
                        color: cta.reason ? 'var(--muted)' : '#fff',
                        border: cta.reason ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {cta.icon}
                      {cta.label}
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts picker */}
      <ContactsSheet
        open={contactsOpen}
        onClose={() => setContactsOpen(false)}
        onSelect={handleSelectContact}
      />

      {/* Save-as-contact after successful send */}
      <ContactsSheet
        open={savePromptOpen}
        onClose={() => { setSavePromptOpen(false); setSavePromptAddr(null) }}
        prefillAddress={savePromptAddr ?? undefined}
      />
    </>
  )
}
