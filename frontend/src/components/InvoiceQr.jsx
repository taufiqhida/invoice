import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

// QR verifikasi: bila discan membuka halaman publik yang menampilkan data nota yang sebenarnya.
// Alamatnya memakai domain tempat aplikasi dibuka, jadi tidak perlu diatur per server.
export const verifyUrl = (token) => `${window.location.origin}/verifikasi/${token}`

export default function InvoiceQr({ token, size = 112 }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(verifyUrl(token), { margin: 1, width: size * 3, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''))
    return () => {
      alive = false
    }
  }, [token, size])

  if (!src) return <div style={{ width: size, height: size }} aria-hidden="true" />
  return <img src={src} width={size} height={size} alt="QR verifikasi nota" className="block" />
}
