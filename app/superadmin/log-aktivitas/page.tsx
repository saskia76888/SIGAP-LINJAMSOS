"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type LogItem = {
  id: string
  ref_tabel: string
  status: string
  catatan: string | null
  created_at: string
  changed_by: string
  users: { nama: string; role: string } | null
}

export default function LogAktivitasPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<LogItem[]>([])

  useEffect(() => {
    async function loadData() {
      const { data: result } = await supabase
        .from("riwayat_status")
        .select("*, users:changed_by(nama, role)")
        .order("created_at", { ascending: false })
        .limit(100)

      setData((result as any) || [])
      setLoading(false)
    }
    loadData()
  }, [])

  const getTableLabel = (table: string) => {
    if (table === "usulan_bansos") return "Usulan Bansos"
    if (table === "laporan_odgj") return "Darurat Sosial"
    if (table === "laporan_bencana") return "Bencana"
    return table
  }

  const roleLabel = (role: string) => {
    if (role === "rt_rw") return "RT/RW"
    if (role === "petugas") return "Petugas"
    if (role === "kabid") return "Kepala Bidang"
    if (role === "superadmin") return "Superadmin"
    return role
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400 animate-pulse">Memuat log aktivitas sistem...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen pb-20 font-sans text-slate-100">
      
      {/* Header Halaman */}
      <div className="bg-[#121629] p-6 rounded-2xl border border-purple-950/40 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Log Aktivitas Sistem</h1>
          <p className="text-xs text-slate-400 mt-1">Riwayat perubahan status dan verifikasi oleh petugas serta kepala bidang.</p>
        </div>
        <div className="bg-purple-950/60 border border-purple-800/40 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-300 flex items-center gap-2 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
          {data.length} Aktivitas Tercatat
        </div>
      </div>

      {/* Tabel Log Aktivitas */}
      <div className="bg-[#121629] border border-purple-950/40 rounded-2xl shadow-lg overflow-hidden transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/40 border-b border-purple-950/40 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Waktu Aktivitas</th>
                <th className="px-6 py-4">Pengguna (User)</th>
                <th className="px-6 py-4">Aksi & Perubahan</th>
                <th className="px-6 py-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-950/30 font-normal">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-500 text-xs italic">
                    Belum ada aktivitas tercatat di dalam sistem.
                  </td>
                </tr>
              ) : (
                data.map((log) => (
                  <tr key={log.id} className="hover:bg-purple-950/10 transition-colors group">
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>{new Date(log.created_at).toLocaleString("id-ID")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-xs">{log.users?.nama || "-"}</div>
                      <div className="mt-1">
                        <span className="text-[10px] font-bold bg-purple-950/60 text-purple-300 px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-purple-800/40">
                          {roleLabel(log.users?.role || "-")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 leading-relaxed">
                      Mengubah status <span className="font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded border border-purple-950/60">{getTableLabel(log.ref_tabel)}</span> menjadi <span className="font-extrabold text-purple-300 bg-purple-950/60 px-2.5 py-0.5 rounded-lg border border-purple-800/40 ml-1">{log.status}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 italic">
                      {log.catatan ? `"${log.catatan}"` : "-"}
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