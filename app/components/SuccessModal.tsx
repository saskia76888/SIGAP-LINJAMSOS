"use client"

type Props = {
  show: boolean
  title: string
  noTiket: string
  onClose: () => void
}

export default function SuccessModal({ show, title, noTiket, onClose }: Props) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-1">Nomor tiket pengajuan Anda:</p>
        <p className="text-sm font-mono font-semibold text-blue-950 bg-blue-50 rounded-lg py-2 mb-5">
          {noTiket}
        </p>
        <button
          onClick={onClose}
          className="w-full bg-blue-950 hover:bg-blue-900 text-white text-sm font-bold rounded-xl py-3 transition-all"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  )
}