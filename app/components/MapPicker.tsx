"use client"
import { useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

type Props = {
  onPick: (lat: number, lng: number) => void
}

function LocationMarker({ onPick }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(null)

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })

  return position ? <Marker position={position} /> : null
}

export default function MapPicker({ onPick }: Props) {
  const defaultCenter: [number, number] = [-7.2159, 107.9086]

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: "160px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <LocationMarker onPick={onPick} />
    </MapContainer>
  )
}