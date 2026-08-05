/**
 * Normalisasi nomor HP Indonesia ke format 62xxxxxxxxxx (dibutuhkan Fonnte).
 * Menerima input bebas: 0812xxxx, 62812xxx, +62812xxx, 812xxxx, dengan spasi/strip, dll.
 */
export function formatPhoneID(raw: string): string {
  // Buang semua karakter selain angka (spasi, strip, tanda +, dll)
  let digits = raw.replace(/\D/g, "")

  // Kalau diawali "0" (format lokal, misal 0812xxxx) -> ganti jadi "62"
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1)
  }

  // Kalau belum ada awalan 62 sama sekali (misal user cuma nulis 812xxxx) -> tambahin
  if (!digits.startsWith("62")) {
    digits = "62" + digits
  }

  return digits
}