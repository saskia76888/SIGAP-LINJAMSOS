"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LaporanPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalBansos: 0,
    totalOdgj: 0,
    totalBencana: 0,
    totalDisetujui: 0,
    totalDitolak: 0,
  })
  const [semuaData, setSemuaData] = useState<any[]>([])
  const [filterJenis, setFilterJenis] = useState("semua")
  const [filterStatus, setFilterStatus] = useState("semua")
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Deteksi apakah mode malam sedang aktif dari localStorage
    const theme = localStorage.getItem("admin_theme")
    if (theme === "dark") setIsDark(true)

    async function loadStats() {
      const [bansosRes, odgjRes, bencanaRes] = await Promise.all([
        supabase.from("usulan_bansos").select("id, no_tiket, nama_warga, status, created_at"),
        supabase.from("laporan_odgj").select("id, no_tiket, nama_terlapor, status, created_at"),
        supabase.from("laporan_bencana").select("id, no_tiket, lokasi, status, created_at"),
      ])

      const bansos = bansosRes.data || []
      const odgj = odgjRes.data || []
      const bencana = bencanaRes.data || []

      const semua = [
        ...bansos.map((d: any) => ({ ...d, jenis: "Bansos", judul: d.nama_warga })),
        ...odgj.map((d: any) => ({ ...d, jenis: "Darurat Sosial", judul: d.nama_terlapor || "Tanpa nama" })),
        ...bencana.map((d: any) => ({ ...d, jenis: "Bencana", judul: d.lokasi })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setSemuaData(semua)

      setStats({
        totalBansos: bansos.length,
        totalOdgj: odgj.length,
        totalBencana: bencana.length,
        totalDisetujui: semua.filter((d) => d.status === "disetujui" || d.status === "selesai").length,
        totalDitolak: semua.filter((d) => d.status === "ditolak").length,
      })

      setLoading(false)
    }
    loadStats()
  }, [])

  function exportSemua() {
    if (semuaData.length === 0) {
      alert("Tidak ada data untuk diekspor.")
      return
    }

    const rows = filteredData.map((item) => ({
      Jenis: item.jenis,
      "Nama/Judul": item.judul,
      "No. Tiket": item.no_tiket,
      Status: item.status,
      Tanggal: new Date(item.created_at).toLocaleDateString("id-ID"),
    }))

    const header = Object.keys(rows[0] || {}).join(",")
    const body = rows.map((row) => Object.values(row).map((v) => `"${v || ""}"`).join(",")).join("\n")
    const csv = `${header}\n${body}`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `rekap-laporan-${Date.now()}.csv`
    link.click()
  }

  const handlePrint = () => {
    window.print()
  }

  const filteredData = semuaData.filter((item) => {
    const matchJenis = filterJenis === "semua" || item.jenis.toLowerCase() === filterJenis.toLowerCase()
    const matchStatus = filterStatus === "semua" || item.status?.toLowerCase() === filterStatus.toLowerCase()
    return matchJenis && matchStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "diproses":
      case "survey":
      case "baru":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20"
      case "diverifikasi":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20"
      case "selesai":
      case "disetujui":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      case "ditolak":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      default:
        return "bg-gray-500/10 text-gray-400 border border-gray-500/20"
    }
  }

  if (loading) {
    return <div className="p-8 text-sm opacity-60 font-medium">Memuat rekapitulasi laporan...</div>
  }

  // Styling dinamis agar kotak tidak ngeblok hitam pekat di mode malam, melainkan ada efek glow kaca (glassmorphism) dengan nuansa ungu
  const cardStyle = isDark 
    ? "bg-[#111c38]/70 backdrop-blur-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white" 
    : "bg-white border border-gray-200/80 shadow-sm text-gray-900"

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#1e1b4b]"}`}>Rekapitulasi Laporan</h1>
          <p className="text-xs opacity-60 mt-1">Ringkasan statistik, filter data, dan cetak rekapitulasi laporan sistem.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportSemua}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak PDF
          </button>
        </div>
      </div>

      {/* 5 Kotak Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 print:hidden">
        <div className={`${cardStyle} rounded-2xl p-5 space-y-1 transition-all`}>
          <p className="text-[11px] font-semibold opacity-50 uppercase tracking-wider">Usulan Bansos</p>
          <p className="text-2xl font-extrabold text-blue-400">{stats.totalBansos}</p>
        </div>
        <div className={`${cardStyle} rounded-2xl p-5 space-y-1 transition-all`}>
          <p className="text-[11px] font-semibold opacity-50 uppercase tracking-wider">Darurat Sosial</p>
          <p className="text-2xl font-extrabold text-teal-400">{stats.totalOdgj}</p>
        </div>
        <div className={`${cardStyle} rounded-2xl p-5 space-y-1 transition-all`}>
          <p className="text-[11px] font-semibold opacity-50 uppercase tracking-wider">Bencana</p>
          <p className="text-2xl font-extrabold text-rose-400">{stats.totalBencana}</p>
        </div>
        <div className={`${cardStyle} rounded-2xl p-5 space-y-1 transition-all`}>
          <p className="text-[11px] font-semibold opacity-50 uppercase tracking-wider">Disetujui</p>
          <p className="text-2xl font-extrabold text-emerald-400">{stats.totalDisetujui}</p>
        </div>
        <div className={`${cardStyle} rounded-2xl p-5 space-y-1 transition-all`}>
          <p className="text-[11px] font-semibold opacity-50 uppercase tracking-wider">Ditolak</p>
          <p className="text-2xl font-extrabold opacity-60">{stats.totalDitolak}</p>
        </div>
      </div>

      {/* Filter Laporan */}
      <div className={`${cardStyle} rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between print:hidden transition-all`}>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] uppercase font-semibold opacity-50 mb-1">Filter Jenis</label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className={`text-xs rounded-xl px-3 py-2 outline-none border transition-all ${
                isDark ? "bg-[#1a2647] border-indigo-500/30 text-white focus:border-purple-500" : "bg-gray-50/80 border-gray-200 text-gray-900 focus:border-purple-600"
              }`}
            >
              <option value="semua">Semua Jenis</option>
              <option value="bansos">Bansos</option>
              <option value="darurat sosial">Darurat Sosial</option>
              <option value="bencana">Bencana</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold opacity-50 mb-1">Filter Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`text-xs rounded-xl px-3 py-2 outline-none border uppercase transition-all ${
                isDark ? "bg-[#1a2647] border-indigo-500/30 text-white focus:border-purple-500" : "bg-gray-50/80 border-gray-200 text-gray-900 focus:border-purple-600"
              }`}
            >
              <option value="semua">Semua Status</option>
              <option value="baru">Baru</option>
              <option value="diverifikasi">Diverifikasi</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>
        </div>

        <div className="text-xs opacity-60">
          Menampilkan <span className="font-bold">{filteredData.length}</span> dari {semuaData.length} laporan
        </div>
      </div>

      {/* Tabel Rekapitulasi */}
      <div className={`${cardStyle} rounded-2xl overflow-hidden transition-all`}>
        <div className="hidden print:block p-6 text-center border-b border-gray-300 text-black">
          <h2 className="text-xl font-bold uppercase tracking-wider">Laporan Rekapitulasi Layanan Sigap Bansos</h2>
          <p className="text-xs text-gray-600 mt-1">Dicetak tanggal: {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}</p>
        </div>

        <div className="p-6 border-b border-inherit flex items-center justify-between print:hidden">
          <h3 className="font-bold text-sm">Daftar Rekapitulasi Laporan</h3>
          <span className="text-xs opacity-50">Data sinkron database</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`opacity-60 font-bold uppercase tracking-wider border-b border-inherit print:bg-gray-100 print:text-black ${isDark ? "bg-[#16223f]" : "bg-white"}`}>
                <th className="py-4 px-6">Jenis Laporan</th>
                <th className="py-4 px-6">Nama / Judul</th>
                <th className="py-4 px-6">Nomor Tiket</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Tanggal Masuk</th>
              </tr>
            </thead>
            <tbody className="divide-y border-inherit">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 opacity-40 text-xs">
                    Tidak ada data rekapitulasi laporan yang cocok.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className={`transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-purple-50/30"}`}>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wide ${isDark ? "bg-white/10 text-indigo-300" : "bg-purple-50 text-purple-700 font-bold"}`}>
                        {item.jenis}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold">{item.judul}</td>
                    <td className="py-4 px-6 font-mono text-purple-600 dark:text-purple-400 font-bold">{item.no_tiket}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${getStatusBadge(item.status)}`}>
                        {item.status || "baru"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right opacity-60 font-medium">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}