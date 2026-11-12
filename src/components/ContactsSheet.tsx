import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Pencil, Check, Search, Users, ArrowLeft, UserCircle2 } from 'lucide-react'
import { isAddress } from 'viem'
import {
  loadContacts,
  saveContact,
  deleteContact,
  makeContactId,
  initials,
  type Contact,
} from '@/utils/contacts'

const springs = { sheet: { type: 'spring' as const, stiffness: 360, damping: 38 } }
const spectral = 'linear-gradient(90deg, #7c3aed, #2563eb, #0891b2, #059669)'

const inner: React.CSSProperties = {
  background: 'var(--surface-muted)',
  border: '1px solid var(--border)',
  borderRadius: '1rem',
}

/* ── Avatar palette ── */
const PALETTE = [
  ['#dbeafe','#1d4ed8'],
  ['#dcfce7','#15803d'],
  ['#fce7f3','#9d174d'],
  ['#fef9c3','#a16207'],
  ['#f3e8ff','#7e22ce'],
  ['#ffedd5','#c2410c'],
  ['#cffafe','#0e7490'],
  ['#ffe4e6','#be123c'],
] as const

function avatarColors(name: string) {
  // stable colour derived from name so it never changes
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const [bg, fg] = PALETTE[h % PALETTE.length]
  return { bg, fg, label: initials(name) }
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/* ─────────────────────────────────────────── Avatar */
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { bg, fg, label } = avatarColors(name)
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.35 }}
    >
      {label}
    </div>
  )
}

/* ─────────────────────────────────────────── Contact row */
interface ContactRowProps {
  contact: Contact
  onSelect?: (c: Contact) => void
  onEdit: (c: Contact) => void
  onDelete: (id: string) => void
  selectable?: boolean
}

function ContactRow({ contact, onSelect, onEdit, onDelete, selectable }: ContactRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-150 hover:-translate-y-px"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Avatar */}
      <Avatar name={contact.name} size={40} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
          {contact.name}
        </p>
        <p className="mono truncate text-xs leading-tight" style={{ color: 'var(--muted)' }}>
          {shorten(contact.address)}
        </p>
        {contact.note && (
          <p className="mt-0.5 truncate text-xs leading-snug" style={{ color: 'var(--subtle)' }}>
            {contact.note}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {selectable && onSelect && (
          <button
            onClick={() => onSelect(contact)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all hover:scale-[1.03] hover:opacity-90 active:scale-[0.97]"
            style={{ background: 'var(--accent)' }}
          >
            Select
          </button>
        )}

        {!confirmDelete ? (
          <>
            <button
              onClick={() => onEdit(contact)}
              className="flex size-8 items-center justify-center rounded-xl transition-colors hover:bg-white/5"
              style={{ color: 'var(--subtle)' }}
              aria-label="Edit"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex size-8 items-center justify-center rounded-xl transition-colors hover:bg-red-500/10"
              style={{ color: 'var(--subtle)' }}
              aria-label="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl px-2 py-1 text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: 'var(--muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(contact.id)}
              className="rounded-xl px-2.5 py-1 text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--danger)' }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────── Contact form */
interface ContactFormProps {
  initial?: Contact
  onSave: (c: Contact) => void
  onCancel: () => void
}

function ContactForm({ initial, onSave, onCancel }: ContactFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [nowMs] = useState(() => Date.now())

  const validAddr = isAddress(address)
  const canSave = name.trim().length > 0 && validAddr

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: initial?.id ?? makeContactId(),
      name: name.trim(),
      address,
      note: note.trim() || undefined,
      createdAt: initial?.createdAt ?? nowMs,
      lastUsed: initial?.lastUsed,
    })
  }

  const isEditing = !!initial?.id

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex size-8 items-center justify-center rounded-xl transition-colors hover:bg-white/5"
          style={{ color: 'var(--subtle)' }}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        {name.trim() ? (
          <Avatar name={name.trim()} size={36} />
        ) : (
          <div
            className="flex size-9 items-center justify-center rounded-full"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
          >
            <UserCircle2 className="size-5" style={{ color: 'var(--subtle)' }} />
          </div>
        )}
        <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>
          {isEditing ? 'Edit contact' : 'New contact'}
        </p>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5 rounded-2xl p-4" style={inner}>
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alice Chen"
          autoFocus
          className="w-full bg-transparent text-sm outline-none placeholder:opacity-40"
          style={{ color: 'var(--ink)' }}
        />
      </div>

      {/* Address */}
      <div className="flex flex-col gap-1.5 rounded-2xl p-4" style={inner}>
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Wallet address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="0x..."
          spellCheck={false}
          className="mono w-full bg-transparent text-sm outline-none placeholder:opacity-40"
          style={{ color: address && !validAddr ? 'var(--danger)' : 'var(--ink)' }}
        />
        {address && !validAddr && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>Not a valid Ethereum address</p>
        )}
        {address && validAddr && (
          <p className="text-xs" style={{ color: 'var(--success)' }}>Valid address</p>
        )}
      </div>

      {/* Note */}
      <div className="flex flex-col gap-1.5 rounded-2xl p-4" style={inner}>
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Note <span className="font-normal normal-case" style={{ color: 'var(--subtle)' }}>(optional)</span>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Freelancer, Team, Client"
          className="w-full bg-transparent text-sm outline-none placeholder:opacity-40"
          style={{ color: 'var(--ink)' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex flex-1 items-center justify-center rounded-2xl py-3 text-sm font-semibold transition-all hover:opacity-70"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          Cancel
        </button>
        <button
          disabled={!canSave}
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          <Check className="size-4" />
          {isEditing ? 'Save changes' : 'Add contact'}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────── Main sheet */
export interface ContactsSheetProps {
  open: boolean
  onClose: () => void
  /** When provided, shows "Select" buttons and calls this on pick */
  onSelect?: (c: Contact) => void
  /** Pre-fill form address when adding a new contact */
  prefillAddress?: string
}

export function ContactsSheet({ open, onClose, onSelect, prefillAddress }: ContactsSheetProps) {
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts())
  const [editing, setEditing] = useState<Contact | null | 'new'>(null)
  const [query, setQuery] = useState('')
  const [nowMs] = useState(() => Date.now())

  const refresh = () => setContacts(loadContacts())

  const handleSave = (c: Contact) => {
    saveContact(c)
    refresh()
    setEditing(null)
  }

  const handleDelete = (id: string) => {
    deleteContact(id)
    refresh()
  }

  const handleSelect = (c: Contact) => {
    onSelect?.(c)
    onClose()
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return q
      ? contacts.filter((c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
      : contacts
  }, [contacts, query])

  const newContactInit: Contact | undefined = prefillAddress
    ? { id: makeContactId(), name: '', address: prefillAddress, createdAt: nowMs }
    : undefined

  const isEmpty = contacts.length === 0
  const noResults = !isEmpty && query && filtered.length === 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.section
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl"
            style={{
              background: 'var(--card-bg)',
              maxHeight: '88dvh',
              display: 'flex',
              flexDirection: 'column',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.sheet}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spectral top bar */}
            <div className="h-1 shrink-0" style={{ background: spectral }} />

            {/* Drag handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-2 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <Users className="size-4.5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h2 className="display text-xl font-bold leading-tight" style={{ color: 'var(--ink)' }}>Contacts</h2>
                  {contacts.length > 0 && (
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {contacts.length} saved {contacts.length === 1 ? 'contact' : 'contacts'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
                style={{ color: 'var(--subtle)' }}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-5 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                    <ContactForm
                      initial={editing === 'new' ? newContactInit : editing}
                      onSave={handleSave}
                      onCancel={() => setEditing(null)}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-col gap-3">
                    {/* Search — always visible */}
                    <div
                      className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
                      style={inner}
                    >
                      <Search className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or address…"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
                        style={{ color: 'var(--ink)' }}
                      />
                      {query && (
                        <button
                          onClick={() => setQuery('')}
                          className="flex size-5 items-center justify-center rounded-full text-xs transition-colors hover:bg-white/10"
                          style={{ color: 'var(--subtle)' }}
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>

                    {/* Empty state */}
                    {isEmpty && (
                      <div className="flex flex-col items-center gap-4 py-10 text-center">
                        <div
                          className="flex size-16 items-center justify-center rounded-2xl"
                          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                        >
                          <Users className="size-8" style={{ color: 'var(--subtle)' }} />
                        </div>
                        <div>
                          <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>No contacts yet</p>
                          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                            Save frequent recipients so you don't have to type addresses every time.
                          </p>
                        </div>
                        <button
                          onClick={() => setEditing('new')}
                          className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
                          style={{ background: 'var(--accent)' }}
                        >
                          <Plus className="size-4" />
                          Add your first contact
                        </button>
                      </div>
                    )}

                    {/* No search results */}
                    {noResults && (
                      <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <Search className="size-8" style={{ color: 'var(--subtle)' }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>No matches for "{query}"</p>
                          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>Try a different name or address</p>
                        </div>
                        <button
                          onClick={() => setQuery('')}
                          className="text-xs font-semibold transition-colors hover:opacity-70"
                          style={{ color: 'var(--accent)' }}
                        >
                          Clear search
                        </button>
                      </div>
                    )}

                    {/* Contact list */}
                    <AnimatePresence mode="popLayout">
                      {filtered.map((c) => (
                        <ContactRow
                          key={c.id}
                          contact={c}
                          onSelect={onSelect ? handleSelect : undefined}
                          onEdit={(ct) => setEditing(ct)}
                          onDelete={handleDelete}
                          selectable={!!onSelect}
                        />
                      ))}
                    </AnimatePresence>

                    {/* Add contact button — shown when list is non-empty */}
                    {!isEmpty && (
                      <button
                        onClick={() => setEditing('new')}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        <Plus className="size-4" />
                        Add contact
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
