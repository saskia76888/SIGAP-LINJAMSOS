"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

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
    return <div className="p-8 text-sm text-gray-500">Memuat laporan...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-indigo-950">Laporan Pertanggungjawaban</h1>
        <p className="text-sm text-gray-500 mt-1">Rekap keputusan yang sudah diambil untuk pelaporan resmi.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Disetujui</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.disetujui}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Ditolak</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.ditolak}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Masih Menunggu</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.menunggu}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={exportSemua}
          className="bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
        >
          Export Rekap (CSV)
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Jenis</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Nama/Judul</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">No. Tiket</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {semuaData.slice(0, 20).map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{item.jenis}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.judul}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.no_tiket}</td>
                <td className="px-4 py-3 text-xs text-gray-700">{item.status}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}