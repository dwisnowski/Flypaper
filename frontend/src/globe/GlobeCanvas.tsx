import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { FlightPathResponse, Plane } from '../types'
import { AircraftLayer } from './AircraftLayer'
import { CloudShell, Earth, RadarShell } from './Earth'
import { AtmosphereDust } from './Particles'
import { EARTH_RADIUS, latLonToVec3, qualityPreset } from './geo'

function ObserverMarker({ lat, lon }: { lat: number; lon: number }) {
  const pos = useMemo(() => latLonToVec3(lat, lon, 0), [lat, lon])
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.022, 12, 12]} />
      <meshStandardMaterial color="#f4a261" emissive="#f4a261" emissiveIntensity={0.7} />
    </mesh>
  )
}

function Scene({
  planes,
  selectedId,
  onSelect,
  flightPath,
  observerLat,
  observerLon,
  radarEnabled,
}: {
  planes: Plane[]
  selectedId: string | null
  onSelect: (id: string) => void
  flightPath: FlightPathResponse | null
  observerLat: number
  observerLon: number
  radarEnabled: boolean
}) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <Stars radius={80} depth={40} count={qualityPreset().touch ? 1200 : 2500} factor={3} fade />
      <Suspense fallback={null}>
        <Earth />
        <CloudShell />
        <RadarShell enabled={radarEnabled} />
        <AtmosphereDust />
        <ObserverMarker lat={observerLat} lon={observerLon} />
        <AircraftLayer
          planes={planes}
          selectedId={selectedId}
          onSelect={onSelect}
          flightPath={flightPath}
        />
      </Suspense>
      <OrbitControls
        enablePan={false}
        minDistance={EARTH_RADIUS * 1.3}
        maxDistance={EARTH_RADIUS * 4.5}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        makeDefault
      />
    </>
  )
}

export function GlobeCanvas({
  planes,
  selectedId,
  onSelect,
  flightPath,
  observerLat,
  observerLon,
  radarEnabled,
}: {
  planes: Plane[]
  selectedId: string | null
  onSelect: (id: string) => void
  flightPath: FlightPathResponse | null
  observerLat: number
  observerLon: number
  radarEnabled: boolean
}) {
  const preset = qualityPreset()
  const cameraPos = useMemo(() => {
    const p = latLonToVec3(observerLat, observerLon, 0)
    return p.multiplyScalar(2.2).toArray() as [number, number, number]
  }, [observerLat, observerLon])

  useEffect(() => {
    const onVis = () => {
      // browsers throttle; OrbitControls still fine
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <Canvas
      dpr={preset.dpr}
      gl={{ antialias: preset.antialias, powerPreference: 'default', alpha: false }}
      camera={{ position: cameraPos, fov: 45, near: 0.1, far: 200 }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#050b12'))
        gl.domElement.style.touchAction = 'none'
      }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <Scene
        planes={planes}
        selectedId={selectedId}
        onSelect={onSelect}
        flightPath={flightPath}
        observerLat={observerLat}
        observerLon={observerLon}
        radarEnabled={radarEnabled}
      />
    </Canvas>
  )
}
