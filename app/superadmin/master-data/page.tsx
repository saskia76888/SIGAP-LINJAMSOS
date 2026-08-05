"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Kategori = { id: string; nama_kategori: string; deskripsi?: string }

export default function MasterDataPage() {
  const [tab, setTab] = useState<"bantuan" | "bencana">("bantuan")
  const [loading, setLoading] = useState(true)
  const [bantuanList, setBantuanList] = useState<Kategori[]>([])
  const [bencanaList, setBencanaList] = useState<Kategori[]>([])
  const [namaBaru, setNamaBaru] = useState("")
  const [deskripsiBaru, setDeskripsiBaru] = useState("")
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [bantuanRes, bencanaRes] = await Promise.all([
      supabase.from("kategori_bantuan").select("*").order("nama_kategori"),
      supabase.from("kategori_bencana").select("*").order("nama_kategori"),
    ])
    setBantuanList(bantuanRes.data || [])
    setBencanaList(bencanaRes.data || [])
    setLoading(false)
  }

  async function handleTambah() {
    if (!namaBaru.trim()) return

    const table = tab === "bantuan" ? "kategori_bantuan" : "kategori_bencana"
    const payload = tab === "bantuan" ? { nama_kategori: namaBaru, deskripsi: deskripsiBaru } : { nama_kategori: namaBaru }

    const { error } = await (supabase.from(table) as any).insert(payload)
    if (error) {
      alert("Gagal menambah: " + error.message)
      return
    }

    setNamaBaru("")
    setDeskripsiBaru("")
    loadData()
  }

  async function handleHapus(id: string) {
    if (!confirm("Yakin ingin menghapus kategori ini?")) return

    const table = tab === "bantuan" ? "kategori_bantuan" : "kategori_bencana"
    const { error } = await (supabase.from(table) as any).delete().eq("id", id)

    if (error) {
      alert("Gagal menghapus: " + error.message)
      return
    }
    loadData()
  }

  const currentList = tab === "bantuan" ? bantuanList : bencanaList

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400 animate-pulse">Memuat master data...</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen pb-20 font-sans text-slate-100">
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">Master Data</h1>
        <p className="text-xs text-slate-400 mt-1">Kelola kategori bantuan dan kategori bencana.</p>
      </div>

      {/* Tab Navigasi */}
      <div className="flex gap-2 border-b border-purple-950/40">
        <button
          onClick={() => setTab("bantuan")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            tab === "bantuan" 
              ? "border-purple-500 text-white" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Kategori Bantuan
        </button>
        <button
          onClick={() => setTab("bencana")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            tab === "bencana" 
              ? "border-purple-500 text-white" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Kategori Bencana
        </button>
      </div>

      {/* Form Tambah Kategori */}
      <div className="bg-[#121629] border border-purple-950/40 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tambah Kategori Baru</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={namaBaru} 
            onChange={(e) => setNamaBaru(e.target.value)}
            placeholder="Nama kategori..."
            className="flex-1 border border-purple-950/40 bg-slate-900/50 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-purple-500 focus:bg-slate-900 transition-all placeholder:text-slate-500"
          />
          {tab === "bantuan" && (
            <input
              value={deskripsiBaru} 
              onChange={(e) => setDeskripsiBaru(e.target.value)}
              placeholder="Deskripsi (opsional)..."
              className="flex-1 border border-purple-950/40 bg-slate-900/50 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-purple-500 focus:bg-slate-900 transition-all placeholder:text-slate-500"
            />
          )}
          <button 
            onClick={handleTambah} 
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl whitespace-nowrap transition-all shadow-md shadow-purple-600/30"
          >
            Tambah
          </button>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-[#121629] border border-purple-950/40 rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/40 border-b border-purple-950/40">
            <tr>
              <th className="text-left px-5 py-3.5 font-bold text-slate-400 text-[11px] uppercase tracking-wider">Nama Kategori</th>
              {tab === "bantuan" && <th className="text-left px-5 py-3.5 font-bold text-slate-400 text-[11px] uppercase tracking-wider">Deskripsi</th>}
              <th className="text-right px-5 py-3.5 font-bold text-slate-400 text-[11px] uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-950/30">
            {currentList.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-10 text-slate-500 text-xs italic">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              currentList.map((k) => (
                <tr key={k.id} className="hover:bg-purple-950/10 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-white text-xs">{k.nama_kategori}</td>
                  {tab === "bantuan" && <td className="px-5 py-3.5 text-slate-400 text-xs max-w-xs truncate">{k.deskripsi || "-"}</td>}
                  <td className="px-5 py-3.5 text-right">
                    <button 
                      onClick={() => handleHapus(k.id)} 
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-400 transition-colors px-2.5 py-1 rounded-lg border border-purple-900/40 bg-purple-950/30 hover:bg-rose-950/40 hover:border-rose-900/50"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}