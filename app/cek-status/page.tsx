"use client"
import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Usulan = {
  id: string
  no_tiket: string
  status: string
  created_at: string
  kategori_bantuan?: { nama_kategori: string } | null
  [key: string]: any
}

// Lima tahap yang tampil di timeline
const LANGKAH = [
  { key: "diterima", judul: "Diterima", deskripsi: "Usulan dari RT/RW telah diterima oleh sistem dan menunggu pemeriksaan berkas oleh petugas." },
  { key: "verifikasi", judul: "Verifikasi Berkas", deskripsi: "Petugas memeriksa kelengkapan berkas (KK, SKTM, formulir assessment) dan foto kondisi rumah." },
  { key: "kabid", judul: "Menunggu Persetujuan Kabid", deskripsi: "Usulan sudah direkomendasikan petugas dan menunggu keputusan akhir dari Kepala Bidang." },
  { key: "disetujui", judul: "Disetujui", deskripsi: "Kepala Bidang menyetujui usulan. Data masuk ke daftar usulan kepesertaan BPJS PBI." },
  { key: "selesai", judul: "Selesai", deskripsi: "Usulan diteruskan ke pihak BPJS dan proses pengajuan dinyatakan selesai." },
]

// Berapa tahap yang sudah SELESAI untuk tiap status di database
// (kalau nama status di aplikasimu beda, tambahkan di sini)
function jumlahSelesai(status?: string) {
  const s = (status || "").toLowerCase().replace(/[\s_-]+/g, " ").trim()
  switch (s) {
    case "selesai":
    case "aktif":
      return 5
    case "disetujui":
      return 4
    case "diverifikasi":
    case "direkomendasikan":
    case "menunggu kabid":
    case "menunggu approval kabid":
    case "menunggu persetujuan kabid":
      return 2
    default:
      return 1 // baru / diproses / proses verifikasi / lainnya
  }
}

const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })

const formatJam = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

function CekStatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tiketParam = searchParams.get("tiket") || ""

  const [nomorTiket, setNomorTiket] = useState(tiketParam)
  const [data, setData] = useState<Usulan | null>(null)
  const [loading, setLoading] = useState(false)
  const [dicari, setDicari] = useState(false)
  const [error, setError] = useState("")

  // Ambil data usulan dari Supabase berdasarkan nomor tiket
  async function cariTiket(tiket: string) {
    const kode = tiket.trim()
    if (!kode) return

    setLoading(true)
    setError("")
    setDicari(true)

    const { data: row, error: err } = await supabase
      .from("usulan_bansos")
      .select("*, kategori_bantuan(nama_kategori)")
      .eq("no_tiket", kode)
      .maybeSingle()

    if (err) {
      setError("Gagal mengambil data: " + err.message)
      setData(null)
    } else {
      setData(row as Usulan | null)
    }
    setLoading(false)
  }

  // Kalau dibuka dari link ?tiket=..., langsung cari
  useEffect(() => {
    if (tiketParam) {
      setNomorTiket(tiketParam)
      cariTiket(tiketParam)
    }
  }, [tiketParam])

  // Realtime: kalau petugas mengubah status, tampilan ikut berubah tanpa refresh
  useEffect(() => {
    if (!data?.id) return
    const channel = supabase
      .channel(`usulan-${data.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "usulan_bansos", filter: `id=eq.${data.id}` },
        (payload) => setData((prev) => (prev ? { ...prev, ...(payload.new as any) } : prev))
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [data?.id])

  const handleCari = (e: React.FormEvent) => {
    e.preventDefault()
    cariTiket(nomorTiket)
  }

  const statusLower = (data?.status || "").toLowerCase()
  const ditolak = statusLower === "ditolak"
  const selesaiSampai = jumlahSelesai(data?.status)
  const alasanTolak: string =
    data?.alasan_penolakan || data?.catatan_penolakan || data?.catatan_petugas || ""

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-16 font-sans antialiased text-gray-900">
      
      {/* Navbar Atas */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="font-bold text-sm text-blue-950 tracking-wider uppercase">Sigap Bansos</span>
          </div>
          <button 
            onClick={() => router.back()} 
            className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 px-3.5 py-1.5 rounded-xl bg-white shadow-sm transition-all"
          >
            Kembali
          </button>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Form Input Pencarian Nomor Tiket */}
        <form onSubmit={handleCari} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-2.5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={nomorTiket}
              onChange={(e) => setNomorTiket(e.target.value)}
              placeholder="Masukkan Nomor Tiket (cth: PGD-178...)"
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-3 text-xs focus:outline-none focus:border-blue-950 focus:bg-white transition-all font-mono"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-950 hover:bg-blue-900 disabled:bg-gray-400 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-sm shrink-0"
          >
            {loading ? "Mencari..." : "Cari"}
          </button>
        </form>

        {/* Pesan error / tidak ditemukan */}
        {dicari && !loading && error && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs text-rose-700">{error}</div>
        )}

        {dicari && !loading && !error && !data && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
            <p className="text-sm font-bold text-gray-900">Nomor tiket tidak ditemukan</p>
            <p className="text-xs text-gray-400 mt-1">Periksa kembali nomor tiket Anda, pastikan tidak ada spasi atau huruf yang salah.</p>
          </div>
        )}

        {data && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Kartu Informasi Penerima */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nomor Tiket</span>
                <span className="text-lg font-mono font-bold text-blue-950">{data.no_tiket}</span>
              </div>

              <div className="space-y-3 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Informasi Penerima</h3>
                <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Jenis Bantuan</span>
                  <span className="font-semibold text-gray-900">
                    BPJS PBI{data.kategori_bantuan?.nama_kategori ? ` (${data.kategori_bantuan.nama_kategori})` : ""}
                  </span>
                </div>
                {data.jenis_kepesertaan && (
                  <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Jenis Kepesertaan</span>
                    <span className="font-semibold text-gray-900">{data.jenis_kepesertaan}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs pb-1">
                  <span className="text-gray-500">Tanggal Pengajuan</span>
                  <span className="font-semibold text-gray-900">{formatTanggal(data.created_at)}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic pt-2 border-t border-gray-100">
                Pastikan Anda selalu memantau status pengajuan secara berkala melalui platform resmi SIGAP BANSOS.
              </p>
            </div>

            {/* Status Pengajuan */}
            {ditolak ? (
              <div className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500">Status Pengajuan</h3>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 text-xs font-bold">✕</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-900">Ditolak / Perlu Revisi</h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {formatTanggal(data.updated_at || data.created_at)}, {formatJam(data.updated_at || data.created_at)}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed pt-0.5">
                      {alasanTolak || "Pengajuan belum dapat diproses. Silakan hubungi RT/RW atau petugas untuk melengkapi berkas."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Status Pengajuan</h3>

                <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-100">
                  {LANGKAH.map((langkah, idx) => {
                    const no = idx + 1
                    const selesai = no <= selesaiSampai
                    const aktif = no === selesaiSampai + 1 && selesaiSampai < 5
                    const menunggu = !selesai && !aktif

                    return (
                      <div key={langkah.key} className={`flex gap-4 relative ${menunggu ? "opacity-60" : ""}`}>
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 text-xs font-bold ${
                            selesai
                              ? "bg-blue-950 text-white shadow-sm"
                              : aktif
                              ? "bg-blue-950 text-white ring-4 ring-blue-50 shadow-md"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {selesai ? "✓" : no}
                        </div>

                        <div className="space-y-1 flex-1">
                          <h4 className={`text-xs font-bold ${aktif ? "text-blue-950" : "text-gray-900"}`}>{langkah.judul}</h4>
                          <p className={`text-[11px] font-medium ${aktif ? "text-blue-600 font-bold" : "text-gray-400"}`}>
                            {no === 1
                              ? `${formatTanggal(data.created_at)}, ${formatJam(data.created_at)}`
                              : selesai
                              ? "Selesai"
                              : aktif
                              ? "Sedang diproses"
                              : "Menunggu Proses"}
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed pt-0.5">{langkah.deskripsi}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Kotak Bantuan / CS */}
            <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h4 className="text-sm font-bold tracking-wide">Butuh bantuan lebih lanjut?</h4>
              <p className="text-xs text-blue-100/80 leading-relaxed">
                Hubungi pusat layanan informasi kami jika terdapat kendala pada proses tracking.
              </p>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 bg-white hover:bg-gray-100 text-blue-950 text-xs font-bold py-3 rounded-xl transition-all shadow-sm">
                  Hubungi CS
                </button>
                <button className="flex-1 bg-blue-900/60 hover:bg-blue-900 border border-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all">
                  FAQ
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  )
}

// useSearchParams harus dibungkus Suspense supaya aman saat build produksi
export default function CekStatusPage() {
  return (
    <Suspense fallback={null}>
      <CekStatusContent />
    </Suspense>
  )
}