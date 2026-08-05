"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SuccessModal from "@/app/components/SuccessModal"

export default function AjukanBansosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dokumenInputRef = useRef<HTMLInputElement>(null)

  const [kategoriList, setKategoriList] = useState<{ id: string; nama_kategori: string }[]>([])
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [dokumenFile, setDokumenFile] = useState<File | null>(null)
  const [dokumenPreview, setDokumenPreview] = useState<string | null>(null)
  const [wilayahUser, setWilayahUser] = useState("")

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [noTiketBerhasil, setNoTiketBerhasil] = useState("")

  const [formData, setFormData] = useState({
    namaWarga: "",
    nik: "",
    alamat: "",
    noKontak: "",
    linkMaps: "",
    jenisBansos: "",
    jenisBansosLainnya: "",
    keterangan: "",
    statusKepemilikanRumah: "",
    pekerjaan: "",
    penghasilanBulanan: "",
    jumlahTanggungan: ""
  })

  useEffect(() => {
    async function loadInitialData() {
      const { data: kategoriData } = await supabase
        .from("kategori_bantuan")
        .select("id, nama_kategori")
        .order("nama_kategori")

      if (kategoriData) {
        const sorted = [...kategoriData].sort((a, b) => {
          if (a.nama_kategori === "Lainnya") return 1
          if (b.nama_kategori === "Lainnya") return -1
          return a.nama_kategori.localeCompare(b.nama_kategori)
        })
        setKategoriList(sorted)
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("wilayah")
          .eq("id", user.id)
          .single()
        if (userData?.wilayah) setWilayahUser(userData.wilayah)
      }
    }
    loadInitialData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFotoFile(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  function handleDokumenSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setDokumenFile(file)
      if (file.type.startsWith("image/")) {
        setDokumenPreview(URL.createObjectURL(file))
      } else {
        setDokumenPreview(null)
      }
    }
  }

  const nextStep = () => setStep((prev) => prev + 1)
  const prevStep = () => setStep((prev) => prev - 1)

  const namaKategoriTerpilih = kategoriList.find((k) => k.id === formData.jenisBansos)?.nama_kategori || "-"
  const isLainnya = namaKategoriTerpilih === "Lainnya"

  async function uploadFile(file: File, folder: string) {
    const fileExt = file.name.split(".").pop()
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("bukti-pengajuan")
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from("bukti-pengajuan")
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (parseInt(formData.jumlahTanggungan) < 0) {
      alert("Jumlah tanggungan tidak boleh minus")
      return
    }

    if (!fotoFile) {
      alert("Foto kondisi rumah wajib diunggah")
      return
    }

    setLoading(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        alert("Sesi login habis, silakan login ulang")
        router.push("/login")
        return
      }

      let fotoUrl: string | null = null
      if (fotoFile) fotoUrl = await uploadFile(fotoFile, "bansos")

      let dokumenUrl: string | null = null
      if (dokumenFile) dokumenUrl = await uploadFile(dokumenFile, "bansos-dokumen")

      const noTiket = "PGD-" + Date.now()

      const kondisiEkonomiFinal = isLainnya
        ? `[Jenis bantuan: ${formData.jenisBansosLainnya}] ${formData.keterangan}`
        : formData.keterangan

      const { error: insertError } = await supabase.from("usulan_bansos").insert({
        no_tiket: noTiket,
        rt_rw_id: user.id,
        nama_warga: formData.namaWarga,
        nik: formData.nik,
        alamat: `${formData.alamat} (${wilayahUser})`,
        no_kontak: formData.noKontak,
        link_maps: formData.linkMaps || null,
        kondisi_ekonomi: kondisiEkonomiFinal,
        kategori_bantuan_id: formData.jenisBansos,
        foto_url: fotoUrl,
        dokumen_pendukung_url: dokumenUrl,
        status_kepemilikan_rumah: formData.statusKepemilikanRumah,
        pekerjaan: formData.pekerjaan,
        penghasilan_bulanan: formData.penghasilanBulanan,
        jumlah_tanggungan: formData.jumlahTanggungan ? parseInt(formData.jumlahTanggungan) : null,
        status: "baru"
      })

      if (insertError) throw insertError

      setNoTiketBerhasil(noTiket)
      setShowSuccessModal(true)
    } catch (err: any) {
      alert("Gagal mengirim: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans antialiased text-gray-950 pb-12">
      
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="font-bold text-sm text-blue-950 tracking-wider uppercase">Sigap Bansos</span>
          </div>
          <button onClick={() => router.push("/rtrw/dashboard")} className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 bg-white shadow-sm">
            Batal & Kembali
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-7 space-y-6">
          
          <div className="flex items-center justify-between relative px-2 py-2 max-w-xl mx-auto">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
            
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-[#f8fafc] px-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-blue-950 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > 1 ? "✓" : "1"}
              </div>
              <span className="text-[10px] font-bold text-blue-950 tracking-tight">Data Diri</span>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-[#f8fafc] px-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-950 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
              <span className={`text-[10px] font-bold tracking-tight ${step >= 2 ? 'text-blue-950' : 'text-gray-400'}`}>Detail Bantuan</span>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-[#f8fafc] px-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 3 ? 'bg-blue-950 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
              <span className={`text-[10px] font-bold tracking-tight ${step === 3 ? 'text-blue-950' : 'text-gray-400'}`}>Konfirmasi</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-blue-950 tracking-tight">Data Penerima Manfaat</h2>
                  <p className="text-xs text-gray-400 mt-1">Pastikan data yang Anda masukkan sesuai dengan Kartu Tanda Penduduk (KTP) yang berlaku.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Nama Lengkap</label>
                    <input
                      type="text" name="namaWarga" value={formData.namaWarga} onChange={handleChange}
                      placeholder="Masukkan nama sesuai KTP"
                      className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Nomor Induk Kependudukan (NIK)</label>
                    <div className="relative">
                      <input
                        type="text" name="nik" maxLength={16} value={formData.nik} onChange={handleChange}
                        placeholder="16 digit NIK"
                        className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all pr-9"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-serif text-xs italic border border-gray-300 w-4 h-4 rounded-full inline-flex items-center justify-center cursor-help" title="Harus 16 Angka KTP">i</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Nomor Kontak/WhatsApp <span className="text-red-500">*</span></label>
                    <input
                      type="tel" name="noKontak" value={formData.noKontak} onChange={handleChange}
                      placeholder="Contoh: 0812xxxxxxx (bisa nomor warga atau nomor RT/RW)"
                      className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Kalau warga tidak punya HP, isi nomor Anda selaku penghubung.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Alamat Lengkap</label>
                    <textarea
                      name="alamat" rows={3} value={formData.alamat} onChange={handleChange}
                      placeholder="Jl. Raya Utama No. 123, RT/RW, Kelurahan, Kecamatan..."
                      className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Minimal 15 karakter, isi alamat lengkap dan jelas.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Link Google Maps (opsional)</label>
                    <input
                      type="text" name="linkMaps" value={formData.linkMaps} onChange={handleChange}
                      placeholder="Tempel link lokasi Google Maps di sini"
                      className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Berguna untuk lokasi yang sulit ditemukan dari alamat teks saja.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Wilayah Pelapor</label>
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-600">
                      {wilayahUser || "Memuat wilayah..."}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 flex items-start gap-3">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">i</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">Sistem akan memverifikasi data secara otomatis guna memastikan kelayakan bantuan.</p>
                </div>

                <button
                  type="button" onClick={nextStep}
                  disabled={!formData.namaWarga || !formData.nik || !formData.noKontak || formData.alamat.length < 15}
                  className="w-full bg-blue-950 hover:bg-blue-900 disabled:bg-gray-300 disabled:text-gray-500 text-white text-xs font-bold rounded-xl py-3 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  Lanjut 
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-blue-950 tracking-tight">Detail Bantuan & Kondisi</h2>
                  <p className="text-xs text-gray-400 mt-1">Lengkapi informasi bantuan yang diajukan serta indikator kondisi ekonomi untuk proses verifikasi.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Jenis Bantuan <span className="text-red-500">*</span></label>
                    <select name="jenisBansos" value={formData.jenisBansos} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all">
                      <option value="">Pilih Program Bantuan</option>
                      {kategoriList.map((k) => (
                        <option key={k.id} value={k.id}>{k.nama_kategori}</option>
                      ))}
                    </select>
                  </div>

                  {isLainnya && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Sebutkan Jenis Bantuan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" name="jenisBansosLainnya" value={formData.jenisBansosLainnya} onChange={handleChange}
                        placeholder="Contoh: Bantuan Yatim Piatu Daerah"
                        className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Status Kepemilikan Rumah <span className="text-red-500">*</span></label>
                      <select name="statusKepemilikanRumah" value={formData.statusKepemilikanRumah} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all">
                        <option value="">Pilih status</option>
                        <option value="Milik Sendiri">Milik Sendiri</option>
                        <option value="Mengontrak">Mengontrak</option>
                        <option value="Menumpang">Menumpang</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Jumlah Tanggungan <span className="text-red-500">*</span></label>
                      <input
                        type="number" name="jumlahTanggungan" value={formData.jumlahTanggungan} onChange={handleChange}
                        min="0"
                        onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault() }}
                        placeholder="Contoh: 3"
                        className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Pekerjaan <span className="text-red-500">*</span></label>
                      <input
                        type="text" name="pekerjaan" value={formData.pekerjaan} onChange={handleChange}
                        placeholder="Contoh: Buruh harian"
                        className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Penghasilan/Bulan <span className="text-red-500">*</span></label>
                      <select name="penghasilanBulanan" value={formData.penghasilanBulanan} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all">
                        <option value="">Pilih rentang</option>
                        <option value="< Rp1.000.000">&lt; Rp1.000.000</option>
                        <option value="Rp1.000.000 - Rp2.000.000">Rp1.000.000 - Rp2.000.000</option>
                        <option value="Rp2.000.000 - Rp3.000.000">Rp2.000.000 - Rp3.000.000</option>
                        <option value="> Rp3.000.000">&gt; Rp3.000.000</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-gray-700">Deskripsi Kondisi Ekonomi <span className="text-red-500">*</span></label>
                      <span className="text-[10px] text-gray-400">Minimal 30 karakter</span>
                    </div>
                    <textarea
                      name="keterangan" rows={4} value={formData.keterangan} onChange={handleChange}
                      placeholder="Contoh: Kepala keluarga bekerja sebagai buruh serabutan dengan penghasilan tidak menentu, rumah masih menumpang di rumah orang tua, kebutuhan sehari-hari sering kekurangan..."
                      className="w-full border border-gray-200 bg-gray-50/30 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-950 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Foto Kondisi Rumah/Keluarga <span className="text-red-500">*</span></label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 bg-gray-50/20 rounded-xl p-5 text-center cursor-pointer hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-1.5"
                    >
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Preview" className="h-24 rounded-lg object-cover" />
                      ) : (
                        <>
                          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-700">Klik untuk unggah foto</span>
                          <span className="text-[9px] text-gray-400">Format: JPG, PNG (Maks. 5MB)</span>
                        </>
                      )}
                    </div>
                    {fotoFile && (
                      <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Foto terunggah: {fotoFile.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Dokumen Pendukung (KTP/KK/SKTM)</label>
                    <input
                      type="file"
                      ref={dokumenInputRef}
                      accept="image/*,.pdf"
                      onChange={handleDokumenSelect}
                      className="hidden"
                    />
                    <div
                      onClick={() => dokumenInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 bg-gray-50/20 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-1.5"
                    >
                      {dokumenPreview ? (
                        <img src={dokumenPreview} alt="Preview dokumen" className="h-24 rounded-lg object-cover" />
                      ) : dokumenFile ? (
                        <>
                          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-700">{dokumenFile.name}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-700">Klik untuk unggah dokumen (opsional)</span>
                          <span className="text-[9px] text-gray-400">Format: JPG, PNG, atau PDF</span>
                        </>
                      )}
                    </div>
                    {dokumenFile && (
                      <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Dokumen terunggah: {dokumenFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button type="button" onClick={prevStep} className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl py-3 transition-all flex items-center justify-center gap-1">
                    ← Kembali
                  </button>
                  <button 
                    type="button" onClick={nextStep}
                    disabled={!formData.jenisBansos || formData.keterangan.length < 30 || (isLainnya && !formData.jenisBansosLainnya) || !formData.statusKepemilikanRumah || !formData.pekerjaan || !formData.penghasilanBulanan || formData.jumlahTanggungan === "" || parseInt(formData.jumlahTanggungan) < 0 || !fotoFile}
                    className="w-full bg-blue-950 hover:bg-blue-900 disabled:bg-gray-300 disabled:text-gray-500 text-white text-xs font-bold rounded-xl py-3 transition-all flex items-center justify-center gap-1"
                  >
                    Lanjut →
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-blue-950 tracking-tight">Periksa Kembali Data</h2>
                  <p className="text-xs text-gray-400 mt-1">Pastikan seluruh data usulan sudah benar sebelum dikirim ke pusat.</p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">Nama Warga</span>
                    <span className="font-semibold text-gray-900">{formData.namaWarga}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">NIK KTP</span>
                    <span className="font-mono font-semibold text-gray-900">{formData.nik}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">Nomor Kontak</span>
                    <span className="font-semibold text-gray-900">{formData.noKontak}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">Wilayah</span>
                    <span className="font-semibold text-gray-900">{wilayahUser}</span>
                  </div>
                  {formData.linkMaps && (
                    <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                      <span className="text-gray-400">Link Maps</span>
                      <a href={formData.linkMaps} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline truncate max-w-[200px]">
                        Lihat lokasi
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">Jenis Program</span>
                    <span className="font-bold text-blue-600 uppercase">
                      {isLainnya ? formData.jenisBansosLainnya : namaKategoriTerpilih}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">Kepemilikan Rumah</span>
                    <span className="font-semibold text-gray-900">{formData.statusKepemilikanRumah}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">Pekerjaan</span>
                    <span className="font-semibold text-gray-900">{formData.pekerjaan}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">Penghasilan/Bulan</span>
                    <span className="font-semibold text-gray-900">{formData.penghasilanBulanan}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400">Jumlah Tanggungan</span>
                    <span className="font-semibold text-gray-900">{formData.jumlahTanggungan} orang</span>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-gray-400">Status Lampiran</span>
                    <div className="flex items-center gap-2">
                      {fotoPreview && (
                        <img src={fotoPreview} alt="Foto rumah" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                      )}
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Foto rumah: Terunggah
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {dokumenPreview && (
                        <img src={dokumenPreview} alt="Dokumen" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                      )}
                      <span className={dokumenFile ? "text-green-600 font-semibold flex items-center gap-1" : "text-gray-400"}>
                        {dokumenFile ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Dokumen pendukung: Terunggah
                          </>
                        ) : (
                          "Dokumen pendukung: Tidak diunggah"
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-gray-400">Alamat & Keterangan Kondisi:</span>
                    <p className="bg-white border border-gray-100 rounded-lg p-2 text-gray-600 font-light">
                      {formData.alamat}. <br/><span className="text-[11px] text-gray-500">Analisis: {formData.keterangan}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={prevStep} disabled={loading} className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl py-3 transition-all">Perbaiki</button>
                  <button
                    type="button" onClick={handleSubmit} disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl py-3 shadow-md shadow-blue-600/10 transition-all flex items-center justify-center"
                  >
                    {loading ? "Mengirim Data..." : "Kirim Usulan Resmi"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-[#0b457e] text-white rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>ℹ️</span> Panduan Pengisian
            </h3>
            
            <div className="space-y-3.5 text-xs text-blue-100/90 leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <span className="font-bold text-white bg-blue-900/40 w-5 h-5 rounded-md flex items-center justify-center shrink-0">01</span>
                <p>Isi seluruh indikator ekonomi (kepemilikan rumah, pekerjaan, penghasilan, tanggungan) sesuai kondisi sebenarnya di lapangan.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="font-bold text-white bg-blue-900/40 w-5 h-5 rounded-md flex items-center justify-center shrink-0">02</span>
                <p>Foto rumah harus mencakup tampak depan secara jelas dan area ruang tamu utama.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="font-bold text-white bg-blue-900/40 w-5 h-5 rounded-md flex items-center justify-center shrink-0">03</span>
                <p>Data yang diberikan akan diverifikasi langsung oleh petugas lapangan dalam waktu 3-5 hari kerja.</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-xs text-gray-900">Butuh Bantuan?</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Hubungi WhatsApp 1500-XXX jika ada kendala sistem.</p>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900 to-slate-900 p-5 shadow-md">
            <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=400&q=80')` }} />
            <p className="relative z-10 text-xs text-blue-200/90 italic font-serif leading-relaxed">
              "Melayani dengan Empati dan Transparansi untuk Indonesia lebih Sejahtera."
            </p>
          </div>

        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center text-[10px] text-gray-400">
        &copy; 2026 SIGAP LINJAMSOS. Melayani dengan Empati dan Transparansi.
      </div>

      <SuccessModal
        show={showSuccessModal}
        title="Pengajuan Berhasil Dikirim"
        noTiket={noTiketBerhasil}
        onClose={() => router.push("/rtrw/dashboard")}
      />
    </main>
  )
}