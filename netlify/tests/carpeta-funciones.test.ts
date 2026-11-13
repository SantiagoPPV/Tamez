import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Netlify publica como función cada archivo de netlify/functions, y su nombre solo admite
 * letras, números, guiones y guiones bajos. Una prueba ahí (factura.test.ts) tumbó un deploy:
 * las pruebas viven en netlify/tests.
 */
describe('Carpeta de funciones de Netlify', () => {
  const files = readdirSync(new URL('../functions', import.meta.url))

  it('solo tiene funciones con nombre válido para Netlify', () => {
    for (const f of files) expect(f.replace(/\.(mts|mjs|cts|cjs|ts|js)$/, ''), f).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('no tiene pruebas', () => {
    expect(files.filter((f) => /\.(test|spec)\./.test(f))).toEqual([])
  })
})
