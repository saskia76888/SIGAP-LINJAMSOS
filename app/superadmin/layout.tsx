"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [nama, setNama] = useState("")
  const [checking, setChecking] = useState(true)

  useEffect(() => {
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

      if (!userData || userData.role !== "superadmin") {
        router.push("/login")
        return
      }

      setNama(userData.nama)
      setChecking(false)
    }
    checkAccess()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const menuItems = [
    { href: "/superadmin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/superadmin/users", label: "Kelola User", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M13 9a4 4 0 11-8 0 4 4 0 018 0z" },
    { href: "/superadmin/pengajuan-rtrw", label: "Pengajuan RT/RW", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { href: "/superadmin/master-data", label: "Master Data", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" },
    { href: "/superadmin/log-aktivitas", label: "Log Aktivitas", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { href: "/superadmin/notifikasi", label: "Notifikasi WA", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  ]

  if (checking) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 bg-[#0B0F19]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400 animate-pulse">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#0B0F19] flex font-sans antialiased text-white overflow-hidden">
      {/* Sidebar Warna Solid Gelap Biar Rapi & Gak Ngeblok */}
      <aside className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col shrink-0 h-full">
        
        {/* Logo / Header Sidebar */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800 bg-[#111827]">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Sigap Bansos
          </span>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const active = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  active 
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/25" 
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Footer User Profile & Logout */}
        <div className="p-3 border-t border-slate-800 bg-[#111827]">
          <div className="px-3 py-2.5 mb-2 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Masuk sebagai</p>
            <p className="text-xs font-bold text-white truncate mt-0.5">{nama}</p>
            <p className="text-[10px] font-medium text-violet-400 mt-0.5">Superadmin</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* Area Konten Utama yang bisa di-scroll */}
      <main className="flex-1 h-full overflow-y-auto">
        {children}
      </main>
    </div>
  )
}