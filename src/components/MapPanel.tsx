import { useEffect, useMemo } from 'react'
import { Circle, MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getBoundary, MUNICIPIO_BBOX } from '../lib/boundary'
import type { MyPos } from '../lib/geo'
import { ARAGUATINS_CENTER, type LatLng } from '../lib/places'
import { iconHtml } from './Icon'

function divIcon(cls: string, html = '', size = 28) {
  return L.divIcon({ className: '', html: `<div class="${cls}">${html}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}
const originIcon = divIcon('pin pin-origin')
const destIcon = divIcon('pin pin-dest')
const pickIcon = divIcon('pin pin-pick', iconHtml('pin-fill', 16))
const meIcon = divIcon('pin pin-me', '<i></i>', 22)
const carIcon = divIcon('pin pin-car', iconHtml('car', 18), 32)
const motoIcon = divIcon('pin pin-car', iconHtml('moto', 20), 32)

function Fit({ points, zoomTo }: { points: LatLng[]; zoomTo: number }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    map.invalidateSize()
    if (points.length >= 2) map.fitBounds(points as L.LatLngTuple[], { padding: [36, 36], maxZoom: 16 })
    else if (points.length === 1) map.setView(points[0], zoomTo)
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
  /** Posição real do usuário (ponto azul). */
  me?: MyPos | null
  picking?: boolean
  picked?: LatLng | null
  onPick?: (p: LatLng) => void
  className?: string
}

export default function MapPanel(p: MapPanelProps) {
  const pts: LatLng[] = [p.origin, p.dest].filter(Boolean) as LatLng[]
  const mePt: LatLng | null = p.me ? [p.me.lat, p.me.lng] : null
  let fitPts: LatLng[]
  if (p.picking && p.picked) fitPts = [p.picked]
  else if (pts.length) fitPts = pts
  else if (mePt) fitPts = [mePt]
  else fitPts = [ARAGUATINS_CENTER]

  const boundary = getBoundary()
  // Contorno do município só ao escolher um ponto: mostra onde a demo atende.
  const outline = useMemo(
    () => (p.picking && boundary ? boundary.polygons.map(([outer]) => outer.map(([lng, lat]) => [lat, lng] as LatLng)) : []),
    [p.picking, boundary],
  )
  const [s, w, n, e] = boundary?.bbox ?? MUNICIPIO_BBOX

  return (
    <div className={`map-wrap ${p.picking ? 'picking' : ''} ${p.className ?? ''}`}>
      <MapContainer
        center={ARAGUATINS_CENTER}
        zoom={14}
        minZoom={9}
        maxBounds={[[s - 0.05, w - 0.05], [n + 0.05, e + 0.05]]}
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
        <Fit points={fitPts} zoomTo={p.picking ? 14 : 15} />
        {p.picking && p.onPick && <Picker onPick={p.onPick} />}
        {outline.map((ring, i) => (
          <Polygon key={i} positions={ring} interactive={false} pathOptions={{ color: '#7FFF00', weight: 2, dashArray: '6 8', fillOpacity: 0.03, opacity: 0.7 }} />
        ))}
        {p.route && p.route.length > 1 && (
          <Polyline
            positions={p.route}
            pathOptions={{ color: '#7FFF00', weight: 5, opacity: p.routeIsEstimate ? 0.85 : 1, dashArray: p.routeIsEstimate ? '4 10' : undefined, lineCap: 'round' }}
          />
        )}
        {p.origin && <Marker position={p.origin} icon={originIcon}><Tooltip direction="top" offset={[0, -12]}>Partida</Tooltip></Marker>}
        {p.dest && <Marker position={p.dest} icon={destIcon}><Tooltip direction="top" offset={[0, -12]}>Destino</Tooltip></Marker>}
        {p.picked && <Marker position={p.picked} icon={pickIcon} />}
        {mePt && p.me && (
          <>
            {p.me.accuracy < 1500 && <Circle center={mePt} radius={p.me.accuracy} interactive={false} pathOptions={{ color: '#3B9DFF', weight: 1, fillColor: '#3B9DFF', fillOpacity: 0.12 }} />}
            <Marker position={mePt} icon={meIcon} zIndexOffset={400} interactive={false} />
          </>
        )}
        {p.vehicle && <Marker position={p.vehicle} icon={p.vehicleKind === 'moto' ? motoIcon : carIcon} zIndexOffset={500} />}
      </MapContainer>
    </div>
  )
}
