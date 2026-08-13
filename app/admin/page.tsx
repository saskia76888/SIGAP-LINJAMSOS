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
  jenis: "bansos" | "odgj" | "bencana"
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [semuaData, setSemuaData] = useState<RiwayatItem[]>([])

  useEffect(() => {
    async function loadData() {
      const [bansosRes, odgjRes, bencanaRes] = await Promise.all([
        supabase
          .from("usulan_bansos")
          .select("id, no_tiket, nama_warga, status, created_at, kategori_bantuan(nama_kategori)"),
        supabase
          .from("laporan_odgj")
          .select("id, no_tiket, nama_terlapor, status, created_at, tingkat_urgensi"),
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

      const odgjItems: RiwayatItem[] = (odgjRes.data || []).map((item: any) => ({
        id: item.id,
        no_tiket: item.no_tiket,
        judul: item.nama_terlapor || "Warga Terlapor",
        keterangan: `Darurat Sosial · ${item.tingkat_urgensi || "Urgent"}`,
        status: item.status,
        created_at: item.created_at,
        jenis: "odgj",
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

      const gabungan = [...bansosItems, ...odgjItems, ...bencanaItems].sort(
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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "diproses":
      case "survey":
      case "baru":
        return "bg-purple-50 text-purple-700 border border-purple-200"
      case "diverifikasi":
        return "bg-amber-50 text-amber-800 border border-amber-200"
      case "selesai":
      case "disetujui":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200"
      case "ditolak":
        return "bg-rose-50 text-rose-800 border border-rose-200"
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200"
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500 font-medium">Memuat data dashboard verifikasi...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header & Tombol Ekspor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e1b4b] tracking-tight">Dashboard Verifikasi</h1>
          <p className="text-xs text-gray-500 mt-1">Selamat datang kembali, berikut ringkasan data bantuan sosial dan laporan darurat hari ini.</p>
        </div>
        <button 
          onClick={() => alert("Fitur ekspor data laporan ke Excel/PDF aktif.")}
          className="bg-[#1e1b4b] hover:bg-purple-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Ekspor Data
        </button>
      </div>

      {/* 4 Kotak Statistik (Gaya Semi-Solid & Berkarakter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-purple-900 to-[#1e1b4b] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-[11px] font-semibold text-purple-200 uppercase tracking-wider">Total Masuk</p>
          <h3 className="text-4xl font-extrabold tracking-tight mt-2">{totalLaporan}</h3>
          <div className="mt-4 flex items-center justify-between text-xs text-purple-200 border-t border-white/10 pt-3">
            <span>Real-time sistem</span>
            <FileText className="w-4 h-4 text-purple-300" />
          </div>
        </div>

        <div className="bg-white border-2 border-amber-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Perlu Verifikasi</p>
          <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight mt-2">{menungguVerifikasi}</h3>
          <div className="mt-4 flex items-center justify-between text-xs text-amber-700 border-t border-amber-50 pt-3 font-medium">
            <span>! Menunggu tindakan</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        <div className="bg-white border-2 border-emerald-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Selesai / Diterima</p>
          <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight mt-2">{terverifikasi}</h3>
          <div className="mt-4 flex items-center justify-between text-xs text-emerald-700 border-t border-emerald-50 pt-3 font-medium">
            <span>✓ Berhasil diproses</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white border-2 border-rose-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Ditolak</p>
          <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight mt-2">{ditolak}</h3>
          <div className="mt-4 flex items-center justify-between text-xs text-rose-700 border-t border-rose-50 pt-3 font-medium">
            <span>✕ Tidak memenuhi syarat</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Tabel Antrean Verifikasi (Data dari Supabase) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-[#1e1b4b]">Daftar Antrean Verifikasi Terbaru</h3>
            <p className="text-xs text-gray-400 mt-0.5">Menampilkan pengajuan usulan bansos dan darurat warga secara langsung.</p>
          </div>
          <button 
            onClick={() => router.push("/admin/verifikasi")}
            className="text-xs font-semibold text-purple-600 hover:text-purple-900 transition-colors inline-flex items-center gap-1"
          >
            Lihat Semua →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-100">
                <th className="py-3.5 px-6">Nama / Kategori</th>
                <th className="py-3.5 px-6">Jenis Laporan</th>
                <th className="py-3.5 px-6">Nomor Tiket</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Tanggal Masuk</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {semuaData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                    Belum ada data usulan atau laporan masuk dari database.
                  </td>
                </tr>
              ) : (
                semuaData.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 uppercase">
                          {item.judul.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{item.judul}</p>
                          <p className="text-[11px] text-gray-400">{item.keterangan}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium uppercase text-[11px] text-slate-600">
                      <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-semibold text-[10px]">{item.jenis}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-purple-600 font-bold">{item.no_tiket}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 font-medium">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => router.push(`/cek-status?tiket=${item.no_tiket}`)}
                        className="font-semibold text-purple-600 hover:text-purple-900 hover:underline"
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
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-6">
          <h3 className="font-bold text-sm text-[#1e1b4b]">Statistik Pengajuan Bulanan</h3>
          <div className="h-48 flex items-end justify-between gap-4 pt-4 px-2">
            {[
              { bulan: "Juni", tinggi: "h-24" },
              { bulan: "Juli", tinggi: "h-32" },
              { bulan: "Agustus", tinggi: "h-40", aktif: true },
              { bulan: "September", tinggi: "h-28" },
              { bulan: "Oktober", tinggi: "h-36" },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className={`w-full max-w-[48px] rounded-t-xl transition-all ${bar.tinggi} ${bar.aktif ? 'bg-purple-600' : 'bg-gray-100'}`} />
                <span className="text-[11px] text-gray-400 font-medium">{bar.bulan}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#1e1b4b]">Aktivitas Terkini</h3>
            <div className="space-y-4 text-xs">
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-purple-600 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900 font-medium">Sistem berhasil menyinkronkan data <b>Supabase</b></p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Baru saja</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900 font-medium">Antrean verifikasi baru masuk dari wilayah RT/RW</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Hari ini</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900 font-medium">Mini-DTKS diperbarui secara otomatis</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">1 jam yang lalu</p>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => alert("Log aktivitas lengkap.")}
            className="w-full py-2.5 border border-gray-200 rounded-xl font-semibold text-xs text-gray-700 hover:bg-gray-50 transition-all"
          >
            Lihat Semua Log
          </button>
        </div>
      </div>
    </div>
  )
}