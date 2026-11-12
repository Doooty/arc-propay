import { useEffect, useState } from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getUsdc } from '@/onchain-facts'

const TARGET_CHAIN_ID = 5042002
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`
const USDC_ADDRESS = (getUsdc(TARGET_CHAIN_ID)?.address ?? '') as `0x${string}`

function makeClient() {
  const rpcUrl = arcTestnet.rpcUrls.default.http[0]
  return createPublicClient({ chain: arcTestnet, transport: http(rpcUrl) })
}

export type PaymentStatusResult = 'pending' | 'paid' | 'expired'

export interface Invoice {
  id: string
  token: 'USDC' | 'EURC'
  amount: string
  memo: string
  to: string
  link: string
  createdAt: number
  expiresAt: number | null
}

const STORAGE_KEY = 'arc_pay_invoices'

export function loadInvoices(): Invoice[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Invoice[]
  } catch {
    return []
  }
}

export function saveInvoice(inv: Invoice) {
  const list = loadInvoices()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([inv, ...list]))
}

export function deleteInvoice(id: string) {
  const list = loadInvoices().filter((i) => i.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function isExpired(invoice: Invoice, now: number): boolean {
  return invoice.expiresAt !== null && now > invoice.expiresAt
}

// Polls the chain for an incoming Transfer to `invoice.to` for the given token since `fromBlock`.
export function usePaymentStatus(invoice: Invoice, fromBlock: bigint): PaymentStatusResult {
  const [paid, setPaid] = useState(false)
  // Snapshot now at mount — expiry check is stable per invoice row lifetime
  const [mountedAt] = useState(() => Date.now())

  // Derived — no setState in render
  const expired = isExpired(invoice, mountedAt)

  useEffect(() => {
    if (expired || paid) return

    let cancelled = false
    const tokenAddr = invoice.token === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS
    const client = makeClient()

    const check = async () => {
      try {
        const logs = await client.getLogs({
          address: tokenAddr,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
          args: { to: invoice.to as `0x${string}` },
          fromBlock,
          toBlock: 'latest',
        })
        if (!cancelled && logs.length > 0) setPaid(true)
      } catch {
        // network hiccup — stay pending
      }
    }

    void check()
    const iv = setInterval(() => { void check() }, 15_000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [invoice, fromBlock, expired, paid])

  if (paid) return 'paid'
  if (expired) return 'expired'
  return 'pending'
}
