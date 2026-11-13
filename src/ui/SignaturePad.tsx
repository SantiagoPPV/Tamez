import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Button } from './kit'

/**
 * Trazo de firma con el dedo o el ratón (opcional). Devuelve una imagen PNG pequeña en
 * data URL, o null si se borra.
 */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0F172A'
  }, [])

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const [x, y] = point(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    const [x, y] = point(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (empty) setEmpty(false)
  }
  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    const c = ref.current
    if (c && !empty) onChange(c.toDataURL('image/png'))
  }
  const clear = () => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange(null)
  }

  return (
    <div>
      <canvas
        ref={ref}
        className="h-32 w-full touch-none rounded-lg border border-dashed border-rule bg-white"
        aria-label="Espacio para dibujar la firma"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span>Dibuja tu firma (opcional)</span>
        {!empty && (
          <Button size="sm" variant="ghost" onClick={clear}>
            Borrar trazo
          </Button>
        )}
      </div>
    </div>
  )
}
