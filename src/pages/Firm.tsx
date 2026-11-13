import { useEffect, useState } from 'react'
import { BookOpen, Building2, ClipboardList, PlugZap, ReceiptText, Save, Scale } from 'lucide-react'
import { useRepo } from '../app/session'
import { useFirm } from '../app/useGlobal'
import { CFDI_USE, DEFAULT_BILLING, PAYMENT_FORM, PAYMENT_METHOD, options } from '../domain/catalogs'
import { DEFAULT_COMPANY_SIZES, DEFAULT_MIN_MONTHLY } from '../domain/crm'
import { DEFAULT_FORMATS, DEFAULT_GUIDES, GUIDE_TITLE, getFormat } from '../domain/formats'
import type { BillingSettings, FirmSettings, FormatCode, FormatDef, GuideKey } from '../domain/types'
import { integrations, type Integrations } from '../data/services'
import { FormGrid, NumberField, SelectField, TextArea, TextField } from '../ui/fields'
import { Badge, Button, Card, cx, Notice, PageHeader, SectionTitle } from '../ui/kit'
import { useToast } from '../ui/feedback'
import { useSaver } from './project/ctx'

const TABS = [
  { id: 'datos', label: 'Datos y firma', hint: 'Despacho y quien firma', icon: Building2 },
  { id: 'venta', label: 'Reglas de venta', hint: 'Mínimo y tamaños', icon: Scale },
  { id: 'facturacion', label: 'Facturación', hint: 'Serie, claves e IVA', icon: ReceiptText },
  { id: 'formatos', label: 'Formatos y preguntas base', hint: 'D15 a D18', icon: ClipboardList },
  { id: 'guias', label: 'Guías de venta', hint: 'Una por paso del CRM', icon: BookOpen },
  { id: 'integraciones', label: 'Integraciones', hint: 'Correo, IA y timbrado', icon: PlugZap },
] as const

/** Datos del despacho, reglas de venta, facturación, formatos base, guías e integraciones. */
export function FirmPage() {
  const { firm, save } = useFirm()
  const [d, setD] = useState<FirmSettings>(firm)
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('datos')
  const saver = useSaver()
  const toast = useToast()
  useEffect(() => setD(firm), [firm])
  const set = <K extends keyof FirmSettings>(k: K, v: FirmSettings[K]) => setD((x) => ({ ...x, [k]: v }))
  const billing: BillingSettings = { ...DEFAULT_BILLING, ...(d.billing ?? {}) }
  const setBilling = (patch: Partial<BillingSettings>) => set('billing', { ...billing, ...patch })
  const sizes = { ...DEFAULT_COMPANY_SIZES, ...(d.companySizes ?? {}) }
  const dirty = JSON.stringify(d) !== JSON.stringify(firm)

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Despacho"
        title="Datos, reglas y formatos del despacho"
        subtitle="Lo que comparten todos los proyectos: quién firma, el mínimo de venta, cómo se factura, los formatos base de cada paso y las guías de venta."
        actions={
          <>
            {dirty && (
              <Badge tone="amber" dot>
                Cambios sin guardar
              </Badge>
            )}
            <Button variant="primary" icon={<Save />} disabled={!dirty} loading={saver.busy} onClick={() => void saver.run(() => save(d)).then((ok) => ok && toast('Datos del despacho guardados.'))}>
              Guardar
            </Button>
          </>
        }
      />
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav className="scroll-fino -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-1 lg:self-start lg:overflow-visible lg:rounded-2xl lg:border lg:border-rule lg:bg-white lg:p-2 lg:shadow-card" aria-label="Secciones del despacho">
        {TABS.map((t) => {
          const Icon = t.icon
          const on = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={on}
              className={cx('flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold whitespace-nowrap transition-colors lg:w-full lg:whitespace-normal', on ? 'bg-accent text-white lg:bg-accent-soft lg:text-accent-2' : 'text-ink2 hover:bg-soft')}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block">{t.label}</span>
                <span className={cx('hidden text-[11px] font-normal lg:block', on ? 'text-accent-2/70' : 'text-muted')}>{t.hint}</span>
              </span>
            </button>
          )
        })}
      </nav>
      <div className="min-w-0">

      {tab === 'datos' && (
        <div className="space-y-6">
          <Card className="p-4">
            <FormGrid>
              <TextField className="sm:col-span-2" label="Nombre del despacho" value={d.name} onChange={(v) => set('name', v)} />
              <TextField label="Correo de venta y cuenta" value={d.salesEmail} onChange={(v) => set('salesEmail', v)} />
              <TextField label="Teléfono de venta y cuenta" value={d.salesPhone} onChange={(v) => set('salesPhone', v)} />
              <TextField label="Correo del contacto diario" value={d.contactEmail} onChange={(v) => set('contactEmail', v)} />
              <TextField label="Teléfono del contacto diario" value={d.contactPhone} onChange={(v) => set('contactPhone', v)} />
              <TextField label="Correo de soporte (canal único)" value={d.supportEmail} onChange={(v) => set('supportEmail', v)} />
              <TextField label="Teléfono de guardia" value={d.supportPhone} onChange={(v) => set('supportPhone', v)} />
            </FormGrid>
          </Card>
          <section>
            <SectionTitle>Quién firma por el despacho</SectionTitle>
            <Card className="p-4">
              <FormGrid>
                <TextField label="Nombre" value={d.signerName ?? ''} onChange={(v) => set('signerName', v)} />
                <TextField label="Puesto" value={d.signerRole ?? ''} onChange={(v) => set('signerRole', v)} />
                <TextField label="Correo con el que entra al sistema" help="La firma del despacho se hace con este usuario." value={d.signerEmail ?? ''} onChange={(v) => set('signerEmail', v.trim())} />
                <TextField label="Avisos de nuevo cliente para Operaciones" help="Correos separados por coma." value={d.opsEmails ?? ''} onChange={(v) => set('opsEmails', v)} />
              </FormGrid>
            </Card>
          </section>
        </div>
      )}

      {tab === 'venta' && (
        <Card className="p-4">
          <FormGrid>
            <NumberField
              label="Mínimo de venta por mes de creación"
              help="Del total del proyecto, al menos esto por cada mes que dura. Los proyectos cortos están bien si respetan el monto mensual."
              value={d.minMonthlyAmount ?? DEFAULT_MIN_MONTHLY}
              onChange={(v) => set('minMonthlyAmount', v ?? DEFAULT_MIN_MONTHLY)}
              suffix="$"
            />
            <div />
            <NumberField label="Micro: hasta (empleados)" value={sizes.micro} onChange={(v) => set('companySizes', { ...sizes, micro: v ?? sizes.micro })} />
            <NumberField label="Pequeña: hasta (empleados)" value={sizes.small} onChange={(v) => set('companySizes', { ...sizes, small: v ?? sizes.small })} />
            <NumberField label="Mediana: hasta (empleados)" help="Más que esto es empresa grande." value={sizes.medium} onChange={(v) => set('companySizes', { ...sizes, medium: v ?? sizes.medium })} />
          </FormGrid>
        </Card>
      )}

      {tab === 'facturacion' && (
        <Card className="space-y-4 p-4">
          <p className="text-sm text-ink2">
            Con lo que se timbra en FacturAPI. El RFC y el certificado de sello digital del despacho se cargan en el panel de FacturAPI. Confirma la clave de producto y
            servicio con tu contador.
          </p>
          <FormGrid>
            <TextField label="Serie" value={billing.series} onChange={(v) => setBilling({ series: v.toUpperCase() })} />
            <TextField label="Clave de producto o servicio (SAT)" value={billing.productKey} onChange={(v) => setBilling({ productKey: v.replace(/\D/g, '').slice(0, 8) })} />
            <TextField label="Clave de unidad (SAT)" value={billing.unitKey} onChange={(v) => setBilling({ unitKey: v.toUpperCase() })} />
            <TextField label="Nombre de la unidad" value={billing.unitName} onChange={(v) => setBilling({ unitName: v })} />
            <SelectField label="Método de pago por omisión" value={billing.paymentMethod} onChange={(v) => v && setBilling({ paymentMethod: v })} options={options(PAYMENT_METHOD)} allowEmpty={false} />
            <SelectField label="Forma de pago (PUE)" value={billing.paymentForm} onChange={(v) => v && setBilling({ paymentForm: v })} options={options(PAYMENT_FORM)} allowEmpty={false} />
            <SelectField label="Uso del CFDI por omisión" value={billing.cfdiUse} onChange={(v) => v && setBilling({ cfdiUse: v })} options={options(CFDI_USE)} allowEmpty={false} />
            <NumberField label="IVA" value={Math.round(billing.taxRate * 100)} onChange={(v) => setBilling({ taxRate: (v ?? 16) / 100 })} suffix="%" />
          </FormGrid>
        </Card>
      )}

      {tab === 'formatos' && <FormatsEditor d={d} set={set} />}
      {tab === 'guias' && <GuidesEditor d={d} set={set} />}
      {tab === 'integraciones' && <IntegrationsPanel />}
      </div>
      </div>
    </main>
  )
}

function FormatsEditor({ d, set }: { d: FirmSettings; set: <K extends keyof FirmSettings>(k: K, v: FirmSettings[K]) => void }) {
  const [code, setCode] = useState<FormatCode>('D15')
  const def = getFormat(d, code)
  const custom = Boolean(d.formats?.[code])
  const put = (next: FormatDef | null) => {
    const formats = { ...(d.formats ?? {}) }
    if (next) formats[code] = next
    else delete formats[code]
    set('formats', formats)
  }
  const edit = (fn: (x: FormatDef) => void) => {
    const next = structuredClone(def)
    fn(next)
    put(next)
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(DEFAULT_FORMATS) as FormatCode[]).map((c) => (
          <button key={c} type="button" onClick={() => setCode(c)} className={cx('rounded-full px-3 py-1 text-sm font-semibold', code === c ? 'bg-accent text-white' : 'bg-soft text-ink2')}>
            {c} · {DEFAULT_FORMATS[c].title}
          </button>
        ))}
      </div>
      <Card className="space-y-4 p-4">
        <p className="text-sm text-ink2">
          {custom ? 'Formato editado por el despacho.' : 'Formato de fábrica.'} Las preguntas aparecen en cada paso y en el documento. Una pregunta con * es obligatoria.
        </p>
        <TextArea label="Introducción del documento" rows={2} value={def.intro} onChange={(v) => edit((x) => (x.intro = v))} />
        {def.sections.map((s, si) => (
          <div key={s.id} className="rounded-lg border border-rule p-3">
            <TextField label={`Sección ${si + 1}`} value={s.title} onChange={(v) => edit((x) => (x.sections[si].title = v))} />
            <div className="mt-2 space-y-2">
              {s.questions.map((q, qi) => (
                <div key={q.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                  <TextField label={`Pregunta${q.required ? ' *' : ''}`} value={q.label} onChange={(v) => edit((x) => (x.sections[si].questions[qi].label = v))} />
                  <Button size="sm" variant="ghost" onClick={() => edit((x) => (x.sections[si].questions[qi].required = !q.required))}>
                    {q.required ? 'Opcional' : 'Obligatoria'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => edit((x) => x.sections[si].questions.splice(qi, 1))}>
                    Quitar
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => edit((x) => x.sections[si].questions.push({ id: `p${Date.now().toString(36)}`, label: 'Nueva pregunta', kind: code === 'D16' ? 'yesno' : 'long' }))}
              >
                + Pregunta
              </Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => edit((x) => x.sections.push({ id: `s${Date.now().toString(36)}`, title: 'Nueva sección', questions: [] }))}>
            + Sección
          </Button>
          {custom && (
            <Button size="sm" variant="ghost" onClick={() => put(null)}>
              Volver al formato de fábrica
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

function GuidesEditor({ d, set }: { d: FirmSettings; set: <K extends keyof FirmSettings>(k: K, v: FirmSettings[K]) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink2">Las guías aparecen en cada paso del CRM. «## » abre un título y «- » una viñeta.</p>
      {(Object.keys(DEFAULT_GUIDES) as GuideKey[]).map((k) => (
        <Card key={k} className="space-y-2 p-4">
          <TextArea label={GUIDE_TITLE[k]} rows={8} value={d.guides?.[k] ?? DEFAULT_GUIDES[k]} onChange={(v) => set('guides', { ...(d.guides ?? {}), [k]: v })} />
          {d.guides?.[k] && (
            <Button size="sm" variant="ghost" onClick={() => set('guides', Object.fromEntries(Object.entries(d.guides ?? {}).filter(([x]) => x !== k)))}>
              Volver a la guía de fábrica
            </Button>
          )}
        </Card>
      ))}
    </div>
  )
}

function IntegrationsPanel() {
  const repo = useRepo()
  const [i, setI] = useState<Integrations | null>(null)
  useEffect(() => {
    void integrations(repo).then(setI)
  }, [repo])
  const row = (label: string, ok: boolean, detail: string) => (
    <li className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
      <span>
        <span className="font-semibold">{label}</span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
      <Badge tone={ok ? 'green' : 'gray'} dot className="shrink-0">
        {ok ? 'Lista' : 'Sin configurar'}
      </Badge>
    </li>
  )
  if (repo.mode === 'demo') return <Notice>En la demostración no hay servidor: las integraciones se configuran en Netlify y funcionan con la base de datos conectada.</Notice>
  return (
    <Card>
      <ul className="divide-y divide-rule">
        {row('Correo del sistema', Boolean(i?.email), i?.email ? `${i.email === 'google' ? 'Google Workspace' : 'Resend'} · ${i.emailFrom ?? ''}` : 'Google Workspace (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SENDER) o Resend (RESEND_API_KEY, EMAIL_FROM). Mientras tanto se abre tu programa de correo.')}
        {row('Resumen con Claude', Boolean(i?.ai), i?.aiGateway ? 'Por el AI Gateway de Netlify (se cobra en créditos de Netlify). Para usar tu cuenta de Anthropic, guarda ANTHROPIC_API_KEY en Netlify.' : i?.ai ? 'Con la clave de Anthropic guardada en Netlify.' : 'ANTHROPIC_API_KEY en Netlify.')}
        {row('Timbrado con FacturAPI', Boolean(i?.facturapi), i?.facturapi ? `Modo ${i.facturapi === 'live' ? 'producción' : 'pruebas'}.` : 'FACTURAPI_KEY en Netlify (clave de pruebas o de producción).')}
      </ul>
    </Card>
  )
}
