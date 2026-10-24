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
  jenis: "bansos" | "bencana"
  raw: any
}

// [BARU] Format tanggal dari database (yyyy-mm-dd) jadi "17 Agustus 1990"
const fmtTgl = (v?: string | null) =>
  v
    ? new Date(v.length === 10 ? v + "T00:00:00" : v).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

// [BARU] Gabungkan tempat dan tanggal lahir
const ttl = (tempat?: string | null, tgl?: string | null) => {
  const t = [tempat, fmtTgl(tgl)].filter(Boolean).join(", ")
  return t || "-"
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
    const [bansosRes, bencanaRes] = await Promise.all([
      supabase
        .from("usulan_bansos")
        .select("*, kategori_bantuan(nama_kategori), users:rt_rw_id(nama, wilayah)")
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

    const bencanaItems: LaporanItem[] = (bencanaRes.data || []).map((item: any) => ({
      id: item.id,
      no_tiket: item.no_tiket,
      judul: item.kategori_bencana?.nama_kategori || "Bencana",
      status: item.status,
      created_at: item.created_at,
      jenis: "bencana",
      raw: item,
    }))

    const gabungan = [...bansosItems, ...bencanaItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setData(gabungan)
    setLoading(false)
  }

  const filtered = data.filter((item) => {
    if (filterJenis !== "semua" && item.jenis !== filterJenis) return false
    if (filterStatus !== "semua" && item.status?.toLowerCase() !== filterStatus.toLowerCase()) return false
    if (search) {
      const q = search.toLowerCase()
      const cocok =
        item.judul.toLowerCase().includes(q) ||
        item.no_tiket.toLowerCase().includes(q) ||
        String(item.raw?.nik || "").includes(search) ||
        String(item.raw?.no_kk || "").includes(search)
      if (!cocok) return false
    }
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

  // [UBAH] Bisa menerima status tujuan langsung dari tombol (Rekomendasikan / Tolak)
  async function handleUpdateStatus(statusTujuan?: string) {
    if (!selected) return
    const target = statusTujuan ?? statusBaru

    // [BARU] Penolakan usulan wajib disertai alasan
    if (selected.jenis === "bansos" && target === "ditolak" && !catatan.trim()) {
      alert("Alasan penolakan wajib diisi (misal: Foto rumah tidak sesuai, KK tidak terbaca).")
      return
    }

    setSaving(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) return

      const tableName = selected.jenis === "bansos" ? "usulan_bansos" : "laporan_bencana"

      // [BARU] Catatan petugas juga disimpan di usulan supaya tampil di halaman lacak warga
      const payload: any = { status: target }
      if (selected.jenis === "bansos") payload.catatan_petugas = catatan.trim() || null

      const { error: updateError } = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", selected.id)

      if (updateError) throw updateError

      await supabase.from("riwayat_status").insert({
        ref_tabel: tableName,
        ref_id: selected.id,
        status: target,
        catatan: catatan || null,
        changed_by: user.id,
      })

      if (selected.jenis === "bansos" && target === "disetujui") {
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
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {status}
          </span>
        )
      case "diverifikasi":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {status}
          </span>
        )
      case "selesai":
      case "disetujui":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Terverifikasi
          </span>
        )
      case "ditolak":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Ditolak
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> {status || "Baru"}
          </span>
        )
    }
  }

  const getJenisLabel = (jenis: string) => {
    if (jenis === "bansos") return "Bansos"
    return "Bencana"
  }

  const statusOptions = ["baru", "diverifikasi", "survey", "diproses", "disetujui", "ditolak", "selesai"]

  // [BARU] Usulan yang sudah disetujui/selesai tidak bisa diubah lagi oleh petugas
  const terkunci = selected?.jenis === "bansos" && ["disetujui", "selesai"].includes((selected?.status || "").toLowerCase())

  if (loading) {
    return <div className="p-8 text-sm text-gray-500 dark:text-gray-400 font-medium">Memuat data verifikasi laporan...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e1b4b] dark:text-white tracking-tight">Verifikasi Laporan</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manajemen terpusat database verifikasi laporan dan usulan bantuan sosial warga.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert("Fitur Ekspor Excel aktif.")}
            className="bg-[#1e1b4b] hover:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Bar Pencarian & Filter */}
      <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Nama, NIK, No. KK, atau No. Tiket..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all"
          />
        </div>

        <select 
          value={filterJenis} 
          onChange={(e) => setFilterJenis(e.target.value)} 
          className="bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all"
        >
          <option value="semua">Jenis Bantuan: Semua</option>
          <option value="bansos">Bansos</option>
          <option value="bencana">Bencana</option>
        </select>

        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)} 
          className="bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all uppercase"
        >
          <option value="semua">Semua Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button 
          onClick={loadData}
          className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
          title="Refresh Data"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider bg-white dark:bg-[#151321]">
                <th className="py-4 px-6">No. Tiket / NIK</th>
                <th className="py-4 px-6">Nama Warga</th>
                <th className="py-4 px-6">Jenis Laporan</th>
                <th className="py-4 px-6">Tanggal Masuk</th>
                <th className="py-4 px-6">Status Verifikasi</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
                    Tidak ada data laporan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-500/5 transition-colors">
                    <td className="py-4 px-6 font-mono text-purple-700 dark:text-purple-400 font-bold">{item.no_tiket}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900 dark:text-white text-sm capitalize">{item.judul}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">Pengusul: {item.raw.users?.nama || "RT/RW Setempat"}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase">
                        {getJenisLabel(item.jenis)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 font-medium">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => openDetail(item)} 
                        className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-purple-100 dark:hover:bg-purple-500/10 hover:border-purple-200 dark:hover:border-purple-500/30 text-gray-600 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 inline-flex items-center justify-center transition-all shadow-sm"
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
        <div className="p-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#151321]">
          <span>Menampilkan <span className="font-semibold text-gray-800 dark:text-gray-200">{filtered.length}</span> data laporan</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 font-semibold text-gray-600 dark:text-gray-300">1</button>
          </div>
        </div>
      </div>

      {/* Modal Detail & Aksi Verifikasi */}
      {selected && (
        <div className="fixed inset-0 bg-[#1e1b4b]/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeDetail}>
          <div className="bg-white dark:bg-[#151321] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-gray-100 dark:border-gray-700/60 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700/60 pb-4">
              <div>
                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-md uppercase tracking-wide">
                  {selected.jenis === "bansos" ? "BPJS PBI" : getJenisLabel(selected.jenis)}
                </span>
                <h2 className="text-lg font-bold text-[#1e1b4b] dark:text-white mt-2 capitalize">{selected.judul}</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">Tiket: {selected.no_tiket}</p>
                <div className="mt-2">{getStatusBadge(selected.status)}</div>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">✕</button>
            </div>

            {/* [BARU] Rincian lengkap usulan BPJS PBI */}
            {selected.jenis === "bansos" && (
              <div className="space-y-5">
                <Section title="Data Kepala Keluarga">
                  <DetailRow label="No. KK" value={selected.raw.no_kk} />
                  <DetailRow label="NIK Kepala Keluarga" value={selected.raw.nik_kepala_keluarga} />
                  <DetailRow label="Nama Kepala Keluarga" value={selected.raw.nama_kepala_keluarga} />
                  <DetailRow label="Tempat, Tanggal Lahir" value={ttl(selected.raw.tempat_lahir_kk, selected.raw.tanggal_lahir_kk)} />
                  <DetailRow label="RT / RW" value={selected.raw.rt || selected.raw.rw ? `${selected.raw.rt || "-"} / ${selected.raw.rw || "-"}` : ""} />
                  <DetailRow label="Desa/Kelurahan" value={selected.raw.desa} />
                  <DetailRow label="Kecamatan" value={selected.raw.kecamatan} />
                </Section>

                <Section title="Peserta yang Diajukan">
                  <DetailRow label="Jenis Kepesertaan" value={selected.raw.jenis_kepesertaan} />
                  <DetailRow label="Hubungan dengan KK" value={selected.raw.hubungan_keluarga} />
                  <DetailRow label="Nama Peserta" value={selected.raw.nama_warga} />
                  <DetailRow label="NIK Peserta" value={selected.raw.nik} />
                  <DetailRow label="Tempat, Tanggal Lahir" value={ttl(selected.raw.tempat_lahir_peserta, selected.raw.tanggal_lahir_peserta)} />
                  <DetailRow label="Program" value={`BPJS PBI${selected.raw.kategori_bantuan?.nama_kategori ? ` (${selected.raw.kategori_bantuan.nama_kategori})` : ""}`} />
                </Section>

                <Section title="Kondisi Ekonomi">
                  <DetailRow label="Status Kepemilikan Rumah" value={selected.raw.status_kepemilikan_rumah} />
                  <DetailRow label="Pekerjaan" value={selected.raw.pekerjaan} />
                  <DetailRow label="Penghasilan/Bulan" value={selected.raw.penghasilan_bulanan} />
                  <DetailRow label="Jumlah Tanggungan KK" value={selected.raw.jumlah_tanggungan != null ? `${selected.raw.jumlah_tanggungan} orang` : ""} />
                  <DetailRow label="Deskripsi Kondisi" value={selected.raw.kondisi_ekonomi} />
                </Section>

                <Section title="Kontak & Lokasi">
                  <DetailRow label="No. Kontak/WhatsApp" value={selected.raw.no_kontak} />
                  <DetailRow label="Alamat" value={selected.raw.alamat} />
                  <DetailRow
                    label="Link Google Maps"
                    value={
                      selected.raw.link_maps ? (
                        <a href={selected.raw.link_maps} target="_blank" rel="noopener noreferrer" className="text-purple-700 dark:text-purple-300 underline">
                          Buka lokasi
                        </a>
                      ) : (
                        ""
                      )
                    }
                  />
                  <DetailRow label="Diusulkan oleh" value={selected.raw.users?.nama ? `${selected.raw.users.nama}${selected.raw.users?.wilayah ? ` (${selected.raw.users.wilayah})` : ""}` : ""} />
                </Section>

                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Berkas Persyaratan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <BerkasItem label="Kartu Keluarga (KK)" url={selected.raw.dokumen_kk_url} />
                    <BerkasItem label="Surat Keterangan Tidak Mampu" url={selected.raw.dokumen_sktm_url} />
                    <BerkasItem label="Formulir Assessment" url={selected.raw.dokumen_assesment_url} />
                    <BerkasItem label="Foto Rumah Tampak Depan" url={selected.raw.foto_url} />
                    <BerkasItem label="Dokumen Lainnya" url={selected.raw.dokumen_pendukung_url} opsional />
                  </div>
                </div>
              </div>
            )}

            {selected.jenis === "bencana" && (
              <div className="space-y-3 text-xs bg-gray-50/60 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60">
                <DetailRow label="Lokasi Bencana" value={selected.raw.lokasi} />
                <DetailRow label="Jenis Bencana" value={selected.raw.kategori_bencana?.nama_kategori} />
                <DetailRow label="Jumlah KK Terdampak" value={selected.raw.jumlah_kk_terdampak} />
                <DetailRow label="Kebutuhan Mendesak" value={selected.raw.kebutuhan_mendesak} />
                <DetailRow label="RT/RW Pelapor" value={`${selected.raw.users?.nama || '-'} (${selected.raw.users?.wilayah || '-'})`} />

                {selected.raw.foto_url && (
                  <div className="pt-2">
                    <p className="text-gray-400 dark:text-gray-500 mb-1.5 font-medium">Dokumentasi Lapangan:</p>
                    <img src={selected.raw.foto_url} alt="Foto Bukti" className="w-full max-h-48 object-cover rounded-xl border dark:border-gray-700 shadow-sm" />
                  </div>
                )}
              </div>
            )}

            {/* Aksi Verifikasi */}
            <div className="border-t border-gray-100 dark:border-gray-700/60 pt-4 space-y-4">
              {selected.jenis === "bansos" ? (
                /* [BARU] Aksi petugas untuk usulan BPJS PBI */
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Catatan Pemeriksaan <span className="normal-case font-medium text-gray-400">(wajib diisi jika menolak)</span>
                    </label>
                    <textarea
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      rows={3}
                      disabled={terkunci}
                      placeholder='Tuliskan hasil pemeriksaan berkas atau alasan penolakan, misal: "Foto rumah tidak sesuai, terlihat rumah mewah".'
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all disabled:opacity-60"
                    />
                  </div>

                  {terkunci ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3">
                      Usulan ini sudah disetujui dan tidak dapat diubah lagi dari halaman petugas.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => handleUpdateStatus("ditolak")}
                        disabled={saving}
                        className="w-full border border-rose-200 dark:border-rose-500/30 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 disabled:opacity-60 text-xs font-bold rounded-xl py-3.5 transition-all"
                      >
                        Tolak / Kembalikan
                      </button>
                      <button
                        onClick={() => handleUpdateStatus("diverifikasi")}
                        disabled={saving}
                        className="w-full bg-[#1e1b4b] hover:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-xs font-bold rounded-xl py-3.5 transition-all shadow-sm"
                      >
                        {saving ? "Menyimpan..." : "Rekomendasikan ke Kabid"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Laporan bencana: tetap memakai form status lama */
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Update Status Laporan</label>
                    <select 
                      value={statusBaru} 
                      onChange={(e) => setStatusBaru(e.target.value)} 
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-xs font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all uppercase"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Catatan Verifikasi (Opsional)</label>
                    <textarea
                      value={catatan} 
                      onChange={(e) => setCatatan(e.target.value)} 
                      rows={3}
                      placeholder="Tuliskan catatan hasil survey lapangan atau alasan persetujuan/penolakan..."
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all"
                    />
                  </div>

                  <button
                    onClick={() => handleUpdateStatus()} 
                    disabled={saving}
                    className="w-full bg-[#1e1b4b] hover:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-xs font-bold rounded-xl py-3.5 transition-all shadow-sm"
                  >
                    {saving ? "Menyimpan Perubahan..." : "Simpan Status & Catatan"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-start gap-4 border-b border-gray-200/60 dark:border-gray-700/60 pb-2">
      <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-gray-100 text-right max-w-[60%] break-words">{value || "-"}</span>
    </div>
  )
}

// [BARU] Pembungkus satu bagian data di modal
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">{title}</h3>
      <div className="space-y-3 text-xs bg-gray-50/60 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60">
        {children}
      </div>
    </div>
  )
}

// [BARU] Satu berkas: gambar tampil sebagai thumbnail, PDF sebagai tombol. Klik untuk membuka di tab baru
function BerkasItem({ label, url, opsional }: { label: string; url?: string | null; opsional?: boolean }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between gap-3 text-xs border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-3">
        <span className="text-gray-500 dark:text-gray-400 font-medium">{label}</span>
        <span className={opsional ? "text-gray-400 font-medium" : "text-rose-500 font-semibold"}>
          {opsional ? "Tidak diunggah" : "Belum diunggah"}
        </span>
      </div>
    )
  }

  const isPdf = url.split("?")[0].toLowerCase().endsWith(".pdf")

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-purple-50/40 dark:hover:bg-purple-500/5 rounded-xl p-3 transition-all"
    >
      {isPdf ? (
        <div className="w-14 h-14 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs font-extrabold flex items-center justify-center shrink-0">
          PDF
        </div>
      ) : (
        <img src={url} alt={label} className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold mt-0.5">Klik untuk membuka</p>
      </div>
    </a>
  )
}