"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// ===== Fungsi bantu: memasukkan peserta yang disetujui ke penerima_bansos =====
type PesertaUsulan = {
  nama: string
  nik: string
  tanggal_lahir?: string | null
  tempat_lahir?: string | null
  hubungan?: string | null
}

const JENIS_LABEL: Record<string, string> = {
  peserta_baru: "Peserta Baru",
  reaktivasi: "Reaktivasi",
  peralihan: "Peralihan",
}

// "peserta_baru" -> "Peserta Baru"
function labelJenisKepesertaan(v?: string | null) {
  if (!v) return ""
  return JENIS_LABEL[v.trim().toLowerCase().replace(/\s+/g, "_")] || v
}

// Apakah usulan memakai daftar peserta (kolom anggota_diajukan)?
function memakaiDaftar(raw: any) {
  return Array.isArray(raw?.anggota_diajukan) && raw.anggota_diajukan.length > 0
}

// Daftar peserta dalam satu usulan.
// - Usulan dengan anggota_diajukan: semua anggota di daftar itu.
// - Usulan biasa: satu orang, yaitu nama_warga dan nik (peserta yang diajukan),
//   lengkap dengan tempat/tanggal lahir dan hubungan dengan KK kalau ada.
function daftarPeserta(raw: any): PesertaUsulan[] {
  if (memakaiDaftar(raw)) {
    const valid = raw.anggota_diajukan.filter((p: any) => p && p.nama && p.nik)
    if (valid.length > 0) return valid
  }
  if (raw?.nama_warga) {
    return [
      {
        nama: raw.nama_warga,
        nik: raw.nik,
        tanggal_lahir: raw.tanggal_lahir_peserta ?? null,
        tempat_lahir: raw.tempat_lahir_peserta ?? null,
        hubungan: raw.hubungan_keluarga ?? null,
      },
    ]
  }
  return []
}

// Kepala keluarga: pakai kolom nama_kepala_keluarga kalau ada.
// Hanya pada usulan berdaftar-peserta, nama_warga berisi kepala keluarga.
function namaKepalaKeluarga(raw: any): string | null {
  if (raw?.nama_kepala_keluarga) return raw.nama_kepala_keluarga
  return memakaiDaftar(raw) ? raw?.nama_warga || null : null
}

function nikKepalaKeluarga(raw: any): string | null {
  if (raw?.nik_kepala_keluarga) return raw.nik_kepala_keluarga
  return memakaiDaftar(raw) ? raw?.nik || null : null
}

// Masukkan setiap peserta usulan yang disetujui ke penerima_bansos (satu baris per orang).
// Aman diulang: peserta yang NIK-nya sudah terdaftar dilewati, tidak dibuat dobel.
async function buatPenerimaDariUsulan(raw: any, userId: string) {
  const peserta = daftarPeserta(raw)
  if (peserta.length === 0) throw new Error("Usulan ini tidak memiliki data peserta.")

  const { data: sudahAda, error: errCek } = await supabase
    .from("penerima_bansos")
    .select("nik")
    .in("nik", peserta.map((p) => p.nik))
    .is("deleted_at", null)
  if (errCek) throw errCek

  const nikTerdaftar = new Set((sudahAda || []).map((r: any) => r.nik))
  const baru = peserta.filter((p) => !nikTerdaftar.has(p.nik))

  if (baru.length > 0) {
    const sekarang = new Date().toISOString()
    const kepala = namaKepalaKeluarga(raw)

    const rows = baru.map((p) => ({
      usulan_id: raw.id,
      nama: p.nama,
      nik: p.nik,
      no_kk: raw.no_kk || null,
      nama_kepala_keluarga: kepala,
      jenis_kepesertaan: labelJenisKepesertaan(raw.jenis_kepesertaan) || null,
      alamat: raw.alamat,
      rt: raw.rt || null,
      rw: raw.rw || null,
      kelurahan: raw.desa || null,
      kecamatan: raw.kecamatan || null,
      kategori_bantuan_id: raw.kategori_bantuan_id,
      status_verifikasi: "terverifikasi",
      status_kepesertaan: "aktif",
      verified_at: sekarang,
      verified_by: userId,
    }))

    const { error } = await supabase.from("penerima_bansos").insert(rows)
    if (error) throw error
  }

  return { dibuat: baru.length, dilewati: peserta.length - baru.length }
}
// ===== Akhir fungsi bantu =====

type LaporanItem = {
  id: string
  no_tiket: string
  judul: string
  created_at: string
  jenis: "bansos" | "bencana"
  raw: any
}

// Format tanggal dari database (yyyy-mm-dd) jadi "17 Agustus 1990"
const fmtTgl = (v?: string | null) =>
  v
    ? new Date(v.length === 10 ? v + "T00:00:00" : v).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

// Gabungkan tempat dan tanggal lahir
const ttl = (tempat?: string | null, tgl?: string | null) => {
  const t = [tempat, fmtTgl(tgl)].filter(Boolean).join(", ")
  return t || "-"
}

export default function ApprovalPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<LaporanItem[]>([])
  const [selected, setSelected] = useState<LaporanItem | null>(null)
  const [catatanPetugas, setCatatanPetugas] = useState<string>("")
  const [catatanKabid, setCatatanKabid] = useState("")
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
        .eq("status", "diverifikasi"),
      supabase
        .from("laporan_bencana")
        .select("*, kategori_bencana(nama_kategori), users:rt_rw_id(nama, wilayah)")
        .eq("status", "diverifikasi"),
    ])

    const bansosItems: LaporanItem[] = (bansosRes.data || []).map((item: any) => ({
      id: item.id, no_tiket: item.no_tiket, judul: item.nama_warga,
      created_at: item.created_at, jenis: "bansos", raw: item,
    }))
    const bencanaItems: LaporanItem[] = (bencanaRes.data || []).map((item: any) => ({
      id: item.id, no_tiket: item.no_tiket, judul: item.kategori_bencana?.nama_kategori || "Bencana",
      created_at: item.created_at, jenis: "bencana", raw: item,
    }))

    const gabungan = [...bansosItems, ...bencanaItems].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    setData(gabungan)
    setLoading(false)
  }

  async function openDetail(item: LaporanItem) {
    setSelected(item)
    setCatatanKabid("")

    const tableName = item.jenis === "bansos" ? "usulan_bansos" : "laporan_bencana"

    const { data: riwayat } = await supabase
      .from("riwayat_status")
      .select("catatan, created_at")
      .eq("ref_tabel", tableName)
      .eq("ref_id", item.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    setCatatanPetugas(riwayat?.catatan || "Tidak ada catatan dari petugas.")
  }

  function closeDetail() {
    setSelected(null)
  }

  async function handleKeputusan(keputusan: "disetujui" | "ditolak") {
    if (!selected) return
    setSaving(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) return

      const tableName = selected.jenis === "bansos" ? "usulan_bansos" : "laporan_bencana"

      // Usulan BPJS PBI yang disetujui: catat peserta ke Data Peserta PBI lebih dulu.
      // Kalau gagal, status usulan belum berubah dan proses bisa diulang tanpa baris dobel.
      let infoPeserta = ""
      if (selected.jenis === "bansos" && keputusan === "disetujui") {
        const hasil = await buatPenerimaDariUsulan(selected.raw, user.id)
        infoPeserta =
          ` ${hasil.dibuat} peserta masuk ke Data Peserta PBI` +
          (hasil.dilewati > 0 ? `, ${hasil.dilewati} dilewati karena NIK sudah terdaftar` : "") +
          "."
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update({ status: keputusan })
        .eq("id", selected.id)

      if (updateError) throw updateError

      await supabase.from("riwayat_status").insert({
        ref_tabel: tableName,
        ref_id: selected.id,
        status: keputusan,
        catatan: catatanKabid || null,
        changed_by: user.id,
      })

      alert(`Laporan berhasil ${keputusan === "disetujui" ? "disetujui" : "ditolak"}.${infoPeserta}`)
      closeDetail()
      loadData()
    } catch (err: any) {
      alert("Gagal memproses: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const getJenisLabel = (jenis: string) => {
    if (jenis === "bansos") return "Bansos"
    return "Bencana"
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Memuat data approval...</div>
  }

  const raw = selected?.raw
  const pesertaTerpilih = selected?.jenis === "bansos" ? daftarPeserta(raw) : []
  const pengusul = raw?.users?.nama
    ? `${raw.users.nama}${raw.users.wilayah ? ` (${raw.users.wilayah})` : ""}`
    : ""

  return (
    <div className="p-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-indigo-950">Approval Laporan</h1>
        <p className="text-sm text-gray-500 mt-1">Laporan yang sudah diverifikasi petugas, menunggu keputusan Anda.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Jenis</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Nama/Judul</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">No. Tiket</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Tanggal</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-xs">Tidak ada laporan yang menunggu approval saat ini.</td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase">
                      {getJenisLabel(item.jenis)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.judul}
                    {item.jenis === "bansos" && daftarPeserta(item.raw).length > 1 && (
                      <span className="block text-[11px] font-normal text-gray-400">
                        {daftarPeserta(item.raw).length} peserta diajukan
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.no_tiket}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(item)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                      Tinjau
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeDetail}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase">
                  {selected.jenis === "bansos" ? "BPJS PBI" : getJenisLabel(selected.jenis)}
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">{selected.judul}</h2>
                <p className="text-xs text-gray-400 font-mono">{selected.no_tiket}</p>
              </div>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            {selected.jenis === "bansos" && (
              <div className="space-y-5 mb-5">
                <Section title="Data Kepala Keluarga">
                  <DetailRow label="No. KK" value={raw.no_kk} />
                  <DetailRow label="NIK Kepala Keluarga" value={nikKepalaKeluarga(raw)} />
                  <DetailRow label="Nama Kepala Keluarga" value={namaKepalaKeluarga(raw)} />
                  <DetailRow label="Tempat, Tanggal Lahir" value={ttl(raw.tempat_lahir_kk, raw.tanggal_lahir_kk)} />
                  <DetailRow label="RT / RW" value={raw.rt || raw.rw ? `${raw.rt || "-"} / ${raw.rw || "-"}` : ""} />
                  <DetailRow label="Desa/Kelurahan" value={raw.desa} />
                  <DetailRow label="Kecamatan" value={raw.kecamatan} />
                </Section>

                <Section title={`Peserta yang Diajukan (${pesertaTerpilih.length} orang)`}>
                  <DetailRow label="Jenis Kepesertaan" value={labelJenisKepesertaan(raw.jenis_kepesertaan)} />
                  <DetailRow label="Program" value={`BPJS PBI${raw.kategori_bantuan?.nama_kategori ? ` (${raw.kategori_bantuan.nama_kategori})` : ""}`} />
                  {pesertaTerpilih.map((p, i) => (
                    <div key={i} className="space-y-2 rounded-lg bg-white border border-gray-100 p-3">
                      <DetailRow label={`Peserta ${i + 1}`} value={p.nama} />
                      <DetailRow label="NIK" value={p.nik} />
                      {p.hubungan && <DetailRow label="Hubungan dengan KK" value={p.hubungan} />}
                      <DetailRow label="Tempat, Tanggal Lahir" value={ttl(p.tempat_lahir, p.tanggal_lahir)} />
                    </div>
                  ))}
                </Section>

                <Section title="Kondisi Ekonomi">
                  <DetailRow label="Status Kepemilikan Rumah" value={raw.status_kepemilikan_rumah} />
                  <DetailRow label="Pekerjaan" value={raw.pekerjaan} />
                  <DetailRow label="Penghasilan/Bulan" value={raw.penghasilan_bulanan} />
                  <DetailRow label="Jumlah Tanggungan KK" value={raw.jumlah_tanggungan != null ? `${raw.jumlah_tanggungan} orang` : ""} />
                  <DetailRow label="Deskripsi Kondisi" value={raw.kondisi_ekonomi} />
                </Section>

                <Section title="Kontak & Lokasi">
                  <DetailRow label="No. Kontak/WhatsApp" value={raw.no_kontak} />
                  <DetailRow label="Alamat" value={raw.alamat} />
                  <DetailRow
                    label="Link Google Maps"
                    value={
                      raw.link_maps ? (
                        <a href={raw.link_maps} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
                          Buka lokasi
                        </a>
                      ) : (
                        ""
                      )
                    }
                  />
                  <DetailRow label="Diusulkan oleh" value={pengusul} />
                </Section>

                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Berkas Persyaratan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <BerkasItem label="Kartu Keluarga (KK)" url={raw.dokumen_kk_url} />
                    <BerkasItem label="Surat Keterangan Tidak Mampu" url={raw.dokumen_sktm_url} />
                    <BerkasItem label="Formulir Assessment" url={raw.dokumen_assesment_url} />
                    <BerkasItem label="Foto Rumah Tampak Depan" url={raw.foto_url} />
                    <BerkasItem label="Dokumen Lainnya" url={raw.dokumen_pendukung_url} opsional />
                  </div>
                </div>
              </div>
            )}

            {selected.jenis === "bencana" && (
              <div className="space-y-3 text-sm mb-5">
                <DetailRow label="Lokasi" value={raw.lokasi} />
                <DetailRow label="Jenis Bencana" value={raw.kategori_bencana?.nama_kategori} />
                <DetailRow label="Jumlah KK Terdampak" value={raw.jumlah_kk_terdampak} />
                <DetailRow label="Kebutuhan Mendesak" value={raw.kebutuhan_mendesak} />
                <DetailRow label="RT/RW Pelapor" value={pengusul} />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Catatan Petugas Lapangan</p>
              <p className="text-xs text-blue-900">{catatanPetugas}</p>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Catatan Keputusan (opsional)</label>
                <textarea
                  value={catatanKabid} onChange={(e) => setCatatanKabid(e.target.value)} rows={2}
                  placeholder="Catatan alasan keputusan..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleKeputusan("ditolak")} disabled={saving}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-bold rounded-lg py-2.5 transition-all"
                >
                  {saving ? "Memproses..." : "Tolak"}
                </button>
                <button
                  onClick={() => handleKeputusan("disetujui")} disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-bold rounded-lg py-2.5 transition-all"
                >
                  {saving ? "Memproses..." : "Setujui"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-start gap-4 border-b border-gray-100 pb-2">
      <span className="text-gray-400 text-xs shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-xs text-right max-w-[60%] break-words">{value || "-"}</span>
    </div>
  )
}

// Pembungkus satu bagian data di modal
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">{title}</h3>
      <div className="space-y-2 bg-gray-50 border border-gray-100 rounded-lg p-3">{children}</div>
    </div>
  )
}

// Satu berkas: gambar tampil sebagai thumbnail, PDF sebagai kotak PDF. Klik untuk membuka di tab baru
function BerkasItem({ label, url, opsional }: { label: string; url?: string | null; opsional?: boolean }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between gap-3 text-xs border border-dashed border-gray-200 rounded-lg p-3">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className={opsional ? "text-gray-400 font-medium" : "text-red-500 font-semibold"}>
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
      className="flex items-center gap-3 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-lg p-3 transition-all"
    >
      {isPdf ? (
        <div className="w-14 h-14 rounded-lg bg-red-50 text-red-600 text-xs font-extrabold flex items-center justify-center shrink-0">
          PDF
        </div>
      ) : (
        <img src={url} alt={label} className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-900">{label}</p>
        <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Klik untuk membuka</p>
      </div>
    </a>
  )
}