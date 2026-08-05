"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError("Email atau password salah")
      setLoading(false)
      return
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, nama")
      .eq("id", authData.user.id)
      .single()

    if (userError || !userData) {
      setError("Akun ditemukan tapi data role tidak ada")
      setLoading(false)
      return
    }

    if (userData.role === "superadmin") router.push("/superadmin")
    else if (userData.role === "rt_rw") router.push("/rtrw/dashboard")
    else if (userData.role === "petugas") router.push("/admin")
    else if (userData.role === "kabid") router.push("/kabid")
    else setError("Role tidak dikenali")

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex bg-[#f8fafc] font-sans antialiased text-gray-950 overflow-hidden relative">
      
      {/* Background Cinematic Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Kiri: Form Login Cinematic & Presisi */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 bg-white/80 backdrop-blur-xl relative z-10 border-r border-gray-100 shadow-2xl shadow-blue-950/5">
        
        {/* Top Minimal Branding */}
        <div className="flex items-center gap-2.5 text-blue-950 font-bold text-sm tracking-wider uppercase">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-900 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-blue-900/20">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span>SIGAP-LINJAMSOS</span>
        </div>

        {/* Center Card Form Box */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          
          {/* Logo Ilustrasi Perisai Tangan Sesuai Gambar */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-blue-50 to-cyan-50/50 border border-blue-100/80 flex items-center justify-center p-3.5 mb-4 shadow-xl shadow-blue-950/5 group hover:scale-105 transition-transform duration-300">
              <svg className="w-full h-full text-blue-900 drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight">SIGAP-LINJAMSOS</h1>
            <p className="text-xs text-gray-400 font-medium mt-1.5 max-w-xs">Sistem Informasi Tanggap Perlindungan & Jaminan Sosial</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Alamat Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L22 8m-9 11h3m-3 0a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v9a3 3 0 01-3 3h-3z" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-blue-900 focus:bg-white focus:ring-4 focus:ring-blue-900/10 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Kata Sandi
                </label>
                <span className="text-[11px] text-blue-900 font-semibold hover:underline cursor-pointer">Lupa kata sandi?</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-900 focus:outline-none focus:border-blue-900 focus:bg-white focus:ring-4 focus:ring-blue-900/10 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="remember" className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-900 cursor-pointer" />
              <label htmlFor="remember" className="text-xs text-gray-500 font-medium cursor-pointer select-none">Ingat saya di perangkat ini</label>
            </div>

            {error && (
              <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 flex items-center gap-2.5 animate-shake">
                <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-900 hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold tracking-wider uppercase rounded-xl py-3.5 shadow-lg shadow-blue-950/20 transition-all flex items-center justify-center gap-2 mt-2 group"
            >
              {loading ? "Memproses Verifikasi..." : (
                <>
                  <span>Masuk Aplikasi Resmi</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500 pt-2">
              Belum punya akun RT/RW? <a href="/daftar-rtrw" className="text-blue-900 font-bold hover:underline">Ajukan di sini</a>
            </p>
          </form>
        </div>

        {/* Bottom Footer Copyright minimal */}
        <div className="text-center text-[10px] text-gray-400 pt-4">
          &copy; {new Date().getFullYear()} SIGAP-LINJAMSOS. Melayani dengan Empati dan Transparansi.
        </div>
      </div>

      {/* Kanan: Panel Visual Sinematik & Premium */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-950 via-slate-900 to-[#021526] relative overflow-hidden items-center justify-center p-16">
        
        {/* Ornamen Grafis Latar Belakang Lingkaran Abstrak Glow */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
        </div>

        {/* Lapisan Grid Pattern Modern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Konten Utama Kanan Sinematik */}
        <div className="relative z-10 max-w-lg space-y-8">
          
          {/* Badge Tagline Atas */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[10px] uppercase font-bold text-cyan-300 tracking-widest shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            Sistem Integrasi Nasional Terpadu
          </div>

          <div className="space-y-4">
            <h2 className="text-white text-3xl xl:text-4xl font-black leading-tight tracking-tight">
              Satu sistem terpadu, memastikan bantuan tepat sasaran bagi warga.
            </h2>
            <p className="text-blue-200/80 text-sm leading-relaxed font-light">
              Menghubungkan RT/RW, petugas lapangan, dan pengambil kebijakan dalam satu alur kerja yang transparan, aman, serta terpantau secara real-time.
            </p>
          </div>

          {/* Statistik Pencapaian Box Modern */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl">
              <p className="text-white text-3xl font-black tracking-tight">3</p>
              <p className="text-cyan-300 text-xs font-medium mt-1">Jenis Layanan Utama</p>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl">
              <p className="text-white text-3xl font-black tracking-tight">100%</p>
              <p className="text-cyan-300 text-xs font-medium mt-1">Transparan & Akuntabel</p>
            </div>
          </div>

          {/* Tips Info Keamanan */}
          <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-cyan-500/20 rounded-2xl p-4 flex gap-3.5 items-center backdrop-blur-sm shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 text-lg">
              🛡️
            </div>
            <p className="text-xs text-blue-100/90 leading-relaxed font-medium">
              <strong>Keamanan Tingkat Tinggi:</strong> Enkripsi data mutakhir menjamin seluruh kerahasiaan pelaporan dan verifikasi warga.
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}