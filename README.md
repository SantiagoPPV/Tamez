# Sistemas a la medida · software interno

«El único lugar donde vive un proyecto: de sus datos salen los documentos, los reportes y
los indicadores.»

Esta es la **versión 1 (núcleo)**: hace lo mismo que hoy hace la hoja de control, con los
mismos cálculos, y la prueba de aceptación del caso ficticio CE-INV pasa en automático.

| Módulo | Pantalla | Qué hace |
| --- | --- | --- |
| Proyecto y parámetros | Proyecto | Clave, cliente, fechas, precio y pagos, costo por hora, reserva, bolsa, plazos, topes, umbrales del semáforo, días inhábiles, personas, tramos e hitos, sombreros |
| Desglose | Desglose | Entregables, actividades y subactividades con horas y responsable; línea base congelada; lista de calidad L1 a L7 por tipo; revisión interna; avance 0 % o 100 % |
| Bitácora de trabajo | Bitácora | Horas por persona y actividad (folio T-), clase de hora, formación y garantía, folio relacionado, gasto, evidencia, bloqueo |
| Control | Cambios, Riesgos, Pendientes, Decisiones, Cobranza | Folios C-, R-, DE-; pendientes del cliente que recorren la fecha prevista; facturas y cobro |
| Indicadores | Tablero, Semanas | Los once indicadores con su semáforo, presupuesto interno D11, seguimiento al corte, avance por hito, corte semanal, carga por persona y calibración por tipo |

Reglas que el software hace cumplir: avance 0 % o 100 % solo con lista completa y revisión
de otra persona con fecha; nadie aprueba su propio trabajo (también en la base); tope de
horas por actividad; línea base congelada tras la firma (puerta 3); horas reales solo desde
la bitácora; ningún renglón de bitácora se borra; todo valor de negocio es un parámetro.

## Arranque rápido

```bash
npm install
npm run dev
```

Sin variables de Supabase arranca en **modo demostración**: el caso CE-INV al corte del
12/02/2027, guardado solo en tu navegador. Para trabajar contra Supabase copia
`.env.example` a `.env.local` y llena la URL y la clave publicable.

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Desarrollo local |
| `npm test` | Pruebas automáticas (aceptación CE-INV, 28 pruebas de humo, días hábiles, formatos, mapeo a la base) |
| `npm run check` | Tipos, lint y pruebas |
| `npm run ci` | Lo que corre Netlify antes de publicar: lint, pruebas y build |

## Cómo está hecho

React 19 + TypeScript + Vite + Tailwind 4 en la interfaz; Supabase (Postgres, Auth) con RLS;
Netlify. Código en inglés, interfaz en español, móvil primero; fechas en hora del centro de
México; formatos `$#,##0`, `dd/mm/aaaa` y horas con un decimal.

```
src/domain/       Lógica pura, sin interfaz
  control.ts        El motor: cada fórmula de la hoja de control (ESPEC.md §1 a §3)
  dates.ts          Días hábiles (WORKDAY, NETWORKDAYS) y hora de México
  catalogs.ts       Listas, bloques, tipos, listas de calidad L1 a L7, sombreros
  defaults.ts       Valores iniciales de los parámetros (minuta de decisiones)
  *.test.ts         Prueba de aceptación y pruebas de humo
src/data/         Acceso a datos
  repository.ts     Interfaz común
  supabaseRepo.ts   Supabase (tablas sam_*)
  demoRepo.ts       Modo demostración (navegador)
  ceinv.raw.ts      Caso CE-INV, generado de construir.py (no editar a mano)
src/pages/        Pantallas
supabase/migrations/  Esquema de la base, con RLS
```

Los cálculos viven en el código y no en la base: así se prueban contra la hoja con cifras
exactas. La base guarda solo lo que se captura.

## Prueba de aceptación

`src/domain/control.acceptance.test.ts` carga CE-INV con corte del viernes 12/02/2027 y
exige las cifras del traspaso: 73/115/95/107/30 = 420 horas; reserva 63 y bolsa 34; costo
$276,500, precio $330,000, margen $53,500 (16.2 %); 199 horas reales; avance 179/188 = 0.95;
eficiencia 0.90; estimado de lo que falta 335; proyección 534 h y $285,000; margen
proyectado $45,000 (13.6 %); 13 defectos internos; semáforos en verde. También reproduce
los cortes pegados de las semanas 1 a 4. `control.smoke.test.ts` corre las 28 pruebas de
humo de ESPEC.md §5, adaptadas a los datos de `construir.py` (las diferencias están
anotadas en el archivo).

## Despliegue

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md): Supabase (migración, usuarios, alta en `sam_staff`),
Netlify y los tres ambientes.

## Lo que sigue

- **Versión 2:** generador de documentos (D02, D10 y D06 primero) a partir de las plantillas
  HTML con `data-campo`; antes, normalizar los sinónimos del diccionario de campos.
- Puertas (cinco, las aprueba Santiago) y permisos por sombrero y escalón.
- Confidencialidad: el repositorio es público. Aquí solo va código y el caso ficticio
  CE-INV; el manual, la minuta y los documentos legales no se suben.
