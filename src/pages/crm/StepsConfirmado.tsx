import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useRepo } from '../../app/session'
import { useGlobal } from '../../app/useGlobal'
import { CFDI_USE, CLIENT_ROLE, DOCUMENT_STATUS, FILE_KIND, PAPERWORK_STATUS, PAYMENT_FORM, PAYMENT_METHOD, TAX_SYSTEM, options } from '../../domain/catalogs'
import { closingCheck, emptyClosing, emptyFiscal, initialInvoice } from '../../domain/crm'
import { todayInMexico } from '../../domain/dates'
import { localId } from '../../domain/factory'
import { fmtDate, fmtMoney } from '../../domain/format'
import { effectiveStage } from '../../domain/stage'
import type { ClientContact, ClientPending, ClientRole, ClosingInfo, FileKind, FiscalData, Invoice, Paperwork } from '../../domain/types'
import { Check, DateField, FormGrid, NumberField, SelectField, TextArea, TextField } from '../../ui/fields'
import { Button, Card, Notice } from '../../ui/kit'
import { InvoicePanel } from '../billing/InvoicePanel'
import { useSaver } from '../project/ctx'
import type { StepProps } from './StepsPreventa'
import { openStoredFile } from '../../ui/openFile'

function NeedsProject() {
  return (
    <Card className="p-4 text-sm text-ink2">
      Este paso se abre al aprobar la puerta 1: ahí nace el expediente del proyecto con los datos del prospecto.
    </Card>
  )
}

/* ------------------------------------------------------- 7. acta de inicio ---- */
export function ActaStep({ crm }: StepProps) {
  const d = crm.project
  if (!d) return <NeedsProject />
  const actas = d.documents.filter((x) => x.code === 'D02').sort((a, b) => b.version - a.version)
  const acta = actas[0]
  const sigs = acta ? d.signatures.filter((s) => s.documentId === acta.id && s.documentVersion === acta.version) : []
  const others = d.documents.filter((x) => x.code === 'D01' || x.code === 'D15' || x.code === 'D16')
  const second = crm.prospect?.sale?.secondInterview
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <p className="text-sm text-ink2">
          El acta de inicio sale de la propuesta preliminar{second?.required && second.notes ? ' y de lo acordado en la segunda entrevista' : ''}. Se firma dentro del sistema: el
          cliente en el portal con su correo y el despacho aquí. Firmada, se manda a varios correos con una liga.
        </p>
        {second?.required && second.notes && <Notice>Lo de la segunda entrevista: {second.notes}</Notice>}
        {acta ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule p-3">
            <div>
              <div className="font-semibold">
                D02 · Acta de inicio v{acta.version} · {DOCUMENT_STATUS[acta.status]}
              </div>
              <div className="text-sm text-muted">
                {(acta.signers ?? []).map((s) => `${s.name}: ${sigs.some((x) => x.signerId === s.id) ? 'firmó' : 'pendiente'}`).join(' · ') || 'Sin firmantes'}
              </div>
            </div>
            <Link to={`/p/${d.project.id}/documentos/${acta.id}`} className="text-sm font-semibold text-accent">
              {acta.status === 'draft' ? 'Revisar y enviar para firma' : acta.status === 'signed' ? 'Ver y enviar firmada' : 'Ver las firmas'}
            </Link>
          </div>
        ) : (
          <Link to={`/p/${d.project.id}/documentos`} className="text-sm font-semibold text-accent">
            Crear el acta de inicio
          </Link>
        )}
      </Card>
      {others.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-bold">En el expediente</h3>
          <ul className="space-y-1 text-sm">
            {others.map((x) => (
              <li key={x.id}>
                <Link to={`/p/${d.project.id}/documentos/${x.id}`} className="font-semibold text-accent">
                  {x.code} v{x.version}
                </Link>{' '}
                <span className="text-muted">· {DOCUMENT_STATUS[x.status]}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------- 8. cita de cierre ---- */
const ROLE_ORDER: ClientRole[] = ['decides', 'responsible', 'systems', 'billing', 'tester', 'other']

export function ClosingStep({ crm }: StepProps) {
  const repo = useRepo()
  const files = useGlobal('files')
  const d = crm.project
  const saver = useSaver()
  const [closing, setClosing] = useState<ClosingInfo>(emptyClosing())
  const [fiscal, setFiscal] = useState<FiscalData>(emptyFiscal())
  const [pay, setPay] = useState({ creditDays: null as number | null, invoiceReception: '', paymentDocuments: '' })
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [pendings, setPendings] = useState<ClientPending[]>([])
  const [kind, setKind] = useState<FileKind>('nda')
  useEffect(() => {
    if (!d) return
    setClosing({ ...emptyClosing(), ...(d.project.closing ?? {}) })
    setFiscal({ ...emptyFiscal(), ...(d.project.fiscal ?? {}), legalName: d.project.fiscal?.legalName || d.project.client.replace(/,?\s*S\.?\s*A\.?.*$/i, '').trim() })
    setPay({ creditDays: d.project.params.creditDays, invoiceReception: d.project.params.invoiceReception, paymentDocuments: d.project.params.paymentDocuments })
    setContacts(structuredClone(d.contacts))
    setPendings(structuredClone(d.pendings))
  }, [d])
  if (!d) return <NeedsProject />
  const check = closingCheck(d)
  const mine = (files.rows ?? []).filter((f) => f.projectId === d.project.id && ['nda', 'vendor', 'purchase_order', 'closing', 'acta'].includes(f.kind))
  const setPaper = (k: 'nda' | 'vendor' | 'purchaseOrder', patch: Partial<Paperwork>) => setClosing((c) => ({ ...c, [k]: { ...c[k], ...patch } }))

  async function saveAll() {
    if (!d) return
    await repo.updateProject({ ...d.project, closing, fiscal, params: { ...d.project.params, ...pay } })
    for (const c of contacts) if (JSON.stringify(c) !== JSON.stringify(d.contacts.find((x) => x.id === c.id))) await repo.save(d.project.id, 'contacts', c)
    for (const c of d.contacts) if (!contacts.some((x) => x.id === c.id)) await repo.remove(d.project.id, 'contacts', c.id)
    for (const p of pendings) if (JSON.stringify(p) !== JSON.stringify(d.pendings.find((x) => x.id === p.id))) await repo.save(d.project.id, 'pendings', p)
    for (const p of d.pendings) if (!pendings.some((x) => x.id === p.id)) await repo.remove(d.project.id, 'pendings', p.id)
    await crm.reloadProject()
  }

  return (
    <div className="space-y-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {!check.ok && <Notice tone="warn">Para cerrar la venta falta: {check.missing.join(' · ')}</Notice>}
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold">La cita</h3>
        <FormGrid>
          <DateField label="Fecha de la cita de cierre" value={closing.heldOn} onChange={(v) => setClosing((c) => ({ ...c, heldOn: v }))} />
        </FormGrid>
        <Check checked={closing.actaReviewed} onChange={(v) => setClosing((c) => ({ ...c, actaReviewed: v }))} label="Se revisó el acta de inicio; los ajustes van en su versión 2." />
        <Check checked={closing.startOnPayment} onChange={(v) => setClosing((c) => ({ ...c, startOnPayment: v }))} label="Se pactó que el arranque comienza al recibir el pago inicial." />
        <TextArea label="Notas de la cita" rows={2} value={closing.notes} onChange={(v) => setClosing((c) => ({ ...c, notes: v }))} />
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Involucrados</h3>
          <Button size="sm" variant="ghost" onClick={() => setContacts((xs) => [...xs, { id: localId('con'), name: '', role: '', roleKey: 'tester', position: '', email: '', phone: '' }])}>
            + Agregar
          </Button>
        </div>
        <p className="text-xs text-muted">Quién decide y paga, responsable del cliente, contacto de sistemas, quien tramita órdenes y pagos, y usuarios que prueban, con correo y teléfono.</p>
        {contacts.map((c, i) => (
          <div key={c.id} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)_10rem_auto]">
            <TextField label="Nombre" value={c.name} onChange={(v) => setContacts((xs) => xs.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
            <SelectField
              label="Papel"
              value={c.roleKey ?? null}
              onChange={(v) => setContacts((xs) => xs.map((x, j) => (j === i ? { ...x, roleKey: v, role: v ? CLIENT_ROLE[v] : x.role } : x)))}
              options={ROLE_ORDER.map((k) => ({ value: k, label: CLIENT_ROLE[k] }))}
            />
            <TextField label="Correo" value={c.email ?? ''} onChange={(v) => setContacts((xs) => xs.map((x, j) => (j === i ? { ...x, email: v.trim() } : x)))} />
            <TextField label="Teléfono" value={c.phone ?? ''} onChange={(v) => setContacts((xs) => xs.map((x, j) => (j === i ? { ...x, phone: v } : x)))} />
            <Button size="sm" variant="ghost" className="self-end" onClick={() => setContacts((xs) => xs.filter((_, j) => j !== i))}>
              Quitar
            </Button>
          </div>
        ))}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Accesos e información, con fecha compromiso</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPendings((xs) => [...xs, { id: localId('pen'), position: xs.length + 1, description: '', contactId: contacts.find((c) => c.roleKey === 'systems')?.id ?? null, requestedOn: closing.heldOn ?? todayInMexico(), dueOn: null, receivedOn: null, blocksKey: null }])}
          >
            + Agregar
          </Button>
        </div>
        <p className="text-xs text-muted">Primero y aparte, los accesos de la prueba técnica. Pasan a Pendientes del cliente del proyecto.</p>
        {pendings.map((p, i) => (
          <div key={p.id} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-[minmax(0,1fr)_12rem_10rem_auto]">
            <TextField label="Qué se necesita" value={p.description} onChange={(v) => setPendings((xs) => xs.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
            <SelectField label="Quién" value={p.contactId} onChange={(v) => setPendings((xs) => xs.map((x, j) => (j === i ? { ...x, contactId: v } : x)))} options={contacts.map((c) => ({ value: c.id, label: c.name || 'Sin nombre' }))} />
            <DateField label="Fecha compromiso" value={p.dueOn} onChange={(v) => setPendings((xs) => xs.map((x, j) => (j === i ? { ...x, dueOn: v } : x)))} />
            <Button size="sm" variant="ghost" className="self-end" onClick={() => setPendings((xs) => xs.filter((_, j) => j !== i))}>
              Quitar
            </Button>
          </div>
        ))}
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold">Papeleo del cliente</h3>
        <p className="text-xs text-muted">Confidencialidad, alta de proveedor y orden de compra. Con clientes más informales puede que no aplique ninguno.</p>
        {(
          [
            ['nda', 'Confidencialidad'],
            ['vendor', 'Alta de proveedor (número)'],
            ['purchaseOrder', 'Orden de compra (número y monto)'],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <TextField label={label} value={closing[k].reference} onChange={(v) => setPaper(k, { reference: v })} />
            <SelectField label="Estado" value={closing[k].status} onChange={(v) => v && setPaper(k, { status: v })} options={options(PAPERWORK_STATUS)} allowEmpty={false} />
          </div>
        ))}
        <div className="flex flex-wrap items-end gap-2">
          <SelectField
            label="Subir documento"
            value={kind}
            onChange={(v) => v && setKind(v)}
            options={(['nda', 'vendor', 'purchase_order', 'acta', 'closing'] as FileKind[]).map((k) => ({ value: k, label: FILE_KIND[k] }))}
            allowEmpty={false}
          />
          <label className="cursor-pointer rounded-lg border border-rule px-3 py-2 text-sm font-semibold text-ink2 hover:bg-soft">
            Elegir archivo
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f)
                  void saver.run(async () => {
                    await repo.uploadFile({ projectId: d.project.id, prospectId: d.project.prospectId ?? null, kind, clientVisible: kind === 'acta', notes: 'Cita de cierre' }, f)
                    await files.reload()
                  })
              }}
            />
          </label>
        </div>
        {mine.length > 0 && (
          <ul className="space-y-1 text-sm">
            {mine.map((f) => (
              <li key={f.id}>
                <button type="button" className="font-semibold text-accent" onClick={() => void saver.run(() => openStoredFile(repo, f))}>
                  {f.name}
                </button>{' '}
                <span className="text-xs text-muted">
                  {FILE_KIND[f.kind]} · {fmtDate(f.uploadedOn)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold">Datos para facturar (CFDI 4.0)</h3>
        <FormGrid>
          <TextField label="RFC" value={fiscal.rfc} onChange={(v) => setFiscal((x) => ({ ...x, rfc: v.toUpperCase().trim() }))} />
          <TextField label="Razón social (sin «S.A. de C.V.»)" value={fiscal.legalName} onChange={(v) => setFiscal((x) => ({ ...x, legalName: v }))} />
          <SelectField label="Régimen fiscal" value={fiscal.taxSystem} onChange={(v) => v && setFiscal((x) => ({ ...x, taxSystem: v }))} options={options(TAX_SYSTEM)} allowEmpty={false} />
          <TextField label="Código postal fiscal" value={fiscal.zip} onChange={(v) => setFiscal((x) => ({ ...x, zip: v.replace(/\D/g, '').slice(0, 5) }))} />
          <SelectField label="Uso del CFDI" value={fiscal.cfdiUse} onChange={(v) => v && setFiscal((x) => ({ ...x, cfdiUse: v }))} options={options(CFDI_USE)} allowEmpty={false} />
          <TextField label="Correos para las facturas" value={fiscal.emails} onChange={(v) => setFiscal((x) => ({ ...x, emails: v }))} />
          <SelectField label="Método de pago" value={fiscal.paymentMethod} onChange={(v) => v && setFiscal((x) => ({ ...x, paymentMethod: v, paymentForm: v === 'PPD' ? '99' : x.paymentForm === '99' ? '03' : x.paymentForm }))} options={options(PAYMENT_METHOD)} allowEmpty={false} />
          <SelectField label="Forma de pago" value={fiscal.paymentForm} onChange={(v) => v && setFiscal((x) => ({ ...x, paymentForm: v }))} options={options(PAYMENT_FORM)} allowEmpty={false} disabled={fiscal.paymentMethod === 'PPD'} />
          <NumberField label="Días de crédito" value={pay.creditDays} onChange={(v) => setPay((x) => ({ ...x, creditDays: v }))} />
          <TextField label="Cómo reciben facturas (portal, correo…)" value={pay.invoiceReception} onChange={(v) => setPay((x) => ({ ...x, invoiceReception: v }))} />
          <TextField className="sm:col-span-2" label="Documentos que piden para pagar" value={pay.paymentDocuments} onChange={(v) => setPay((x) => ({ ...x, paymentDocuments: v }))} />
        </FormGrid>
      </Card>
      <Button variant="primary" disabled={saver.busy} onClick={() => void saver.run(saveAll)}>
        {saver.busy ? 'Guardando…' : 'Guardar la cita de cierre'}
      </Button>
    </div>
  )
}

/* ------------------------------------------------ 9. factura y cobro ---- */
export function CobroStep({ crm }: StepProps) {
  const repo = useRepo()
  const saver = useSaver()
  const d = crm.project
  if (!d) return <NeedsProject />
  const inv = initialInvoice(d)
  const stage = effectiveStage(d)
  async function create() {
    if (!d) return
    const row: Invoice = {
      id: localId('inv'),
      position: 1,
      concept: 'initial',
      description: 'Pago inicial',
      amount: d.project.params.initialPayment ?? null,
      purchaseOrder: d.project.closing?.purchaseOrder.reference ?? '',
      invoiceDate: null,
      paidDate: null,
    }
    await repo.save(d.project.id, 'invoices', row)
    await crm.reloadProject()
  }
  return (
    <div className="space-y-4">
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {stage !== 'confirmed' && (
        <Notice>
          El pago inicial está cobrado: {crm.prospect?.company} ya es cliente y su proyecto está en Operaciones.{' '}
          <Link to={`/p/${d.project.id}/proceso`} className="font-semibold underline">
            Ir al proyecto
          </Link>
        </Notice>
      )}
      {inv ? (
        <InvoicePanel data={d} invoice={inv} onChanged={crm.reloadAll} quiet />
      ) : (
        <Card className="space-y-2 p-4">
          <p className="text-sm text-ink2">No hay factura del pago inicial. Se crea con el monto de la propuesta{d.project.params.initialPayment ? ` (${fmtMoney(d.project.params.initialPayment)})` : ''}.</p>
          <Button variant="primary" disabled={saver.busy} onClick={() => void saver.run(create)}>
            Crear la factura del pago inicial
          </Button>
        </Card>
      )}
    </div>
  )
}
