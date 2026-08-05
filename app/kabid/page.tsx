"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  AlertTriangle, 
  ArrowUpRight,
  ShieldAlert,
  Users,
  Activity,
  Sparkles
} from "lucide-react"

type Item = {
  id: string
  status: string
  created_at: string
  jenis: "bansos" | "odgj" | "bencana"
}

export default function KabidDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Item[]>([])

  useEffect(() => {
    async function loadData() {
      const [bansosRes, odgjRes, bencanaRes] = await Promise.all([
        supabase.from("usulan_bansos").select("id, status, created_at"),
        supabase.from("laporan_odgj").select("id, status, created_at"),
        supabase.from("laporan_bencana").select("id, status, created_at"),
      ])

      const gabungan: Item[] = [
        ...(bansosRes.data || []).map((d: any) => ({ ...d, jenis: "bansos" as const })),
        ...(odgjRes.data || []).map((d: any) => ({ ...d, jenis: "odgj" as const })),
        ...(bencanaRes.data || []).map((d: any) => ({ ...d, jenis: "bencana" as const })),
      ]

      setData(gabungan)
      setLoading(false)
    }
    loadData()
  }, [])

  const totalLaporan = data.length
  const menungguApproval = data.filter((d) => d.status === "diverifikasi").length
  const disetujui = data.filter((d) => d.status === "disetujui" || d.status === "selesai").length
  const ditolak = data.filter((d) => d.status === "ditolak").length

  const now = new Date()
  const bulanIni = data.filter((d) => {
    const tgl = new Date(d.created_at)
    return tgl.getMonth() === now.getMonth() && tgl.getFullYear() === now.getFullYear()
  }).length

  const perJenis = {
    bansos: data.filter((d) => d.jenis === "bansos").length,
    odgj: data.filter((d) => d.jenis === "odgj").length,
    bencana: data.filter((d) => d.jenis === "bencana").length,
  }

  // Tambahan statistik persentase penyelesaian & rasio
  const tingkatPenyelesaian = totalLaporan > 0 ? Math.round((disetujui / totalLaporan) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">Memuat data dashboard strategis...</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-gradient-to-br from-slate-50/50 via-indigo-50/20 to-white min-h-screen">
      
      {/* Header dengan Banner Selamat Datang / Aksen Modern */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-indigo-100/60 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-50 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Portal Eksekutif Kepala Bidang
          </div>
          <h1 className="text-2xl font-extrabold text-indigo-950 tracking-tight">Dashboard Kepala Bidang</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan strategis seluruh laporan dan usulan yang masuk ke sistem secara real-time.</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 bg-slate-50 p-3 rounded-xl border border-gray-100">
          <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Indeks Kinerja</p>
            <p className="text-sm font-bold text-indigo-950">{tingkatPenyelesaian}% Terselesaikan</p>
          </div>
        </div>
      </div>

      {/* Grid Kartu Statistik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Laporan */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-indigo-500"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Laporan</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{totalLaporan}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{bulanIni} laporan masuk bulan ini</span>
          </div>
        </div>

        {/* Menunggu Approval */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-amber-500"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Menunggu Approval</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{menungguApproval}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">Sudah diverifikasi petugas</p>
        </div>

        {/* Disetujui */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Disetujui / Selesai</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{disetujui}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">Telah disetujui / diproses tuntas</p>
        </div>

        {/* Ditolak */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-rose-500"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ditolak</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600 tracking-tight">{ditolak}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">Tidak memenuhi syarat validasi</p>
        </div>

      </div>

      {/* Bagian Statistik Tambahan & Distribusi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Distribusi Berdasarkan Jenis Laporan (2 Kolom di Desktop) */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Distribusi Berdasarkan Jenis Laporan</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">Real-time Breakdown</span>
            </div>
            <div className="space-y-5">
              <BarRow label="Usulan Bansos" value={perJenis.bansos} total={totalLaporan} color="bg-blue-600" icon={<Users className="w-4 h-4 text-blue-600" />} />
              <BarRow label="Darurat Sosial (ODGJ)" value={perJenis.odgj} total={totalLaporan} color="bg-teal-600" icon={<ShieldAlert className="w-4 h-4 text-teal-600" />} />
              <BarRow label="Bencana Alam" value={perJenis.bencana} total={totalLaporan} color="bg-rose-600" icon={<AlertTriangle className="w-4 h-4 text-rose-600" />} />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
            <span>Komparasi beban kategori penanganan</span>
            <span className="font-semibold text-indigo-600">Total: {totalLaporan} Kasus</span>
          </div>
        </div>

        {/* Ringkasan Status / Mini Analytic Card */}
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Statistik Cepat</h3>
              <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded text-[10px] font-semibold">Summary</span>
            </div>
            <p className="text-xs text-indigo-300 leading-relaxed mb-6">
              Rasio efisiensi penanganan dan validasi laporan masuk pada periode berjalan.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-xs text-indigo-200">Rasio Validasi</span>
                <span className="text-sm font-bold text-emerald-400">
                  {totalLaporan > 0 ? Math.round(((disetujui + ditolak) / totalLaporan) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-xs text-indigo-200">Pending Review</span>
                <span className="text-sm font-bold text-amber-400">{menungguApproval} Kasus</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${tingkatPenyelesaian}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-[11px] text-indigo-300">
              <span>Tingkat Penyelesaian</span>
              <span className="font-bold text-white">{tingkatPenyelesaian}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Alert Banner Approval */}
      {menungguApproval > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Perhatian Tindakan Diperlukan</h4>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Ada <strong>{menungguApproval}</strong> laporan baru yang sudah diverifikasi oleh petugas dan menunggu keputusan Anda.
              </p>
            </div>
          </div>
          <a 
            href="/kabid/approval" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all shrink-0"
          >
            <span>Tinjau Sekarang</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  )
}

function BarRow({ label, value, total, color, icon }: { label: string; value: number; total: number; color: string; icon?: React.ReactNode }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs items-center">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-gray-700 font-semibold">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-gray-900">{value}</span>
          <span className="text-gray-400 font-medium">({percent}%)</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/60">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  )
}