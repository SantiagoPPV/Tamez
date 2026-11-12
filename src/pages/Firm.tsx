import { useEffect, useState } from 'react'
import { useFirm } from '../app/useGlobal'
import type { FirmSettings } from '../domain/types'
import { FormGrid, TextField } from '../ui/fields'
import { Button, Card, Eyebrow, Notice } from '../ui/kit'
import { useSaver } from './project/ctx'

export function FirmPage() {
  const { firm, save } = useFirm()
  const [d, setD] = useState<FirmSettings>(firm)
  const [ok, setOk] = useState(false)
  const saver = useSaver()
  useEffect(() => setD(firm), [firm])
  const set = <K extends keyof FirmSettings>(k: K, v: FirmSettings[K]) => {
    setOk(false)
    setD((x) => ({ ...x, [k]: v }))
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Eyebrow>Despacho</Eyebrow>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Datos que llevan los documentos</h1>
      <p className="mb-5 text-sm text-ink2">
        Nombre comercial y canales del despacho. La marca «Sistemas a la medida» es provisional; la razón social está por definir.
      </p>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {ok && <Notice>Guardado.</Notice>}
      <Card className="mt-3 p-4">
        <FormGrid>
          <TextField className="sm:col-span-2" label="Nombre comercial" value={d.name} onChange={(v) => set('name', v)} />
          <TextField label="Correo de cuenta (venta)" value={d.salesEmail} onChange={(v) => set('salesEmail', v)} />
          <TextField label="Teléfono de cuenta" value={d.salesPhone} onChange={(v) => set('salesPhone', v)} />
          <TextField label="Correo del contacto diario" value={d.contactEmail} onChange={(v) => set('contactEmail', v)} />
          <TextField label="Teléfono del contacto diario" value={d.contactPhone} onChange={(v) => set('contactPhone', v)} />
          <TextField label="Correo de soporte (canal único)" value={d.supportEmail} onChange={(v) => set('supportEmail', v)} />
          <TextField label="Teléfono de guardia" value={d.supportPhone} onChange={(v) => set('supportPhone', v)} />
        </FormGrid>
        <div className="mt-4">
          <Button variant="primary" disabled={saver.busy} onClick={() => void saver.run(() => save(d)).then((x) => setOk(x))}>
            Guardar
          </Button>
        </div>
      </Card>
    </main>
  )
}
