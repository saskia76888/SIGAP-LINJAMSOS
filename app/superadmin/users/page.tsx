"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type UserItem = {
  id: string
  nama: string
  email: string
  role: string
  wilayah: string | null
  no_hp: string | null
  is_active: boolean
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterRole, setFilterRole] = useState("semua")
  const [searchQuery, setSearchQuery] = useState("")

  const [filterStatus, setFilterStatus] = useState("semua")
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  const [formData, setFormData] = useState({
    nama: "", email: "", password: "", role: "rt_rw", wilayah: "", noHp: "",
  })

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from("users").select("*").order("nama")
    setUsers(data || [])
    setLoading(false)
  }

  const filtered = users.filter((u) => {
    const matchRole = filterRole === "semua" || u.role === filterRole
    const matchStatus = filterStatus === "semua" || (filterStatus === "aktif" ? u.is_active : !u.is_active)
    const matchSearch = u.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.wilayah && u.wilayah.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (u.no_hp && u.no_hp.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchRole && matchStatus && matchSearch
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const result = await res.json()

      if (!result.success) throw new Error(result.error)

      alert("User berhasil dibuat")
      setShowModal(false)
      setFormData({ nama: "", email: "", password: "", role: "rt_rw", wilayah: "", noHp: "" })
      loadUsers()
    } catch (err: any) {
      alert("Gagal membuat user: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(userItem: UserItem) {
    const { error } = await supabase
      .from("users")
      .update({ is_active: !userItem.is_active })
      .eq("id", userItem.id)

    if (error) {
      alert("Gagal update status: " + error.message)
      return
    }
    loadUsers()
  }

  function exportToCSV() {
    const headers = ["Nama,Email,Role,Wilayah,No HP,Status"]
    const rows = filtered.map(u => `"${u.nama}","${u.email}","${u.role}","${u.wilayah || '-'}","${u.no_hp || '-'}","${u.is_active ? 'Aktif' : 'Nonaktif'}"`)
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `data_users_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const roleLabel = (role: string) => {
    if (role === "rt_rw") return "RT/RW"
    if (role === "petugas") return "Petugas"
    if (role === "kabid") return "Kepala Bidang"
    if (role === "superadmin") return "Superadmin"
    return role
  }

  const roleBadgeStyle = (role: string) => {
    if (role === "rt_rw") return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
    if (role === "petugas") return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    if (role === "kabid") return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    if (role === "superadmin") return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
    return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#0B0F19]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Memuat data user...</p>
      </div>
    )
  }

  const totalAktif = users.filter(u => u.is_active).length
  const totalRtRw = users.filter(u => u.role === "rt_rw").length
  const totalPetugas = users.filter(u => u.role === "petugas").length

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen pb-20 font-sans text-slate-900 dark:text-white bg-slate-50 dark:bg-[#0B0F19] transition-colors">
      
      {/* STAT CARDS ALA REFERENSI GAMBAR (Clean, Rounded, Gradient Icon Box di Kanan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Pengguna */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Pengguna</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{users.length}</h3>
              <span className="text-[11px] font-bold text-emerald-500">+100%</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white flex items-center justify-center shadow-md shadow-violet-500/25 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M13 9a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          </div>
        </div>

        {/* Card 2: Status Aktif */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Status Aktif</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{totalAktif}</h3>
              <span className="text-[11px] font-bold text-emerald-500">Aktif</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>

        {/* Card 3: Akun RT / RW */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Akun RT / RW</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{totalRtRw}</h3>
              <span className="text-[11px] font-bold text-cyan-500">Wilayah</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/25 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          </div>
        </div>

        {/* Card 4: Petugas Lapangan */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Petugas Lapangan</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{totalPetugas}</h3>
              <span className="text-[11px] font-bold text-blue-500">Tim</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
        </div>

      </div>

      {/* Top Bar (Search, Filter Role, Filter Status, & Tombol Tambah/Export) */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <input 
            type="text" 
            placeholder="Cari nama, email, wilayah, atau no HP..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#1F2937]/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-600 transition-all cursor-pointer"
          >
            <option value="semua" className="bg-white dark:bg-[#111827]">Semua Status</option>
            <option value="aktif" className="bg-white dark:bg-[#111827]">Aktif</option>
            <option value="nonaktif" className="bg-white dark:bg-[#111827]">Nonaktif</option>
          </select>

          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)} 
            className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-600 transition-all cursor-pointer"
          >
            <option value="semua" className="bg-white dark:bg-[#111827]">Semua Role</option>
            <option value="rt_rw" className="bg-white dark:bg-[#111827]">RT/RW</option>
            <option value="petugas" className="bg-white dark:bg-[#111827]">Petugas</option>
            <option value="kabid" className="bg-white dark:bg-[#111827]">Kepala Bidang</option>
            <option value="superadmin" className="bg-white dark:bg-[#111827]">Superadmin</option>
          </select>

          <button
            onClick={exportToCSV}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shrink-0"
            title="Export data ke CSV"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-violet-600/25 transition-all flex items-center gap-2 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Tambah User
          </button>
        </div>
      </div>

      {/* Header Judul Halaman */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Manajemen User</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kelola hak akses dan informasi petugas penyalur bantuan sosial.</p>
      </div>

      {/* Tabel Data Utama */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-[#1F2937]/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-3.5">Nama & Kontak</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Wilayah</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                    Tidak ada data pengguna yang ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                          {u.nama.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <button onClick={() => setSelectedUser(u)} className="font-bold text-slate-900 dark:text-white text-xs hover:text-violet-600 dark:hover:text-violet-400 text-left transition-colors">
                            {u.nama}
                          </button>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] font-mono mt-0.5">{u.email}</div>
                          {u.no_hp && <div className="text-slate-400 text-[10px] mt-0.5 flex items-center gap-1">📱 {u.no_hp}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${roleBadgeStyle(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 text-xs font-medium">
                      {u.wilayah || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleActive(u)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${u.is_active ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                        title={u.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${u.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedUser(u)}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                        >
                          Detail
                        </button>
                        <button 
                          onClick={() => toggleActive(u)} 
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${u.is_active ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"}`}
                        >
                          {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 dark:bg-[#1F2937]/30 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Menampilkan <strong>{filtered.length}</strong> dari <strong>{users.length}</strong> user terdaftar</span>
          <div className="flex gap-1.5">
            <button className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all">‹</button>
            <button className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all">›</button>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL USER */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Detail Informasi Pengguna</h3>
              <button onClick={() => setSelectedUser(null)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs">✕</button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#1F2937]/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedUser.nama}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-[#1F2937]/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{selectedUser.email}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1F2937]/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">No. WhatsApp</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{selectedUser.no_hp || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-[#1F2937]/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Role Akses</span>
                  <div><span className={`inline-block mt-0.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${roleBadgeStyle(selectedUser.role)}`}>{roleLabel(selectedUser.role)}</span></div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1F2937]/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status Akun</span>
                  <p className={`font-bold mt-0.5 ${selectedUser.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {selectedUser.is_active ? 'Aktif' : 'Nonaktif'}
                  </p>
                </div>
              </div>
              {selectedUser.wilayah && (
                <div className="p-3 bg-slate-50 dark:bg-[#1F2937]/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Wilayah Penugasan</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{selectedUser.wilayah}</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button onClick={() => setSelectedUser(null)} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-bold py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-all">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER TAMBAH USER */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex justify-end z-50 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-[#111827] border-l border-slate-200 dark:border-slate-800 h-full max-w-md w-full p-7 shadow-2xl flex flex-col justify-between overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            
            <div>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-black text-slate-900 dark:text-white">Tambah User Baru</h2>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} id="createUserForm" className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nama Lengkap</label>
                  <input name="nama" value={formData.nama} onChange={handleChange} required placeholder="Contoh: Ahmad Subarjo" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-600 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Alamat Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="nama@email.com" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-600 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">No. HP (WhatsApp)</label>
                  <input name="noHp" value={formData.noHp} onChange={handleChange} placeholder="0812xxxx" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-600 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Role Pengguna</label>
                  <select name="role" value={formData.role} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-600 transition-all font-medium cursor-pointer">
                    <option value="rt_rw" className="bg-white dark:bg-[#111827]">RT/RW</option>
                    <option value="petugas" className="bg-white dark:bg-[#111827]">Petugas Lapangan</option>
                    <option value="kabid" className="bg-white dark:bg-[#111827]">Kepala Bidang</option>
                    <option value="superadmin" className="bg-white dark:bg-[#111827]">Superadmin</option>
                  </select>
                </div>
                {formData.role === "rt_rw" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Wilayah (RT/RW)</label>
                    <input name="wilayah" value={formData.wilayah} onChange={handleChange} placeholder="Contoh: RT 03 / RW 05" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-600 transition-all font-medium" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="••••••••" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-600 transition-all font-medium" />
                </div>
              </form>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <button 
                type="submit" 
                form="createUserForm"
                disabled={saving} 
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl py-3.5 shadow-lg shadow-violet-600/25 transition-all"
              >
                {saving ? "Menyimpan User..." : "Simpan User Baru"}
              </button>
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white py-2 transition-all"
              >
                Batalkan
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}