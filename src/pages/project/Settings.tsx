import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useRepo } from '../../app/session'
import { CLIENT_ROLE, HAT, HAT_LEVEL, options } from '../../domain/catalogs'
import { PARAM_FIELDS } from '../../domain/defaults'
import { localId } from '../../domain/factory'
import { fmtDate, fmtMoney } from '../../domain/format'
import type { ClientContact, Member, Params, Project, Segment } from '../../domain/types'
import { DateField, FormGrid, NumberField, SelectField, TextField } from '../../ui/fields'
import { Button, Card, Drawer, Notice, SectionTitle } from '../../ui/kit'
import { names, useDraft, useP, useSaver } from './ctx'
import { MilestoneForm, newMilestone } from './Wbs'

export function SettingsPage() {
  return (
    <div className="space-y-10">
      <ProjectForm />
      <People />
      <Segments />
      <Hats />
      <Facts />
      <Portal />
      <Danger />
    </div>
  )
}

/** Lo que se capturó una vez para todos los documentos del proyecto. */
function Facts() {
  const { data, updateProject } = useP()
  const saver = useSaver()
  const facts = data.project.facts ?? { fields: {}, lists: {} }
  const fields = Object.entries(facts.fields)
  const lists = Object.entries(facts.lists)
  const drop = (kind: 'fields' | 'lists', k: string) => {
    const next = structuredClone(facts)
    delete next[kind][k]
    void saver.run(() => updateProject({ ...data.project, facts: next }))
  }
  return (
    <section>
      <SectionTitle>Lo que se captura una vez</SectionTitle>
      <p className="mb-3 text-sm text-ink2">
        Datos que usan todos los documentos del proyecto: facturación del cliente, objetivo, alcance, supuestos… Se agregan desde el editor de cada documento con
        «Al proyecto».
      </p>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {fields.length + lists.length === 0 ? (
        <p className="text-sm text-muted">Todavía nada.</p>
      ) : (
        <Card className="divide-y divide-rule text-sm">
          {fields.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-2 sm:grid-cols-[16rem_1fr_auto] sm:gap-3">
              <span className="font-mono text-xs text-muted">{k}</span>
              <span>{v}</span>
              <button type="button" className="justify-self-start text-xs text-muted hover:text-rojo" onClick={() => drop('fields', k)}>
                Quitar
              </button>
            </div>
          ))}
          {lists.map(([k, rows]) => (
            <div key={k} className="grid gap-1 px-4 py-2 sm:grid-cols-[16rem_1fr_auto] sm:gap-3">
              <span className="font-mono text-xs text-muted">lista {k}</span>
              <span>{rows.length} renglones</span>
              <button type="button" className="justify-self-start text-xs text-muted hover:text-rojo" onClick={() => drop('lists', k)}>
                Quitar
              </button>
            </div>
          ))}
        </Card>
      )}
    </section>
  )
}

/** Quién del cliente entra al portal. */
function Portal() {
  const { data, save, remove } = useP()
  const n = names(data)
  const saver = useSaver()
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [contactId, setContactId] = useState<string | null>(null)
  return (
    <section>
      <SectionTitle aside={<Link to={`/portal/${data.project.id}`} className="text-sm font-semibold text-accent">Ver el portal como el cliente</Link>}>Portal del cliente</SectionTitle>
      <p className="mb-3 text-sm text-ink2">
        El cliente entra con su correo y solo ve su proyecto: avance, hitos y su aceptación, pendientes, sus solicitudes, los documentos enviados y lo que tiene
        por firmar. Nunca costos, horas internas ni márgenes. Para entrar elige «Cliente» en la pantalla de entrada y recibe un enlace en su correo.
      </p>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <Card className="divide-y divide-rule">
        {data.portalAccess.length === 0 && <p className="p-4 text-sm text-muted">Nadie del cliente tiene acceso todavía.</p>}
        {data.portalAccess.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span>
              <span className="font-semibold">{n.contact(a.contactId) || a.email}</span> <span className="text-muted">{a.email}</span>
              {a.userId && <span className="block font-mono text-xs text-muted">{a.userId}</span>}
            </span>
            <Button size="sm" variant="ghost" onClick={() => void saver.run(() => remove('portalAccess', a.id))}>
              Quitar acceso
            </Button>
          </div>
        ))}
        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <TextField label="Correo con el que entra" value={email} onChange={(v) => setEmail(v.trim())} />
          <SelectField
            label="Persona del cliente"
            value={contactId}
            onChange={(v) => {
              setContactId(v)
              const c = data.contacts.find((x) => x.id === v)
              if (c?.email && !email) setEmail(c.email)
            }}
            options={n.contactOptions}
          />
          <TextField label="Id de usuario (opcional)" help="Solo si ya tiene usuario en Supabase." value={userId} onChange={setUserId} />
          <Button
            disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || (userId.trim() !== '' && !/^[0-9a-f-]{36}$/i.test(userId.trim())) || saver.busy}
            onClick={() =>
              void saver
                .run(() => save('portalAccess', { id: localId('acc'), userId: userId.trim() || null, email: email.trim().toLowerCase(), contactId }))
                .then((ok) => {
                  if (ok) {
                    setUserId('')
                    setEmail('')
                    setContactId(null)
                  }
                })
            }
          >
            Dar acceso
          </Button>
        </div>
      </Card>
    </section>
  )
}

function ProjectForm() {
  const { data, result, updateProject } = useP()
  const [draft, setDraft] = useState<Project>(() => structuredClone(data.project))
  const [newHoliday, setNewHoliday] = useState<string | null>(null)
  const saver = useSaver()
  const [ok, setOk] = useState(false)
  const set = <K extends keyof Project>(k: K, v: Project[K]) => {
    setOk(false)
    setDraft((d) => ({ ...d, [k]: v }))
  }
  const setParam = <K extends keyof Params>(k: K, v: Params[K]) => set('params', { ...draft.params, [k]: v })
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.project)
  const groups = [...new Set(PARAM_FIELDS.map((f) => f.group))]

  return (
    <section>
      <SectionTitle
        aside={
          <Button variant="primary" disabled={!dirty || saver.busy} onClick={() => void saver.run(() => updateProject(draft)).then((x) => setOk(x))}>
            {saver.busy ? 'Guardando…' : 'Guardar el proyecto'}
          </Button>
        }
      >
        Proyecto y parámetros
      </SectionTitle>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      {ok && !dirty && <Notice>Guardado.</Notice>}
      <Card className="mt-3 space-y-6 p-4 sm:p-5">
        <FormGrid>
          <TextField label="Clave del proyecto" value={draft.key} onChange={(v) => set('key', v.toUpperCase())} />
          <TextField label="Nombre del proyecto" value={draft.name} onChange={(v) => set('name', v)} />
          <TextField label="Cliente" value={draft.client} onChange={(v) => set('client', v)} />
          <TextField label="Versión del presupuesto interno (D11)" value={draft.budgetVersion} onChange={(v) => set('budgetVersion', v)} />
          <DateField label="Fecha de arranque" value={draft.startDate} onChange={(v) => set('startDate', v)} />
          <DateField label="Fecha de corte (vacía = hoy)" value={draft.cutoffDate} onChange={(v) => set('cutoffDate', v)} />
          <NumberField
            label="Horas de la línea base firmada"
            help={result.baselineCheck}
            value={draft.baselineHours}
            onChange={(v) => set('baselineHours', v)}
            suffix="h"
          />
          <DateField label="Fecha de firma de la línea base (puerta 3)" value={draft.baselineSignedOn} onChange={(v) => set('baselineSignedOn', v)} />
        </FormGrid>
        <p className="text-xs text-muted">
          Suma de pagos (pago inicial + hitos): {fmtMoney(result.paymentsSum)} {result.paymentsCheck && `· ${result.paymentsCheck}`}
        </p>

        {groups.map((g) => (
          <div key={g}>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{g}</h3>
            <FormGrid>
              {PARAM_FIELDS.filter((f) => f.group === g).map((f) => {
                const v = draft.params[f.key]
                if (f.unit === 'date')
                  return <DateField key={f.key} label={f.label} value={(v as string | null) ?? null} onChange={(x) => setParam(f.key, x as never)} />
                if (f.unit === 'text')
                  return (
                    <TextField key={f.key} className="sm:col-span-2" label={f.label} value={String(v ?? '')} onChange={(x) => setParam(f.key, x as never)} />
                  )
                const isPct = f.unit === 'pct'
                return (
                  <NumberField
                    key={f.key}
                    label={f.label}
                    suffix={isPct ? '%' : f.unit === 'pesos' ? '$' : f.unit === 'hours' ? 'h' : f.unit === 'days' ? 'días' : undefined}
                    value={v == null ? null : isPct ? Math.round((v as number) * 10000) / 100 : (v as number)}
                    onChange={(x) => setParam(f.key, (x == null ? (f.key === 'minMargin' || f.key === 'expectedMargin' || f.unit === 'pesos' || f.key === 'creditDays' ? null : 0) : isPct ? x / 100 : x) as never)}
                  />
                )
              })}
            </FormGrid>
          </div>
        ))}

        <div>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Días inhábiles</h3>
          <p className="mb-2 text-xs text-muted">Descansos obligatorios y los que avisa el cliente. Los sábados y domingos ya no cuentan.</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {[...draft.nonWorkingDays].sort().map((d) => (
              <span key={d} className="num inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1 text-sm">
                {fmtDate(d)}
                <button
                  type="button"
                  aria-label={`Quitar ${fmtDate(d)}`}
                  className="text-muted hover:text-rojo"
                  onClick={() => set('nonWorkingDays', draft.nonWorkingDays.filter((x) => x !== d))}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <DateField className="w-48" label="Agregar día" value={newHoliday} onChange={setNewHoliday} />
            <Button
              disabled={!newHoliday}
              onClick={() => {
                if (newHoliday && !draft.nonWorkingDays.includes(newHoliday)) set('nonWorkingDays', [...draft.nonWorkingDays, newHoliday])
                setNewHoliday(null)
              }}
            >
              Agregar
            </Button>
          </div>
        </div>
      </Card>
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-semibold text-ambar">Cambios sin guardar en el proyecto</span>
            <div className="flex gap-2">
              <Button onClick={() => setDraft(structuredClone(data.project))}>Descartar</Button>
              <Button variant="primary" disabled={saver.busy} onClick={() => void saver.run(() => updateProject(draft)).then((x) => setOk(x))}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function People() {
  const { data, save, remove } = useP()
  const member = useDraft<Member>()
  const contact = useDraft<ClientContact>()
  const saver = useSaver()
  const used = (id: string) =>
    data.wbs.some((w) => w.ownerId === id || w.reviewerId === id) || data.workLogs.some((l) => l.personId === id) || data.risks.some((r) => r.ownerId === id)
  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <div>
        <SectionTitle aside={<Button size="sm" onClick={() => member.setDraft({ id: localId('mem'), name: '', hourlyCost: null, weeklyHours: null, userId: null })}>Agregar</Button>}>
          Personas del despacho
        </SectionTitle>
        <Card className="divide-y divide-rule">
          {data.members.length === 0 && <p className="p-4 text-sm text-muted">Agrega a los socios con su costo por hora.</p>}
          {data.members.map((m) => (
            <button key={m.id} type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface" onClick={() => member.setDraft(structuredClone(m))}>
              <span className="font-semibold">{m.name}</span>
              <span className="num text-sm text-muted">
                {m.hourlyCost ? `${fmtMoney(m.hourlyCost)}/h` : 'sin costo por hora'} · {m.weeklyHours ?? '—'} h/sem
              </span>
            </button>
          ))}
        </Card>
      </div>
      <div>
        <SectionTitle aside={<Button size="sm" onClick={() => contact.setDraft({ id: localId('con'), name: '', role: '' })}>Agregar</Button>}>
          Personas del cliente
        </SectionTitle>
        <Card className="divide-y divide-rule">
          {data.contacts.length === 0 && <p className="p-4 text-sm text-muted">Quien decide y paga, la responsable del proyecto, el contacto de sistemas…</p>}
          {data.contacts.map((c) => (
            <button key={c.id} type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface" onClick={() => contact.setDraft(structuredClone(c))}>
              <span className="font-semibold">{c.name}</span>
              <span className="text-right text-sm text-muted">{c.role}</span>
            </button>
          ))}
        </Card>
      </div>

      {member.draft && (
        <Drawer
          open
          onClose={() => member.setDraft(null)}
          title={member.draft.name || 'Persona del despacho'}
          footer={
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={saver.busy || !member.draft.name.trim()} onClick={() => void saver.run(() => save('members', member.draft!)).then((ok) => ok && member.setDraft(null))}>
                Guardar
              </Button>
              <Button onClick={() => member.setDraft(null)}>Cancelar</Button>
              <div className="flex-1" />
              {data.members.some((m) => m.id === member.draft!.id) && !used(member.draft.id) && (
                <Button variant="danger" onClick={() => void saver.run(() => remove('members', member.draft!.id)).then((ok) => ok && member.setDraft(null))}>
                  Borrar
                </Button>
              )}
            </div>
          }
        >
          {saver.error && <Notice tone="error">{saver.error}</Notice>}
          <FormGrid>
            <TextField className="sm:col-span-2" label="Nombre" value={member.draft.name} onChange={(v) => member.set('name', v)} />
            <NumberField label="Costo por hora" help="Sin él se usa el costo para estimar." value={member.draft.hourlyCost} onChange={(v) => member.set('hourlyCost', v)} suffix="$" />
            <NumberField label="Horas por semana comprometidas" value={member.draft.weeklyHours} onChange={(v) => member.set('weeklyHours', v)} suffix="h" />
            <TextField label="Puesto" value={member.draft.position ?? ''} onChange={(v) => member.set('position', v)} />
            <TextField label="Correo" value={member.draft.email ?? ''} onChange={(v) => member.set('email', v)} />
            <TextField label="Teléfono" value={member.draft.phone ?? ''} onChange={(v) => member.set('phone', v)} />
            <TextField
              className="sm:col-span-2"
              label="Usuario (id de Supabase Auth)"
              help="Opcional: liga a la persona con su usuario para proponerla al capturar horas."
              value={member.draft.userId ?? ''}
              onChange={(v) => member.set('userId', v.trim() || null)}
            />
          </FormGrid>
        </Drawer>
      )}
      {contact.draft && (
        <Drawer
          open
          onClose={() => contact.setDraft(null)}
          title={contact.draft.name || 'Persona del cliente'}
          footer={
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={saver.busy || !contact.draft.name.trim()} onClick={() => void saver.run(() => save('contacts', contact.draft!)).then((ok) => ok && contact.setDraft(null))}>
                Guardar
              </Button>
              <Button onClick={() => contact.setDraft(null)}>Cancelar</Button>
            </div>
          }
        >
          {saver.error && <Notice tone="error">{saver.error}</Notice>}
          <FormGrid>
            <TextField className="sm:col-span-2" label="Nombre" value={contact.draft.name} onChange={(v) => contact.set('name', v)} />
            <SelectField
              label="Papel"
              help="Los documentos y el portal lo usan: quien decide y paga aprueba los cambios con costo."
              value={contact.draft.roleKey ?? null}
              onChange={(v) => {
                contact.set('roleKey', v)
                if (v && !contact.draft!.role) contact.set('role', CLIENT_ROLE[v])
              }}
              options={options(CLIENT_ROLE)}
            />
            <TextField label="Papel como se escribe" help="Decide y paga, responsable del proyecto…" value={contact.draft.role} onChange={(v) => contact.set('role', v)} />
            <TextField label="Puesto" value={contact.draft.position ?? ''} onChange={(v) => contact.set('position', v)} />
            <TextField label="Correo" value={contact.draft.email ?? ''} onChange={(v) => contact.set('email', v)} />
            <TextField label="Teléfono" value={contact.draft.phone ?? ''} onChange={(v) => contact.set('phone', v)} />
          </FormGrid>
        </Drawer>
      )}
    </section>
  )
}

function Segments() {
  const { data, save, remove } = useP()
  const seg = useDraft<Segment>()
  const ms = useDraft<ReturnType<typeof newMilestone>>()
  const saver = useSaver()
  const segments = [...data.segments].sort((a, b) => a.position - b.position)
  return (
    <section>
      <SectionTitle
        aside={
          <Button size="sm" onClick={() => seg.setDraft({ id: localId('seg'), position: Math.max(0, ...segments.map((s) => s.position)) + 1, name: '' })}>
            Agregar tramo
          </Button>
        }
      >
        Tramos e hitos
      </SectionTitle>
      <Card className="divide-y divide-rule">
        {segments.map((s) => {
          const m = data.milestones.find((x) => x.segmentId === s.id)
          return (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <button type="button" className="text-left font-semibold hover:text-accent" onClick={() => seg.setDraft(structuredClone(s))}>
                {s.position}. {s.name}
              </button>
              {m ? (
                <button type="button" className="num text-left text-sm text-ink2 hover:text-accent" onClick={() => ms.setDraft(structuredClone(m))}>
                  {m.key} · {m.title || 'sin nombre'} · {fmtMoney(m.paymentAmount)} · entrega {fmtDate(m.plannedDelivery) || '—'}
                </button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => ms.setDraft(newMilestone(s.id, `H${data.milestones.length + 1}`))}>
                  Agregar hito
                </Button>
              )}
            </div>
          )
        })}
      </Card>
      {seg.draft && (
        <Drawer
          open
          onClose={() => seg.setDraft(null)}
          title={seg.draft.name || 'Tramo'}
          footer={
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={!seg.draft.name.trim() || saver.busy} onClick={() => void saver.run(() => save('segments', seg.draft!)).then((ok) => ok && seg.setDraft(null))}>
                Guardar
              </Button>
              <Button onClick={() => seg.setDraft(null)}>Cancelar</Button>
              <div className="flex-1" />
              {data.segments.some((x) => x.id === seg.draft!.id) && !data.wbs.some((w) => w.segmentId === seg.draft!.id) && (
                <Button variant="danger" onClick={() => void saver.run(() => remove('segments', seg.draft!.id)).then((ok) => ok && seg.setDraft(null))}>
                  Borrar
                </Button>
              )}
            </div>
          }
        >
          {saver.error && <Notice tone="error">{saver.error}</Notice>}
          <FormGrid>
            <TextField label="Nombre" value={seg.draft.name} onChange={(v) => seg.set('name', v)} help="Hasta la puerta 3, Hito 1… El orden importa para los retrasos del cliente." />
            <NumberField label="Orden" value={seg.draft.position} onChange={(v) => seg.set('position', v ?? 0)} />
            <TextField className="sm:col-span-2" label="Nombre para el cliente" help="Por ejemplo, «Diagnóstico» para «Hasta la puerta 3»." value={seg.draft.title ?? ''} onChange={(v) => seg.set('title', v)} />
            <TextField className="sm:col-span-2" label="Resultado" value={seg.draft.result ?? ''} onChange={(v) => seg.set('result', v)} />
            <TextField className="sm:col-span-2" label="Cómo se comprueba" value={seg.draft.criterion ?? ''} onChange={(v) => seg.set('criterion', v)} />
          </FormGrid>
        </Drawer>
      )}
      {ms.draft && <MilestoneForm draft={ms.draft} set={ms.set} close={() => ms.setDraft(null)} />}
    </section>
  )
}

function Hats() {
  const { data, save } = useP()
  const n = names(data)
  const saver = useSaver()
  return (
    <section>
      <SectionTitle>Sombreros</SectionTitle>
      <p className="mb-3 text-sm text-ink2">
        Quién lleva cada sombrero, en qué escalón y quién lo suple. Cada subida de escalón se anota en Decisiones con su evidencia.
      </p>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <Card className="divide-y divide-rule">
        {data.hats.map((h) => (
          <div key={h.id} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[12rem_1fr_1fr_1fr] sm:items-end">
            <div className="font-semibold sm:pb-2.5">{HAT[h.hat]}</div>
            <SelectField label="Quién lo lleva" value={h.holderId} onChange={(v) => void saver.run(() => save('hats', { ...h, holderId: v }))} options={n.memberOptions} />
            <SelectField label="Escalón" value={h.level} onChange={(v) => v && void saver.run(() => save('hats', { ...h, level: v }))} options={options(HAT_LEVEL)} allowEmpty={false} />
            <SelectField label="Suplente" value={h.backupId} onChange={(v) => void saver.run(() => save('hats', { ...h, backupId: v }))} options={n.memberOptions} />
          </div>
        ))}
      </Card>
    </section>
  )
}

function Danger() {
  const { data } = useP()
  const repo = useRepo()
  const navigate = useNavigate()
  const saver = useSaver()
  return (
    <section className="border-t border-rule pt-6">
      <SectionTitle>Borrar el proyecto</SectionTitle>
      <p className="mb-3 text-sm text-ink2">Borra el proyecto y todo lo capturado en él. No se puede deshacer.</p>
      {saver.error && <Notice tone="error">{saver.error}</Notice>}
      <Button
        variant="danger"
        onClick={() => {
          const k = prompt(`Escribe la clave ${data.project.key} para confirmar.`)
          if (k === data.project.key) void saver.run(() => repo.deleteProject(data.project.id)).then((ok) => ok && navigate('/'))
        }}
      >
        Borrar {data.project.key}
      </Button>
    </section>
  )
}
