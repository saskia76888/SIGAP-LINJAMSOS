"use client"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [nama, setNama] = useState("")
  const [checking, setChecking] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin_theme")
    if (savedTheme === "dark") {
      setDarkMode(true)
    }

    async function checkAccess() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase
        .from("users")
        .select("nama, role")
        .eq("id", user.id)
        .single()

      if (!userData || userData.role !== "petugas") {
        router.push("/login")
        return
      }

      setNama(userData.nama)
      setChecking(false)
    }
    checkAccess()
  }, [router])

  function toggleDarkMode() {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem("admin_theme", newMode ? "dark" : "light")
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/admin/verifikasi", label: "Verifikasi", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { href: "/admin/mini-dtks", label: "Mini-DTKS", icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" },
    { href: "/admin/laporan", label: "Laporan", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  ]

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-500">Memuat sesi petugas...</div>
  }

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-300 ${darkMode ? "bg-gradient-to-br from-[#090d16] via-[#0f172a] to-[#1e1b4b] text-gray-100" : "bg-[#f8fafc] text-gray-900"}`}>
      
      {/* Sidebar Kiri */}
      <aside className={`w-64 flex flex-col shrink-0 border-r sticky top-0 h-screen transition-colors duration-300 ${
        darkMode ? "bg-[#070b14]/90 backdrop-blur-md border-indigo-500/20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]" : "bg-blue-950 border-blue-900 text-white"
      }`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <svg className={`w-6 h-6 ${darkMode ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]" : "text-white"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="font-bold text-sm tracking-wider uppercase">Sigap Bansos</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  active 
                    ? darkMode 
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" 
                      : "bg-white/10 text-white" 
                    : darkMode 
                      ? "text-gray-400 hover:bg-white/5 hover:text-white" 
                      : "text-blue-200 hover:bg-white/5 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Info User */}
        <div className={`p-3 border-t ${darkMode ? "border-indigo-500/10" : "border-blue-900"}`}>
          <div className="px-3 py-2 mb-1">
            <p className={`text-[10px] ${darkMode ? "text-indigo-400 font-medium" : "text-blue-200"}`}>Masuk sebagai</p>
            <p className="text-xs font-bold truncate mt-0.5">{nama}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Konten Utama Kanan */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Atas dengan Tombol Toggle Glow */}
        <header className={`h-16 px-6 lg:px-8 border-b flex items-center justify-end sticky top-0 z-40 transition-colors duration-300 ${
          darkMode ? "bg-[#090d16]/80 backdrop-blur-md border-indigo-500/20" : "bg-white border-gray-200"
        }`}>
          <button
            onClick={toggleDarkMode}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
              darkMode 
                ? "bg-indigo-950/60 border-indigo-500/40 text-amber-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105" 
                : "bg-gray-100 border-gray-200 text-slate-700 hover:bg-gray-200 hover:scale-105"
            }`}
            title={darkMode ? "Ubah ke Mode Terang" : "Ubah ke Mode Malam"}
          >
            {darkMode ? (
              <svg className="w-4 h-4 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        {/* Isi Halaman dengan Pengaman Latar Belakang */}
        <main className={`flex-1 overflow-y-auto p-6 lg:p-8 transition-colors duration-300 ${darkMode ? "bg-transparent text-gray-100" : "bg-[#f8fafc] text-gray-900"}`}>
          {children}
        </main>

      </div>
    </div>
  )
}