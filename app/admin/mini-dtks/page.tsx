"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Penerima = {
  id: string
  nik: string
  nama: string
  alamat: string
  kelurahan: string | null
  kecamatan: string | null
  status_verifikasi: string
  verified_at: string
  kategori_bantuan: { nama_kategori: string } | null
}

export default function MiniDtksPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Penerima[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: result } = await supabase
      .from("penerima_bansos")
      .select("id, nik, nama, alamat, kelurahan, kecamatan, status_verifikasi, verified_at, kategori_bantuan(nama_kategori)")
      .order("verified_at", { ascending: false })

    setData((result as any) || [])
    setLoading(false)
  }

  const filtered = data.filter((item) =>
    item.nama.toLowerCase().includes(search.toLowerCase()) || item.nik.includes(search)
  )

  function exportExcel() {
    if (filtered.length === 0) {
      alert("Tidak ada data untuk diekspor.")
      return
    }

    const rows = filtered.map((item) => ({
      NIK: item.nik,
      Nama: item.nama,
      Alamat: item.alamat,
      "Kategori Bantuan": item.kategori_bantuan?.nama_kategori || "-",
      "Status Verifikasi": item.status_verifikasi,
      "Tanggal Verifikasi": item.verified_at ? new Date(item.verified_at).toLocaleDateString("id-ID") : "-",
    }))

    const header = Object.keys(rows[0] || {}).join(",")
    const body = rows.map((row) => Object.values(row).map((v) => `"${v || ""}"`).join(",")).join("\n")
    const csv = `${header}\n${body}`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `mini-dtks-${Date.now()}.csv`
    link.click()
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500 font-medium">Memuat data basis data Mini-DTKS...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e1b4b] tracking-tight">Mini-DTKS</h1>
          <p className="text-xs text-gray-500 mt-1">Database terpadu daftar penerima bantuan sosial yang sudah tervalidasi dan terverifikasi.</p>
        </div>
        <div className="bg-white border border-gray-200/80 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 shadow-sm">
          Total Terverifikasi: <span className="text-purple-700 font-bold">{data.length}</span> Warga
        </div>
      </div>

      {/* Bar Pencarian & Tombol Ekspor */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama lengkap atau NIK warga..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-purple-600 transition-all"
          />
        </div>

        <button
          onClick={exportExcel}
          className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export Excel (CSV)
        </button>
      </div>

      {/* Tabel Data Mini-DTKS */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider bg-white">
                <th className="py-4 px-6">Nama Warga</th>
                <th className="py-4 px-6">NIK</th>
                <th className="py-4 px-6">Alamat</th>
                <th className="py-4 px-6">Kategori Bantuan</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Tgl Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                    Belum ada data penerima bansos terverifikasi di database Mini-DTKS.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 uppercase text-xs">
                          {item.nama ? item.nama.slice(0, 2) : "W"}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm capitalize">{item.nama}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-purple-700 font-medium">{item.nik}</td>
                    <td className="py-4 px-6 text-gray-500 max-w-[220px] truncate">{item.alamat || "-"}</td>
                    <td className="py-4 px-6 font-medium text-slate-700">
                      <span className="bg-purple-50 text-purple-700 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase">
                        {item.kategori_bantuan?.nama_kategori || "Bansos Umum"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {item.status_verifikasi || "Terverifikasi"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-gray-500 font-medium">
                      {item.verified_at ? new Date(item.verified_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
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