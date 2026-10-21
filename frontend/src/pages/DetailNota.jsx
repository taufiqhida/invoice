import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EditNota from '../components/EditNota.jsx'
import InvoicePrint from '../components/InvoicePrint.jsx'
import {
  STATUS_LABEL,
  deleteInvoice,
  isOpen,
  setInvoiceStatus,
  updateCustomer,
  updateInvoice,
  useInvoice,
} from '../lib/invoiceStore.js'

export default function DetailNota() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { invoice, loading, error } = useInvoice(id)
  const [statusError, setStatusError] = useState('')
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')

  const changeStatus = async (status) => {
    setStatusError('')
    try {
      await setInvoiceStatus(invoice.id, status)
    } catch (err) {
      setStatusError(err.message)
    }
  }

  const saveChanges = async ({ customer, invoice: payload }) => {
    if (customer) await updateCustomer(invoice.customerId, customer)
    await updateInvoice(invoice.id, payload)
    setEditing(false)
    setNotice('Perubahan nota sudah disimpan.')
  }

  const removeInvoice = async () => {
    await deleteInvoice(invoice.id)
    navigate('/riwayat', { replace: true })
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-slate-500">Memuat nota…</p>
  }

  if (!invoice) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="mb-3 text-slate-600">{error ? `Nota belum bisa dimuat: ${error}` : 'Nota tidak ditemukan.'}</p>
        <Link to="/riwayat" className="font-medium text-indigo-700 underline">
          Kembali ke riwayat
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/riwayat" className="text-sm font-medium text-indigo-700 hover:underline">
          ← Riwayat
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Status
            <select
              value={invoice.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setNotice('')
                setEditing(true)
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ubah nota
            </button>
          )}
          {isOpen(invoice) && !editing && (
            <Link
              to={`/nota/baru?pelanggan=${invoice.customerId ?? ''}`}
              className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              + Tambah barang
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Cetak / Simpan PDF
          </button>
        </div>
      </div>
      {statusError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 print:hidden">
          {statusError}
        </p>
      )}
      {notice && !editing && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 print:hidden">
          {notice}
        </p>
      )}
      {editing ? (
        <EditNota invoice={invoice} onSave={saveChanges} onCancel={() => setEditing(false)} onDelete={removeInvoice} />
      ) : (
        <InvoicePrint invoice={invoice} />
      )}
    </div>
  )
}
