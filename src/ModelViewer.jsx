import React from 'react'

export default function ModelViewer({ src, alt }) {
  if (!src) return null

  const isModelFile = /\.(glb|gltf|usdz)(\?.*)?$/i.test(src)

  if (isModelFile) {
    return (
      <model-viewer
        src={src}
        alt={alt}
        camera-controls
        auto-rotate
        style={{ width: '100%', height: '100%', background: '#f5f5f5' }}
      />
    )
  }

  // Fallback: if src is a page (like the GitHub demo), embed it in an iframe
  return (
    <div className="pv-iframe-wrap" style={{ width: '30%', height: '100%' }}>
      <iframe
        src={src}
        title={alt || '3D model'}
        style={{ width: '100%', height: '100%', border: 0 }}
        loading="lazy"
      />
    </div>
  )
}
