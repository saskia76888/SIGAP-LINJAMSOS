"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"

const MapPicker = dynamic(() => import("@/app/components/MapPicker"), { ssr: false })

export default function LaporBencanaPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [urgensi, setUrgensi] = useState("Sedang")
  const [kategoriBencanaId, setKategoriBencanaId] = useState("")
  const [koordinat, setKoordinat] = useState<{ lat: number; lng: number } | null>(null)
  const [formData, setFormData] = useState({
    alamat: "",
    deskripsi: "",
    jumlahKkTerdampak: ""
  })

  const [kategoriBencanaList, setKategoriBencanaList] = useState<{ id: string; nama_kategori: string }[]>([])
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  useEffect(() => {
    async function loadKategoriBencana() {
      const { data } = await supabase
        .from("kategori_bencana")
        .select("id, nama_kategori")
        .order("nama_kategori")

      if (data) {
        const sorted = [...data].sort((a, b) => {
          if (a.nama_kategori === "Lainnya") return 1
          if (b.nama_kategori === "Lainnya") return -1
          return a.nama_kategori.localeCompare(b.nama_kategori)
        })
        setKategoriBencanaList(sorted)
      }
    }
    loadKategoriBencana()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFotoFile(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!kategoriBencanaId) {
      alert("Pilih jenis bencana terlebih dahulu")
      return
    }

    setLoading(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        alert("Sesi login habis, silakan login ulang")
        router.push("/login")
        return
      }

      let fotoUrl: string | null = null
      if (fotoFile) {
        const fileExt = fotoFile.name.split(".").pop()
        const fileName = `bencana/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from("bukti-pengajuan")
          .upload(fileName, fotoFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from("bukti-pengajuan")
          .getPublicUrl(fileName)

        fotoUrl = urlData.publicUrl
      }

      const noTiket = "DRT-" + Date.now()

      const lokasiFinal = koordinat
        ? `${formData.alamat} (Titik peta: ${koordinat.lat.toFixed(5)}, ${koordinat.lng.toFixed(5)})`
        : formData.alamat

      const { error: insertError } = await supabase.from("laporan_bencana").insert({
        no_tiket: noTiket,
        rt_rw_id: user.id,
        kategori_bencana_id: kategoriBencanaId,
        lokasi: lokasiFinal,
        jumlah_kk_terdampak: formData.jumlahKkTerdampak ? parseInt(formData.jumlahKkTerdampak) : 0,
        kebutuhan_mendesak: formData.deskripsi,
        foto_url: fotoUrl,
        status: "baru"
      })

      if (insertError) throw insertError

      alert(`Laporan bencana berhasil dikirim! Nomor tiket: ${noTiket}`)
      router.push("/rtrw/dashboard")
    } catch (err: any) {
      alert("Gagal mengirim: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans antialiased text-gray-950">
      
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="font-bold text-sm text-blue-950 tracking-wider uppercase">Sigap Bansos</span>
          </div>
          <button onClick={() => router.push("/rtrw/dashboard")} className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 bg-white shadow-sm">
            Batal
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
        
        <div className="lg:col-span-7 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Lapor Bencana</h1>
            <p className="text-xs text-gray-400 mt-1">Laporkan kejadian bencana alam yang terjadi di wilayah Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wide">Lokasi Kejadian</label>
              
              <MapPicker onPick={(lat, lng) => setKoordinat({ lat, lng })} />
              {koordinat && (
                <p className="text-[10px] text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Titik lokasi terpilih: {koordinat.lat.toFixed(5)}, {koordinat.lng.toFixed(5)}
                </p>
              )}

              <input
                type="text" name="alamat" value={formData.alamat} onChange={handleChange} required
                placeholder="Masukkan alamat lengkap atau patokan lokasi"
                className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
              />
              <p className="text-[10px] text-gray-400">Klik titik di peta di atas untuk menandai lokasi persis (opsional, tapi sangat membantu).</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wide">Jenis Bencana</label>
              <select 
                value={kategoriBencanaId} onChange={(e) => setKategoriBencanaId(e.target.value)} required
                className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%23475569%22%20stroke-width%3D%221.67%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.875rem_center] bg-no-repeat"
              >
                <option value="">Pilih jenis bencana</option>
                {kategoriBencanaList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama_kategori}</option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wide">Jumlah KK Terdampak</label>
              <input
                type="number" name="jumlahKkTerdampak" value={formData.jumlahKkTerdampak} onChange={handleChange}
                min="0"
                onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault() }}
                placeholder="Contoh: 5"
                className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
              />
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wide">Deskripsi & Kebutuhan Mendesak</label>
              <textarea
                name="deskripsi" rows={4} value={formData.deskripsi} onChange={handleChange} required
                placeholder="Ceritakan detail kejadian, kondisi terkini, dan kebutuhan mendesak di lokasi..."
                className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
              />
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2.5">
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wide">Tingkat Urgensi</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button" onClick={() => setUrgensi("Rendah")}
                  className={`py-2.5 rounded-xl font-medium text-xs border transition-all flex items-center justify-center gap-1 ${urgensi === "Rendah" ? "bg-slate-100 border-slate-300 text-slate-800 font-bold" : "bg-gray-50/50 border-gray-200 text-gray-500"}`}
                >
                  ❕ Rendah
                </button>
                <button
                  type="button" onClick={() => setUrgensi("Sedang")}
                  className={`py-2.5 rounded-xl font-medium text-xs border transition-all flex items-center justify-center gap-1 ${urgensi === "Sedang" ? "bg-blue-50 border-blue-200 text-blue-600 font-bold" : "bg-gray-50/50 border-gray-200 text-gray-500"}`}
                >
                  ⚠ Sedang
                </button>
                <button
                  type="button" onClick={() => setUrgensi("Tinggi")}
                  className={`py-2.5 rounded-xl font-medium text-xs border transition-all flex items-center justify-center gap-1 ${urgensi === "Tinggi" ? "bg-red-50 border-red-200 text-red-600 font-bold" : "bg-gray-50/50 border-gray-200 text-gray-500"}`}
                >
                  🚨 Tinggi
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wide">Lampiran Foto</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 bg-gray-50/20 rounded-xl p-6 text-center hover:bg-gray-50/50 cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Preview" className="h-24 rounded-lg object-cover" />
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-700">Ketuk untuk unggah bukti foto</span>
                    <span className="text-[10px] text-gray-400">Format: JPG, PNG (Maks 5MB)</span>
                  </>
                )}
              </div>
              {fotoFile && (
                <p className="text-[10px] text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Foto terunggah: {fotoFile.name}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit" disabled={loading}
                className="w-full bg-blue-950 hover:bg-blue-900 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                {loading ? "Mengirim Laporan..." : "Kirim Laporan"}
              </button>
              <p className="text-[10px] text-center text-gray-500 flex items-center justify-center gap-1">
                🔒 Data Anda dienkripsi dan dijamin kerahasiaannya.
              </p>
            </div>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-4 self-start lg:sticky lg:top-20">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">Informasi Pelaporan</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-light">
              Gunakan menu ini untuk melaporkan kejadian bencana alam yang membutuhkan penanganan segera di wilayah Anda.
            </p>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Respon cepat instansi terkait dalam waktu 1x24 jam.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Laporan langsung terintegrasi dengan dasbor pusat Dinsos.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <footer className="text-center py-6 border-t border-gray-200/60 text-[10px] text-gray-400">
        &copy; 2026 SIGAP BANSOS. Melayani dengan Empati dan Transparansi.
      </footer>
    </main>
  )
}