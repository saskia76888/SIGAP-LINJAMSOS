"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { FileText, AlertTriangle, CheckCircle2, XCircle, Download } from "lucide-react"

type RiwayatItem = {
  id: string
  no_tiket: string
  judul: string
  keterangan: string
  status: string
  created_at: string
  jenis: "bansos" | "bencana"
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [semuaData, setSemuaData] = useState<RiwayatItem[]>([])

  useEffect(() => {
    async function loadData() {
      const [bansosRes, bencanaRes] = await Promise.all([
        supabase
          .from("usulan_bansos")
          .select("id, no_tiket, nama_warga, status, created_at, kategori_bantuan(nama_kategori)"),
        supabase
          .from("laporan_bencana")
          .select("id, no_tiket, lokasi, status, created_at, kategori_bencana(nama_kategori)"),
      ])

      const bansosItems: RiwayatItem[] = (bansosRes.data || []).map((item: any) => ({
        id: item.id,
        no_tiket: item.no_tiket,
        judul: item.nama_warga,
        keterangan: item.kategori_bantuan?.nama_kategori || "Bansos Sembako/PKH",
        status: item.status,
        created_at: item.created_at,
        jenis: "bansos",
      }))

      const bencanaItems: RiwayatItem[] = (bencanaRes.data || []).map((item: any) => ({
        id: item.id,
        no_tiket: item.no_tiket,
        judul: item.kategori_bencana?.nama_kategori || "Bencana Alam",
        keterangan: item.lokasi || "Lokasi Bencana",
        status: item.status,
        created_at: item.created_at,
        jenis: "bencana",
      }))

      const gabungan = [...bansosItems, ...bencanaItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setSemuaData(gabungan)
      setLoading(false)
    }
    loadData()
  }, [])

  const totalLaporan = semuaData.length
  const menungguVerifikasi = semuaData.filter((d) => d.status?.toLowerCase() === "baru" || d.status?.toLowerCase() === "perlu verifikasi" || !d.status).length
  const terverifikasi = semuaData.filter((d) => ["diverifikasi", "disetujui", "selesai"].includes(d.status?.toLowerCase())).length
  const ditolak = semuaData.filter((d) => d.status?.toLowerCase() === "ditolak").length

  // Statistik pengajuan bulanan dihitung langsung dari data asli (semuaData),
  // menampilkan 5 bulan terakhir sampai bulan berjalan
  const statistikBulanan = (() => {
    const now = new Date()
    const bulanList = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1)
      return { label: d.toLocaleDateString("id-ID", { month: "long" }), bulan: d.getMonth(), tahun: d.getFullYear() }
    })

    const jumlahPerBulan = bulanList.map((b) =>
      semuaData.filter((item) => {
        const tgl = new Date(item.created_at)
        return tgl.getMonth() === b.bulan && tgl.getFullYear() === b.tahun
      }).length
    )

    const maxJumlah = Math.max(...jumlahPerBulan, 1)

    return bulanList.map((b, i) => ({
      label: b.label,
      jumlah: jumlahPerBulan[i],
      persen: jumlahPerBulan[i] > 0 ? Math.max((jumlahPerBulan[i] / maxJumlah) * 100, 15) : 4,
      aktif: i === bulanList.length - 1,
    }))
  })()

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "diproses":
      case "survey":
      case "baru":
        return "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30"
      case "diverifikasi":
        return "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
      case "selesai":
      case "disetujui":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
      case "ditolak":
        return "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600"
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500 dark:text-gray-400 font-medium">Memuat data dashboard verifikasi...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header & Tombol Ekspor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e1b4b] dark:text-white tracking-tight">Dashboard Verifikasi</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selamat datang kembali, berikut ringkasan data bantuan sosial dan laporan darurat hari ini.</p>
        </div>
        <button 
          onClick={() => alert("Fitur ekspor data laporan ke Excel/PDF aktif.")}
          className="bg-[#1e1b4b] hover:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Ekspor Data
        </button>
      </div>

      {/* 4 Kotak Statistik (Gaya Semi-Solid & Berkarakter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-purple-900 to-[#1e1b4b] dark:from-purple-800 dark:to-[#14122c] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-[11px] font-semibold text-purple-200 uppercase tracking-wider">Total Masuk</p>
          <h3 className="text-4xl font-extrabold tracking-tight mt-2">{totalLaporan}</h3>
          <div className="mt-4 flex items-center justify-between text-xs text-purple-200 border-t border-white/10 pt-3">
            <span>Real-time sistem</span>
            <FileText className="w-4 h-4 text-purple-300" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#151321] border-2 border-amber-100 dark:border-amber-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Perlu Verifikasi</p>
          <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-2">{menungguVerifikasi}</h3>
          <div className="mt-4 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 border-t border-amber-50 dark:border-amber-500/10 pt-3 font-medium">
            <span>! Menunggu tindakan</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#151321] border-2 border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Selesai / Diterima</p>
          <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-2">{terverifikasi}</h3>
          <div className="mt-4 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 border-t border-emerald-50 dark:border-emerald-500/10 pt-3 font-medium">
            <span>✓ Berhasil diproses</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#151321] border-2 border-rose-100 dark:border-rose-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Ditolak</p>
          <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-2">{ditolak}</h3>
          <div className="mt-4 flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 border-t border-rose-50 dark:border-rose-500/10 pt-3 font-medium">
            <span>✕ Tidak memenuhi syarat</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Tabel Antrean Verifikasi (Data dari Supabase) */}
      <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-[#1e1b4b] dark:text-white">Daftar Antrean Verifikasi Terbaru</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Menampilkan pengajuan usulan bansos dan darurat warga secara langsung.</p>
          </div>
          <button 
            onClick={() => router.push("/admin/verifikasi")}
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 transition-colors inline-flex items-center gap-1"
          >
            Lihat Semua →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/60">
                <th className="py-3.5 px-6">Nama / Kategori</th>
                <th className="py-3.5 px-6">Jenis Laporan</th>
                <th className="py-3.5 px-6">Nomor Tiket</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Tanggal Masuk</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-300">
              {semuaData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-gray-500 text-xs">
                    Belum ada data usulan atau laporan masuk dari database.
                  </td>
                </tr>
              ) : (
                semuaData.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-500/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0 uppercase">
                          {item.judul.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{item.judul}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">{item.keterangan}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium uppercase text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-md font-semibold text-[10px]">{item.jenis}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-purple-600 dark:text-purple-400 font-bold">{item.no_tiket}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 font-medium">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => router.push(`/cek-status?tiket=${item.no_tiket}`)}
                        className="font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 hover:underline"
                      >
                        Proses
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bagian Bawah: Statistik Bulanan & Aktivitas Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-6">
          <h3 className="font-bold text-sm text-[#1e1b4b] dark:text-white">Statistik Pengajuan Bulanan</h3>
          <div className="h-48 flex items-end justify-between gap-4 pt-4 px-2">
            {statistikBulanan.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className={`w-full max-w-[48px] rounded-t-xl transition-all ${bar.aktif ? 'bg-purple-600' : 'bg-gray-100 dark:bg-white/10'}`}
                  style={{ height: `${bar.persen}%` }}
                  title={`${bar.jumlah} laporan masuk`}
                />
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#1e1b4b] dark:text-white">Aktivitas Terkini</h3>
            <div className="space-y-4 text-xs">
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-purple-600 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">Sistem berhasil menyinkronkan data <b>Supabase</b></p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Baru saja</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">Antrean verifikasi baru masuk dari wilayah RT/RW</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Hari ini</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">Mini-DTKS diperbarui secara otomatis</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">1 jam yang lalu</p>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => alert("Log aktivitas lengkap.")}
            className="w-full py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
          >
            Lihat Semua Log
          </button>
        </div>
      </div>
    </div>
  )
}