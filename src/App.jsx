import React, { useEffect, useState, useRef } from 'react'
import ModelViewer from './ModelViewer'

const IMAGE_PATH = `${import.meta.env.BASE_URL}planta.svg`
const HOTSPOTS_JSON = `${import.meta.env.BASE_URL}data/hotspots.json`

function Modal({ open, onClose, data, hotspots = [] }) {
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
          {data.model ? (
            <ModelViewer src={data.model} alt={data.title || 'plant model'} />
          ) : (
            <img src={data.image || IMAGE_PATH} alt={data.title || 'plant'} />
          )}

          <div className="pv-info">
            <div className="pv-main-info">
              <p><strong>ID:</strong> {data.id}</p>
              <p><strong>Info:</strong> {data.info}</p>
            </div>

                <div className="pv-room-list">
                  <h3>Also in:</h3>
                  <ul>
                    {(data.rooms && data.rooms.length) ? (
                      data.rooms.map(r => {
                        // Try to resolve the room id to a hotspot to get its color
                        const roomHotspot = hotspots.find(h => h.id === r)
                        const roomColor = roomHotspot?.color || data.color || '#3dc99a'

                        // simple hex luminance check to pick white or dark text
                        function readableTextColor(col) {
                          try {
                            if (!col || typeof col !== 'string') return '#fff'
                            let c = col.trim()
                            if (c[0] === '#') c = c.slice(1)
                            if (c.length === 3) c = c.split('').map(ch => ch+ch).join('')
                            if (c.length !== 6) return '#fff'
                            const r255 = parseInt(c.slice(0,2), 16)
                            const g255 = parseInt(c.slice(2,4), 16)
                            const b255 = parseInt(c.slice(4,6), 16)
                            const lum = (0.2126 * r255 + 0.7152 * g255 + 0.0722 * b255) / 255
                            return lum > 0.6 ? '#111' : '#fff'
                          } catch (err) {
                            return '#fff'
                          }
                        }

                        const textColor = readableTextColor(roomColor)
                        return (
                          <li
                            key={r}
                            className="pv-room-item"
                            style={{ ['--room-color']: roomColor, color: textColor }}
                            aria-label={`Related room ${r}`}
                          >
                            {r}
                          </li>
                        )
                      })
                    ) : (
                      ['A1', '3BC', '6LD', 'B2'].map(r => <li key={r} className="pv-room-item">{r}</li>)
                    )}
                  </ul>
                </div>

            <div className="pv-product-list">
              <h3>Included</h3>
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
  const draggingRef = useRef(false)
  const scaleRef = useRef(scale)
  const translateRef = useRef(translate)
  // Smooth animation / inertia configs and refs
  const SMOOTHING = 0.14
  const INERTIA_MULT = 200
  const MIN_SCALE = 1
  const MAX_SCALE = 3
  const ZOOM_STEP = 1.35
  const targetScaleRef = useRef(scaleRef.current)
  const targetTranslateRef = useRef(translateRef.current)
  const rafRef = useRef(null)
  const lastMoveRef = useRef({ x: 0, y: 0, t: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  // Track last pointer position on the container (client coords)
  // Used by zoom buttons to centre zoom on last interaction point
  const lastPointerRef = useRef(null)

  // viewSize: width and height in viewBox units. default to 100x100 for safety.
  const [viewSize, setViewSize] = useState({ w: 100, h: 100 })

  useEffect(() => {
    fetch(HOTSPOTS_JSON).then(r => r.json()).then(setHotspots).catch(() => setHotspots([]))
  }, [])

  // Fetch the SVG file and parse viewBox or width/height to compute aspect ratio
  useEffect(() => {
    let mounted = true
    fetch(IMAGE_PATH).then(r => r.text()).then(text => {
      if (!mounted) return
      try {
        // Try viewBox first
        const vbMatch = text.match(/<svg[^>]*viewBox=["']([^"']+)["'][^>]*>/i)
        if (vbMatch) {
          const parts = vbMatch[1].trim().split(/\s+/).map(Number)
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            const w = parts[2]
            const h = parts[3]
            setViewSize({ w: 100, h: 100 * (h / w) })
            return
          }
        }

        // Fallback: width/height attributes (numbers, possibly with px)
        const whMatch = text.match(/<svg[^>]*width=["']([\d.]+)(?:px)?["'][^>]*height=["']([\d.]+)(?:px)?["'][^>]*>/i)
        if (whMatch) {
          const wnum = parseFloat(whMatch[1])
          const hnum = parseFloat(whMatch[2])
          if (wnum > 0 && hnum > 0) {
            setViewSize({ w: 100, h: 100 * (hnum / wnum) })
            return
          }
        }
      } catch (err) {
        // ignore parse errors and keep defaults
      }
    }).catch(() => {
      // keep defaults on fetch failure
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    translateRef.current = translate
  }, [translate])

  // Smooth animator helpers
  function lerp(a, b, t) { return a + (b - a) * t }

  function setTargetScaleTranslate(nextScale, nextTranslate) {
    targetScaleRef.current = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale))
    targetTranslateRef.current = nextTranslate
    startSmoothAnimation()
  }

  function startSmoothAnimation() {
    if (rafRef.current) return
    let last = performance.now()
    function tick(now) {
      // If user started dragging, stop the smooth animator so pointer
      // interactions take immediate effect.
      if (draggingRef.current) {
        rafRef.current = null
        return
      }
      const dt = Math.min((now - last) / 16.6667, 4)
      last = now

      const t = 1 - Math.pow(1 - SMOOTHING, dt)

      const curS = scaleRef.current
      const tgtS = targetScaleRef.current
      const newS = lerp(curS, tgtS, t)

      const curT = translateRef.current
      const tgtT = targetTranslateRef.current
      const newTx = lerp(curT.x, tgtT.x, t)
      const newTy = lerp(curT.y, tgtT.y, t)

      scaleRef.current = newS
      translateRef.current = { x: newTx, y: newTy }
      setScale(newS)
      setTranslate(translateRef.current)

      const closeEnoughScale = Math.abs(newS - tgtS) < 0.0005
      const closeEnoughTranslate = Math.hypot(newTx - tgtT.x, newTy - tgtT.y) < 0.5

      if (closeEnoughScale && closeEnoughTranslate) {
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  // cleanup RAF on unmount
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  useEffect(() => {
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
        // convert to view units using viewSize
        const cursorUnitsX = (cursorX * viewSize.w) / rect.width
        const cursorUnitsY = (cursorY * viewSize.h) / rect.height

        // Normalize deltaY according to deltaMode per MDN guidance
        let delta = e.deltaY
        // DOM_DELTA_LINE = 1, DOM_DELTA_PAGE = 2
        if (e.deltaMode === 1) delta *= 16
        else if (e.deltaMode === 2) delta *= 800

        const ZOOM_SENSITIVITY = 0.0010
        const zoomFactor = Math.exp(-delta * ZOOM_SENSITIVITY)

        const s = scaleRef.current
        const t = translateRef.current
        const targetS = Math.max(MIN_SCALE, Math.min(s * zoomFactor, MAX_SCALE))

        // world point under cursor (in view units)
        const worldX = (cursorUnitsX - t.x) / s
        const worldY = (cursorUnitsY - t.y) / s

        const targetTx = cursorUnitsX - worldX * targetS
        const targetTy = cursorUnitsY - worldY * targetS

        const clamped = clampTranslate(targetS, targetTx, targetTy)
        setTargetScaleTranslate(targetS, clamped)
      }

      el.addEventListener('wheel', nativeWheel, { passive: false })
      return () => {
        el.removeEventListener('wheel', nativeWheel, { passive: false })
      }
    }
    // include viewSize so handlers use latest unit scale
  }, [viewSize])

  // ─── Zoom button helpers ──────────────────────────────────────────────────

  /**
   * Zoom by `factor` centred on the last recorded pointer position inside the
   * container.  If no pointer has been tracked yet (e.g. first button click on
   * a touch-only device) we fall back to the geometric centre of the container.
   */
  function zoomAtLastPointer(factor) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    let cursorX, cursorY
    if (lastPointerRef.current) {
      // Clamp to container bounds in case pointer left the element
      cursorX = Math.max(0, Math.min(lastPointerRef.current.x - rect.left, rect.width))
      cursorY = Math.max(0, Math.min(lastPointerRef.current.y - rect.top, rect.height))
    } else {
      // Default: centre of the container
      cursorX = rect.width / 2
      cursorY = rect.height / 2
    }

    const cursorUnitsX = (cursorX * viewSize.w) / rect.width
    const cursorUnitsY = (cursorY * viewSize.h) / rect.height

    const s = scaleRef.current
    const t = translateRef.current
    const targetS = Math.max(MIN_SCALE, Math.min(s * factor, MAX_SCALE))

    // World point under the cursor (view units)
    const worldX = (cursorUnitsX - t.x) / s
    const worldY = (cursorUnitsY - t.y) / s

    const targetTx = cursorUnitsX - worldX * targetS
    const targetTy = cursorUnitsY - worldY * targetS

    const clamped = clampTranslate(targetS, targetTx, targetTy)
    setTargetScaleTranslate(targetS, clamped)
  }

  function handleZoomIn()  { zoomAtLastPointer(ZOOM_STEP) }
  function handleZoomOut() { zoomAtLastPointer(1 / ZOOM_STEP) }
  function handleReset()   { setTargetScaleTranslate(1, { x: 0, y: 0 }) }

  // ─────────────────────────────────────────────────────────────────────────

  function onPointerDown(e) {
    if (!containerRef.current) return
    // don't start dragging when user clicked a hotspot (let the hotspot handle the event)
    try {
      if (e.target && e.target.closest && e.target.closest('.pv-hotspot-group')) return
    } catch (err) {}

    setDragging(true)
    draggingRef.current = true
    // If a smooth animation is running, cancel it so the user can take
    // immediate control via pointer movements.
    try { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } } catch (err) {}
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    // initialize velocity tracking
    lastMoveRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    velocityRef.current = { x: 0, y: 0 }
    try { containerRef.current.setPointerCapture && containerRef.current.setPointerCapture(e.pointerId) } catch (err) {}
  }

  function onPointerMove(e) {
    // Always keep lastPointerRef up to date so zoom buttons use current position
    lastPointerRef.current = { x: e.clientX, y: e.clientY }

    if (!draggingRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    const dxUnits = (dx * viewSize.w) / rect.width
    const dyUnits = (dy * viewSize.h) / rect.height

    // compute new translate immediately and write to ref so the RAF
    // animation won't (re)apply an older value.
    const s = scaleRef.current
    const newX = translateRef.current.x + dxUnits
    const newY = translateRef.current.y + dyUnits
    const clamped = clampTranslate(s, newX, newY)
    translateRef.current = clamped
    setTranslate(clamped)
    // update velocity estimate (pixels per ms converted to view units per ms)
    const now = performance.now()
    const dt = Math.max(1, now - (lastMoveRef.current.t || now))
    velocityRef.current = {
      x: ((e.clientX - lastMoveRef.current.x) * viewSize.w) / (rect.width * dt),
      y: ((e.clientY - lastMoveRef.current.y) * viewSize.h) / (rect.height * dt),
    }
    lastMoveRef.current = { x: e.clientX, y: e.clientY, t: now }
    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }

  function onPointerUp(e) {
    if (!draggingRef.current) return
    setDragging(false)
    draggingRef.current = false
    try { containerRef.current.releasePointerCapture && containerRef.current.releasePointerCapture(e.pointerId) } catch (err) {}
    // apply inertia based on last velocity
    const v = velocityRef.current
    const speed = Math.hypot(v.x, v.y)
    if (speed > 0.002) {
      const inertiaTarget = {
        x: translateRef.current.x + v.x * INERTIA_MULT,
        y: translateRef.current.y + v.y * INERTIA_MULT,
      }
      const clamped = clampTranslate(scaleRef.current, inertiaTarget.x, inertiaTarget.y)
      setTargetScaleTranslate(scaleRef.current, clamped)
    }
  }

  function clampTranslate(s, tx, ty) {
    const minX = viewSize.w * (1 - s)
    const minY = viewSize.h * (1 - s)
    const maxX = 0
    const maxY = 0

    if (s >= 1) {
      return {
        x: Math.max(minX, Math.min(tx, maxX)),
        y: Math.max(minY, Math.min(ty, maxY)),
      }
    }

    // center when zoomed out (separately for x and y)
    const centerX = (viewSize.w - viewSize.w * s) / 2
    const centerY = (viewSize.h - viewSize.h * s) / 2
    return { x: centerX, y: centerY }
  }

  const atMinScale = scale <= MIN_SCALE + 0.01
  const atMaxScale = scale >= MAX_SCALE - 0.01

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
        <svg className="pv-overlay" viewBox={`0 0 ${viewSize.w} ${viewSize.h}`} preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
            <image href={IMAGE_PATH} x={0} y={0} width={viewSize.w} height={viewSize.h} preserveAspectRatio="xMidYMid meet" />

            {hotspots.map(h => (
                <g
                  key={h.id}
                  transform={`translate(${h.x * viewSize.w / 100}, ${h.y * viewSize.h / 100}) scale(${1 / scale})`}
                  className="pv-hotspot-group"
                  style={{ ['--hotspot-color']: h.color || '#3dc99a' }}
                >
                <title>{h.title}</title>

                    <rect
                      className="pv-pill"
                      x={-1.8} y={-1.3}
                      width={12} height={2.6}
                      rx={1.2} ry={2}
                      fill="transparent"
                      opacity={0}
                    />

                <circle
                  className="pv-hotspot"
                  r={0.9}
                  stroke="#f5f5f5"
                  strokeWidth={0.2}
                  onClick={() => setSelected(h)}
                  style={{ cursor: 'pointer' }}
                />

                <text
                  className="pv-label"
                  x={2} y={0.1}
                  fontSize={1.4}
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

      {/* Zoom controls */}
      <div className="pv-zoom-controls" aria-label="Map controls">
        <button
          className="pv-zoom-btn"
          onClick={handleZoomIn}
          disabled={atMaxScale}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="pv-zoom-divider" aria-hidden="true" />

        <button
          className="pv-zoom-btn"
          onClick={handleZoomOut}
          disabled={atMinScale}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="pv-zoom-divider" aria-hidden="true" />

        <button
          className="pv-zoom-btn pv-zoom-reset"
          onClick={handleReset}
          disabled={atMinScale}
          aria-label="Reset view"
          title="Reset view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8a5 5 0 1 1 1.5 3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="3,5.5 3,8.5 6,8.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} data={selected || {}} hotspots={hotspots} />
    </div>
  )
}