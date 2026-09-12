import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EARTH_RADIUS, qualityPreset } from './geo'

export function AtmosphereDust({ count }: { count?: number }) {
  const preset = qualityPreset()
  const n = count ?? preset.particleCount
  const points = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = EARTH_RADIUS * (1.02 + Math.random() * 0.12)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi)
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [n])

  const velocities = useMemo(() => {
    const arr = new Float32Array(n)
    for (let i = 0; i < n; i++) arr[i] = 0.0004 + Math.random() * 0.0012
    return arr
  }, [n])

  useFrame((_, dt) => {
    const mesh = points.current
    if (!mesh) return
    const attr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < n; i++) {
      const ix = i * 3
      const x = arr[ix]
      const z = arr[ix + 2]
      const a = velocities[i] * dt * 60
      arr[ix] = x * Math.cos(a) - z * Math.sin(a)
      arr[ix + 2] = x * Math.sin(a) + z * Math.cos(a)
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.008}
        color="#9ad8ff"
        transparent
        opacity={0.35}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

export function ContrailParticles({ points }: { points: THREE.Vector3[] }) {
  const positions = useMemo(() => {
    const max = Math.min(points.length, 400)
    const arr = new Float32Array(Math.max(max, 1) * 3)
    for (let i = 0; i < max; i++) {
      const p = points[Math.floor((i / Math.max(max - 1, 1)) * (points.length - 1))]
      arr[i * 3] = p.x
      arr[i * 3 + 1] = p.y
      arr[i * 3 + 2] = p.z
    }
    return { arr, count: max }
  }, [points])

  if (points.length < 2) return null

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.arr, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#3dd6c6"
        transparent
        opacity={0.7}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
