"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function DaftarRtRwPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sukses, setSukses] = useState(false)
  const [skFile, setSkFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    nama: "", email: "", noHp: "", wilayah: "", alasan: "",
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setSkFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!skFile) {
      alert("Mohon upload file SK RT/RW terlebih dahulu.")
      return
    }

    setLoading(true)

    try {
      // 1. Upload file SK ke Supabase Storage dulu
      const fileExt = skFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("sk-rtrw")
        .upload(fileName, skFile)

      if (uploadError) throw new Error("Gagal upload SK: " + uploadError.message)

      // 2. Ambil URL publik file yang baru diupload
      const { data: publicUrlData } = supabase.storage
        .from("sk-rtrw")
        .getPublicUrl(fileName)

      // 3. Simpan pengajuan beserta URL SK-nya
      const { error } = await supabase.from("pengajuan_rtrw").insert({
        nama: formData.nama,
        email: formData.email,
        no_hp: formData.noHp,
        wilayah: formData.wilayah,
        alasan: formData.alasan,
        status: "pending",
        sk_url: publicUrlData.publicUrl,
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
      <div 
        style={{ backgroundColor: "#f0f6ff" }}
        className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center px-4 font-sans text-slate-800"
      >
        <div className="max-w-md w-full bg-white border border-sky-100 rounded-2xl p-8 text-center shadow-xl shadow-sky-950/10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-200">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-base font-black text-slate-800 mb-2">Pengajuan Berhasil Dikirim</h1>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Tim kami akan meninjau pengajuan Anda. Jika disetujui, informasi akun akan dikirim ke nomor HP/email yang Anda daftarkan.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="text-xs font-bold text-sky-700 hover:text-sky-900 transition-colors cursor-pointer"
          >
            ← Kembali ke halaman login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      style={{ background: "linear-gradient(to bottom right, #f0f6ff, #e0f2fe, #eef2ff)" }}
      className="fixed inset-0 z-50 overflow-y-auto font-sans text-slate-800"
    >
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2.5 justify-center mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-700 to-blue-900 text-white flex items-center justify-center shadow-md shadow-sky-900/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="font-black text-xs text-slate-800 tracking-wider uppercase">Sigap Bansos</span>
          </div>

          <div className="bg-white/95 backdrop-blur-md border border-sky-100 rounded-2xl p-6 md:p-8 shadow-xl shadow-sky-950/10">
            <h1 className="text-base font-black text-slate-800 mb-1">Pengajuan Akun RT/RW</h1>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Isi form ini untuk mengajukan akses sebagai RT/RW pengguna sistem. Pengajuan akan diverifikasi oleh admin sebelum akun aktif.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nama Lengkap</label>
                <input
                  name="nama" value={formData.nama} onChange={handleChange} required
                  placeholder="Contoh: Bapak Asep Suryana"
                  className="w-full border border-sky-100 bg-sky-50/30 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Wilayah (RT/RW & Kelurahan)</label>
                <input
                  name="wilayah" value={formData.wilayah} onChange={handleChange} required
                  placeholder="Contoh: RT 02/RW 05, Kp. Naringgul"
                  className="w-full border border-sky-100 bg-sky-50/30 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nomor HP/WhatsApp Aktif</label>
                <input
                  type="tel" name="noHp" value={formData.noHp} onChange={handleChange} required
                  placeholder="0812xxxxxxxx"
                  className="w-full border border-sky-100 bg-sky-50/30 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Alamat Email</label>
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange} required
                  placeholder="nama@email.com"
                  className="w-full border border-sky-100 bg-sky-50/30 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">Email ini akan digunakan untuk login jika pengajuan disetujui.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Upload SK RT/RW</label>
                <input
                  type="file"
                  name="skFile"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  required
                  className="w-full border border-sky-100 bg-sky-50/30 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-sky-700 file:text-white hover:file:bg-sky-800 file:cursor-pointer cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Format PDF/JPG/PNG, digunakan untuk verifikasi keabsahan pengajuan. Maks. 5MB.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Keterangan Tambahan (opsional)</label>
                <textarea
                  name="alasan" value={formData.alasan} onChange={handleChange} rows={3}
                  placeholder="Contoh: Sudah menjabat sebagai RT sejak 2023, SK terlampir bisa diminta saat verifikasi."
                  className="w-full border border-sky-100 bg-sky-50/30 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all resize-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-sky-700 via-blue-800 to-indigo-800 hover:from-sky-800 hover:to-indigo-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl py-3 shadow-md shadow-sky-900/20 transition-all cursor-pointer"
              >
                {loading ? "Mengunggah & Mengirim..." : "Kirim Pengajuan"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 mt-4">
            Sudah punya akun? <a href="/login" className="text-sky-700 font-bold hover:underline">Masuk di sini</a>
          </p>
        </div>
      </div>
    </div>
  )
}