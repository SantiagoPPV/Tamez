import { useEffect, useRef, useState } from 'react'
import { pageCount } from './engine'

const PAGE_W = 816 // 8.5 in a 96 ppp
const PAGE_H = 1056 // 11 in
const GAP = 16

/** Vista previa de un documento en hoja carta, escalada al ancho disponible. */
export function DocPreview({ html, title }: { html: string; title: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(PAGE_W)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale = Math.min(1, width / PAGE_W)
  const pages = pageCount(html)
  const height = pages * (PAGE_H + GAP) + GAP * 2
  return (
    <div ref={box} className="mx-auto w-full max-w-[816px] overflow-hidden rounded-xl border border-rule bg-[#cbd5e1]">
      {/* El iframe va en posición absoluta para que su ancho fijo no ensanche la página en celular. */}
      <div style={{ height: height * scale, position: 'relative' }}>
        <iframe
          title={title}
          srcDoc={html}
          sandbox="allow-same-origin allow-modals"
          style={{ position: 'absolute', left: 0, top: 0, width: PAGE_W, height, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}
        />
      </div>
    </div>
  )
}

/** Imprime (o guarda como PDF) el documento en una ventana aparte, en hoja carta. */
export function printDocument(html: string, fileName: string) {
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(html.replace(/<title>[^<]*<\/title>/, `<title>${fileName}</title>`))
  doc.close()
  const go = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 1000)
  }
  // Espera la letra Inter para que el PDF salga igual que la plantilla.
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts
  if (fonts?.ready) void fonts.ready.then(() => setTimeout(go, 150))
  else setTimeout(go, 600)
}
