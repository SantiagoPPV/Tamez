# TAMEZ — Sistema de marca en código

Cómo el Brand Book se traduce a este repositorio: qué valor vive en qué
archivo, por qué se tomó cada decisión y qué hay que tocar cuando llegue el
material definitivo.

Documento de referencia para quien edite el sitio. Los pasos de despliegue
están en [`../DEPLOY.md`](../DEPLOY.md).

---

## 1. Contexto

**Qué es.** TAMEZ Plastic Surgery es una firma de cirugía plástica. El sitio
cumple dos funciones a la vez: web institucional premium y *sales funnel*
consultivo cuya conversión primaria es la solicitud de valoración.

**Concepto rector.** Lujo silencioso + precisión quirúrgica + naturalidad.
La marca parte de que la verdadera sofisticación está en la precisión.

**Personalidad.** Sobria, segura, elegante, contemporánea, humana y altamente
profesional.

**Principios.** Menos es más · proporción · detalle · naturalidad ·
personalización · excelencia.

**Audiencia.** Paciente de nivel socioeconómico medio-alto/alto que investiga
con cuidado antes de elegir cirujano. Valora reputación, credenciales,
naturalidad, seguridad y discreción.

### Lo que la marca no es

Esto no es una lista de estilo: son restricciones duras que el código debe
respetar.

| No usar                                        | Por qué                                    |
| ---------------------------------------------- | ------------------------------------------ |
| Rosa, dorado excesivo, glamour evidente         | Códigos de spa y beauty clinic             |
| Iconografía beauty, cuerpos hipersexualizados   | Rompe el posicionamiento médico            |
| Venta agresiva, descuentos, urgencia artificial | El funnel es consultivo, no promocional    |
| Countdowns, pop-ups, "compra ahora"             | Prohibidos explícitamente por el brief     |
| Stock genérico, estética hospitalaria fría      | Contradice la dirección de arte editorial  |
| Imágenes IA como resultado clínico              | Prohibido sin excepción                    |

Las imágenes generadas por IA sí pueden usarse para atmósfera editorial, nunca
para representar resultados, pacientes, credenciales ni instalaciones reales.

### El funnel

Descubrimiento → Confianza → Consideración → Evidencia → Conversión.

La portada recorre las cinco etapas en ese orden; cada sección de
`src/app/page.tsx` está anotada con la etapa a la que pertenece.

CTA principal en todo el sitio: **"Solicitar valoración"**. Cada página de
procedimiento lleva además un CTA intermedio y uno final.

---

## 2. Color

Cuatro tintas. No hay una quinta.

| Tinta        | HEX       | RGB           | CMYK              | Pantone  |
| ------------ | --------- | ------------- | ----------------- | -------- |
| **Petróleo** | `#33464E` | 51 · 70 · 78  | 78 / 55 / 49 / 47 | 7545 C   |
| **Bosque**   | `#0C2D2C` | 12 · 45 · 44  | 90 / 54 / 62 / 70 | 547 C    |
| **Arena**    | `#E5DCD1` | 229 · 220 · 209 | 12 / 13 / 19 / 0 | 7534 C   |
| **Niebla**   | `#B9BEC0` | 185 · 190 · 192 | 31 / 21 / 22 / 2 | 428 C    |

Los valores RGB/HEX son los que rigen en pantalla. CMYK y Pantone se
documentan aquí para que el sitio y la papelería no diverjan; en impresión
siempre hay que hacer prueba de color antes de producción.

Petróleo es el color firma: es el fondo de la portada del Brand Book y el que
domina el sitio.

### Cómo se usan en el código

Las cuatro tintas están en `src/app/globals.css` como
`--color-petrol`, `--color-forest`, `--color-sand`, `--color-mist`.

Los componentes **no** las usan directamente. Cada sección declara un tono y
los hijos leen tokens semánticos:

```tsx
<Section tone="sand">
  <p className="text-fg-muted">Se adapta al tono de su sección.</p>
</Section>
```

| Tono       | Superficie | Texto     | Acento (CTA) |
| ---------- | ---------- | --------- | ------------ |
| `petrol`   | `#33464E`  | `#E5DCD1` | `#E5DCD1`    |
| `forest`   | `#0C2D2C`  | `#E5DCD1` | `#E5DCD1`    |
| `sand`     | `#E5DCD1`  | `#0C2D2C` | `#33464E`    |
| `mist`     | `#B9BEC0`  | `#0C2D2C` | `#0C2D2C`    |

Tokens disponibles dentro de cualquier tono: `surface`, `surface-2`, `fg`,
`fg-muted`, `fg-subtle`, `line`, `accent`. Se usan como utilidades de
Tailwind: `bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`.

> **Detalle que importa.** Los tokens se declaran en cada `[data-tone]` con su
> valor final, nunca como `var(--otra-variable)` que apunte a `:root`. Una
> custom property se sustituye donde se declara: con la indirección, todos los
> bloques heredarían el valor de `:root` y las secciones claras saldrían
> oscuras. Ya pasó una vez.

Los `*-soft` (`--color-petrol-soft`, etc.) **no son colores de marca**: son
derivados funcionales para marcos de imagen, campos y superficies
secundarias. Nunca deben usarse como color principal de una pieza.

### Contraste

Verificado contra WCAG AA (4.5:1 para texto normal):

| Combinación             | Ratio    |
| ----------------------- | -------- |
| Arena sobre petróleo    | 7.3 : 1  |
| Arena sobre bosque      | 10.8 : 1 |
| Petróleo sobre arena    | 7.3 : 1  |
| Bosque sobre niebla     | 7.8 : 1  |

Los niveles `fg-muted` y `fg-subtle` están calibrados para no bajar de 4.5:1
en ningún tono. Si alguien cambia esos porcentajes, hay que recalcular.

### Ritmo de la portada

Ninguna sección repite el tono de su vecina:

petróleo → arena → petróleo → niebla → arena → petróleo → bosque → arena →
niebla → bosque (pie).

---

## 3. Tipografía

| Rol            | Familia                | Uso                              |
| -------------- | ---------------------- | -------------------------------- |
| **Principal**  | Cormorant Garamond     | Logotipo, títulos, cifras grandes |
| **Secundaria** | Avenir LT Std          | Texto corrido, interfaz, etiquetas |

### Cormorant Garamond

Es la del manual, tiene licencia libre (SIL OFL) y se sirve desde el propio
sitio con `next/font/google`. Sin pendientes.

Se usa siempre en peso Light (300) y sin transformar a versalitas: la serif
editorial de alto contraste es el gesto de marca.

### Avenir LT Std — y por qué ahora mismo no está

Avenir LT Std es de licencia comercial (Linotype). No puede distribuirse desde
este repositorio ni existe en Google Fonts. Publicar el sitio con ella sin
licencia sería una infracción.

Mientras el cliente no entregue los archivos con licencia, la sustituta es
**Nunito Sans**: comparte el esqueleto geométrico de Avenir, la `a` de doble
piso, la `g` de un piso y una altura de x alta.

Se descartó deliberadamente apoyarse en la Avenir Next que traen macOS e iOS:
haría que el sitio se viera distinto en Mac y en Windows, y "Avenir Next" no
es el mismo corte que "Avenir LT Std". Una marca construida sobre la precisión
no puede renderizarse distinto según el equipo del visitante.

**Para activar la Avenir real** — tres pasos, en `src/app/layout.tsx`:

1. Copiar los `.woff2` con licencia a `src/fonts/`.
2. Sustituir el bloque `Nunito_Sans({…})` por `localFont({…})` apuntando a
   esos archivos, conservando `variable: '--font-avenir-fallback'`.
3. Cambiar `nunito.variable` por `avenir.variable` en el `<html>`.

El nombre de la variable CSS no cambia, así que `--font-sans` y el resto del
sitio siguen igual. El comentario del propio archivo trae el fragmento exacto.

### Espaciado entre caracteres

El manual fija para la secundaria un espaciado de **200 a 400 unidades**
(0.20em – 0.40em). En el código son dos utilidades:

| Utilidad            | Valor           | Dónde                                     |
| ------------------- | --------------- | ----------------------------------------- |
| `tracking-eyebrow`  | 0.22em (220 u.) | Antetítulos, botones, navegación, etiquetas |
| `tracking-wordmark` | 0.30em (300 u.) | Textos de marca en versalitas             |

**Excepción documentada.** El texto corrido de párrafo va con espaciado
normal. En el Brand Book todos los bloques de texto aparecen en versalitas y
muy espaciados, pero eso funciona en una lámina impresa de diez líneas, no en
una página web con párrafos de lectura. Aplicarles 0.20em destruiría la
legibilidad, y el brief pone explícitamente la legibilidad por encima de la
estética. El espaciado del manual se respeta íntegro en todo lo que sí es
elemento de marca: versalitas, botones, navegación y etiquetas.

---

## 4. Logotipo

**Estado:** `[PENDIENTE: logotipo y monograma finales en vector]`.

Mientras llega el SVG, el logotipo se compone tipográficamente en
`src/components/brand/Wordmark.tsx` siguiendo la retícula del manual. Al
recibir el vector basta sustituir el interior de `<Mark>`: la API pública
(`variant`, `size`, `clearSpace`) no cambia y no hay que tocar nada más.

### La retícula

La unidad base **X** es la altura total de las letras de TAMEZ, es decir su
altura de mayúscula. Todo lo demás se deriva de ella:

```
ancho del logotipo TAMEZ ......... 7.5 X
ancho del descriptor ............. 5.2 X
espacio logotipo · descriptor .... 0.5 X   (filete vertical centrado)
área de respeto .................. 1 X     por los cuatro lados
```

En código, `--x` es esa unidad y el tamaño de letra se calcula dividiéndola
por la relación altura-de-mayúscula/em de la familia. Cambiar `size` reescala
el conjunto entero sin romper ninguna proporción.

Las constantes del archivo (`CAP_RATIO_DISPLAY`, `WORDMARK_TRACKING`,
`DESCRIPTOR_EM`) **no son estimaciones**: se calibraron midiendo el render en
un navegador real hasta que las tres medidas dieron exactas.

| Medida                        | Manual | En código | |
| ----------------------------- | ------ | --------- | --- |
| TAMEZ                         | 7.50 X | 7.50 X    | ✅ |
| Separación logotipo·descriptor| 0.50 X | 0.50 X    | ✅ |
| Descriptor, versión centrada  | 5.20 X | 5.20 X    | ✅ |
| Descriptor, versión horizontal| 5.20 X | 3.10 X    | ⚠️ |

**La discrepancia del descriptor horizontal, explicada.** A dos líneas, un
bloque de 5.2 X de ancho sale casi tres veces más alto que la altura de
mayúscula de TAMEZ, y eso no es lo que muestra el arte entregado: en la
portada del Brand Book el bloque PLASTIC / SURGERY mide alrededor de 1 X de
alto y unos 3.2 X de ancho.

Ante dos fuentes que no concuerdan se ajustó al arte, que es inequívoco sobre
cómo debe verse el conjunto, y la anotación quedó registrada aquí y en el
propio componente. **Hay que confirmar la medida contra el logotipo vectorial
final**; si el vector confirma 5.2 X, se corrige `DESCRIPTOR_EM` y basta.

Si se cambia la tipografía principal hay que volver a medir todo: la relación
altura-de-mayúscula/em es propia de cada familia.

### Variantes

| `variant`    | Composición                          | Dónde se usa            |
| ------------ | ------------------------------------ | ----------------------- |
| `horizontal` | TAMEZ │ PLASTIC / SURGERY            | Header                  |
| `stacked`    | TAMEZ sobre PLASTIC SURGERY centrado | Hero, pie               |
| `monogram`   | T                                    | Marcadores, favicon     |

`clearSpace` aplica el área de respeto de 1 X cuando el logotipo va sobre un
fondo con otros elementos.

---

## 5. Fotografía y dirección de arte

Luz suave, piel real, encuadres cerrados. Perfiles, cuello, manos, detalles
corporales elegantes, retratos del doctor y arquitectura. Mucho espacio
negativo, composición asimétrica controlada, ritmo editorial.

**Mientras no haya fotografía real no se pone nada.** El componente
`MediaFrame` dibuja un marcador editorial con el monograma y la descripción
de lo que falta, en lugar de rellenar con stock. El hueco es evidente a
propósito: así el cliente ve exactamente qué material tiene que entregar y el
layout ya es el definitivo.

Para los casos antes/después la regla es más estricta todavía:
`src/content/results.ts` arranca vacío y `getPublishableResults()` sólo deja
pasar los que tienen `consentOnFile: true`.

---

## 6. Movimiento

Microanimaciones discretas: fundidos y apariciones suaves. Nada de parallax
pesado ni carruseles automáticos.

El componente `Reveal` usa `IntersectionObserver` —unas veinte líneas, cero
dependencias— y el CSS neutraliza toda transición bajo
`prefers-reduced-motion: reduce`.

La velocidad y la legibilidad van por delante de la animación.

---

## 7. Dónde vive cada cosa

| Qué                              | Archivo                                 |
| -------------------------------- | --------------------------------------- |
| Tintas, tonos y tokens           | `src/app/globals.css`                   |
| Tipografías                      | `src/app/layout.tsx`                    |
| Logotipo y retícula              | `src/components/brand/Wordmark.tsx`     |
| Datos institucionales y contacto | `src/content/site.ts`                   |
| Copy de portada                  | `src/content/home.ts`                   |
| Catálogo de procedimientos       | `src/content/procedures.ts`             |
| Casos de resultados              | `src/content/results.ts`                |
| Favicon                          | `src/app/icon.svg`                      |
| Imagen para compartir            | `src/app/opengraph-image.tsx`           |

---

## 8. Qué falta del Brand Book

- Logotipo y monograma en vector (SVG/AI).
- Archivos con licencia de Avenir LT Std.
- Fotografía real: doctor, consultorio, editorial.
- Casos antes/después con consentimiento firmado.

La lista viva de todo el contenido pendiente —generada leyendo el contenido
real, no mantenida a mano— está en la ruta `/pendientes` del propio sitio.
No está indexada y debe retirarse antes del lanzamiento.
