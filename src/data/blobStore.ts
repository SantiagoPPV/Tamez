/**
 * Archivos de la demostración: se guardan en este navegador (IndexedDB). Si el navegador
 * no lo permite (ventana privada), duran mientras la página esté abierta.
 */
const DB = 'sam-demo-archivos'
const STORE = 'archivos'
const memory = new Map<string, Blob>()

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await open()
  if (!db) return undefined
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(undefined)
    } catch {
      resolve(undefined)
    }
  })
}

export async function putBlob(id: string, blob: Blob): Promise<void> {
  memory.set(id, blob)
  await tx('readwrite', (s) => s.put(blob, id))
}

export async function getBlob(id: string): Promise<Blob | null> {
  if (memory.has(id)) return memory.get(id)!
  const b = await tx<Blob>('readonly', (s) => s.get(id) as IDBRequest<Blob>)
  return b ?? null
}

export async function deleteBlob(id: string): Promise<void> {
  memory.delete(id)
  await tx('readwrite', (s) => s.delete(id))
}
