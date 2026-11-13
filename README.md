# Sistemas a la medida · software interno

«El único lugar donde vive un proyecto: de sus datos salen los documentos, los reportes y
los indicadores.»

El software sigue el proceso del despacho de punta a punta: **CRM → Operaciones →
Cobranza**, con el **portal del cliente** para ver, firmar y descargar. La prueba de
aceptación del caso ficticio CE-INV pasa en automático con las mismas cifras de la hoja de
control.

## Módulos

| Módulo | Qué hace |
| --- | --- |
| **CRM** | Tablero por estado (inicial, factible, confirmado, cliente, perdido), cada prospecto con sus pasos de preventa y venta, guía y formato base en cada paso, resumen de la junta con IA, factibilidad con el mínimo mensual automático, propuesta con validación de dirección general, seguimiento por correo y WhatsApp, puerta 1, acta de inicio firmada, cita de cierre y cobro inicial. Mide cuántos pasan la factibilidad y dónde se caen los demás |
| **Operaciones** | Un expediente por cliente con su etapa (Inicio, Planeación, Ejecución, Cierre, Servicio). La pestaña Proceso muestra los pasos de Inicio y los nueve de Planeación con lo que falta. Debajo sigue el núcleo: desglose con línea base, bitácora de horas, cambios, riesgos, pendientes, decisiones, puertas, documentos D01 a D18, servicio mensual, tablero de once indicadores y cortes semanales |
| **Cobranza** | Todas las facturas de todos los proyectos: por facturar, por cobrar, vencidas y cobradas. Timbra el CFDI 4.0 con FacturAPI (o se sube el XML y el PDF hechos fuera), registra el cobro con su comprobante, emite el complemento de pago para PPD, cancela con motivo y lo envía por correo |
| **Portal del cliente** | El cliente entra con un enlace a su correo. Ve el avance, los hitos, sus pendientes y solicitudes; firma lo que está por firmar y descarga sus documentos y archivos. Nunca ve costos, horas internas ni márgenes |
| **Despacho** | Datos del despacho y de quien firma, mínimo de venta y tamaños de empresa, datos de facturación, formatos base editables (D15 a D18), guías de venta editables, estado de las integraciones, estimaciones y horas base |

## El proceso del CRM (Excel de consultoría)

| Fase | Estado | Pasos | Lo que el software hace solo |
| --- | --- | --- | --- |
| Preventa | Prospecto inicial | Alta · Junta de descubrimiento · Análisis de factibilidad | Tamaño de la empresa por empleados, resumen de la junta con Claude desde la transcripción, D15 y D16 con formato base, revisión del mínimo de **$30,000 por mes de creación** con la estimación v0 |
| Venta | Prospecto factible | Propuesta preliminar · Segunda entrevista · Seguimiento hasta un sí o un no | La propuesta no se presenta sin la validación de dirección general; si cambia el monto o el alcance, la validación se cae. Un «no» pide el motivo y cuenta en «dónde se caen» |
| Venta | Prospecto confirmado | Acta de inicio firmada · Cita de cierre · Factura y cobro del pago inicial | La puerta 1 (la aprueba Santiago) crea el expediente con todos los datos y el acta D02 lista para firmar por las dos partes |
| Producción | Cliente en Inicio | Papeleo, interesados, accesos, junta de arranque (D17) | Al registrar el cobro del pago inicial el prospecto pasa a cliente, el proyecto aparece en Operaciones y se avisa al equipo |
| Producción | Cliente en Planeación | Diagnóstico (D18) y los nueve pasos de planeación | Las puertas 2 a 5 mueven la etapa (Planeación, Ejecución, Cierre, Servicio); una etapa no retrocede sola |

### Firma electrónica simple

Un documento enviado para firma queda congelado. Cada firma guarda el nombre, el correo
verificado, la fecha y la hora, el trazo si lo hay, el navegador y la huella SHA-256 del
contenido; el documento firmado no se puede modificar, y lo que se firma lleva una hoja de
constancia con las firmas y la huella. El cliente firma desde el portal, al que entra con
un enlace a su correo; el despacho firma desde el expediente. Un documento firmado se
comparte a varios correos con una liga que vence y se puede revocar.

### Integraciones (opcionales)

Todo funciona sin ellas: el correo se abre listo en el programa de correo, el resumen se
escribe a mano y la factura hecha fuera se sube con su XML y su PDF.

| Integración | Para qué | Variables en Netlify |
| --- | --- | --- |
| Google Workspace (o Resend) | Correos del sistema: propuesta, acta, liga, aviso a Operaciones | `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SENDER` · o `RESEND_API_KEY`, `EMAIL_FROM` |
| Claude (Anthropic) | Resumen de la junta de descubrimiento desde la transcripción | `ANTHROPIC_API_KEY` |
| FacturAPI | Timbrar, cancelar y enviar el CFDI 4.0 y el complemento de pago | `FACTURAPI_KEY` |

Los pasos de cada una están en [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Diseño

Azul oscuro y blanco: barra lateral azul con los módulos, contenido en blanco, y el verde
solo para lo que salió bien (semáforo verde, cobrado, firmado). Los colores viven como
variables en [`src/index.css`](src/index.css) (y los de los documentos en
`src/docs/plantillas/base.css`). Los componentes comunes están en `src/ui/`: encabezado de
página, indicadores, etiquetas de estado, filtros, tablas que en celular se vuelven tarjetas,
paneles laterales, estados vacíos, avisos breves y el diálogo de confirmación del software
(no se usan los cuadros del navegador). Las pantallas secundarias se descargan al abrirse.

## Arranque rápido

```bash
npm install
```

```bash
npm run dev
```

Sin variables de Supabase arranca en **modo demostración**: el caso CE-INV al corte del
12/02/2027 y seis prospectos ficticios, uno en cada punto del proceso, guardados solo en tu
navegador. Para trabajar contra Supabase copia `.env.example` a `.env.local` y llena la URL
y la clave publicable.

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Desarrollo local (sin las funciones del servidor; para probarlas, `npx netlify dev`) |
| `npm test` | Pruebas automáticas (127): aceptación CE-INV, 28 pruebas de humo, días hábiles, documentos, CRM de punta a punta, etapas, CFDI, correo y resumen con IA |
| `npm run check` | Tipos, lint y pruebas |
| `npm run ci` | Lo que corre Netlify antes de publicar: lint, pruebas y build |

## Cómo está hecho

React 19 + TypeScript + Vite + Tailwind 4 en la interfaz; Supabase (Postgres, Auth,
Storage) con RLS; Netlify (sitio y funciones). Código en inglés, interfaz en español, móvil
primero; fechas en hora del centro de México; formatos `$#,##0`, `dd/mm/aaaa` y horas con
un decimal.

```
src/domain/       Lógica pura, sin interfaz
  control.ts        El motor: cada fórmula de la hoja de control (ESPEC.md §1 a §3)
  crm.ts            Pasos y estados del CRM, factibilidad, mínimo mensual, medición
  stage.ts          Etapa del cliente y pasos de Inicio y Planeación
  cfdi.ts           CFDI 4.0: totales, datos fiscales y lo que se manda a timbrar
  formats.ts        Formatos base (D15 a D18) y guías de venta
  gates.ts          Las cinco puertas y lo que falta para pasar cada una
  estimating.ts     Desglose tipo: de las unidades a las horas y al precio
  conversion.ts     Del prospecto (puerta 1) al expediente
  learning.ts       Base de estimaciones con horas reales y calibración
  service.ts        Bolsa de horas, tiempos de respuesta y rutinas del mes
  catalogs.ts       Listas, estados, etapas, puertas, documentos, catálogos del SAT
  *.test.ts         Prueba de aceptación, pruebas de humo y del proceso
src/docs/         Documentos
  plantillas/       Plantillas HTML de D01 a D14 y base.css
  formatDoc.ts      Formatos de preguntas (D15 a D18) y hoja de constancia de firma
  render.ts         Arma cualquier documento con sus firmas
  autofill.ts       Qué dato del proyecto llena cada campo
src/data/         Acceso a datos
  supabaseRepo.ts   Supabase (tablas sam_*, funciones y Storage)
  demoRepo.ts       Modo demostración (navegador)
  services.ts       Funciones del servidor: correo, IA, timbrado
src/app/lifecycle.ts  Puerta 1, paso a cliente, avisos y ligas
src/pages/        Pantallas (crm/, billing/, project/…)
netlify/functions/  correo, factura, integraciones y resumen-background
netlify/lib/        Sesión del socio, Gmail/Resend, FacturAPI y Claude
supabase/migrations/  Esquema con RLS (tres migraciones, en orden)
```

Los cálculos viven en el código y no en la base: así se prueban contra la hoja con cifras
exactas. La base guarda solo lo que se captura y cuida las reglas que importan: las puertas
y la validación de la propuesta solo las aprueba un administrador, nadie aprueba su propio
trabajo, las bitácoras y las firmas no se borran, lo firmado no se edita y el cliente solo
ve lo suyo.

### Documentos

D01 a D14 salen de las plantillas; D15 a D18 son formatos de preguntas base que el despacho
edita en Despacho → Formatos. Cada campo se llena en este orden: lo congelado al enviar, lo
capturado en el documento, los datos del proyecto que se capturan una vez y lo que sale de
los registros. Lo que falta se marca en el borrador. Al enviarlo, el documento guarda una
copia fija de lo que salió (y del formato con que se hizo); una corrección es una versión
nueva.

## Prueba de aceptación

`src/domain/control.acceptance.test.ts` carga CE-INV con corte del viernes 12/02/2027 y
exige las cifras del traspaso: 73/115/95/107/30 = 420 horas; reserva 63 y bolsa 34; costo
$276,500, precio $330,000, margen $53,500 (16.2 %); 199 horas reales; avance 179/188 = 0.95;
eficiencia 0.90; estimado de lo que falta 335; proyección 534 h y $285,000; margen
proyectado $45,000 (13.6 %); 13 defectos internos; semáforos en verde. También reproduce
los cortes pegados de las semanas 1 a 4. `control.smoke.test.ts` corre las 28 pruebas de
humo de ESPEC.md §5. `crm.test.ts` y `demoRepo.test.ts` recorren el proceso del Excel: del
prospecto a la puerta 1, la firma de las dos partes, la liga compartida y el paso a cliente
al cobrar.

## Despliegue

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md): Supabase (las tres migraciones, socios,
administradores, acceso al portal por correo y SMTP), Netlify (variables e integraciones) y
los tres ambientes.

## Confidencialidad

El repositorio es público. Aquí solo va código y datos ficticios (CE-INV y los prospectos
de ejemplo); el manual, la minuta, los documentos legales y los datos de clientes reales no
se suben. Las contraseñas viven solo en la bóveda y las claves de las integraciones solo en
las variables de Netlify.
