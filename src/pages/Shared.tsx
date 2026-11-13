import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { DemoRepository } from '../data/demoRepo'
import type { SharedDocument } from '../data/repository'
import { getSupabase, supabaseConfigured } from '../data/supabase'
import { SupabaseRepository } from '../data/supabaseRepo'
import { DOCUMENTS } from '../domain/catalogs'
import { fmtDate } from '../domain/format'
import { DocPreview, printDocument } from '../docs/DocPreview'
import { renderDocument } from '../docs/render'
import { Button, Eyebrow, Notice, Spinner } from '../ui/kit'

/** Un documento compartido por liga: se ve y se descarga sin entrar al sistema. */
export function SharedPage() {
  const { token = '' } = useParams()
  const [doc, setDoc] = useState<SharedDocument | null | undefined>(undefined)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const repo = supabaseConfigured ? new SupabaseRepository(getSupabase()!) : new DemoRepository()
    void repo
      .sharedDocument(token)
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [token])
  const meta = (() => {
    try {
      return doc?.snapshot.fields.__meta ? (JSON.parse(doc.snapshot.fields.__meta) as { version: number; dateText: string; fileName: string; firmName: string; projectName?: string; client?: string; projectKey?: string }) : null
    } catch {
      return null
    }
  })()
  useEffect(() => {
    if (!doc) return
    void renderDocument({
      code: doc.code,
      data: doc.snapshot,
      signers: doc.signers,
      signatures: doc.signatures,
      hash: doc.signatures[0]?.documentHash ?? null,
      meta: {
        firmName: meta?.firmName ?? 'Sistemas a la medida',
        projectKey: doc.project?.key ?? meta?.projectKey ?? '',
        projectName: doc.project?.name ?? meta?.projectName ?? '',
        client: doc.project?.client ?? meta?.client ?? '',
        version: meta?.version ?? 1,
        dateText: meta?.dateText ?? '',
        fileName: meta?.fileName ?? doc.title,
      },
    }).then((r) => setHtml(r.html))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc])
  if (error) return <Wrap><Notice tone="error">{error}</Notice></Wrap>
  if (doc === undefined) return <Spinner />
  if (doc === null)
    return (
      <Wrap>
        <Notice tone="warn">Esta liga ya no está disponible: venció o se retiró. Pide al despacho que te la envíe de nuevo.</Notice>
      </Wrap>
    )
  return (
    <Wrap>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>{meta?.firmName ?? 'Sistemas a la medida'}</Eyebrow>
          <h1 className="text-xl font-extrabold tracking-tight">{DOCUMENTS[doc.code].title}</h1>
          <p className="text-sm text-muted">
            {doc.title}
            {doc.signatures.length > 0 && ` · ${doc.signatures.length} firma${doc.signatures.length > 1 ? 's' : ''} electrónica${doc.signatures.length > 1 ? 's' : ''}`} · disponible hasta el {fmtDate(doc.expiresOn)}
          </p>
        </div>
        {html && <Button variant="primary" onClick={() => printDocument(html, meta?.fileName ?? doc.title)}>Descargar PDF</Button>}
      </div>
      {html ? <DocPreview html={html} title={doc.title} /> : <Spinner />}
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">{children}</main>
}
