"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Pengajuan = {
  id: string
  nama: string
  email: string
  no_hp: string
  wilayah: string
  alasan: string | null
  status: string
  created_at: string
  sk_url: string | null
}

export default function PengajuanRtRwPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Pengajuan[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  const [selected, setSelected] = useState<Pengajuan | null>(null)
  const [editing, setEditing] = useState<Pengajuan | null>(null)
  const [saving, setSaving] = useState(false)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterRiwayatStatus, setFilterRiwayatStatus] = useState("semua")

  const [resultInfo, setResultInfo] = useState<{
    type: "success" | "warning" | "error"
    text: string
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: result } = await supabase
      .from("pengajuan_rtrw")
      .select("*")
      .order("created_at", { ascending: false })
    setData(result || [])
    setLoading(false)
  }

  function openApprove(item: Pengajuan) {
    setSelected(item)
  }

  async function handleApprove() {
    if (!selected) return
    setProcessing(selected.id)
    setResultInfo(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) return

      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: selected.nama,
          email: selected.email,
          role: "rt_rw",
          wilayah: selected.wilayah,
          noHp: selected.no_hp,
          sendWhatsapp: true,
        }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      await supabase
        .from("pengajuan_rtrw")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: user.id,
        })
        .eq("id", selected.id)

      if (result.whatsappSent) {
        setResultInfo({
          type: result.notifLogError ? "warning" : "success",
          text: result.notifLogError
            ? `Akun untuk ${selected.nama} berhasil dibuat, WA terkirim, TAPI gagal dicatat ke log notifikasi: ${result.notifLogError}`
            : `Akun untuk ${selected.nama} berhasil dibuat dan password sudah terkirim otomatis via WhatsApp.`,
        })
      } else {
        setResultInfo({
          type: "warning",
          text: `Akun untuk ${selected.nama} berhasil dibuat, TAPI WhatsApp gagal terkirim (${result.whatsappError}). Sampaikan manual — Email: ${selected.email} · Password: ${result.password}`,
        })
      }

      setSelected(null)
      loadData()
    } catch (err: any) {
      setResultInfo({ type: "error", text: "Gagal memproses: " + err.message })
    } finally {
      setProcessing(null)
    }
  }

  async function handleTolak(item: Pengajuan) {
    if (!confirm(`Tolak pengajuan dari ${item.nama}?`)) return
    setProcessing(item.id)
    setResultInfo(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) return

      await supabase
        .from("pengajuan_rtrw")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          processed_by: user.id,
        })
        .eq("id", item.id)

      setResultInfo({ type: "success", text: `Pengajuan dari ${item.nama} ditolak.` })
      loadData()
    } catch (err: any) {
      setResultInfo({ type: "error", text: "Gagal memproses: " + err.message })
    } finally {
      setProcessing(null)
    }
  }

  async function handleDelete(item: Pengajuan) {
    if (!confirm(`Hapus data pengajuan dari ${item.nama} secara permanen?`)) return
    setProcessing(item.id)
    setResultInfo(null)

    const { error } = await supabase.from("pengajuan_rtrw").delete().eq("id", item.id)

    if (error) {
      setResultInfo({ type: "error", text: "Gagal hapus: " + error.message })
    } else {
      setResultInfo({ type: "success", text: "Data pengajuan berhasil dihapus." })
      loadData()
    }
    setProcessing(null)
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)

    const { error } = await supabase
      .from("pengajuan_rtrw")
      .update({
        nama: editing.nama,
        email: editing.email,
        no_hp: editing.no_hp,
        wilayah: editing.wilayah,
        alasan: editing.alasan,
      })
      .eq("id", editing.id)

    setSaving(false)

    if (error) {
      setResultInfo({ type: "error", text: "Gagal simpan perubahan: " + error.message })
    } else {
      setResultInfo({ type: "success", text: "Perubahan berhasil disimpan." })
      setEditing(null)
      loadData()
    }
  }

  const pending = data.filter((d) => d.status === "pending")
  const sudahDiproses = data.filter((d) => {
    const matchStatus = filterRiwayatStatus === "semua" || d.status === filterRiwayatStatus
    const matchSearch = d.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        d.wilayah.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        d.email.toLowerCase().includes(searchQuery.toLowerCase())
    return d.status !== "pending" && matchStatus && matchSearch
  })

  const totalDisetujui = data.filter(d => d.status === "approved").length
  const totalDitolak = data.filter(d => d.status === "rejected").length

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Memuat pengajuan...</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen pb-20 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* HEADER PAGE */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pengajuan Akun RT/RW</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Tinjau, edit, setujui, atau tolak pendaftaran akun RT/RW baru dari masyarakat.
        </p>
      </div>

      {/* STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Menunggu Persetujuan */}
        <div className="bg-slate-100 dark:bg-[#121629] p-5 rounded-2xl border border-slate-200/80 dark:border-purple-950/40 shadow-sm flex items-center justify-between relative overflow-hidden transition-colors">
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Menunggu Persetujuan</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pending.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-purple-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-purple-800/40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>

        {/* Total Disetujui */}
        <div className="bg-slate-100 dark:bg-[#121629] p-5 rounded-2xl border border-slate-200/80 dark:border-purple-950/40 shadow-sm flex items-center justify-between relative overflow-hidden transition-colors">
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Disetujui</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalDisetujui}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-purple-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-purple-800/40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>

        {/* Total Ditolak */}
        <div className="bg-slate-100 dark:bg-[#121629] p-5 rounded-2xl border border-slate-200/80 dark:border-purple-950/40 shadow-sm flex items-center justify-between relative overflow-hidden transition-colors">
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Ditolak</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{totalDitolak}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-purple-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-purple-800/40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>
      </div>

      {resultInfo && (
        <div
          className={`border rounded-2xl p-4 flex justify-between items-start gap-3 text-xs shadow-xs ${
            resultInfo.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : resultInfo.type === "warning"
              ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <p className="font-semibold leading-relaxed">{resultInfo.text}</p>
          <button onClick={() => setResultInfo(null)} className="shrink-0 opacity-60 hover:opacity-100 font-bold text-sm">
            ✕
          </button>
        </div>
      )}

      {/* Menunggu Persetujuan */}
      <div>
        <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
          Menunggu Persetujuan ({pending.length})
        </h2>
        <div className="bg-slate-100 dark:bg-[#121629] border border-slate-200/80 dark:border-purple-950/40 rounded-2xl shadow-sm overflow-hidden transition-colors">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-500 text-xs italic">Tidak ada pengajuan baru.</div>
          ) : (
            <div className="divide-y divide-slate-200/60 dark:divide-purple-950/30">
              {pending.map((item) => (
                <div key={item.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-200/50 dark:hover:bg-purple-950/10 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-200 dark:bg-purple-600/20 text-purple-800 dark:text-purple-300 font-bold flex items-center justify-center text-xs shrink-0 border border-purple-300 dark:border-purple-500/30">
                      {item.nama.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{item.nama}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">{item.wilayah}</span> · {item.email} · 📱 {item.no_hp}
                      </p>
                      {item.alasan && (
                        <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-900/80 border border-slate-300/80 dark:border-purple-950/60 rounded-xl px-3 py-1.5 italic inline-block">
                          &ldquo;{item.alasan}&rdquo;
                        </div>
                      )}
                      {item.sk_url ? (
                        <div className="mt-2">
                          <button
                            onClick={() => setPreviewUrl(item.sk_url)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 bg-sky-100/70 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-900/50 rounded-lg px-2.5 py-1.5 transition-all"
                          >
                            📄 Lihat Dokumen SK
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/40 rounded-lg px-2.5 py-1.5 inline-block">
                          ⚠️ SK belum diupload
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end w-full md:w-auto">
                    <button
                      onClick={() => setEditing(item)}
                      disabled={processing === item.id}
                      className="text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-purple-900/40 bg-slate-200/60 dark:bg-purple-950/30 rounded-xl px-3.5 py-2 hover:bg-slate-300/60 dark:hover:bg-purple-900/40 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={processing === item.id}
                      className="text-[11px] font-bold text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-purple-900/40 bg-slate-200/60 dark:bg-purple-950/30 rounded-xl px-3.5 py-2 hover:bg-slate-300/60 dark:hover:bg-purple-900/40 transition-all"
                    >
                      Hapus
                    </button>
                    <button
                      onClick={() => handleTolak(item)}
                      disabled={processing === item.id}
                      className="text-[11px] font-bold text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900/50 bg-rose-100/60 dark:bg-rose-950/40 rounded-xl px-3.5 py-2 hover:bg-rose-200/60 dark:hover:bg-rose-900/50 transition-all"
                    >
                      Tolak
                    </button>
                    <button
                      onClick={() => openApprove(item)}
                      disabled={processing === item.id}
                      className="text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl px-4 py-2 transition-all shadow-md shadow-purple-600/20"
                    >
                      Setujui
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Riwayat Diproses */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Riwayat Diproses</h2>
          
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Cari riwayat..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-slate-300 dark:border-purple-950/40 bg-slate-100 dark:bg-[#121629] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
            />
            <select
              value={filterRiwayatStatus}
              onChange={(e) => setFilterRiwayatStatus(e.target.value)}
              className="border border-slate-300 dark:border-purple-950/40 bg-slate-100 dark:bg-[#121629] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="semua" className="bg-white dark:bg-[#121629]">Semua Status</option>
              <option value="approved" className="bg-white dark:bg-[#121629]">Disetujui</option>
              <option value="rejected" className="bg-white dark:bg-[#121629]">Ditolak</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-[#121629] border border-slate-200/80 dark:border-purple-950/40 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <table className="w-full text-sm">
            <thead className="bg-slate-200/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-purple-950/40">
              <tr>
                <th className="text-left px-5 py-3.5 font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Nama</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Wilayah</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Tanggal</th>
                <th className="text-right px-5 py-3.5 font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-purple-950/30">
              {sudahDiproses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500 dark:text-slate-500 text-xs italic">
                    Belum ada riwayat pengajuan yang cocok.
                  </td>
                </tr>
              ) : (
                sudahDiproses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-200/50 dark:hover:bg-purple-950/10 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white text-xs">{item.nama}</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 text-xs font-medium">{item.wilayah}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          item.status === "approved"
                            ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/50"
                            : "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-900/50"
                        }`}
                      >
                        {item.status === "approved" ? "Disetujui" : "Ditolak"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors px-2.5 py-1 rounded-lg border border-slate-300 dark:border-purple-900/40 bg-slate-200/60 dark:bg-purple-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-900/50"
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

      {/* Modal Approve */}
      {selected && (
        <div
          className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div className="bg-white dark:bg-[#121629] border border-slate-200 dark:border-purple-950/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Setujui Pengajuan</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Akun untuk <strong className="text-slate-900 dark:text-slate-200">{selected.nama}</strong> ({selected.wilayah}) akan dibuat otomatis, dan
                password akan langsung dikirim ke WhatsApp <strong className="text-slate-900 dark:text-slate-200">{selected.no_hp}</strong>.
              </p>
            </div>

            {!selected.sk_url && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                ⚠️ Pengajuan ini belum melampirkan SK RT/RW. Pastikan sudah diverifikasi manual sebelum disetujui.
              </div>
            )}
            
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              💡 Kalau pengiriman WhatsApp gagal, password akan ditampilkan di layar sebagai cadangan supaya tetap bisa disampaikan manual.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setSelected(null)}
                className="w-full border border-slate-300 dark:border-purple-900/50 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl py-2.5 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleApprove}
                disabled={processing === selected.id}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl py-2.5 shadow-md shadow-purple-600/30 transition-all"
              >
                {processing === selected.id ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editing && (
        <div
          className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setEditing(null)}
        >
          <div className="bg-white dark:bg-[#121629] border border-slate-200 dark:border-purple-950/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-purple-950/40 pb-3">Edit Pengajuan</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Nama</label>
                <input
                  value={editing.nama}
                  onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
                  className="w-full border border-slate-300 dark:border-purple-950/40 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Email</label>
                <input
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="w-full border border-slate-300 dark:border-purple-950/40 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">No. HP (WhatsApp)</label>
                <input
                  value={editing.no_hp}
                  onChange={(e) => setEditing({ ...editing, no_hp: e.target.value })}
                  className="w-full border border-slate-300 dark:border-purple-950/40 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Wilayah</label>
                <input
                  value={editing.wilayah}
                  onChange={(e) => setEditing({ ...editing, wilayah: e.target.value })}
                  className="w-full border border-slate-300 dark:border-purple-950/40 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Alasan (opsional)</label>
                <textarea
                  value={editing.alasan || ""}
                  onChange={(e) => setEditing({ ...editing, alasan: e.target.value })}
                  className="w-full border border-slate-300 dark:border-purple-950/40 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-purple-950/40">
              <button
                onClick={() => setEditing(null)}
                className="w-full border border-slate-300 dark:border-purple-900/50 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl py-2.5 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl py-2.5 shadow-md shadow-purple-600/30 transition-all"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Dokumen SK */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white dark:bg-[#121629] border border-slate-200 dark:border-purple-950/80 rounded-2xl max-w-2xl w-full max-h-[85vh] p-4 shadow-2xl space-y-3 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Dokumen SK</h2>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 rounded-lg px-2.5 py-1.5 transition-all"
                >
                  Buka Tab Baru
                </a>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-lg px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-slate-100 dark:bg-slate-950/50 flex items-center justify-center">
              {previewUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe src={previewUrl} className="w-full h-[70vh] rounded-xl" />
              ) : (
                <img
                  src={previewUrl}
                  alt="Dokumen SK"
                  className="max-w-full max-h-[70vh] object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}