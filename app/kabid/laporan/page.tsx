"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, XCircle, Clock, Download } from "lucide-react"

export default function LaporanKabidPage() {
  const [loading, setLoading] = useState(true)
  const [semuaData, setSemuaData] = useState<any[]>([])
  const [stats, setStats] = useState({ disetujui: 0, ditolak: 0, menunggu: 0 })

  useEffect(() => {
    async function loadData() {
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
        disetujui: semua.filter((d) => d.status === "disetujui" || d.status === "selesai").length,
        ditolak: semua.filter((d) => d.status === "ditolak").length,
        menunggu: semua.filter((d) => d.status === "diverifikasi").length,
      })
      setLoading(false)
    }
    loadData()
  }, [])

  function exportSemua() {
    const rows = semuaData.map((item) => ({
      Jenis: item.jenis,
      "Nama/Judul": item.judul,
      "No. Tiket": item.no_tiket,
      Status: item.status,
      Tanggal: new Date(item.created_at).toLocaleDateString("id-ID"),
    }))

    const header = Object.keys(rows[0] || {}).join(",")
    const body = rows.map((row) => Object.values(row).map((v) => `"${v}"`).join(",")).join("\n")
    const csv = `${header}\n${body}`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `laporan-kabid-${Date.now()}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">Memuat laporan pertanggungjawaban...</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-gray-50/30 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
            Dokumentasi & Arsip Resmi
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Laporan Pertanggungjawaban</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rekap keputusan yang sudah diambil untuk pelaporan resmi.</p>
        </div>
        <button
          onClick={exportSemua}
          className="inline-flex items-center gap-2 bg-[#1e1b4b] hover:bg-purple-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-sm transition-all duration-200 hover:scale-105 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Rekap (CSV)</span>
        </button>
      </div>

      {/* Kartu Statistik - Diselaraskan tema ungu */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Disetujui</span>
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600 tracking-tight">{stats.disetujui}</p>
          <div className="mt-3 inline-block px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
            Tervalidasi & Selesai
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ditolak</span>
            <XCircle className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600 tracking-tight">{stats.ditolak}</p>
          <div className="mt-3 inline-block px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
            Tidak memenuhi syarat
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Masih Menunggu</span>
            <Clock className="w-5 h-5 text-purple-600 animate-pulse" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600 tracking-tight">{stats.menunggu}</p>
          <div className="mt-3 inline-block px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
            Menunggu review lanjutan
          </div>
        </div>

      </div>

      {/* Tabel Data */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Arsip Data Masuk (20 Teratas)</span>
          <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg">Total Tercatat: {semuaData.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Jenis</th>
                <th className="px-6 py-3.5">Nama/Judul</th>
                <th className="px-6 py-3.5">No. Tiket</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {semuaData.slice(0, 20).map((item) => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-6 py-4 text-xs">
                    <span className="inline-flex px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md font-medium">
                      {item.jenis}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{item.judul}</td>
                  <td className="px-6 py-4 font-mono text-xs text-purple-600 font-medium">{item.no_tiket}</td>
                  <td className="px-6 py-4 text-xs">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}