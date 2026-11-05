"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Pencil, Trash2, UserX, UserCheck, Plus } from "lucide-react"

type Penerima = {
  id: string
  nik: string
  nama: string
  alamat: string | null
  kelurahan: string | null
  kecamatan: string | null
  rt: string | null
  rw: string | null
  no_kk: string | null
  nama_kepala_keluarga: string | null
  nik_kepala_keluarga: string | null
  tempat_lahir: string | null
  tanggal_lahir: string | null
  hubungan_keluarga: string | null
  pekerjaan: string | null
  penghasilan_bulanan: string | null
  status_kepemilikan_rumah: string | null
  jumlah_tanggungan: number | null
  no_kontak: string | null
  jenis_kepesertaan: string | null
  status_verifikasi: string | null
  status_kepesertaan: string | null
  alasan_nonaktif: string | null
  verified_at: string | null
  kategori_bantuan: { nama_kategori: string } | null
}

const KECAMATAN_GARUT = [
  "Balubur Limbangan","Banjarwangi","Banyuresmi","Bayongbong","Bungbulang",
  "Caringin","Cibalong","Cibatu","Cibiuk","Cigedug","Cihurip","Cikajang",
  "Cikelet","Cilawu","Cisewu","Cisompet","Cisurupan","Garut Kota","Kadungora",
  "Karangpawitan","Karangtengah","Kersamanah","Leles","Leuwigoong","Malangbong",
  "Mekarmukti","Pakenjeng","Pamulihan","Pangatikan","Pasirwangi","Peundeuy",
  "Samarang","Selaawi","Singajaya","Sucinaraja","Sukaresmi","Sukawening",
  "Talegong","Tarogong Kaler","Tarogong Kidul","Wanaraja",
]

const ALASAN_NONAKTIF = [
  "Meninggal dunia",
  "Pindah domisili keluar Garut",
  "Ekonomi sudah mampu",
  "Data ganda",
  "Lainnya",
]

const FORM_KOSONG = {
  nama: "",
  nik: "",
  no_kk: "",
  nama_kepala_keluarga: "",
  jenis_kepesertaan: "",
  alamat: "",
  rt: "",
  rw: "",
  kelurahan: "",
  kecamatan: "",
  nik_kepala_keluarga: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  hubungan_keluarga: "",
  pekerjaan: "",
  penghasilan_bulanan: "",
  status_kepemilikan_rumah: "",
  jumlah_tanggungan: "",
  no_kontak: "",
}

// Tanggal lahir diketik manual: dd/mm/yyyy
function formatTanggalInput(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

function tanggalKeISO(value: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (year < 1900 || month < 1 || month > 12 || day < 1) return null
  const tgl = new Date(year, month - 1, day)
  if (tgl.getFullYear() !== year || tgl.getMonth() !== month - 1 || tgl.getDate() !== day) return null
  if (tgl > new Date()) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

const isoKeTanggal = (v?: string | null) => {
  if (!v) return ""
  const [y, m, d] = v.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

const inputCls =
  "w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all"

const labelCls = "block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"

export default function DataPesertaPbiPage() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [data, setData] = useState<Penerima[]>([])
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("semua")
  const [pbiId, setPbiId] = useState<string | null>(null)

  // Modal tambah / edit
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Penerima | null>(null)
  const [form, setForm] = useState(FORM_KOSONG)
  const [saving, setSaving] = useState(false)

  // Modal usulan nonaktif
  const [nonaktifTarget, setNonaktifTarget] = useState<Penerima | null>(null)
  const [alasan, setAlasan] = useState("")
  const [catatanNonaktif, setCatatanNonaktif] = useState("")

  useEffect(() => {
    loadData()
    loadPbiId()
  }, [])

  async function loadPbiId() {
    const { data: pbi } = await supabase
      .from("kategori_bantuan")
      .select("id")
      .eq("nama_kategori", "PBI-JK")
      .single()
    if (pbi?.id) setPbiId(pbi.id)
  }

  // READ: ambil semua peserta yang belum dihapus
  async function loadData() {
    setLoading(true)
    setErrorMsg("")
    const { data: result, error } = await supabase
      .from("penerima_bansos")
      .select("*, kategori_bantuan(nama_kategori)")
      .is("deleted_at", null)
      .order("verified_at", { ascending: false })

    if (error) {
      setErrorMsg("Gagal memuat data: " + error.message)
      setData([])
    } else {
      setData((result as any) || [])
    }
    setLoading(false)
  }

  async function ambilUser() {
    const { data: sessionData } = await supabase.auth.getSession()
    return sessionData.session?.user || null
  }

  // Catat jejak perubahan (kegagalan mencatat tidak menghentikan proses)
  async function catatRiwayat(refId: string, status: string, catatan: string, userId: string) {
    await supabase.from("riwayat_status").insert({
      ref_tabel: "penerima_bansos",
      ref_id: refId,
      status,
      catatan,
      changed_by: userId,
    })
  }

  const statusDari = (p: Penerima) => p.status_kepesertaan || "aktif"

  const filtered = data.filter((item) => {
    if (filterStatus !== "semua" && statusDari(item) !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        item.nama.toLowerCase().includes(q) ||
        item.nik.includes(search) ||
        (item.no_kk || "").includes(search)
      )
    }
    return true
  })

  const jumlahAktif = data.filter((d) => statusDari(d) === "aktif").length
  const jumlahUsulan = data.filter((d) => statusDari(d) === "usulan_nonaktif").length
  const jumlahNonaktif = data.filter((d) => statusDari(d) === "nonaktif").length

  // ---------- CREATE & UPDATE ----------
  function bukaTambah() {
    setEditing(null)
    setForm(FORM_KOSONG)
    setFormOpen(true)
  }

  function bukaEdit(item: Penerima) {
    setEditing(item)
    setForm({
      nama: item.nama || "",
      nik: item.nik || "",
      no_kk: item.no_kk || "",
      nama_kepala_keluarga: item.nama_kepala_keluarga || "",
      jenis_kepesertaan: item.jenis_kepesertaan || "",
      alamat: item.alamat || "",
      rt: item.rt || "",
      rw: item.rw || "",
      kelurahan: item.kelurahan || "",
      kecamatan: item.kecamatan || "",
      nik_kepala_keluarga: item.nik_kepala_keluarga || "",
      tempat_lahir: item.tempat_lahir || "",
      tanggal_lahir: isoKeTanggal(item.tanggal_lahir),
      hubungan_keluarga: item.hubungan_keluarga || "",
      pekerjaan: item.pekerjaan || "",
      penghasilan_bulanan: item.penghasilan_bulanan || "",
      status_kepemilikan_rumah: item.status_kepemilikan_rumah || "",
      jumlah_tanggungan: item.jumlah_tanggungan != null ? String(item.jumlah_tanggungan) : "",
      no_kontak: item.no_kontak || "",
    })
    setFormOpen(true)
  }

  function tutupForm() {
    setFormOpen(false)
    setEditing(null)
  }

  const setField = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }))
  const angka = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max)

  function validasi() {
    if (!form.nama.trim()) return "Nama peserta wajib diisi."
    if (form.nik.length !== 16) return "NIK harus 16 digit."
    if (form.no_kk.length !== 16) return "Nomor KK harus 16 digit."
    if (!form.jenis_kepesertaan) return "Pilih jenis kepesertaan."
    if (!form.kecamatan || !form.kelurahan.trim()) return "Kecamatan dan desa/kelurahan wajib diisi."
    if (form.nik_kepala_keluarga && form.nik_kepala_keluarga.length !== 16) return "NIK kepala keluarga harus 16 digit."
    if (form.tanggal_lahir && !tanggalKeISO(form.tanggal_lahir)) return "Tanggal lahir tidak valid. Contoh: 17/08/1990"
    return ""
  }

  // Ubah isian form jadi format database (tanggal ISO, tanggungan angka)
  const buatPayload = () => ({
    ...form,
    tanggal_lahir: tanggalKeISO(form.tanggal_lahir),
    jumlah_tanggungan: form.jumlah_tanggungan === "" ? null : parseInt(form.jumlah_tanggungan),
  })

  async function handleSimpan() {
    const msg = validasi()
    if (msg) {
      alert(msg)
      return
    }

    setSaving(true)
    try {
      const user = await ambilUser()
      if (!user) {
        alert("Sesi login habis, silakan login ulang")
        return
      }

      // Cegah NIK ganda
      let cek: any = supabase.from("penerima_bansos").select("id").eq("nik", form.nik).is("deleted_at", null)
      if (editing) cek = cek.neq("id", editing.id)
      const { data: ganda } = await cek
      if (ganda && ganda.length > 0) {
        alert("NIK ini sudah terdaftar di data peserta.")
        return
      }

      if (editing) {
        const { error } = await supabase.from("penerima_bansos").update(buatPayload()).eq("id", editing.id)
        if (error) throw error
        await catatRiwayat(editing.id, "diedit", "Data peserta diperbarui", user.id)
      } else {
        const { data: baru, error } = await supabase
          .from("penerima_bansos")
          .insert({
            ...buatPayload(),
            kategori_bantuan_id: pbiId,
            status_verifikasi: "terverifikasi",
            status_kepesertaan: "aktif",
            verified_at: new Date().toISOString(),
            verified_by: user.id,
          })
          .select("id")
          .single()
        if (error) throw error
        if (baru?.id) await catatRiwayat(baru.id, "ditambahkan", "Peserta ditambahkan manual oleh petugas", user.id)
      }

      tutupForm()
      loadData()
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ---------- STATUS KEPESERTAAN (usulan nonaktif / batal / aktifkan kembali) ----------
  function bukaNonaktif(item: Penerima) {
    setNonaktifTarget(item)
    setAlasan("")
    setCatatanNonaktif("")
  }

  async function handleUsulkanNonaktif() {
    if (!nonaktifTarget) return
    if (!alasan) {
      alert("Pilih alasan penonaktifan.")
      return
    }
    if (alasan === "Lainnya" && !catatanNonaktif.trim()) {
      alert("Isi keterangan untuk alasan 'Lainnya'.")
      return
    }

    setSaving(true)
    try {
      const user = await ambilUser()
      if (!user) {
        alert("Sesi login habis, silakan login ulang")
        return
      }

      const alasanLengkap = catatanNonaktif.trim() ? `${alasan} - ${catatanNonaktif.trim()}` : alasan

      const { error } = await supabase
        .from("penerima_bansos")
        .update({ status_kepesertaan: "usulan_nonaktif", alasan_nonaktif: alasanLengkap })
        .eq("id", nonaktifTarget.id)
      if (error) throw error

      await catatRiwayat(nonaktifTarget.id, "usulan_nonaktif", alasanLengkap, user.id)
      setNonaktifTarget(null)
      loadData()
    } catch (err: any) {
      alert("Gagal mengusulkan nonaktif: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function kembalikanKeAktif(item: Penerima, pesan: string) {
    if (!confirm(pesan)) return
    try {
      const user = await ambilUser()
      if (!user) {
        alert("Sesi login habis, silakan login ulang")
        return
      }
      const { error } = await supabase
        .from("penerima_bansos")
        .update({ status_kepesertaan: "aktif", alasan_nonaktif: null, nonaktif_at: null })
        .eq("id", item.id)
      if (error) throw error
      await catatRiwayat(item.id, "aktif", "Status dikembalikan menjadi aktif", user.id)
      loadData()
    } catch (err: any) {
      alert("Gagal mengubah status: " + err.message)
    }
  }

  // ---------- DELETE (soft delete) ----------
  async function handleHapus(item: Penerima) {
    if (!confirm(`Hapus data peserta "${item.nama}"?\n\nData disembunyikan dari daftar dan jejaknya tetap tersimpan.`)) return
    try {
      const user = await ambilUser()
      if (!user) {
        alert("Sesi login habis, silakan login ulang")
        return
      }
      const { error } = await supabase
        .from("penerima_bansos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", item.id)
      if (error) throw error
      await catatRiwayat(item.id, "dihapus", "Data peserta dihapus", user.id)
      loadData()
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message)
    }
  }

  // ---------- EKSPOR ----------
  function exportExcel() {
    if (filtered.length === 0) {
      alert("Tidak ada data untuk diekspor.")
      return
    }

    // ="..." agar NIK/KK 16 digit tidak berubah jadi notasi ilmiah di Excel
    const teks = (v: string | null | undefined) => `="${(v || "").replace(/"/g, '""')}"`
    const biasa = (v: string | null | undefined) => `"${(v || "").replace(/"/g, '""')}"`

    const header = [
      "NIK", "No. KK", "Nama", "Nama Kepala Keluarga", "Alamat", "RT", "RW",
      "Desa/Kelurahan", "Kecamatan", "Jenis Kepesertaan", "Status Kepesertaan", "Tanggal Verifikasi",
    ].join(",")

    const body = filtered
      .map((i) =>
        [
          teks(i.nik),
          teks(i.no_kk),
          biasa(i.nama),
          biasa(i.nama_kepala_keluarga),
          biasa(i.alamat),
          biasa(i.rt),
          biasa(i.rw),
          biasa(i.kelurahan),
          biasa(i.kecamatan),
          biasa(i.jenis_kepesertaan),
          biasa(statusDari(i)),
          biasa(i.verified_at ? new Date(i.verified_at).toLocaleDateString("id-ID") : ""),
        ].join(",")
      )
      .join("\n")

    const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `data-peserta-pbi-${Date.now()}.csv`
    link.click()
  }

  const badgeStatus = (item: Penerima) => {
    const s = statusDari(item)
    if (s === "aktif")
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
        </span>
      )
    if (s === "usulan_nonaktif")
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Menunggu Kabid
        </span>
      )
    return (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Nonaktif
      </span>
    )
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500 dark:text-gray-400 font-medium">Memuat data peserta BPJS PBI...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e1b4b] dark:text-white tracking-tight">Data Peserta PBI</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Daftar peserta BPJS PBI APBD Kabupaten Garut yang sudah disetujui Kabid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 px-4 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 shadow-sm">
            Aktif: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{jumlahAktif}</span>
          </div>
          <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 px-4 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 shadow-sm">
            Usulan Nonaktif: <span className="text-amber-600 dark:text-amber-400 font-bold">{jumlahUsulan}</span>
          </div>
          <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 px-4 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 shadow-sm">
            Nonaktif: <span className="text-rose-600 dark:text-rose-400 font-bold">{jumlahNonaktif}</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl p-4">
          {errorMsg}
          <p className="mt-1 text-rose-500">Pastikan SQL penambahan kolom pada tabel penerima_bansos sudah dijalankan di Supabase.</p>
        </div>
      )}

      {/* Bar Pencarian, Filter, Tambah, Ekspor */}
      <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIK, atau No. KK..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 transition-all"
        >
          <option value="semua">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="usulan_nonaktif">Usulan Nonaktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>

        <button
          onClick={bukaTambah}
          className="bg-[#1e1b4b] hover:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Peserta
        </button>

        <button
          onClick={exportExcel}
          className="bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export Excel (CSV)
        </button>
      </div>

      {/* Tabel Data Peserta */}
      <div className="bg-white dark:bg-[#151321] border border-gray-200/80 dark:border-gray-700/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider bg-white dark:bg-[#151321]">
                <th className="py-4 px-6">Nama Peserta</th>
                <th className="py-4 px-6">NIK / No. KK</th>
                <th className="py-4 px-6">Wilayah</th>
                <th className="py-4 px-6">Jenis Kepesertaan</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Tgl Verifikasi</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
                    Belum ada data peserta yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const s = statusDari(item)
                  return (
                    <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-500/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0 uppercase text-xs">
                            {item.nama ? item.nama.slice(0, 2) : "W"}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm capitalize">{item.nama}</p>
                            {item.nama_kepala_keluarga && (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">KK: {item.nama_kepala_keluarga}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-purple-700 dark:text-purple-400 font-medium">
                        <p>{item.nik}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">{item.no_kk || "-"}</p>
                      </td>
                      <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                        <p>{[item.kelurahan, item.kecamatan].filter(Boolean).join(", ") || item.alamat || "-"}</p>
                        {(item.rt || item.rw) && (
                          <p className="text-[11px]">RT {item.rt || "-"} / RW {item.rw || "-"}</p>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase">
                          {item.jenis_kepesertaan || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {badgeStatus(item)}
                        {s !== "aktif" && item.alasan_nonaktif && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[180px]">{item.alasan_nonaktif}</p>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-500 dark:text-gray-400 font-medium">
                        {item.verified_at
                          ? new Date(item.verified_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          : "-"}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => bukaEdit(item)}
                            title="Edit data"
                            className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-purple-100 dark:hover:bg-purple-500/10 text-gray-600 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 inline-flex items-center justify-center transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {s === "aktif" && (
                            <button
                              onClick={() => bukaNonaktif(item)}
                              title="Usulkan nonaktif"
                              className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-amber-100 dark:hover:bg-amber-500/10 text-gray-600 dark:text-gray-300 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center justify-center transition-all"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          {s === "usulan_nonaktif" && (
                            <button
                              onClick={() => kembalikanKeAktif(item, `Batalkan usulan nonaktif untuk "${item.nama}"?`)}
                              title="Batalkan usulan nonaktif"
                              className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center justify-center transition-all"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}

                          {s === "nonaktif" && (
                            <button
                              onClick={() => kembalikanKeAktif(item, `Aktifkan kembali "${item.nama}"?`)}
                              title="Aktifkan kembali"
                              className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center justify-center transition-all"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleHapus(item)}
                            title="Hapus data"
                            className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-rose-100 dark:hover:bg-rose-500/10 text-gray-600 dark:text-gray-300 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#151321]">
          Menampilkan <span className="font-semibold text-gray-800 dark:text-gray-200">{filtered.length}</span> dari {data.length} peserta
        </div>
      </div>

      {/* Modal Tambah / Edit Peserta */}
      {formOpen && (
        <div className="fixed inset-0 bg-[#1e1b4b]/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={tutupForm}>
          <div
            className="bg-white dark:bg-[#151321] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-gray-100 dark:border-gray-700/60 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700/60 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#1e1b4b] dark:text-white">{editing ? "Edit Data Peserta" : "Tambah Peserta BPJS PBI"}</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {editing ? "Perbarui data peserta yang salah atau berubah." : "Untuk peserta yang diinput langsung oleh petugas."}
                </p>
              </div>
              <button onClick={tutupForm} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nama Peserta</label>
                <input className={inputCls} value={form.nama} onChange={(e) => setField("nama", e.target.value)} placeholder="Sesuai KK/KTP" />
              </div>
              <div>
                <label className={labelCls}>NIK Peserta</label>
                <input className={inputCls} inputMode="numeric" value={form.nik} onChange={(e) => setField("nik", angka(e.target.value, 16))} placeholder="16 digit" />
              </div>
              <div>
                <label className={labelCls}>Nomor KK</label>
                <input className={inputCls} inputMode="numeric" value={form.no_kk} onChange={(e) => setField("no_kk", angka(e.target.value, 16))} placeholder="16 digit" />
              </div>
              <div>
                <label className={labelCls}>Nama Kepala Keluarga</label>
                <input className={inputCls} value={form.nama_kepala_keluarga} onChange={(e) => setField("nama_kepala_keluarga", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Jenis Kepesertaan</label>
                <select className={inputCls} value={form.jenis_kepesertaan} onChange={(e) => setField("jenis_kepesertaan", e.target.value)}>
                  <option value="">Pilih jenis</option>
                  <option value="Peserta Baru">Peserta Baru</option>
                  <option value="Reaktivasi">Reaktivasi</option>
                  <option value="Peralihan">Peralihan</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Kecamatan</label>
                <select className={inputCls} value={form.kecamatan} onChange={(e) => setField("kecamatan", e.target.value)}>
                  <option value="">Pilih kecamatan</option>
                  {KECAMATAN_GARUT.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Desa/Kelurahan</label>
                <input className={inputCls} value={form.kelurahan} onChange={(e) => setField("kelurahan", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>RT</label>
                <input className={inputCls} inputMode="numeric" value={form.rt} onChange={(e) => setField("rt", angka(e.target.value, 3))} />
              </div>
              <div>
                <label className={labelCls}>RW</label>
                <input className={inputCls} inputMode="numeric" value={form.rw} onChange={(e) => setField("rw", angka(e.target.value, 3))} />
              </div>
              <div>
                <label className={labelCls}>NIK Kepala Keluarga</label>
                <input className={inputCls} inputMode="numeric" value={form.nik_kepala_keluarga} onChange={(e) => setField("nik_kepala_keluarga", angka(e.target.value, 16))} placeholder="16 digit" />
              </div>
              <div>
                <label className={labelCls}>Hubungan dengan Kepala Keluarga</label>
                <select className={inputCls} value={form.hubungan_keluarga} onChange={(e) => setField("hubungan_keluarga", e.target.value)}>
                  <option value="">Pilih hubungan</option>
                  <option value="Kepala Keluarga">Kepala Keluarga</option>
                  <option value="Istri/Suami">Istri/Suami</option>
                  <option value="Anak">Anak</option>
                  <option value="Orang Tua">Orang Tua</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Tempat Lahir</label>
                <input className={inputCls} value={form.tempat_lahir} onChange={(e) => setField("tempat_lahir", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Tanggal Lahir</label>
                <input className={inputCls} inputMode="numeric" maxLength={10} value={form.tanggal_lahir} onChange={(e) => setField("tanggal_lahir", formatTanggalInput(e.target.value))} placeholder="dd/mm/yyyy" />
                {form.tanggal_lahir.length === 10 && !tanggalKeISO(form.tanggal_lahir) && (
                  <p className="text-[10px] text-rose-500 mt-1">Tanggal tidak valid. Contoh: 17/08/1990</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Status Kepemilikan Rumah</label>
                <select className={inputCls} value={form.status_kepemilikan_rumah} onChange={(e) => setField("status_kepemilikan_rumah", e.target.value)}>
                  <option value="">Pilih status</option>
                  <option value="Milik Sendiri">Milik Sendiri</option>
                  <option value="Mengontrak">Mengontrak</option>
                  <option value="Menumpang">Menumpang</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Jumlah Tanggungan KK</label>
                <input className={inputCls} type="number" min="0" value={form.jumlah_tanggungan} onChange={(e) => setField("jumlah_tanggungan", e.target.value)} placeholder="Orang yang dibiayai KK" />
              </div>
              <div>
                <label className={labelCls}>Pekerjaan</label>
                <input className={inputCls} value={form.pekerjaan} onChange={(e) => setField("pekerjaan", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Penghasilan/Bulan</label>
                <select className={inputCls} value={form.penghasilan_bulanan} onChange={(e) => setField("penghasilan_bulanan", e.target.value)}>
                  <option value="">Pilih rentang</option>
                  <option value="< Rp1.000.000">&lt; Rp1.000.000</option>
                  <option value="Rp1.000.000 - Rp2.000.000">Rp1.000.000 - Rp2.000.000</option>
                  <option value="Rp2.000.000 - Rp3.000.000">Rp2.000.000 - Rp3.000.000</option>
                  <option value="> Rp3.000.000">&gt; Rp3.000.000</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>No. Kontak/WhatsApp</label>
                <input className={inputCls} type="tel" value={form.no_kontak} onChange={(e) => setField("no_kontak", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Alamat Lengkap</label>
                <textarea className={inputCls} rows={2} value={form.alamat} onChange={(e) => setField("alamat", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={tutupForm}
                disabled={saving}
                className="w-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl py-3 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSimpan}
                disabled={saving}
                className="w-full bg-[#1e1b4b] hover:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-xs font-bold rounded-xl py-3 transition-all shadow-sm"
              >
                {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Peserta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Usulkan Nonaktif */}
      {nonaktifTarget && (
        <div className="fixed inset-0 bg-[#1e1b4b]/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setNonaktifTarget(null)}>
          <div
            className="bg-white dark:bg-[#151321] rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700/60 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-lg font-bold text-[#1e1b4b] dark:text-white">Usulkan Nonaktif</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                {nonaktifTarget.nama} · {nonaktifTarget.nik}
              </p>
            </div>

            <div>
              <label className={labelCls}>Alasan Penonaktifan</label>
              <select className={inputCls} value={alasan} onChange={(e) => setAlasan(e.target.value)}>
                <option value="">Pilih alasan</option>
                {ALASAN_NONAKTIF.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>
                Keterangan <span className="normal-case font-medium text-gray-400">{alasan === "Lainnya" ? "(wajib)" : "(opsional)"}</span>
              </label>
              <textarea
                className={inputCls}
                rows={3}
                value={catatanNonaktif}
                onChange={(e) => setCatatanNonaktif(e.target.value)}
                placeholder="Tambahkan keterangan pendukung..."
              />
            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Usulan akan diteruskan ke Kabid. Status peserta menjadi "Menunggu Kabid" sampai disetujui.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNonaktifTarget(null)}
                disabled={saving}
                className="w-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl py-3 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleUsulkanNonaktif}
                disabled={saving}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-xs font-bold rounded-xl py-3 transition-all shadow-sm"
              >
                {saving ? "Mengirim..." : "Usulkan Nonaktif"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}