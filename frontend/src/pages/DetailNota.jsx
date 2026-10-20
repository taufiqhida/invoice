import { Link, useParams } from 'react-router-dom'
import InvoicePrint from '../components/InvoicePrint.jsx'
import { useInvoice } from '../mocks/invoiceStore.js'

export default function DetailNota() {
  const { id } = useParams()
  const invoice = useInvoice(id)

  if (!invoice) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="mb-3 text-slate-600">Nota tidak ditemukan.</p>
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
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Cetak / Simpan PDF
        </button>
      </div>
      <InvoicePrint invoice={invoice} />
    </div>
  )
}
