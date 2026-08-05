"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

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
        return "bg-blue-50 text-blue-700 border border-blue-200"
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
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Dashboard Verifikasi</h1>
          <p className="text-xs text-gray-500 mt-1">Selamat datang kembali, berikut ringkasan data bantuan sosial dan laporan darurat hari ini.</p>
        </div>
        <button 
          onClick={() => alert("Fitur ekspor data laporan ke Excel/PDF aktif.")}
          className="bg-blue-950 hover:bg-blue-900 text-white font-medium text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Ekspor Data
        </button>
      </div>

      {/* 4 Kotak Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Masuk</p>
            <h3 className="text-3xl font-extrabold text-blue-950">{totalLaporan}</h3>
            <p className="text-[11px] text-emerald-600 font-medium pt-1">↑ Real-time dari sistem</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Perlu Verifikasi</p>
            <h3 className="text-3xl font-extrabold text-amber-600">{menungguVerifikasi}</h3>
            <p className="text-[11px] text-amber-600 font-medium pt-1">! Menunggu tindakan</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Selesai / Diterima</p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{terverifikasi}</h3>
            <p className="text-[11px] text-emerald-600 font-medium pt-1">✓ Berhasil diproses</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ditolak</p>
            <h3 className="text-3xl font-extrabold text-rose-600">{ditolak}</h3>
            <p className="text-[11px] text-rose-600 font-medium pt-1">✕ Tidak memenuhi syarat</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
        </div>
      </div>

      {/* Tabel Antrean Verifikasi (Data dari Supabase) */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-gray-900">Daftar Antrean Verifikasi Terbaru</h3>
            <p className="text-xs text-gray-400 mt-0.5">Menampilkan pengajuan usulan bansos dan darurat warga secara langsung.</p>
          </div>
          <button 
            onClick={() => router.push("/admin/verifikasi")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
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
                  <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                    Belum ada data usulan atau laporan masuk dari database.
                  </td>
                </tr>
              ) : (
                semuaData.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 uppercase">
                          {item.judul.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{item.judul}</p>
                          <p className="text-[11px] text-gray-400">{item.keterangan}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium uppercase text-[11px] text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded-md">{item.jenis}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-blue-600 font-bold">{item.no_tiket}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => router.push(`/cek-status?tiket=${item.no_tiket}`)}
                        className="font-semibold text-blue-600 hover:underline"
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
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-6">
          <h3 className="font-bold text-sm text-gray-900">Statistik Pengajuan Bulanan</h3>
          <div className="h-48 flex items-end justify-between gap-4 pt-4 px-2">
            {[
              { bulan: "Juni", tinggi: "h-24" },
              { bulan: "Juli", tinggi: "h-32" },
              { bulan: "Agustus", tinggi: "h-40", aktif: true },
              { bulan: "September", tinggi: "h-28" },
              { bulan: "Oktober", tinggi: "h-36" },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className={`w-full max-w-[48px] rounded-t-xl transition-all ${bar.tinggi} ${bar.aktif ? 'bg-blue-600' : 'bg-gray-100'}`} />
                <span className="text-[11px] text-gray-400 font-medium">{bar.bulan}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-gray-900">Aktivitas Terkini</h3>
            <div className="space-y-4 text-xs">
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900">Sistem berhasil menyinkronkan data <b>Supabase</b></p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Baru saja</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900">Antrean verifikasi baru masuk dari wilayah RT/RW</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Hari ini</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="text-gray-900">Mini-DTKS diperbarui secara otomatis</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">1 jam yang lalu</p>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => alert("Log aktivitas lengkap.")}
            className="w-full py-2.5 border border-gray-200 rounded-xl font-medium text-xs text-gray-700 hover:bg-gray-50 transition-all"
          >
            Lihat Semua Log
          </button>
        </div>
      </div>

    </div>
  )
}