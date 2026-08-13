"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  AlertTriangle, 
  ArrowUpRight,
  Users,
  Activity
} from "lucide-react"

type Item = {
  id: string
  status: string
  created_at: string
  jenis: "bansos" | "bencana"
}

export default function KabidDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Item[]>([])

  useEffect(() => {
    async function loadData() {
      const [bansosRes, bencanaRes] = await Promise.all([
        supabase.from("usulan_bansos").select("id, status, created_at"),
        supabase.from("laporan_bencana").select("id, status, created_at"),
      ])

      const gabungan: Item[] = [
        ...(bansosRes.data || []).map((d: any) => ({ ...d, jenis: "bansos" as const })),
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
    bencana: data.filter((d) => d.jenis === "bencana").length,
  }

  const tingkatPenyelesaian = totalLaporan > 0 ? Math.round((disetujui / totalLaporan) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">Memuat data dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-gray-50/30 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
            Portal Eksekutif Kepala Bidang
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard Kepala Bidang</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ringkasan strategis seluruh laporan dan usulan yang masuk ke sistem.</p>
        </div>
        <div className="flex items-center gap-3 bg-purple-50/50 px-4 py-3 rounded-2xl border border-purple-100">
          <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-purple-600 font-semibold">Indeks Kinerja</p>
            <p className="text-sm font-bold text-gray-900">{tingkatPenyelesaian}% Terselesaikan</p>
          </div>
        </div>
      </div>

      {/* Grid Kartu Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Laporan</span>
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600">{totalLaporan}</p>
          <div className="mt-3 inline-block px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
            {bulanIni} laporan bulan ini
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Menunggu Approval</span>
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600">{menungguApproval}</p>
          <div className="mt-3 inline-block px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
            Sudah diverifikasi petugas
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Disetujui / Selesai</span>
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600">{disetujui}</p>
          <div className="mt-3 inline-block px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
            Diproses tuntas
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ditolak</span>
            <XCircle className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600">{ditolak}</p>
          <div className="mt-3 inline-block px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
            Tidak memenuhi syarat
          </div>
        </div>
      </div>

      {/* Bagian Bawah: Distribusi & Statistik Cepat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Distribusi - Ditambahkan flex flex-col h-full agar sama tinggi dengan card sebelah */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col h-full">
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Distribusi Berdasarkan Jenis Laporan</h2>
              <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-lg font-semibold animate-pulse">Real-time</span>
            </div>
            <div className="space-y-6">
              <BarRow label="Usulan Bansos" value={perJenis.bansos} total={totalLaporan} color="bg-purple-600" icon={<Users className="w-4 h-4 text-purple-600" />} />
              <BarRow label="Bencana Alam" value={perJenis.bencana} total={totalLaporan} color="bg-purple-400" icon={<AlertTriangle className="w-4 h-4 text-purple-400" />} />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
            <span>Komparasi beban kategori penanganan</span>
            <span className="font-semibold text-purple-600">Total: {totalLaporan} Kasus</span>
          </div>
        </div>

        {/* Statistik Cepat */}
        <div className="bg-[#1e1b4b] text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200">Statistik Cepat</h3>
              <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded text-[10px] font-semibold">Summary</span>
            </div>
            <p className="text-xs text-purple-200/80 leading-relaxed mb-6">Rasio efisiensi penanganan dan validasi laporan.</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-xs text-purple-200">Rasio Validasi</span>
                <span className="text-sm font-bold text-emerald-400">{totalLaporan > 0 ? Math.round(((disetujui + ditolak) / totalLaporan) * 100) : 0}%</span>
              </div>
              <div className="flex items-center justify-between bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-xs text-purple-200">Pending Review</span>
                <span className="text-sm font-bold text-amber-400">{menungguApproval} Kasus</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: `${tingkatPenyelesaian}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-[11px] text-purple-200">
              <span>Tingkat Penyelesaian</span>
              <span className="font-bold text-white">{tingkatPenyelesaian}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {menungguApproval > 0 && (
        <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-purple-950">Perhatian Tindakan Diperlukan</h4>
              <p className="text-xs text-purple-900/80 mt-0.5">Ada <strong>{menungguApproval}</strong> laporan baru yang menunggu keputusan Anda.</p>
            </div>
          </div>
          <a href="/kabid/approval" className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2.5 rounded-xl transition-all">
            Tinjau Sekarang
          </a>
        </div>
      )}
    </div>
  )
}

function BarRow({ label, value, total, color, icon }: { label: string; value: number; total: number; color: string; icon?: React.ReactNode }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-2">
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
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200/60">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}