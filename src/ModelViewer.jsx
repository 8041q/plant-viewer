import React from 'react'

export default function ModelViewer({ src, alt }) {
  if (!src) return null

  const isModelFile = /\.(glb|gltf|usdz)(\?.*)?$/i.test(src)

  return (
    <div className="pv-modal-media">
      {isModelFile ? (
        <model-viewer
          src={src}
          alt={alt}
          camera-controls
          auto-rotate
        />
      ) : (
        <div className="pv-iframe-wrap">
          <iframe
            src={src}
            title={alt || '3D model'}
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}
