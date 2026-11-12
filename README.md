# Sistemas a la medida · software interno

«El único lugar donde vive un proyecto: de sus datos salen los documentos, los reportes y
los indicadores.»

Están hechas las cuatro versiones del plan. La prueba de aceptación del caso ficticio CE-INV
pasa en automático con las mismas cifras de la hoja de control.

| Versión | Pantallas | Qué hace |
| --- | --- | --- |
| 1 · Núcleo | Proyecto, Desglose, Bitácora, Cambios, Riesgos, Pendientes, Decisiones, Cobranza, Tablero, Semanas | Lo mismo que la hoja de control, con los mismos cálculos: parámetros, desglose con línea base, bitácora de horas, folios C-, R-, DE-, cobranza, los once indicadores con semáforo, D11 y corte semanal |
| 1 · Puertas | Puertas, Desglose | Las cinco puertas con su lista; solo un administrador (Santiago) las aprueba, también en la base. Criterios de aceptación por hito, con su resultado |
| 2 · Documentos | Documentos | D01 a D14 desde las plantillas HTML: se llenan con los datos del proyecto, lo que falta se captura una vez, cada documento lleva versión y lo enviado queda congelado. Se imprimen o guardan en PDF en hoja carta |
| 3 · Servicio | Servicio | Solicitudes de soporte en la bitácora de cambios, bolsa de horas del mes, tiempos de respuesta (urgente y normal), rutinas del mes y reporte mensual D09 |
| 3 · Portal | Portal del cliente | El cliente entra con su usuario y ve solo su proyecto: avance, hitos y su aceptación, pendientes, sus solicitudes y los documentos enviados. Nunca costos, horas internas ni márgenes |
| 4 · Aprendizaje | Prospectos, Estimaciones, Despacho | Embudo de prospectos, propuestas con desglose tipo (de las unidades a las horas y al precio), conversión de la propuesta aceptada en proyecto, base de estimaciones con horas reales y versiones de la tabla de horas base |

Reglas que el software hace cumplir: avance 0 % o 100 % solo con lista completa y revisión
de otra persona con fecha; nadie aprueba su propio trabajo (también en la base); tope de
horas por actividad; línea base congelada tras la firma (puerta 3); horas reales solo desde
la bitácora; ningún renglón de bitácora se borra; las puertas y las versiones de horas base
las aprueba un administrador; lo enviado al cliente no se edita; todo valor de negocio es un
parámetro.

## Arranque rápido

```bash
npm install
```

```bash
npm run dev
```

Sin variables de Supabase arranca en **modo demostración**: el caso CE-INV al corte del
12/02/2027, con su prospecto, su propuesta y sus documentos, guardado solo en tu navegador.
Para trabajar contra Supabase copia `.env.example` a `.env.local` y llena la URL y la clave
publicable.

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Desarrollo local |
| `npm test` | Pruebas automáticas (89): aceptación CE-INV, 28 pruebas de humo, días hábiles, versiones 2 a 4, plantillas de documentos y mapeo a la base |
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
  gates.ts          Las cinco puertas y lo que falta para pasar cada una
  estimating.ts     Desglose tipo: de las unidades a las horas y al precio
  conversion.ts     De la propuesta aceptada al proyecto
  learning.ts       Base de estimaciones con horas reales y calibración
  service.ts        Bolsa de horas, tiempos de respuesta y rutinas del mes
  catalogs.ts       Listas, bloques, tipos, listas de calidad, puertas, documentos
  defaults.ts       Valores iniciales de los parámetros (minuta de decisiones)
  *.test.ts         Prueba de aceptación, pruebas de humo y pruebas de v2 a v4
src/docs/         Generador de documentos
  plantillas/       Las plantillas HTML (data-campo, data-lista) y base.css
  autofill.ts       Qué dato del proyecto llena cada campo de cada documento
  engine.ts         Llena la plantilla, marca lo que falta y cuenta las hojas
src/data/         Acceso a datos
  repository.ts     Interfaz común
  supabaseRepo.ts   Supabase (tablas sam_* y funciones del portal)
  demoRepo.ts       Modo demostración (navegador)
  portalView.ts     Lo que el cliente puede ver de su proyecto
  ceinv.raw.ts      Caso CE-INV, generado de construir.py (no editar a mano)
src/pages/        Pantallas
supabase/migrations/  Esquema de la base, con RLS (dos migraciones, en orden)
```

Los cálculos viven en el código y no en la base: así se prueban contra la hoja con cifras
exactas. La base guarda solo lo que se captura.

### Documentos

Cada campo de una plantilla se llena en este orden: lo congelado al enviar, lo capturado en
el documento, los datos del proyecto que se capturan una vez (Proyecto → «Lo que se captura
una vez») y lo que sale de los registros (desglose, bitácora, cambios, hitos). Lo que falta
se marca en el borrador y no deja enviarlo sin aviso. Al marcarlo como enviado, el
documento guarda una copia fija de lo que salió; una corrección es una versión nueva.

### Portal del cliente

El cliente no tiene permiso sobre ninguna tabla: todo pasa por funciones de la base
(`sam_portal_*`) que revisan su acceso al proyecto y devuelven solo lo que le corresponde.
Quien es «responsable» o «decide» acepta los hitos; solo quien «decide y paga» aprueba los
cambios con costo.

## Prueba de aceptación

`src/domain/control.acceptance.test.ts` carga CE-INV con corte del viernes 12/02/2027 y
exige las cifras del traspaso: 73/115/95/107/30 = 420 horas; reserva 63 y bolsa 34; costo
$276,500, precio $330,000, margen $53,500 (16.2 %); 199 horas reales; avance 179/188 = 0.95;
eficiencia 0.90; estimado de lo que falta 335; proyección 534 h y $285,000; margen
proyectado $45,000 (13.6 %); 13 defectos internos; semáforos en verde. También reproduce
los cortes pegados de las semanas 1 a 4. `control.smoke.test.ts` corre las 28 pruebas de
humo de ESPEC.md §5, adaptadas a los datos de `construir.py` (las diferencias están
anotadas en el archivo). `v2v4.test.ts` comprueba que el desglose tipo con las unidades de
CE-INV reproduce las 420 horas por bloque y el precio de $330,000.

## Despliegue

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md): Supabase (las dos migraciones, socios en
`sam_staff`, administradores y acceso al portal), Netlify y los tres ambientes.

## Confidencialidad

El repositorio es público. Aquí solo va código y el caso ficticio CE-INV; el manual, la
minuta, los documentos legales y los datos de clientes reales no se suben. Las contraseñas
viven solo en la bóveda.
