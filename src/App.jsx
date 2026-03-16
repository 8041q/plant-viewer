import React, { useEffect, useState, useRef } from 'react'

const IMAGE_PATH = 'src/planta.png'
const HOTSPOTS_JSON = 'data/hotspots.json'

function Modal({ open, onClose, data }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="pv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pv-modal" onClick={e => e.stopPropagation()}>
        <button className="pv-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="pv-modal-title">{data.title}</h2>
        <div className="pv-modal-body">
          <img src={data.image || IMAGE_PATH} alt={data.title || 'plant'} />

          <div className="pv-info">
            <div className="pv-main-info">
              <p><strong>ID:</strong> {data.id}</p>
              <p><strong>Info:</strong> {data.info}</p>
            </div>

            <div className="pv-room-list">
              <h3>Rooms</h3>
              <ul>
                {(data.rooms && data.rooms.length) ? (
                  data.rooms.map(r => <li key={r} className="pv-room-item">{r}</li>)
                ) : (
                  ['A1', '3BC', '6LD', 'B2'].map(r => <li key={r} className="pv-room-item">{r}</li>)
                )}
              </ul>
            </div>

            <div className="pv-product-list">
              <h3>Products</h3>
              <ul>
                {(data.products && data.products.length) ? (
                  data.products.map((p, i) => (
                    <li key={p.id || i} className="pv-product-item">
                      <div className="pv-product-name">{p.name || 'Product Name'}</div>
                      <div className="pv-product-meta">{p.variant || p.sku || 'Placeholder'}</div>
                    </li>
                  ))
                ) : (
                  ['Product 1', 'Product 2', 'Product 3'].map((n, i) => (
                    <li key={i} className="pv-product-item">
                      <div className="pv-product-name">{n}</div>
                      <div className="pv-product-meta">Placeholder</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [hotspots, setHotspots] = useState([])
  const [selected, setSelected] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    fetch(HOTSPOTS_JSON).then(r => r.json()).then(setHotspots).catch(() => setHotspots([]))
  }, [])

  return (
    <div className="pv-root">

      <div className="pv-image-wrap" ref={containerRef}>
        <img src={IMAGE_PATH} alt="plant" className="pv-image" />
        <svg className="pv-overlay" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          {hotspots.map(h => (
            <g key={h.id} transform={`translate(${h.x}, ${h.y})`}>
              <title>{h.title}</title>
              <circle
                className="pv-hotspot"
                r={0.8}
                fill="#3dc99a"
                stroke="#fff"
                strokeWidth={0.2}
                onClick={() => setSelected(h)}
                style={{ cursor: 'pointer' }}
              />
              <text x={3} y={1.5} fontSize={1.5} fill="#000" pointerEvents="none">{h.title}</text>
            </g>
          ))}
        </svg>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} data={selected || {}} />
    </div>
  )
}
