"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type NotifItem = {
  id: string
  tujuan_no_hp: string
  pesan: string
  jenis: string
  status_kirim: string
  created_at: string
}

export default function NotifikasiPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<NotifItem[]>([])

  useEffect(() => {
    async function loadData() {
      const { data: result } = await supabase
        .from("notifikasi_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      setData(result || [])
      setLoading(false)
    }
    loadData()
  }, [])

  const terkirim = data.filter((d) => d.status_kirim === "terkirim").length
  const gagal = data.filter((d) => d.status_kirim === "gagal").length

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400 animate-pulse">Memuat log notifikasi...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen pb-20 font-sans text-slate-100">
      
      {/* Header Halaman */}
      <div className="bg-[#121629] p-6 rounded-2xl border border-purple-950/40 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Monitor Notifikasi WhatsApp</h1>
          <p className="text-xs text-slate-400 mt-1">Riwayat pengiriman dan status log notifikasi pesan otomatis secara real-time.</p>
        </div>
        <div className="bg-purple-950/60 border border-purple-800/40 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-300 flex items-center gap-2 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
          Gateway Aktif
        </div>
      </div>

      {/* Kartu Statistik / Ringkasan (Terkirim & Gagal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        
        {/* Card Terkirim */}
        <div className="bg-[#121629] p-5 rounded-2xl border border-purple-950/40 shadow-lg relative overflow-hidden group hover:border-purple-800/60 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all -mr-6 -mt-6"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pesan Terkirim</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-2">{terkirim}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
            Berhasil diterima warga
          </div>
        </div>

        {/* Card Gagal */}
        <div className="bg-[#121629] p-5 rounded-2xl border border-purple-950/40 shadow-lg relative overflow-hidden group hover:border-purple-800/60 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all -mr-6 -mt-6"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pengiriman Gagal</p>
              <h3 className="text-3xl font-black text-rose-400 mt-2">{gagal}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg w-fit">
            Perlu pengecekan nomor
          </div>
        </div>

      </div>

      {/* Tabel Log Notifikasi */}
      <div className="bg-[#121629] border border-purple-950/40 rounded-2xl shadow-lg overflow-hidden transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/40 border-b border-purple-950/40 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Waktu Kirim</th>
                <th className="px-6 py-4">Nomor Tujuan</th>
                <th className="px-6 py-4">Isi Pesan</th>
                <th className="px-6 py-4">Status Pengiriman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-950/30 font-normal">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-500 text-xs italic">
                    Belum ada notifikasi WhatsApp yang tercatat di sistem.
                  </td>
                </tr>
              ) : (
                data.map((n) => (
                  <tr key={n.id} className="hover:bg-purple-950/10 transition-colors group">
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>{new Date(n.created_at).toLocaleString("id-ID")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-white">
                      {n.tujuan_no_hp}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 max-w-sm truncate font-medium">
                      {n.pesan}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                        n.status_kirim === "terkirim" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${n.status_kirim === "terkirim" ? "bg-emerald-400" : "bg-rose-400"}`}></span>
                        {n.status_kirim}
                      </span>
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