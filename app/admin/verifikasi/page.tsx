"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Eye } from "lucide-react"

type LaporanItem = {
  id: string
  no_tiket: string
  judul: string
  status: string
  created_at: string
  jenis: "bansos" | "odgj" | "bencana"
  raw: any
}

export default function VerifikasiPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<LaporanItem[]>([])
  const [filterJenis, setFilterJenis] = useState("semua")
  const [filterStatus, setFilterStatus] = useState("semua")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<LaporanItem | null>(null)
  const [catatan, setCatatan] = useState("")
  const [statusBaru, setStatusBaru] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [bansosRes, odgjRes, bencanaRes] = await Promise.all([
      supabase
        .from("usulan_bansos")
        .select("*, kategori_bantuan(nama_kategori), users:rt_rw_id(nama, wilayah)")
        .order("created_at", { ascending: false }),
      supabase
        .from("laporan_odgj")
        .select("*, users:rt_rw_id(nama, wilayah)")
        .order("created_at", { ascending: false }),
      supabase
        .from("laporan_bencana")
        .select("*, kategori_bencana(nama_kategori), users:rt_rw_id(nama, wilayah)")
        .order("created_at", { ascending: false }),
    ])

    const bansosItems: LaporanItem[] = (bansosRes.data || []).map((item: any) => ({
      id: item.id,
      no_tiket: item.no_tiket,
      judul: item.nama_warga,
      status: item.status,
      created_at: item.created_at,
      jenis: "bansos",
      raw: item,
    }))

    const odgjItems: LaporanItem[] = (odgjRes.data || []).map((item: any) => ({
      id: item.id,
      no_tiket: item.no_tiket,
      judul: item.nama_terlapor || "Tanpa nama",
      status: item.status,
      created_at: item.created_at,
      jenis: "odgj",
      raw: item,
    }))

    const bencanaItems: LaporanItem[] = (bencanaRes.data || []).map((item: any) => ({
      id: item.id,
      no_tiket: item.no_tiket,
      judul: item.kategori_bencana?.nama_kategori || "Bencana",
      status: item.status,
      created_at: item.created_at,
      jenis: "bencana",
      raw: item,
    }))

    const gabungan = [...bansosItems, ...odgjItems, ...bencanaItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setData(gabungan)
    setLoading(false)
  }

  const filtered = data.filter((item) => {
    if (filterJenis !== "semua" && item.jenis !== filterJenis) return false
    if (filterStatus !== "semua" && item.status?.toLowerCase() !== filterStatus.toLowerCase()) return false
    if (search && !item.judul.toLowerCase().includes(search.toLowerCase()) && !item.no_tiket.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function openDetail(item: LaporanItem) {
    setSelected(item)
    setStatusBaru(item.status)
    setCatatan("")
  }

  function closeDetail() {
    setSelected(null)
  }

  async function handleUpdateStatus() {
    if (!selected) return
    setSaving(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) return

      const tableName = selected.jenis === "bansos" ? "usulan_bansos" : selected.jenis === "odgj" ? "laporan_odgj" : "laporan_bencana"

      const { error: updateError } = await supabase
        .from(tableName)
        .update({ status: statusBaru })
        .eq("id", selected.id)

      if (updateError) throw updateError

      await supabase.from("riwayat_status").insert({
        ref_tabel: tableName,
        ref_id: selected.id,
        status: statusBaru,
        catatan: catatan || null,
        changed_by: user.id,
      })

      if (selected.jenis === "bansos" && statusBaru === "disetujui") {
        const raw = selected.raw
        await supabase.from("penerima_bansos").insert({
          nik: raw.nik,
          nama: raw.nama_warga,
          alamat: raw.alamat,
          kategori_bantuan_id: raw.kategori_bantuan_id,
          status_verifikasi: "terverifikasi",
          usulan_id: raw.id,
          verified_by: user.id,
        })
      }

      alert("Status berhasil diperbarui")
      closeDetail()
      loadData()
    } catch (err: any) {
      alert("Gagal update: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "diproses":
      case "survey":
      case "baru":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {status}
          </span>
        )
      case "diverifikasi":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {status}
          </span>
        )
      case "selesai":
      case "disetujui":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Terverifikasi
          </span>
        )
      case "ditolak":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Ditolak
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> {status || "Baru"}
          </span>
        )
    }
  }

  const getJenisLabel = (jenis: string) => {
    if (jenis === "bansos") return "Bansos"
    if (jenis === "odgj") return "Darurat Sosial"
    return "Bencana"
  }

  const statusOptions = ["baru", "diverifikasi", "survey", "diproses", "disetujui", "ditolak", "selesai"]

  if (loading) {
    return <div className="p-8 text-sm text-gray-500 font-medium">Memuat data verifikasi laporan...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e1b4b] tracking-tight">Verifikasi Laporan</h1>
          <p className="text-xs text-gray-500 mt-1">Manajemen terpusat database verifikasi laporan dan usulan bantuan sosial warga.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert("Fitur Ekspor Excel aktif.")}
            className="bg-[#1e1b4b] hover:bg-purple-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Bar Pencarian & Filter */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Nama atau NIK..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-purple-600 transition-all"
          />
        </div>

        <select 
          value={filterJenis} 
          onChange={(e) => setFilterJenis(e.target.value)} 
          className="bg-gray-50/80 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-purple-600 transition-all"
        >
          <option value="semua">Jenis Bantuan: Semua</option>
          <option value="bansos">Bansos</option>
          <option value="odgj">Darurat Sosial</option>
          <option value="bencana">Bencana</option>
        </select>

        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)} 
          className="bg-gray-50/80 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-purple-600 transition-all uppercase"
        >
          <option value="semua">Semua Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button 
          onClick={loadData}
          className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all"
          title="Refresh Data"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider bg-white">
                <th className="py-4 px-6">No. Tiket / NIK</th>
                <th className="py-4 px-6">Nama Warga</th>
                <th className="py-4 px-6">Jenis Laporan</th>
                <th className="py-4 px-6">Tanggal Masuk</th>
                <th className="py-4 px-6">Status Verifikasi</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                    Tidak ada data laporan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-4 px-6 font-mono text-purple-700 font-bold">{item.no_tiket}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900 text-sm capitalize">{item.judul}</p>
                      <p className="text-[11px] text-gray-400">Pengusul: {item.raw.users?.nama || "RT/RW Setempat"}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-purple-50 text-purple-700 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase">
                        {getJenisLabel(item.jenis)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 font-medium">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => openDetail(item)} 
                        className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 hover:bg-purple-100 hover:border-purple-200 text-gray-600 hover:text-purple-700 inline-flex items-center justify-center transition-all shadow-sm"
                        title="Lihat Detail & Verifikasi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-white">
          <span>Menampilkan <span className="font-semibold text-gray-800">{filtered.length}</span> data laporan</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 font-semibold text-gray-600">1</button>
          </div>
        </div>
      </div>

      {/* Modal Detail & Aksi Verifikasi */}
      {selected && (
        <div className="fixed inset-0 bg-[#1e1b4b]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeDetail}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-gray-100 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md uppercase tracking-wide">
                  {getJenisLabel(selected.jenis)}
                </span>
                <h2 className="text-lg font-bold text-[#1e1b4b] mt-2 capitalize">{selected.judul}</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Tiket: {selected.no_tiket}</p>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors">✕</button>
            </div>

            {/* Rincian Data */}
            <div className="space-y-3 text-xs bg-gray-50/60 p-4 rounded-xl border border-gray-100">
              {selected.jenis === "bansos" && (
                <>
                  <DetailRow label="NIK" value={selected.raw.nik} />
                  <DetailRow label="Alamat" value={selected.raw.alamat} />
                  <DetailRow label="Kategori Bantuan" value={selected.raw.kategori_bantuan?.nama_kategori} />
                  <DetailRow label="Kondisi Ekonomi" value={selected.raw.kondisi_ekonomi} />
                  <DetailRow label="RT/RW Pengusul" value={`${selected.raw.users?.nama || '-'} (${selected.raw.users?.wilayah || '-'})`} />
                </>
              )}

              {selected.jenis === "odgj" && (
                <>
                  <DetailRow label="Lokasi Kejadian" value={selected.raw.lokasi} />
                  <DetailRow label="Kondisi Terlapor" value={selected.raw.kondisi} />
                  <DetailRow label="Tingkat Urgensi" value={selected.raw.tingkat_urgensi} />
                  <DetailRow label="RT/RW Pelapor" value={`${selected.raw.users?.nama || '-'} (${selected.raw.users?.wilayah || '-'})`} />
                </>
              )}

              {selected.jenis === "bencana" && (
                <>
                  <DetailRow label="Lokasi Bencana" value={selected.raw.lokasi} />
                  <DetailRow label="Jenis Bencana" value={selected.raw.kategori_bencana?.nama_kategori} />
                  <DetailRow label="Jumlah KK Terdampak" value={selected.raw.jumlah_kk_terdampak} />
                  <DetailRow label="Kebutuhan Mendesak" value={selected.raw.kebutuhan_mendesak} />
                  <DetailRow label="RT/RW Pelapor" value={`${selected.raw.users?.nama || '-'} (${selected.raw.users?.wilayah || '-'})`} />
                </>
              )}

              {selected.raw.foto_url && (
                <div className="pt-2">
                  <p className="text-gray-400 mb-1.5 font-medium">Dokumentasi Lapangan:</p>
                  <img src={selected.raw.foto_url} alt="Foto Bukti" className="w-full max-h-48 object-cover rounded-xl border shadow-sm" />
                </div>
              )}
            </div>

            {/* Form Update Status */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Update Status Laporan</label>
                <select 
                  value={statusBaru} 
                  onChange={(e) => setStatusBaru(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-gray-900 focus:outline-none focus:border-purple-600 transition-all uppercase"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Catatan Verifikasi (Opsional)</label>
                <textarea
                  value={catatan} 
                  onChange={(e) => setCatatan(e.target.value)} 
                  rows={3}
                  placeholder="Tuliskan catatan hasil survey lapangan atau alasan persetujuan/penolakan..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:border-purple-600 transition-all"
                />
              </div>

              <button
                onClick={handleUpdateStatus} 
                disabled={saving}
                className="w-full bg-[#1e1b4b] hover:bg-purple-900 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl py-3.5 transition-all shadow-sm"
              >
                {saving ? "Menyimpan Perubahan..." : "Simpan Status & Catatan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="font-semibold text-gray-900 text-right max-w-[60%]">{value || "-"}</span>
    </div>
  )
}