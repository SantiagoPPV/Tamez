import { ImageResponse } from 'next/og';

/**
 * Imagen Open Graph para compartir en WhatsApp y redes (brief §9).
 *
 * Se genera en tiempo de build, sin dependencias externas ni fuentes
 * remotas: así el build nunca depende de una descarga que pueda fallar.
 * [PENDIENTE: sustituir por el logotipo vectorial cuando llegue el Brand Book]
 */

export const alt = 'TAMEZ Plastic Surgery — Precisión, proporción y naturalidad.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PETROL = '#33464e'; // PANTONE 7545 C
const SAND = '#e5dcd1'; // PANTONE 7534 C

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: PETROL,
          color: SAND,
        }}
      >
        <div
          style={{
            fontSize: 116,
            letterSpacing: 34,
            fontWeight: 300,
            // El tracking desplaza el bloque a la derecha; se compensa.
            paddingLeft: 34,
            display: 'flex',
          }}
        >
          TAMEZ
        </div>

        <div
          style={{
            fontSize: 26,
            letterSpacing: 14,
            paddingLeft: 14,
            marginTop: 18,
            opacity: 0.85,
            display: 'flex',
          }}
        >
          PLASTIC SURGERY
        </div>

        <div
          style={{
            width: 120,
            height: 1,
            backgroundColor: SAND,
            opacity: 0.35,
            marginTop: 56,
            display: 'flex',
          }}
        />

        <div
          style={{
            fontSize: 28,
            marginTop: 40,
            opacity: 0.75,
            display: 'flex',
          }}
        >
          Precisión, proporción y naturalidad.
        </div>
      </div>
    ),
    { ...size },
  );
}
