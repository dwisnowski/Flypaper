import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS, qualityPreset } from './geo'
import {
  fetchRainViewerMaps,
  latestRadarFrame,
  radarWorldTileUrl,
} from '../weather/rainviewer'

export function Earth() {
  const preset = qualityPreset()
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    // Public domain–style Blue Marble via three-globe CDN (widely used in demos).
    const tex = loader.load(
      'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
    )
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [])

  const bump = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return loader.load('https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png')
  }, [])

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, preset.earthSegments, preset.earthSegments]} />
      <meshStandardMaterial
        map={texture}
        bumpMap={bump}
        bumpScale={0.045}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  )
}

export function CloudShell() {
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const tex = loader.load('https://unpkg.com/three-globe@2.31.1/example/img/earth-clouds.png')
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS * 1.01, 48, 48]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0.35}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function RadarShell({ enabled }: { enabled: boolean }) {
  const preset = qualityPreset()
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!enabled) {
      setTexture(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const maps = await fetchRainViewerMaps()
        const frame = latestRadarFrame(maps)
        if (!frame || cancelled) return
        const url = radarWorldTileUrl(maps.host, frame.path, 512)
        // Prefer proxy if needed
        const proxyUrl = `/api/weather/tile?url=${encodeURIComponent(url)}`
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin('anonymous')
        loader.load(
          url,
          (tex) => {
            if (cancelled) return
            tex.colorSpace = THREE.SRGBColorSpace
            setTexture(tex)
          },
          undefined,
          () => {
            // Fallback through our proxy
            loader.load(proxyUrl, (tex) => {
              if (cancelled) return
              tex.colorSpace = THREE.SRGBColorSpace
              setTexture(tex)
            })
          },
        )
      } catch {
        /* radar unavailable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  if (!enabled || !texture) return null

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS * 1.015, 48, 48]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={preset.radarOpacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
