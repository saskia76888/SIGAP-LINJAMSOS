"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function CekStatusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tiketParam = searchParams.get("tiket") || ""
  
  const [nomorTiket, setNomorTiket] = useState(tiketParam)
  const [hasilCari, setHasilCari] = useState(!!tiketParam)

  useEffect(() => {
    if (tiketParam) {
      setNomorTiket(tiketParam)
      setHasilCari(true)
    }
  }, [tiketParam])

  const handleCari = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomorTiket.trim()) return
    setHasilCari(true)
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-16 font-sans antialiased text-gray-900">
      
      {/* Navbar Atas */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="font-bold text-sm text-blue-950 tracking-wider uppercase">Sigap Bansos</span>
          </div>
          <button 
            onClick={() => router.back()} 
            className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 px-3.5 py-1.5 rounded-xl bg-white shadow-sm transition-all"
          >
            Kembali
          </button>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Form Input Pencarian Nomor Tiket */}
        <form onSubmit={handleCari} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-2.5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={nomorTiket}
              onChange={(e) => setNomorTiket(e.target.value)}
              placeholder="Masukkan Nomor Tiket (cth: PGD-178...)"
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-3 text-xs focus:outline-none focus:border-blue-950 focus:bg-white transition-all font-mono"
            />
          </div>
          <button 
            type="submit" 
            className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-sm shrink-0"
          >
            Cari
          </button>
        </form>

        {hasilCari && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Kartu Informasi Penerima */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nomor Tiket</span>
                <span className="text-lg font-mono font-bold text-blue-950">{nomorTiket || "SB-987654"}</span>
              </div>

              <div className="space-y-3 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Informasi Penerima</h3>
                <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Jenis Bantuan</span>
                  <span className="font-semibold text-gray-900">PKH Mandiri</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1">
                  <span className="text-gray-500">Tanggal Pengajuan</span>
                  <span className="font-semibold text-gray-900">12 Okt 2024</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic pt-2 border-t border-gray-100">
                Pastikan Anda selalu memantau status pengajuan secara berkala melalui platform resmi SIGAP BANSOS.
              </p>
            </div>

            {/* Timeline Status Pengajuan (Sesuai Foto Rujukan) */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Status Pengajuan</h3>

              <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-100">
                
                {/* Step 1: Diterima */}
                <div className="flex gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-blue-950 text-white flex items-center justify-center shrink-0 z-10 text-xs font-bold shadow-sm">✓</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-900">Diterima</h4>
                    <p className="text-[11px] text-gray-400 font-medium">12 Okt 2024, 09:00</p>
                    <p className="text-xs text-gray-600 leading-relaxed pt-0.5">
                      Laporan Anda telah diterima oleh sistem dan sedang menunggu antrian verifikasi awal berkas administrasi.
                    </p>
                  </div>
                </div>

                {/* Step 2: Diverifikasi */}
                <div className="flex gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-blue-950 text-white flex items-center justify-center shrink-0 z-10 text-xs font-bold shadow-sm">✓</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-900">Diverifikasi</h4>
                    <p className="text-[11px] text-gray-400 font-medium">13 Okt 2024, 14:30</p>
                    <p className="text-xs text-gray-600 leading-relaxed pt-0.5">
                      Dokumen administrasi telah divalidasi oleh tim kurator. Data Anda dinyatakan sesuai dengan persyaratan awal.
                    </p>
                  </div>
                </div>

                {/* Step 3: Survey Lapangan (Aktif) */}
                <div className="flex gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-blue-950 text-white flex items-center justify-center shrink-0 z-10 text-xs font-bold ring-4 ring-blue-50 shadow-md">3</div>
                  <div className="space-y-2.5 flex-1">
                    <div>
                      <h4 className="text-xs font-bold text-blue-950">Survey Lapangan</h4>
                      <p className="text-[11px] text-blue-600 font-bold">Estimasi 15 Okt 2024</p>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Petugas sedang dalam proses penjadwalan kunjungan ke lokasi Anda untuk verifikasi data faktual di lapangan.
                    </p>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex gap-3 items-start">
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">i</span>
                      <p className="text-[11px] text-blue-950 leading-relaxed font-medium">
                        Harap pastikan nomor telepon Anda aktif untuk koordinasi kunjungan petugas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4: Disetujui */}
                <div className="flex gap-4 relative opacity-60">
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 z-10 text-xs font-bold">4</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-900">Disetujui</h4>
                    <p className="text-[11px] text-gray-400 font-medium">Menunggu Proses</p>
                    <p className="text-xs text-gray-500 leading-relaxed pt-0.5">
                      Keputusan akhir berdasarkan hasil survey lapangan dan kelayakan kriteria bantuan sosial.
                    </p>
                  </div>
                </div>

                {/* Step 5: Selesai */}
                <div className="flex gap-4 relative opacity-60">
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 z-10 text-xs font-bold">5</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-900">Selesai</h4>
                    <p className="text-[11px] text-gray-400 font-medium">Belum Tercapai</p>
                    <p className="text-xs text-gray-500 leading-relaxed pt-0.5">
                      Bantuan sosial disalurkan kepada penerima melalui kanal distribusi yang telah ditentukan.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Kotak Bantuan / CS */}
            <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h4 className="text-sm font-bold tracking-wide">Butuh bantuan lebih lanjut?</h4>
              <p className="text-xs text-blue-100/80 leading-relaxed">
                Hubungi pusat layanan informasi kami jika terdapat kendala pada proses tracking.
              </p>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 bg-white hover:bg-gray-100 text-blue-950 text-xs font-bold py-3 rounded-xl transition-all shadow-sm">
                  Hubungi CS
                </button>
                <button className="flex-1 bg-blue-900/60 hover:bg-blue-900 border border-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all">
                  FAQ
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  )
}