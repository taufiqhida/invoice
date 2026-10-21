import { useEffect, useMemo, useRef, useState } from 'react'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

// Combobox pelanggan: ketik untuk mencari, klik / Enter untuk memilih.
export default function CustomerPicker({ customers, value, onChange, onAddCustomer, onUpdateCustomer }) {
  const selected = customers.find((c) => String(c.id) === String(value)) || null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false) // true: form dipakai untuk mengubah pelanggan terpilih
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [addError, setAddError] = useState('')
  const rootRef = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
  }, [customers, query])

  useEffect(() => {
    const onDocClick = (e) => {
      // composedPath() dihitung saat dispatch, jadi tetap benar walau target sudah dilepas React.
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) {
        setOpen(false)
        setAdding(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const choose = (c) => {
    onChange(String(c.id))
    setQuery('')
    setOpen(false)
  }

  const startAdding = () => {
    setNewName(query.trim())
    setNewPhone('')
    setAddError('')
    setEditing(false)
    setAdding(true)
  }

  const startEditing = () => {
    setNewName(selected.name)
    setNewPhone(selected.phone)
    setAddError('')
    setEditing(true)
    setAdding(true)
  }

  const closeForm = () => {
    setAdding(false)
    setEditing(false)
  }

  const [savingNew, setSavingNew] = useState(false)
  const saveNew = async () => {
    if (savingNew) return
    const name = newName.trim()
    const phone = newPhone.trim()
    if (!name) return setAddError('Nama pelanggan wajib diisi.')
    if (phone && !/^[0-9+\-\s]{6,20}$/.test(phone)) return setAddError('Nomor telepon tidak valid.')
    setSavingNew(true)
    setAddError('')
    try {
      if (editing) {
        await onUpdateCustomer(selected.id, { name, phone })
        closeForm()
      } else {
        const created = await onAddCustomer({ name, phone })
        closeForm()
        choose(created)
      }
    } catch (err) {
      setAddError(err.message)
    } finally {
      setSavingNew(false)
    }
  }

  const onNewKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveNew()
    } else if (e.key === 'Escape') {
      closeForm()
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      if (results[active]) choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1 block text-sm font-medium">Pelanggan</span>
      {selected && !open ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <button
            type="button"
            className="flex-1 text-left"
            onClick={() => setOpen(true)}
            aria-label="Ganti pelanggan"
          >
            <span className="font-medium">{selected.name}</span>
            <span className="ml-2 text-slate-500">{selected.phone}</span>
          </button>
          {onUpdateCustomer && (
            <button
              type="button"
              onClick={startEditing}
              aria-label="Ubah data pelanggan"
              className="ml-2 rounded px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Ubah
            </button>
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Hapus pilihan pelanggan"
            className="ml-1 text-slate-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          className={inputCls}
          placeholder="Cari nama pelanggan…"
          value={query}
          autoFocus={open}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
        />
      )}
      {adding && (
        <div className="absolute z-10 mt-1 w-full space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium">{editing ? 'Ubah data pelanggan' : 'Pelanggan baru'}</p>
          {editing && (
            <p className="text-xs text-slate-500">Perubahan berlaku di semua nota pelanggan ini, termasuk yang lama.</p>
          )}
          <input
            className={inputCls}
            placeholder="Nama pelanggan"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={onNewKeyDown}
          />
          <input
            className={inputCls}
            placeholder="No. WhatsApp (opsional)"
            inputMode="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={onNewKeyDown}
          />
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={saveNew}
              disabled={savingNew}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {savingNew ? 'Menyimpan…' : editing ? 'Simpan' : 'Simpan & Pilih'}
            </button>
          </div>
        </div>
      )}
      {open && !adding && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Pelanggan tidak ditemukan.</li>}
          {results.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(c)
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-indigo-50' : ''}`}
            >
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-slate-500">{c.phone}</span>
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            onMouseDown={(e) => {
              e.preventDefault()
              startAdding()
            }}
            className="cursor-pointer border-t border-slate-100 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            + Tambah pelanggan baru{query.trim() ? ` “${query.trim()}”` : ''}
          </li>
        </ul>
      )}
    </div>
  )
}
