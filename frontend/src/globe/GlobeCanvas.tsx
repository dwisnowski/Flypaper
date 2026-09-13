import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { FlightPathResponse, Plane } from '../types'
import { AircraftLayer } from './AircraftLayer'
import { CloudShell, Earth, RadarShell } from './Earth'
import { AtmosphereDust } from './Particles'
import {
  EARTH_RADIUS,
  latLonToVec3,
  qualityPreset,
  ZOOM_MAX_DISTANCE,
  ZOOM_MIN_DISTANCE,
  ZOOM_START_DISTANCE,
} from './geo'

function ObserverMarker({ lat, lon }: { lat: number; lon: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const pos = useMemo(() => latLonToVec3(lat, lon, 0), [lat, lon])

  useFrame(() => {
    if (!mesh.current) return
    const dist = camera.position.distanceTo(pos)
    const size = THREE.MathUtils.clamp(dist * 0.06, 0.0006, 0.01)
    mesh.current.scale.setScalar(size)
  })

  return (
    <mesh ref={mesh} position={pos}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial color="#f4a261" emissive="#f4a261" emissiveIntensity={0.7} />
    </mesh>
  )
}

/** Aim at the observer and start ~metro altitude (Orbit distance is from surface target, not Earth center). */
function RegionalCamera({
  lat,
  lon,
  controlsRef,
}: {
  lat: number
  lon: number
  controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()

  useEffect(() => {
    const target = latLonToVec3(lat, lon, 0)
    const normal = target.clone().normalize()
    camera.position.copy(normal.multiplyScalar(EARTH_RADIUS + ZOOM_START_DISTANCE))
    camera.near = 0.0002
    camera.far = 200
    camera.updateProjectionMatrix()
    camera.lookAt(target)

    const ctrl = controlsRef.current
    if (ctrl) {
      ctrl.target.copy(target)
      ctrl.minDistance = ZOOM_MIN_DISTANCE
      ctrl.maxDistance = ZOOM_MAX_DISTANCE
      ctrl.update()
    }
  }, [lat, lon, camera, controlsRef])

  return null
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
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const target = useMemo(
    () => latLonToVec3(observerLat, observerLon, 0),
    [observerLat, observerLon],
  )

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
      <RegionalCamera lat={observerLat} lon={observerLon} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={ZOOM_MIN_DISTANCE}
        maxDistance={ZOOM_MAX_DISTANCE}
        // Keep the camera mostly above the local horizon so close zoom doesn't clip through Earth.
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.88}
        rotateSpeed={0.55}
        zoomSpeed={1.35}
        target={target}
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
    return p
      .clone()
      .normalize()
      .multiplyScalar(EARTH_RADIUS + ZOOM_START_DISTANCE)
      .toArray() as [number, number, number]
  }, [observerLat, observerLon])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        minHeight: 0,
      }}
    >
      <Canvas
        dpr={preset.dpr}
        gl={{ antialias: preset.antialias, powerPreference: 'default', alpha: false }}
        camera={{ position: cameraPos, fov: 50, near: 0.0002, far: 200 }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#050b12'))
          gl.domElement.style.touchAction = 'none'
          gl.domElement.style.width = '100%'
          gl.domElement.style.height = '100%'
          gl.domElement.style.display = 'block'
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
    </div>
  )
}
