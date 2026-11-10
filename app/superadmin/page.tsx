"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabase"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

const emptyChart = BULAN.map((name) => ({ name, laporan: 0 }))

export default function SuperadminDashboard() {
  const [loading, setLoading] = useState(true)

  // Tema global (next-themes): klik di mana pun, semua halaman ikut berubah
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const darkMode = mounted && resolvedTheme === "dark"
  const toggleTheme = () => setTheme(darkMode ? "light" : "dark")

  const [stats, setStats] = useState({
    totalUser: 0,
    totalRtRw: 0,
    totalPetugas: 0,
    totalKabid: 0,
    totalLaporan: 0,
  })

  const [chartData, setChartData] = useState(emptyChart)

  const [roleData, setRoleData] = useState([
    { name: "RT / RW", value: 0, color: "#8b5cf6" },
    { name: "Petugas", value: 0, color: "#a78bfa" },
    { name: "Kabid", value: 0, color: "#c4b5fd" },
  ])

  // Latency asli: lama waktu query ke Supabase
  const [latency, setLatency] = useState<number | null>(null)

  const fullText = "Ringkasan performa sistem, statistik user, dan data laporan secara real-time."
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [loopNum, setLoopNum] = useState(0)
  const [typingSpeed, setTypingSpeed] = useState(50)

  const loadData = useCallback(async () => {
    const startedAt = performance.now()
    const year = new Date().getFullYear()
    const awalTahun = `${year}-01-01T00:00:00`
    const akhirTahun = `${year + 1}-01-01T00:00:00`

    const [usersRes, bansosRes, odgjRes, bencanaRes] = await Promise.all([
      supabase.from("users").select("role"),
      supabase.from("usulan_bansos").select("created_at").gte("created_at", awalTahun).lt("created_at", akhirTahun),
      supabase.from("laporan_odgj").select("created_at").gte("created_at", awalTahun).lt("created_at", akhirTahun),
      supabase.from("laporan_bencana").select("created_at").gte("created_at", awalTahun).lt("created_at", akhirTahun),
    ])

    setLatency(Math.round(performance.now() - startedAt))

    const allUsers = usersRes.data || []
    const rtRwCount = allUsers.filter((u) => u.role === "rt_rw").length
    const petugasCount = allUsers.filter((u) => u.role === "petugas").length
    const kabidCount = allUsers.filter((u) => u.role === "kabid").length

    // Gabungkan semua laporan tahun ini, lalu hitung per bulan (data asli)
    const semuaLaporan = [...(bansosRes.data || []), ...(odgjRes.data || []), ...(bencanaRes.data || [])]
    const perBulan = new Array(12).fill(0)
    semuaLaporan.forEach((row: { created_at: string }) => {
      const bulan = new Date(row.created_at).getMonth()
      if (bulan >= 0 && bulan < 12) perBulan[bulan] += 1
    })

    setStats({
      totalUser: allUsers.length,
      totalRtRw: rtRwCount,
      totalPetugas: petugasCount,
      totalKabid: kabidCount,
      totalLaporan: semuaLaporan.length,
    })

    setRoleData([
      { name: "RT / RW", value: rtRwCount, color: "#8b5cf6" },
      { name: "Petugas", value: petugasCount, color: "#a78bfa" },
      { name: "Kabid", value: kabidCount, color: "#c4b5fd" },
    ])

    setChartData(BULAN.map((name, i) => ({ name, laporan: perBulan[i] })))

    setLoading(false)
  }, [])

  // Load awal + realtime
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    loadData()

    // Debounce supaya banyak perubahan beruntun hanya memicu satu refresh
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => loadData(), 500)
    }

    const channel = supabase
      .channel("superadmin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "usulan_bansos" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "laporan_odgj" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "laporan_bencana" }, scheduleRefresh)
      .subscribe()

    // Cadangan: refresh berkala bila Realtime belum diaktifkan di Supabase
    const interval = setInterval(() => loadData(), 30000)

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [loadData])

  useEffect(() => {
    const handleTyping = () => {
      if (displayText === fullText) {
        setIsDeleting(true)
        return
      }
      setDisplayText(fullText.substring(0, displayText.length + 1))
    }

    const handleDeleting = () => {
      setDisplayText(fullText.substring(0, displayText.length - 1))
      if (displayText.length <= 1) {
        setIsDeleting(false)
        setLoopNum(loopNum + 1)
      }
    }

    // Jeda 3 detik saat teks sudah penuh sebelum mulai menghapus
    const delay = !isDeleting && displayText === fullText ? 3000 : typingSpeed

    const timer = setTimeout(() => {
      if (!isDeleting) {
        handleTyping()
        setTypingSpeed(50)
      } else {
        handleDeleting()
        setTypingSpeed(30)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [displayText, isDeleting, loopNum])

  const persentaseRtRw = stats.totalUser > 0 ? Math.round((stats.totalRtRw / stats.totalUser) * 100) : 0
  const persentasePetugas = stats.totalUser > 0 ? Math.round((stats.totalPetugas / stats.totalUser) * 100) : 0
  const persentaseKabid = stats.totalUser > 0 ? Math.round((stats.totalKabid / stats.totalUser) * 100) : 0

  const latencyLabel = latency === null ? "-" : `${latency}ms`
  const loadLabel = latency === null ? "-" : latency < 300 ? "Optimal" : latency < 800 ? "Normal" : "Tinggi"
  const systemOk = latency === null || latency < 800

  const cardCls = `border rounded-3xl transition-all duration-300 ${
    darkMode
      ? "bg-slate-900/70 border-violet-900/40 shadow-[0_0_15px_rgba(139,92,246,0.08)] backdrop-blur-md"
      : "bg-white border-slate-200/80 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.05)]"
  }`

  const statCls = `border rounded-3xl transition-all duration-300 ${
    darkMode
      ? "bg-slate-900/70 border-violet-900/40 shadow-[0_0_15px_rgba(139,92,246,0.08)] backdrop-blur-md"
      : "bg-white border-violet-200 shadow-[0_2px_12px_-3px_rgba(124,58,237,0.08)]"
  }`

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat dashboard superadmin...</p>
      </div>
    )
  }

  return (
    <div className={`p-6 md:p-10 space-y-6 min-h-screen font-sans antialiased transition-colors duration-500 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-[#f8fafc] text-slate-800"}`}>

      {/* Header Dashboard & System Health Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className={`lg:col-span-8 p-7 rounded-3xl border relative overflow-hidden flex flex-col justify-center transition-all duration-300 ${
          darkMode
            ? "bg-slate-900/80 border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.15)] backdrop-blur-md"
            : "bg-white border-slate-200/80 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.05)]"
        }`}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-violet-600 to-indigo-600"></div>

          <div className="flex justify-between items-start relative">
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>Overview Superadmin</h1>
            <button
              onClick={toggleTheme}
              aria-label="Ganti tema"
              className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition-all hover:scale-105 ${
                darkMode
                  ? "bg-violet-950/60 border-violet-700/60 text-violet-300"
                  : "bg-violet-50 border-violet-200 text-violet-600"
              }`}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>

          <p className={`text-sm mt-1.5 min-h-[20px] font-normal ${darkMode ? "text-slate-300" : "text-slate-500"}`}>
            {displayText}
            <span className="animate-pulse font-normal text-violet-600 ml-0.5">|</span>
          </p>
        </div>

        <div className={`lg:col-span-4 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
          darkMode
            ? "text-white bg-gradient-to-br from-violet-950 via-slate-900 to-purple-950 border border-violet-500/40 shadow-[0_0_35px_rgba(139,92,246,0.25)]"
            : "text-slate-800 bg-white border border-violet-200 shadow-[0_2px_12px_-3px_rgba(139,92,246,0.08)]"
        }`}>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <div className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-violet-400" : "text-violet-600"}`}>System Health & Stats</div>
              <div className="flex items-center gap-2.5 mt-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemOk ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${systemOk ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                </span>
                <span className={`text-sm font-bold tracking-wide ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {systemOk ? "All Systems Normal" : "Sistem Lambat"}
                </span>
              </div>
            </div>
            <span className={`text-[10px] border px-2.5 py-1 rounded-full font-semibold ${darkMode ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-violet-100 text-violet-700 border-violet-200"}`}>
              Live Monitor
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className={`p-2.5 rounded-2xl border text-center ${darkMode ? "bg-white/[0.06] border-white/10 backdrop-blur-sm" : "bg-slate-50 border-slate-200/60"}`}>
              <div className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">Uptime</div>
              <div className={`text-xs font-bold mt-0.5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>99.98%</div>
            </div>
            <div className={`p-2.5 rounded-2xl border text-center ${darkMode ? "bg-white/[0.06] border-white/10 backdrop-blur-sm" : "bg-slate-50 border-slate-200/60"}`}>
              <div className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">Latency</div>
              <div className={`text-xs font-bold mt-0.5 ${darkMode ? "text-violet-400" : "text-violet-600"}`}>{latencyLabel}</div>
            </div>
            <div className={`p-2.5 rounded-2xl border text-center ${darkMode ? "bg-white/[0.06] border-white/10 backdrop-blur-sm" : "bg-slate-50 border-slate-200/60"}`}>
              <div className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">Load</div>
              <div className={`text-xs font-bold mt-0.5 ${darkMode ? "text-purple-400" : "text-purple-600"}`}>{loadLabel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistik Kartu Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className={`p-6 flex flex-col justify-between ${statCls}`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total User</p>
            <h3 className={`text-3xl font-extrabold mt-2 ${darkMode ? "text-white" : "text-slate-900"}`}>{stats.totalUser}</h3>
          </div>
          <div className={`mt-5 text-[11px] font-semibold px-3 py-1.5 rounded-xl w-fit ${darkMode ? "bg-slate-800 text-slate-300" : "bg-violet-50 text-violet-700 border border-violet-100"}`}>Akun terdaftar</div>
        </div>

        <div className={`p-6 flex flex-col justify-between ${statCls}`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">RT / RW</p>
            <h3 className={`text-3xl font-extrabold mt-2 ${darkMode ? "text-violet-500" : "text-violet-600"}`}>{stats.totalRtRw}</h3>
          </div>
          <div className={`mt-5 text-[11px] font-semibold px-3 py-1.5 rounded-xl w-fit ${darkMode ? "bg-violet-950/60 text-violet-300 border border-violet-800/50" : "bg-violet-50 text-violet-700 border border-violet-100"}`}>{persentaseRtRw}% dari total</div>
        </div>

        <div className={`p-6 flex flex-col justify-between ${statCls}`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Petugas</p>
            <h3 className={`text-3xl font-extrabold mt-2 ${darkMode ? "text-purple-500" : "text-purple-600"}`}>{stats.totalPetugas}</h3>
          </div>
          <div className={`mt-5 text-[11px] font-semibold px-3 py-1.5 rounded-xl w-fit ${darkMode ? "bg-purple-950/60 text-purple-300 border border-purple-800/50" : "bg-purple-50 text-purple-700 border border-purple-100"}`}>{persentasePetugas}% dari total</div>
        </div>

        <div className={`p-6 flex flex-col justify-between ${statCls}`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kepala Bidang</p>
            <h3 className={`text-3xl font-extrabold mt-2 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>{stats.totalKabid}</h3>
          </div>
          <div className={`mt-5 text-[11px] font-semibold px-3 py-1.5 rounded-xl w-fit ${darkMode ? "bg-indigo-950/60 text-indigo-300 border border-indigo-800/50" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}`}>{persentaseKabid}% dari total</div>
        </div>

        <div className={`p-6 flex flex-col justify-between ${statCls}`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Laporan</p>
            <h3 className={`text-3xl font-extrabold mt-2 ${darkMode ? "text-fuchsia-500" : "text-fuchsia-600"}`}>{stats.totalLaporan}</h3>
          </div>
          <div className={`mt-5 text-[11px] font-semibold px-3 py-1.5 rounded-xl w-fit ${darkMode ? "bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-800/50" : "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100"}`}>Tahun ini</div>
        </div>
      </div>

      {/* SECTION GRAFIK UTAMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Line Chart */}
        <div className={`lg:col-span-2 p-7 flex flex-col justify-between ${cardCls}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-base font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>Laporan Masuk per Bulan</h2>
              <p className="text-xs text-slate-400 mt-0.5">Grafik tren jumlah laporan masuk per bulan (data real-time)</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${darkMode ? "bg-violet-950/80 text-violet-300 border border-violet-800" : "bg-slate-100 text-slate-600"}`}>
              {new Date().getFullYear()}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: darkMode ? "#090d16" : "#1e293b", border: darkMode ? "1px solid #7c3aed" : "none", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value) => [value, "Laporan"]}
                />
                <Line type="monotone" dataKey="laporan" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#7c3aed" }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className={`p-7 flex flex-col justify-between ${cardCls}`}>
          <div>
            <h2 className={`text-base font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>User Distribution</h2>
            <p className="text-xs text-slate-400 mt-0.5">Proporsi akun berdasarkan peran</p>
          </div>

          <div className="relative h-[180px] flex items-center justify-center my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
              <span className={`text-lg font-extrabold ${darkMode ? "text-white" : "text-slate-900"}`}>{stats.totalUser}</span>
            </div>
          </div>

          <div className="space-y-2">
            {roleData.map((item, idx) => {
              const percent = stats.totalUser > 0 ? Math.round((item.value / stats.totalUser) * 100) : 0
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{item.name}</span>
                  </div>
                  <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{percent}% ({item.value})</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Navigasi Menu Cepat */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
        <a href="/superadmin/users" className={`p-7 group flex flex-col justify-between hover:border-violet-300 ${cardCls}`}>
          <div>
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${darkMode ? "text-violet-400 bg-violet-950/50 border-violet-800/60" : "text-violet-600 bg-violet-50 border-violet-100"}`}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className={`font-bold text-lg transition-colors ${darkMode ? "text-white group-hover:text-violet-400" : "text-slate-900 group-hover:text-violet-600"}`}>Kelola User</h3>
            <p className="text-xs text-slate-400 mt-2">Tambah, nonaktifkan, atau atur akun pengguna sistem.</p>
          </div>
          <div className={`mt-8 flex items-center gap-2 text-xs font-bold ${darkMode ? "text-violet-400" : "text-violet-600"}`}>
            <span>Buka Manajemen User</span>
            <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </div>
        </a>

        <a href="/superadmin/master-data" className={`p-7 group flex flex-col justify-between hover:border-purple-300 ${cardCls}`}>
          <div>
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${darkMode ? "text-purple-400 bg-purple-950/50 border-purple-800/60" : "text-purple-600 bg-purple-50 border-purple-100"}`}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            </div>
            <h3 className={`font-bold text-lg transition-colors ${darkMode ? "text-white group-hover:text-purple-400" : "text-slate-900 group-hover:text-purple-600"}`}>Master Data</h3>
            <p className="text-xs text-slate-400 mt-2">Kelola kategori bantuan sosial dan data bencana.</p>
          </div>
          <div className={`mt-8 flex items-center gap-2 text-xs font-bold ${darkMode ? "text-purple-400" : "text-purple-600"}`}>
            <span>Buka Master Data</span>
            <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </div>
        </a>

        <a href="/superadmin/log-aktivitas" className={`p-7 group flex flex-col justify-between hover:border-indigo-300 ${cardCls}`}>
          <div>
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${darkMode ? "text-indigo-400 bg-indigo-950/50 border-indigo-800/60" : "text-indigo-600 bg-indigo-50 border-indigo-100"}`}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className={`font-bold text-lg transition-colors ${darkMode ? "text-white group-hover:text-indigo-400" : "text-slate-900 group-hover:text-indigo-600"}`}>Log Aktivitas</h3>
            <p className="text-xs text-slate-400 mt-2">Pantau riwayat perubahan status oleh petugas & kabid.</p>
          </div>
          <div className={`mt-8 flex items-center gap-2 text-xs font-bold ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
            <span>Buka Log Sistem</span>
            <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </div>
        </a>
      </div>

    </div>
  )
}