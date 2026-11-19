import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ARAGUATINS_CENTER, DEMO_BOUNDS, type LatLng } from '../lib/places'

function divIcon(cls: string, html = '') {
  return L.divIcon({ className: '', html: `<div class="${cls}">${html}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] })
}
const originIcon = divIcon('pin pin-origin')
const destIcon = divIcon('pin pin-dest')
const pickIcon = divIcon('pin pin-pick')
const carIcon = divIcon('pin pin-car', '🚗')
const motoIcon = divIcon('pin pin-car', '🏍️')

function Fit({ points }: { points: LatLng[] }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    map.invalidateSize()
    if (points.length >= 2) map.fitBounds(points as L.LatLngTuple[], { padding: [36, 36], maxZoom: 16 })
    else if (points.length === 1) map.setView(points[0], 15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}

function Picker({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return null
}

export interface MapPanelProps {
  origin?: LatLng
  dest?: LatLng
  route?: LatLng[]
  routeIsEstimate?: boolean
  vehicle?: LatLng | null
  vehicleKind?: 'moto' | 'carro'
  picking?: boolean
  picked?: LatLng | null
  onPick?: (p: LatLng) => void
  className?: string
}

export default function MapPanel(p: MapPanelProps) {
  const pts: LatLng[] = [p.origin, p.dest].filter(Boolean) as LatLng[]
  const fitPts = p.picking ? (p.picked ? [p.picked] : pts.length ? pts : [ARAGUATINS_CENTER]) : pts.length ? pts : [ARAGUATINS_CENTER]
  return (
    <div className={`map-wrap ${p.picking ? 'picking' : ''} ${p.className ?? ''}`}>
      <MapContainer
        center={ARAGUATINS_CENTER}
        zoom={14}
        minZoom={11}
        maxBounds={DEMO_BOUNDS as L.LatLngBoundsLiteral}
        maxBoundsViscosity={0.9}
        zoomControl
        attributionControl
        className="map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Fit points={fitPts} />
        {p.picking && p.onPick && <Picker onPick={p.onPick} />}
        {p.route && p.route.length > 1 && (
          <Polyline
            positions={p.route}
            pathOptions={{ color: '#7FFF00', weight: 5, opacity: p.routeIsEstimate ? 0.85 : 1, dashArray: p.routeIsEstimate ? '4 10' : undefined, lineCap: 'round' }}
          />
        )}
        {p.origin && <Marker position={p.origin} icon={originIcon}><Tooltip direction="top" offset={[0, -12]}>Partida</Tooltip></Marker>}
        {p.dest && <Marker position={p.dest} icon={destIcon}><Tooltip direction="top" offset={[0, -12]}>Destino</Tooltip></Marker>}
        {p.picked && <Marker position={p.picked} icon={pickIcon} />}
        {p.vehicle && <Marker position={p.vehicle} icon={p.vehicleKind === 'moto' ? motoIcon : carIcon} zIndexOffset={500} />}
        {!p.origin && !p.dest && !p.picking && <CircleMarker center={ARAGUATINS_CENTER} radius={0} />}
      </MapContainer>
    </div>
  )
}
