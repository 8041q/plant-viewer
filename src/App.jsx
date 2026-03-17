import React, { useEffect, useState, useRef } from 'react'

const IMAGE_PATH = 'src/planta.svg'
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
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(scale)
  const translateRef = useRef(translate)

  useEffect(() => {
    fetch(HOTSPOTS_JSON).then(r => r.json()).then(setHotspots).catch(() => setHotspots([]))
  }, [])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    translateRef.current = translate
  }, [translate])

  useEffect(() => {
    function onKey(e) {
      // reset transforms on Escape
      if (e.key === 'Escape') {
        setScale(1)
        setTranslate({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', onKey)

    // add native non-passive wheel listener to the container so we can call preventDefault()
    const el = containerRef.current
    if (el) {
      const nativeWheel = (e) => {
        // only intercept when Ctrl (Windows/Linux) or Meta (macOS) is pressed
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()

        const rect = el.getBoundingClientRect()
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top
        const cursorUnitsX = (cursorX * 100) / rect.width
        const cursorUnitsY = (cursorY * 100) / rect.height

        // Normalize deltaY according to deltaMode per MDN guidance
        let delta = e.deltaY
        // DOM_DELTA_LINE = 1, DOM_DELTA_PAGE = 2
        if (e.deltaMode === 1) delta *= 16
        else if (e.deltaMode === 2) delta *= 800

        const ZOOM_SENSITIVITY = 0.0005
        const zoomFactor = Math.exp(-delta * ZOOM_SENSITIVITY)

        const s = scaleRef.current
        const t = translateRef.current
        const newScale = Math.max(1, Math.min(s * zoomFactor, 2))

        // world point under cursor (in viewBox units)
        const worldX = (cursorUnitsX - t.x) / s
        const worldY = (cursorUnitsY - t.y) / s

        const newTx = cursorUnitsX - worldX * newScale
        const newTy = cursorUnitsY - worldY * newScale

        const clamped = clampTranslate(newScale, newTx, newTy)
        setScale(newScale)
        setTranslate(clamped)
      }

      el.addEventListener('wheel', nativeWheel, { passive: false })
      return () => {
        el.removeEventListener('wheel', nativeWheel, { passive: false })
        window.removeEventListener('keydown', onKey)
      }
    }
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onPointerDown(e) {
    if (!containerRef.current) return
    // don't start dragging when user clicked a hotspot (let the hotspot handle the event)
    try {
      if (e.target && e.target.closest && e.target.closest('.pv-hotspot-group')) return
    } catch (err) {}

    setDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    try { containerRef.current.setPointerCapture && containerRef.current.setPointerCapture(e.pointerId) } catch (err) {}
  }

  function onPointerMove(e) {
    if (!dragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    const dxUnits = (dx * 100) / rect.width
    const dyUnits = (dy * 100) / rect.height
 
    // How many viewBox units the user can drag past the image edge
    const OVERSCROLL = 15
 
    setTranslate(t => {
      const newX = t.x + dxUnits
      const newY = t.y + dyUnits
      const s = scaleRef.current
 
      let minX, maxX, minY, maxY
      if (s >= 1) {
        // zoomed in: normal clamp edges + overscroll buffer
        minX = 100 * (1 - s) - OVERSCROLL
        maxX = OVERSCROLL
        minY = 100 * (1 - s) - OVERSCROLL
        maxY = OVERSCROLL
      } else {
        // zoomed out: image is centered; allow a small nudge either way
        const center = (100 - 100 * s) / 2
        minX = center - OVERSCROLL
        maxX = center + OVERSCROLL
        minY = center - OVERSCROLL
        maxY = center + OVERSCROLL
      }
 
      return {
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      }
    })
    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }

  function onPointerUp(e) {
    setDragging(false)
    try { containerRef.current.releasePointerCapture && containerRef.current.releasePointerCapture(e.pointerId) } catch (err) {}
  }

  function clampTranslate(s, tx, ty) {
    const min = 100 * (1 - s)
    const max = 0

    if (s >= 1) {
      return {
        x: Math.max(min, Math.min(tx, max)),
        y: Math.max(min, Math.min(ty, max)),
      }
    }

    // center when zoomed out
    const center = (100 - 100 * s) / 2
    return { x: center, y: center }
  }

  return (
    <div className="pv-root">

      <div
        className={`pv-image-wrap ${dragging ? 'dragging' : ''}`}
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg className="pv-overlay" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
            <image href={IMAGE_PATH} x={0} y={0} width={100} height={100} preserveAspectRatio="xMidYMid meet" />

            {hotspots.map(h => (
              <g key={h.id} transform={`translate(${h.x}, ${h.y}) scale(${1 / scale})`} className="pv-hotspot-group">
                <title>{h.title}</title>

                    <rect
                      className="pv-pill"
                      x={-1.8} y={-1.25}
                      width={12} height={2.5}
                      rx={1.2} ry={2}
                      fill="transparent"
                      opacity={0}
                    />

                <circle
                  className="pv-hotspot"
                  r={0.8}
                  fill="#3dc99a"
                  stroke="#fff"
                  strokeWidth={0.2}
                  onClick={() => setSelected(h)}
                  style={{ cursor: 'pointer' }}
                />

                <text
                  className="pv-label"
                  x={2} y={0.1}
                  fontSize={1.3}
                  fill="#000"
                  textAnchor="start"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >{h.title}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} data={selected || {}} />
    </div>
  )
}
