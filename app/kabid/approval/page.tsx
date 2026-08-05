"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type LaporanItem = {
  id: string
  no_tiket: string
  judul: string
  created_at: string
  jenis: "bansos" | "bencana"
  raw: any
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

      if (selected.jenis === "bansos" && keputusan === "disetujui") {
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

      alert(`Laporan berhasil ${keputusan === "disetujui" ? "disetujui" : "ditolak"}`)
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
                  <td className="px-4 py-3 font-medium text-gray-900">{item.judul}</td>
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
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase">
                  {getJenisLabel(selected.jenis)}
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">{selected.judul}</h2>
                <p className="text-xs text-gray-400 font-mono">{selected.no_tiket}</p>
              </div>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <div className="space-y-3 text-sm mb-4">
              {selected.jenis === "bansos" && (
                <>
                  <DetailRow label="NIK" value={selected.raw.nik} />
                  <DetailRow label="Alamat" value={selected.raw.alamat} />
                  <DetailRow label="Kategori Bantuan" value={selected.raw.kategori_bantuan?.nama_kategori} />
                  <DetailRow label="Kondisi Ekonomi" value={selected.raw.kondisi_ekonomi} />
                  <DetailRow label="RT/RW Pengusul" value={`${selected.raw.users?.nama} - ${selected.raw.users?.wilayah}`} />
                  {selected.raw.foto_url && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Foto Rumah</p>
                      <img src={selected.raw.foto_url} alt="Foto" className="w-full max-h-40 object-cover rounded-lg border" />
                    </div>
                  )}
                </>
              )}
              {selected.jenis === "bencana" && (
                <>
                  <DetailRow label="Lokasi" value={selected.raw.lokasi} />
                  <DetailRow label="Jenis Bencana" value={selected.raw.kategori_bencana?.nama_kategori} />
                  <DetailRow label="Jumlah KK Terdampak" value={selected.raw.jumlah_kk_terdampak} />
                  <DetailRow label="Kebutuhan Mendesak" value={selected.raw.kebutuhan_mendesak} />
                  <DetailRow label="RT/RW Pelapor" value={`${selected.raw.users?.nama} - ${selected.raw.users?.wilayah}`} />
                </>
              )}
            </div>

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
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="font-medium text-gray-900 text-xs text-right max-w-[60%]">{value || "-"}</span>
    </div>
  )
}