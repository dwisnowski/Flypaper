import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { FlightPathResponse, Plane } from '../types'
import { ContrailParticles } from './Particles'
import { latLonToVec3 } from './geo'

function PlaneMarker({
  plane,
  selected,
  onSelect,
}: {
  plane: Plane
  selected: boolean
  onSelect: (id: string) => void
}) {
  if (plane.latitude == null || plane.longitude == null) return null
  const pos = latLonToVec3(plane.latitude, plane.longitude, plane.baro_altitude_m ?? 0)
  return (
    <mesh
      position={pos}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(plane.icao24)
      }}
    >
      <sphereGeometry args={[selected ? 0.028 : 0.016, 10, 10]} />
      <meshStandardMaterial
        color={selected ? '#f4a261' : '#3dd6c6'}
        emissive={selected ? '#f4a261' : '#0d7377'}
        emissiveIntensity={selected ? 0.6 : 0.25}
      />
    </mesh>
  )
}

export function AircraftLayer({
  planes,
  selectedId,
  onSelect,
  flightPath,
}: {
  planes: Plane[]
  selectedId: string | null
  onSelect: (id: string) => void
  flightPath: FlightPathResponse | null
}) {
  const flown = useMemo(() => {
    if (!flightPath?.flown?.length) return [] as THREE.Vector3[]
    return flightPath.flown.map((p) => latLonToVec3(p.lat, p.lon, 8000))
  }, [flightPath])

  const remaining = useMemo(() => {
    if (!flightPath?.remaining?.length) return [] as THREE.Vector3[]
    return flightPath.remaining.map((p) => latLonToVec3(p.lat, p.lon, 8000))
  }, [flightPath])

  const dest =
    flightPath?.destination != null
      ? latLonToVec3(flightPath.destination.lat, flightPath.destination.lon, 0)
      : null

  const flownPts = useMemo(() => flown.map((v) => v.toArray() as [number, number, number]), [flown])
  const remPts = useMemo(
    () => remaining.map((v) => v.toArray() as [number, number, number]),
    [remaining],
  )

  return (
    <group>
      {planes.map((p) => (
        <PlaneMarker
          key={p.icao24}
          plane={p}
          selected={p.icao24 === selectedId}
          onSelect={onSelect}
        />
      ))}
      {flownPts.length >= 2 && (
        <Line points={flownPts} color="#3dd6c6" lineWidth={2} transparent opacity={0.95} />
      )}
      {remPts.length >= 2 && (
        <Line
          points={remPts}
          color="#ef476f"
          lineWidth={2}
          dashed
          dashSize={0.04}
          gapSize={0.03}
          transparent
          opacity={0.9}
        />
      )}
      <ContrailParticles points={flown} />
      {dest && (
        <mesh position={dest}>
          <boxGeometry args={[0.03, 0.03, 0.03]} />
          <meshStandardMaterial color="#ef476f" emissive="#ef476f" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  )
}
