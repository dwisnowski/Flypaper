import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
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
  const mesh = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const hasCoords = plane.latitude != null && plane.longitude != null
  const pos = useMemo(
    () =>
      hasCoords
        ? latLonToVec3(plane.latitude!, plane.longitude!, plane.baro_altitude_m ?? 0)
        : new THREE.Vector3(),
    [hasCoords, plane.latitude, plane.longitude, plane.baro_altitude_m],
  )

  useFrame(() => {
    if (!mesh.current || !hasCoords) return
    // Scale from camera→marker distance (not Earth-center altitude).
    const dist = camera.position.distanceTo(pos)
    const size = THREE.MathUtils.clamp(dist * 0.085, 0.0007, 0.02)
    mesh.current.scale.setScalar(selected ? size * 1.55 : size)
  })

  if (!hasCoords) return null

  return (
    <mesh
      ref={mesh}
      position={pos}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(plane.icao24)
      }}
    >
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial
        color={selected ? '#f4a261' : '#3dd6c6'}
        emissive={selected ? '#f4a261' : '#0d7377'}
        emissiveIntensity={selected ? 0.7 : 0.3}
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
  const visiblePlanes = useMemo(
    () => (selectedId ? planes.filter((p) => p.icao24 === selectedId) : planes),
    [planes, selectedId],
  )

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
      {visiblePlanes.map((p) => (
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
          <boxGeometry args={[0.012, 0.012, 0.012]} />
          <meshStandardMaterial color="#ef476f" emissive="#ef476f" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  )
}
