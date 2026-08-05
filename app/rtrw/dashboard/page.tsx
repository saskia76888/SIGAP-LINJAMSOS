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
  jenis: "bansos" | "bencana"
}

export default function RtRwDashboard() {
  const router = useRouter()
  const [nama, setNama] = useState("")
  const [wilayah, setWilayah] = useState("")
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lihatSemua, setLihatSemua] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase
        .from("users")
        .select("nama, wilayah, role")
        .eq("id", user.id)
        .single()

      if (!userData || userData.role !== "rt_rw") {
        router.push("/login")
        return
      }

      setNama(userData.nama)
      setWilayah(userData.wilayah || "")

      const [bansosRes, bencanaRes] = await Promise.all([
        supabase
          .from("usulan_bansos")
          .select("id, no_tiket, nama_warga, status, created_at, kategori_bantuan(nama_kategori)")
          .eq("rt_rw_id", user.id),
        supabase
          .from("laporan_bencana")
          .select("id, no_tiket, lokasi, kebutuhan_mendesak, status, created_at, kategori_bencana(nama_kategori)")
          .eq("rt_rw_id", user.id),
      ])

      const bansosItems: RiwayatItem[] = (bansosRes.data || []).map((item: any) => ({
        id: item.id,
        no_tiket: item.no_tiket,
        judul: item.nama_warga,
        keterangan: item.kategori_bantuan?.nama_kategori || "-",
        status: item.status,
        created_at: item.created_at,
        jenis: "bansos",
      }))

      const bencanaItems: RiwayatItem[] = (bencanaRes.data || []).map((item: any) => ({
        id: item.id,
        no_tiket: item.no_tiket,
        judul: item.kategori_bencana?.nama_kategori || "Bencana",
        keterangan: item.lokasi || "-",
        status: item.status,
        created_at: item.created_at,
        jenis: "bencana",
      }))

      const gabungan = [...bansosItems, ...bencanaItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setRiwayat(gabungan)
      setLoading(false)
    }
    loadData()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pembahasan":
      case "diproses":
      case "pending":
      case "baru":
        return darkMode ? "bg-blue-950/60 text-blue-300 border border-blue-800" : "bg-blue-50 text-blue-700 border border-blue-100"
      case "diverifikasi":
      case "urgent":
        return darkMode ? "bg-amber-950/60 text-amber-300 border border-amber-800" : "bg-amber-50 text-amber-700 border border-amber-100"
      case "selesai":
      case "disetujui":
        return darkMode ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
      default:
        return darkMode ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-gray-50 text-gray-600 border border-gray-100"
    }
  }

  const getIconByJenis = (jenis: string) => {
    if (jenis === "bencana") {
      return (
        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    )
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-500">Memuat data portal...</main>
  }

  const displayedRiwayat = lihatSemua ? riwayat : riwayat.slice(0, 5)

  const totalUsulan = riwayat.length
  const totalSelesai = riwayat.filter(item => ["selesai", "disetujui"].includes(item.status?.toLowerCase())).length
  const totalProses = riwayat.filter(item => ["pembahasan", "diproses", "pending", "baru", "diverifikasi", "urgent"].includes(item.status?.toLowerCase())).length

  return (
    <main className={`min-h-screen pb-24 lg:pb-12 font-sans antialiased transition-colors duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-[#f8fafc] text-gray-900"}`}>
      
      {/* Navbar */}
      <nav className={`border-b sticky top-0 z-50 transition-colors duration-300 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className={`w-5 h-5 ${darkMode ? "text-blue-400" : "text-blue-900"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className={`font-bold text-sm tracking-wider uppercase ${darkMode ? "text-white" : "text-blue-950"}`}>SIGAP LINJAMSOS</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Tombol Toggle Dark Mode */}
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`p-2 rounded-xl border transition-all ${darkMode ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}
              title="Ganti Mode Tampilan"
            >
              {darkMode ? (
                /* Icon Matahari */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                /* Icon Bulan */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <button className={`p-1.5 relative ${darkMode ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}>
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600" />
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v1.341C7.67 7.165 7 8.388 7 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button onClick={handleLogout} className="text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition-all">
              Keluar
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Header Sambutan & Statistik Singkat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="space-y-1 lg:col-span-2">
            <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Selamat Datang,</p>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${darkMode ? "text-white" : "text-blue-950"}`}>{wilayah || "RT -- / RW --"}</h1>
            <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-400"}`}>Pengelola: <span className={`font-medium ${darkMode ? "text-slate-200" : "text-gray-600"}`}>{nama}</span></p>
          </div>

          {/* Kartu Statistik RT/RW */}
          <div className={`grid grid-cols-3 gap-3 p-3.5 rounded-2xl border shadow-sm transition-colors ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}>
            <div className={`text-center border-r last:border-none ${darkMode ? "border-slate-800" : "border-gray-100"}`}>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Total</p>
              <p className={`text-lg font-bold mt-0.5 ${darkMode ? "text-white" : "text-blue-950"}`}>{totalUsulan}</p>
            </div>
            <div className={`text-center border-r last:border-none ${darkMode ? "border-slate-800" : "border-gray-100"}`}>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Proses</p>
              <p className="text-lg font-bold text-amber-500 mt-0.5">{totalProses}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Selesai</p>
              <p className="text-lg font-bold text-emerald-500 mt-0.5">{totalSelesai}</p>
            </div>
          </div>
        </div>

        {/* Banner Utama */}
        <div className="relative bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-2">
            <h2 className="text-white text-lg sm:text-xl font-bold tracking-wide">Pantau Kesejahteraan Warga</h2>
            <p className="text-blue-200/80 text-xs sm:text-sm leading-relaxed">
              Akses cepat laporan bantuan sosial dan kedaruratan wilayah Anda secara terintegrasi.
            </p>
          </div>
        </div>

        {/* Layout Grid Utama untuk Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Kolom Kiri: Layanan Utama & Bantuan Teknis */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">Layanan Utama</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => router.push("/rtrw/bansos")}
                  className={`border rounded-2xl p-5 flex flex-col justify-between text-left shadow-sm transition-all group h-full ${darkMode ? "bg-slate-900 border-slate-800 hover:border-blue-700" : "bg-white border-gray-100 hover:border-blue-200"}`}
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${darkMode ? "bg-blue-950 text-blue-400 group-hover:bg-blue-600 group-hover:text-white" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"}`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>Ajukan Bansos</h4>
                      <p className="text-xs text-gray-400 mt-1">Input data bantuan warga</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end text-xs font-semibold text-blue-500 group-hover:translate-x-1 transition-transform">
                    <span>Akses</span> &rarr;
                  </div>
                </button>

                <button 
                  onClick={() => router.push("/rtrw/bencana")}
                  className={`border rounded-2xl p-5 flex flex-col justify-between text-left shadow-sm transition-all group h-full ${darkMode ? "bg-slate-900 border-slate-800 hover:border-red-700" : "bg-white border-gray-100 hover:border-red-200"}`}
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${darkMode ? "bg-red-950 text-red-400 group-hover:bg-red-600 group-hover:text-white" : "bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white"}`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>Lapor Bencana</h4>
                      <p className="text-xs text-gray-400 mt-1">Banjir, kebakaran, tanah longsor, & lainnya</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end text-xs font-semibold text-red-500 group-hover:translate-x-1 transition-transform">
                    <span>Akses</span> &rarr;
                  </div>
                </button>
              </div>
            </div>

            {/* Kotak Bantuan */}
            <div className={`border rounded-3xl p-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-colors ${darkMode ? "bg-slate-900 border-slate-800" : "bg-gradient-to-r from-slate-50 to-blue-50/50 border-blue-100/60"}`}>
              <div className="space-y-1 z-10">
                <h4 className={`font-bold text-sm ${darkMode ? "text-white" : "text-blue-950"}`}>Butuh Bantuan Teknis?</h4>
                <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                  Tim SIGAP LINJAMSOS siap melayani 24/7 untuk kendala sistem di tingkat RT/RW.
                </p>
              </div>
              <button className="bg-[#006666] hover:bg-[#004d4d] text-white font-medium text-xs px-5 py-3 rounded-xl shrink-0 shadow-sm transition-all z-10 self-start sm:self-center">
                Hubungi Helpdesk
              </button>
              <span className={`absolute -right-4 -bottom-8 text-8xl font-black select-none pointer-events-none ${darkMode ? "text-slate-800/40" : "text-blue-900/[0.03]"}`}>?</span>
            </div>
          </div>

          {/* Kolom Kanan: Riwayat Pengajuan */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">Riwayat pengajuan saya</h3>
              {riwayat.length > 5 && (
                <button 
                  onClick={() => setLihatSemua(!lihatSemua)}
                  className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
                >
                  {lihatSemua ? "Tampilkan Sebagian" : "Lihat Semua"}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {riwayat.length === 0 ? (
                <div className={`border rounded-2xl p-8 text-center text-xs text-gray-400 shadow-sm ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}>
                  Belum ada data pengajuan usulan bansos atau laporan di wilayah ini.
                </div>
              ) : (
                displayedRiwayat.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => router.push(`/cek-status?tiket=${item.no_tiket}`)}
                    className={`border rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer transition-all ${darkMode ? "bg-slate-900 border-slate-800 hover:border-blue-700" : "bg-white border-gray-100 hover:border-blue-300"}`}
                    title="Klik untuk melacak status"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600"}`}>
                        {getIconByJenis(item.jenis)}
                      </div>
                      <div>
                        <h4 className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{item.judul}</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {item.keterangan} &middot; <span className="font-mono text-blue-500 font-bold">{item.no_tiket}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider ${getStatusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className={`text-center pt-8 pb-4 border-t space-y-2 ${darkMode ? "border-slate-800 text-slate-500" : "border-gray-200/60 text-gray-400"}`}>
          <div className="flex items-center justify-center gap-1.5 text-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span className="font-bold tracking-wider uppercase text-[10px]">SIGAP LINJAMSOS</span>
          </div>
          <p className="text-[10px]">&copy; {new Date().getFullYear()} SIGAP LINJAMSOS. Melayani dengan Empati dan Transparansi.</p>
        </footer>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 border-t h-16 px-6 flex items-center justify-around z-50 shadow-lg ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}>
        <button className="flex flex-col items-center gap-1 text-blue-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold">Beranda</span>
        </button>
        <button onClick={() => setLihatSemua(true)} className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-medium">Riwayat</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-medium">Profil</span>
        </button>
      </div>
    </main>
  )
}