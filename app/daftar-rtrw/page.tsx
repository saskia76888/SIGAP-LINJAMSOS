"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function DaftarRtRwPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sukses, setSukses] = useState(false)
  const [formData, setFormData] = useState({
    nama: "", email: "", noHp: "", wilayah: "", alasan: "",
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("pengajuan_rtrw").insert({
        nama: formData.nama,
        email: formData.email,
        no_hp: formData.noHp,
        wilayah: formData.wilayah,
        alasan: formData.alasan,
        status: "pending",
      })

      if (error) throw error
      setSukses(true)
    } catch (err: any) {
      alert("Gagal mengirim pengajuan: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sukses) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Pengajuan Berhasil Dikirim</h1>
          <p className="text-sm text-gray-500 mb-6">
            Tim kami akan meninjau pengajuan Anda. Jika disetujui, informasi akun akan dikirim ke nomor HP/email yang Anda daftarkan.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Kembali ke halaman login
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-2 justify-center mb-6">
          <svg className="w-6 h-6 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span className="font-bold text-sm text-blue-950 tracking-wider uppercase">Sigap Bansos</span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900 mb-1">Pengajuan Akun RT/RW</h1>
          <p className="text-xs text-gray-500 mb-6">
            Isi form ini untuk mengajukan akses sebagai RT/RW pengguna sistem. Pengajuan akan diverifikasi oleh admin sebelum akun aktif.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Nama Lengkap</label>
              <input
                name="nama" value={formData.nama} onChange={handleChange} required
                placeholder="Contoh: Bapak Asep Suryana"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Wilayah (RT/RW & Kelurahan)</label>
              <input
                name="wilayah" value={formData.wilayah} onChange={handleChange} required
                placeholder="Contoh: RT 02/RW 05, Kp. Naringgul"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Nomor HP/WhatsApp Aktif</label>
              <input
                type="tel" name="noHp" value={formData.noHp} onChange={handleChange} required
                placeholder="0812xxxxxxxx"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Alamat Email</label>
              <input
                type="email" name="email" value={formData.email} onChange={handleChange} required
                placeholder="nama@email.com"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950"
              />
              <p className="text-[10px] text-gray-400 mt-1">Email ini akan digunakan untuk login jika pengajuan disetujui.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Keterangan Tambahan (opsional)</label>
              <textarea
                name="alasan" value={formData.alasan} onChange={handleChange} rows={3}
                placeholder="Contoh: Sudah menjabat sebagai RT sejak 2023, SK terlampir bisa diminta saat verifikasi."
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-950 hover:bg-blue-900 disabled:bg-gray-300 text-white text-sm font-bold rounded-xl py-3 transition-all"
            >
              {loading ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Sudah punya akun? <a href="/login" className="text-blue-600 font-semibold hover:underline">Masuk di sini</a>
        </p>
      </div>
    </main>
  )
}