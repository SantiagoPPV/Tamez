/* Generado de las plantillas con el caso ficticio CE-INV (03-plantillas/fuente). No editar a mano. */
import type { AcceptanceCriterion, DocData } from '../domain/types'

export const CEINV_FACTS: DocData = {
  "fields": {
    "proyecto.objetivo": "Saber en tiempo real cuánto inventario hay en cada uno de sus tres almacenes y eliminar el conteo manual de cada semana.",
    "terceros.servicios": "la compra de equipos ni las licencias o conectores de su sistema contable",
    "terceros.quien_contrata": "su área de sistemas",
    "terceros.a_nombre_de": "Cliente Ejemplo, S.A. de C.V.",
    "terceros.quien_paga": "Cliente Ejemplo, S.A. de C.V.",
    "facturacion.razon_social": "Cliente Ejemplo, S.A. de C.V.",
    "facturacion.rfc": "CEJ150302AB4",
    "facturacion.cfdi": "Régimen 601, General de Ley Personas Morales; uso G03, gastos en general; método PPD, con complemento de pago; código postal 03100.",
    "facturacion.orden_compra": "Sí la piden. OC-2027-0018, por $330,000 más IVA, con cuatro partidas: una por pago.",
    "facturacion.portal": "No usan portal. El PDF y el XML se envían por correo a facturas@clienteejemplo.mx, con copia a Patricia Luna.",
    "facturacion.dias_pago": "Transferencia a 15 días naturales de recibida la factura.",
    "facturacion.documento_exigido": "Número de orden de compra en cada factura. En los pagos de hito, el acta de aceptación o el aviso de aceptación por plazo vencido.",
    "facturacion.contacto": "Patricia Luna, cuentas por pagar · pluna@clienteejemplo.mx",
    "restriccion.fecha_limite": "Uso completo en marzo de 2027",
    "restriccion.tecnologia": "Su sistema contable se queda",
    "restriccion.reglas": "Operación y accesos",
    "regla.monto_cambios_responsable": "$0 (solo cambios sin costo)",
    "regla.dias_ausencia": "2",
    "regla.dias_correccion": "2",
    "regla.porcentaje_minimo_hito": "50 %",
    "regla.dias_para_terminar": "20",
    "regla.ambientes_datos_reales": "el ambiente de pruebas y el de producción",
    "regla.dueno_codigo": "El sistema es de ustedes. El código y la documentación de cada hito son suyos al pagarse ese hito. Conservamos nuestra base técnica reutilizable y les damos licencia permanente para usarla en este sistema.",
    "problema.principal_quien": "Ricardo Solís, director general",
    "problema.principal_frase": "«Contamos a mano cada semana y aun así no sabemos cuánto hay en cada almacén.»",
    "vendido.resultado": "Saber en tiempo real cuánto inventario hay en cada uno de sus tres almacenes y eliminar el conteo manual de cada semana.",
    "cobro.plazo": "Por confirmar con Patricia Luna el lunes 4 de enero de 2027.",
    "cobro.orden_compra": "Sí la exigen antes de facturar; una por el total, con sus cuatro pagos.",
    "cobro.alta_proveedor": "Constancia de situación fiscal, opinión de cumplimiento, carátula bancaria y su formato firmado; tarda 3 días hábiles.",
    "cobro.dia_corte": "Por confirmar con Patricia Luna el lunes 4 de enero de 2027.",
    "cobro.envio_factura": "Por correo a facturas@clienteejemplo.mx, con copia a Patricia Luna.",
    "cobro.dueno_codigo": "Se ofreció la opción A: el sistema es del cliente al pagarse cada hito.",
    "proyecto.objetivo_portada": "saber en tiempo real cuánto inventario hay en cada uno de sus tres almacenes y eliminar el conteo manual de cada semana",
    "inversion.iva": "Todos los montos son más IVA. El IVA se suma en cada factura.",
    "inversion.facturacion": "El pago inicial se factura al firmar el acta de inicio. Cada pago de hito se factura con su acta de aceptación o con el aviso de aceptación por plazo vencido.",
    "inversion.plazo_pago": "Transferencia a 15 días naturales de recibida la factura.",
    "inversion.orden_compra": "Si su empresa la pide, la necesitamos antes de la primera factura, por el total y con una partida por pago.",
    "mensualidad.actualizacion": "Cada año, con la inflación (INPC).",
    "facturacion.orden_compra_detalle": "OC-2027-0018, por $330,000 más IVA, con cuatro partidas: una por pago.",
    "facturacion.envio": "PDF y XML por correo a facturas@clienteejemplo.mx, con copia a Patricia Luna, cuentas por pagar.",
    "entrega.titularidad": "Según el acta de inicio, el sistema es de ustedes: el código y la documentación de cada hito son suyos al pagarse ese hito; los del Hito 3, al pagarse su factura.",
    "entrega.titular_nube": "La nube y el dominio están contratados a su nombre",
    "entrega.paga_nube": "Cliente Ejemplo al proveedor",
    "mensualidad.canal": "el correo soporte@sistemasalamedida.mx; las fallas urgentes, además, por el teléfono de guardia 55 5550 0112"
  },
  "lists": {
    "alcance_incluye": [
      {
        "alcance.incluye": "Diagnóstico por escrito del proceso actual, los datos y la conexión."
      },
      {
        "alcance.incluye": "Existencias por almacén en tiempo real, en celular o computadora, con usuarios y permisos."
      },
      {
        "alcance.incluye": "Registro de entradas y salidas con responsable."
      },
      {
        "alcance.incluye": "Conexión con su sistema contable."
      },
      {
        "alcance.incluye": "Carga inicial del catálogo y de las existencias de los tres almacenes."
      },
      {
        "alcance.incluye": "Capacitación a los almacenistas en su almacén y en su turno, con manuales."
      },
      {
        "alcance.incluye": "Pruebas con guion, salida a producción y acompañamiento de dos semanas.",
        "alcance.no_incluye": "Compra de equipos: celulares, tabletas, lectores o impresoras."
      }
    ],
    "alcance_no_incluye": [
      {
        "alcance.no_incluye": "Compra de equipos: celulares, tabletas, lectores o impresoras."
      },
      {
        "alcance.no_incluye": "Licencias o conectores de su sistema contable."
      },
      {
        "alcance.no_incluye": "Cambios o configuración dentro de su sistema contable."
      },
      {
        "alcance.no_incluye": "Almacenes adicionales u otras empresas."
      },
      {
        "alcance.no_incluye": "Módulos de compras, ventas o facturación."
      },
      {
        "alcance.no_incluye": "Depuración de su catálogo: corregir claves o quitar duplicados."
      },
      {
        "alcance.no_incluye": "El servicio mensual posterior a la capacitación final: se contrata aparte, por $12,000 más IVA al mes."
      }
    ],
    "resultados": [
      {
        "resultado.nombre": "Inventario en tiempo real",
        "resultado.comprobacion": "La existencia de cada producto se consulta por almacén, en celular o computadora, en los tres almacenes."
      },
      {
        "resultado.nombre": "Sin conteo manual semanal",
        "resultado.comprobacion": "Cada entrada y cada salida se registra al momento, con su responsable; el conteo semanal deja de hacerse."
      },
      {
        "resultado.nombre": "Una sola captura",
        "resultado.comprobacion": "Los movimientos de inventario llegan a su sistema contable sin volver a capturarlos."
      }
    ],
    "supuestos": [
      {
        "supuesto.hecho": "Son tres almacenes.",
        "supuesto.efecto": "Si son más, cambian el precio y la fecha del Hito 3.",
        "supuesto.texto": "Son tres almacenes."
      },
      {
        "supuesto.hecho": "Su sistema contable permite que otro sistema consulte y registre movimientos, y cuenta con acceso de pruebas.",
        "supuesto.efecto": "Si no, cambian el precio y la fecha del Hito 2.",
        "supuesto.texto": "Su sistema contable permite que otro sistema consulte y registre movimientos, y cuenta con acceso de pruebas."
      },
      {
        "supuesto.hecho": "El catálogo de productos existe en un archivo o en su sistema contable, con una clave única por producto.",
        "supuesto.efecto": "Si hay que depurarlo, cambian el precio y la fecha del Hito 1.",
        "supuesto.texto": "El catálogo de productos existe en un archivo o en su sistema contable, con una clave única por producto."
      },
      {
        "supuesto.hecho": "Cada almacén tiene internet estable y un celular o tableta de la empresa para registrar movimientos.",
        "supuesto.efecto": "Si falta, se mueve la fecha del hito de ese almacén: Hito 1 o Hito 3.",
        "supuesto.texto": "Cada almacén tiene internet estable y un celular o tableta de la empresa para registrar movimientos."
      },
      {
        "supuesto.hecho": "Los tres almacenistas disponen de 2 horas a la semana para demostraciones y pruebas.",
        "supuesto.efecto": "Si no, se mueve la fecha de aceptación de cada hito.",
        "supuesto.texto": "Los tres almacenistas disponen de 2 horas a la semana para demostraciones y pruebas."
      }
    ],
    "restricciones_fechas": [
      {
        "restriccion.texto": "Los tres almacenes deben operar con el sistema en marzo de 2027."
      },
      {
        "restriccion.texto": "Jueves 25 y viernes 26 de marzo de 2027, Semana Santa: no se trabaja ni se prueba."
      },
      {
        "restriccion.texto": "Días inhábiles dentro del plan: lunes 1 de febrero y lunes 15 de marzo de 2027.",
        "restriccion.tecnologia": "Su sistema contable se queda",
        "restriccion.reglas": "Operación y accesos"
      }
    ],
    "restricciones_tecnologia": [
      {
        "restriccion.texto": "El sistema se conecta con el sistema contable que ya usan; no lo reemplaza ni lo modifica."
      },
      {
        "restriccion.texto": "Es una aplicación web: se usa en celular y computadora, sin instalar programas.",
        "restriccion.reglas": "Operación y accesos"
      }
    ],
    "restricciones_reglas": [
      {
        "restriccion.texto": "Las pruebas y la capacitación no detienen la operación de los almacenes."
      },
      {
        "restriccion.texto": "Los accesos a su sistema contable los autoriza Iván Torres y son personales."
      },
      {
        "restriccion.texto": "Las visitas a los almacenes se acuerdan con Laura Méndez con dos días hábiles de anticipación."
      }
    ],
    "problema_frases": [
      {
        "problema.frase": "«Cuando el conteo no cuadra con el sistema contable, nadie sabe cuál de los dos números es el bueno.»",
        "problema.quien": "Laura Méndez, gerente de operaciones"
      },
      {
        "problema.frase": "«Nos enteramos de que falta producto cuando el cliente ya lo pidió.»",
        "problema.quien": "Ricardo Solís, director general"
      }
    ],
    "promesas": [
      {
        "promesa.fecha": "Jue 10 dic 2026",
        "promesa.a_quien": "Ricardo Solís",
        "promesa.texto": "«Verá las existencias en su celular desde el Hito 1.»",
        "promesa.destino_tipo": "Entra al acta",
        "promesa.destino_detalle": "Criterio de aceptación del Hito 1 (D02)."
      },
      {
        "promesa.fecha": "Jue 10 dic 2026",
        "promesa.a_quien": "Laura Méndez",
        "promesa.texto": "«A los almacenistas los capacitamos en su almacén y en su turno.»",
        "promesa.destino_tipo": "Entra al acta",
        "promesa.destino_detalle": "En el alcance (D02): capacitación en cada almacén y en el turno de cada almacenista."
      },
      {
        "promesa.fecha": "Jue 17 dic 2026",
        "promesa.a_quien": "Ricardo Solís",
        "promesa.texto": "«Si abren un cuarto almacén el año que entra, lo vemos y les damos precio.»",
        "promesa.destino_tipo": "Se aclara por escrito",
        "promesa.destino_detalle": "Antes de firmar el acta: un almacén adicional se cotiza como cambio de alcance. Aclara Santiago el 6 de enero de 2027."
      }
    ],
    "no_prometido": [
      {
        "no_prometido.texto": "Módulo de compras."
      },
      {
        "no_prometido.texto": "Cambios dentro de su sistema contable."
      }
    ],
    "mensualidad_cubre": [
      {
        "mensualidad.cubre": "Monitoreo, con aviso si el sistema se detiene."
      },
      {
        "mensualidad.cubre": "Respaldos diarios, con prueba de recuperación cada bimestre."
      },
      {
        "mensualidad.cubre": "Actualizaciones de seguridad y revisión mensual de accesos."
      },
      {
        "mensualidad.cubre": "Fallas urgentes las 24 horas: respuesta en 1 hora en horario hábil y en 2 fuera de él. Lo demás, en 1 día hábil."
      },
      {
        "mensualidad.cubre": "Bolsa de 8 horas al mes para ajustes y mejoras."
      },
      {
        "mensualidad.cubre": "Revisión mensual de 1 hora con su responsable del proyecto.",
        "mensualidad.monto": "$12,000"
      }
    ],
    "costos_terceros": [
      {
        "terceros.servicio": "Licencias o conectores de su sistema contable",
        "terceros.quien_contrata": "Su área de sistemas",
        "terceros.a_nombre_de": "Su empresa",
        "terceros.quien_paga": "Su empresa"
      },
      {
        "terceros.servicio": "Equipos: celulares, tabletas, lectores o impresoras",
        "terceros.quien_contrata": "Su área de sistemas",
        "terceros.a_nombre_de": "Su empresa",
        "terceros.quien_paga": "Su empresa"
      }
    ],
    "como_lo_logramos": [
      {
        "paso.texto": "Diagnóstico de dos semanas. Revisamos su proceso, su catálogo y la conexión con su sistema contable. Al terminar confirmamos alcance y precio."
      },
      {
        "paso.texto": "Tres hitos. Cada uno deja algo que sus almacenistas ya usan. Empezamos con un almacén piloto."
      },
      {
        "paso.texto": "Ustedes prueban y aceptan. Cada hito se paga cuando ustedes confirman que cumple lo acordado."
      },
      {
        "paso.texto": "Capacitación y acompañamiento. Capacitamos en cada almacén y los acompañamos dos semanas después de la salida a producción."
      }
    ],
    "diagnostico_hallazgos": [
      {
        "hallazgo.texto": "Son tres almacenes. El Almacén 1 es el piloto del Hito 1; los almacenes 2 y 3 entran en el Hito 3."
      },
      {
        "hallazgo.texto": "Un solo catálogo para los tres almacenes, con clave única por producto. El del piloto no hace falta depurarlo; lo que agreguen los almacenes 2 y 3 se revisa antes de cargarlo."
      },
      {
        "hallazgo.texto": "La prueba técnica, terminada el miércoles 20 de enero, confirmó que su sistema contable recibe entradas y salidas."
      },
      {
        "hallazgo.texto": "Cuatro perfiles: almacenista, responsable del proyecto, director general y sistemas."
      }
    ],
    "alcance_unidades": [
      {
        "unidad.cantidad": "3",
        "unidad.detalle": "Uno piloto y dos en el Hito 3."
      },
      {
        "unidad.cantidad": "13",
        "unidad.detalle": "Detalladas en cada especificación."
      },
      {
        "unidad.cantidad": "4",
        "unidad.detalle": "Uno en el Hito 2 y tres en el Hito 3."
      },
      {
        "unidad.cantidad": "1",
        "unidad.detalle": "Envía entradas y salidas."
      }
    ],
    "comunicacion": [
      {
        "comunicacion.que": "Demostración",
        "comunicacion.cuando": "Jueves, 10:00, semanas 3 a 11; en la 11, miércoles 24 de marzo",
        "comunicacion.duracion": "30 minutos",
        "comunicacion.asistentes": "Laura Méndez, un almacenista y nuestro contacto diario",
        "comunicacion.como": "Videollamada; lo que pidan se registra ese día."
      },
      {
        "comunicacion.que": "Reporte semanal",
        "comunicacion.cuando": "Viernes antes de las 14:00, semanas 1 a 13; en la 11, miércoles 24 de marzo",
        "comunicacion.duracion": "—",
        "comunicacion.asistentes": "Laura Méndez, con copia a Ricardo Solís",
        "comunicacion.como": "Correo con el reporte en PDF."
      },
      {
        "comunicacion.que": "Aviso de entrega de hito",
        "comunicacion.cuando": "Viernes 12 de febrero, viernes 5 de marzo y miércoles 24 de marzo",
        "comunicacion.duracion": "—",
        "comunicacion.asistentes": "Laura Méndez, con copia a Ricardo Solís",
        "comunicacion.como": "Correo con el guion de pruebas."
      },
      {
        "comunicacion.que": "Sesión de pruebas",
        "comunicacion.cuando": "Lunes 15 de febrero, 8 de marzo y 29 de marzo, 10:00",
        "comunicacion.duracion": "2 horas",
        "comunicacion.asistentes": "Laura Méndez, los tres almacenistas y nuestro equipo",
        "comunicacion.como": "En el almacén, con el guion."
      },
      {
        "comunicacion.que": "Firma del acta de aceptación",
        "comunicacion.cuando": "Al cumplirse los criterios, dentro del plazo de revisión",
        "comunicacion.duracion": "30 minutos",
        "comunicacion.asistentes": "Laura Méndez y nuestro líder de proyecto, con copia a Ricardo Solís",
        "comunicacion.como": "Videollamada; el acta se firma y se envía por correo."
      },
      {
        "comunicacion.que": "Junta de cierre",
        "comunicacion.cuando": "Viernes 9 de abril, 10:00",
        "comunicacion.duracion": "1 hora",
        "comunicacion.asistentes": "Ricardo Solís, Laura Méndez, Santiago y el socio operativo",
        "comunicacion.como": "En sus oficinas; se firma el acta de cierre."
      }
    ]
  }
}

export const CEINV_CRITERIA: AcceptanceCriterion[] = [
  {
    "id": "ca-1",
    "milestoneId": "ms-h1",
    "code": "CA-1.1-01",
    "deliverable": "1.1",
    "action": "La responsable del proyecto carga el archivo de ejemplo con 20 productos.",
    "expected": "El catálogo muestra los 20, cada uno con clave, descripción y unidad.",
    "result": null,
    "obtained": "",
    "evidence": "",
    "classification": null,
    "note": "Cargar el catálogo"
  },
  {
    "id": "ca-2",
    "milestoneId": "ms-h1",
    "code": "CA-1.1-02",
    "deliverable": "1.1",
    "action": "Un almacenista escribe «EJ-003» en el buscador del catálogo.",
    "expected": "La pantalla muestra solo «Guante de nitrilo talla M», con unidad «Par».",
    "result": null,
    "obtained": "",
    "evidence": "",
    "classification": null,
    "note": "Buscar por clave"
  },
  {
    "id": "ca-3",
    "milestoneId": "ms-h1",
    "code": "CA-1.1-03",
    "deliverable": "1.1",
    "action": "La responsable del proyecto carga un archivo con la clave «EJ-001» en dos renglones.",
    "expected": "El sistema no carga el archivo y muestra «Clave repetida: EJ-001».",
    "result": null,
    "obtained": "",
    "evidence": "",
    "classification": null,
    "note": "Clave repetida"
  },
  {
    "id": "ca-4",
    "milestoneId": "ms-h1",
    "code": "CA-1.1-04",
    "deliverable": "1.1",
    "action": "La responsable del proyecto carga un archivo con el producto «EJ-021» sin unidad.",
    "expected": "El sistema no carga el archivo y muestra «Falta la unidad: EJ-021».",
    "result": null,
    "obtained": "",
    "evidence": "",
    "classification": null,
    "note": "Producto sin unidad"
  }
]

/** Resultado y criterio de cada tramo, como los dice el acta de inicio (D02). */
export const CEINV_SEGMENT_TEXT: Record<string, { title: string; result: string; criterion: string }> = {
  "Diagnóstico": {
    "title": "Diagnóstico",
    "result": "Diagnóstico por escrito, propuesta definitiva y plan del proyecto.",
    "criterion": "Ustedes reciben el diagnóstico y firman el plan del proyecto, con alcance, fechas y montos definitivos."
  },
  "Hito 1": {
    "title": "Prueba piloto en un almacén",
    "result": "Inventario en tiempo real en el almacén piloto, con catálogo y existencias cargados.",
    "criterion": "Las existencias del almacén piloto se consultan en celular y en computadora, y cuadran con un conteo de muestra."
  },
  "Hito 2": {
    "title": "Entradas, salidas y conexión con su sistema contable",
    "result": "Entradas y salidas registradas al momento y enviadas a su sistema contable.",
    "criterion": "Cada entrada y cada salida queda registrada con su responsable y llega a su sistema contable sin volver a capturarla."
  },
  "Hito 3": {
    "title": "Uso completo en los tres almacenes",
    "result": "Los tres almacenes operan con el sistema.",
    "criterion": "Los tres almacenes registran sus movimientos en el sistema y la existencia por almacén cuadra con un conteo de muestra."
  },
  "Acompañamiento y cierre": {
    "title": "Acompañamiento y cierre",
    "result": "Capacitación final, manuales y paquete de entrega.",
    "criterion": "Capacitación final impartida el jueves 8 de abril y acta de cierre firmada el viernes 9 de abril de 2027."
  }
}

export const CEINV_CONTACT_DETAILS: Record<string, { position: string; email: string; phone: string; signs: string }> = {
  "Ricardo Solís": {
    "position": "Director general",
    "email": "rsolis@clienteejemplo.mx",
    "phone": "55 5550 0101",
    "signs": "Esta acta y los cambios con costo. Recibe copia de las aceptaciones."
  },
  "Laura Méndez": {
    "position": "Gerente de operaciones",
    "email": "lmendez@clienteejemplo.mx",
    "phone": "55 5550 0102",
    "signs": "Plan del proyecto, especificaciones, actas y cambios sin costo."
  },
  "Iván Torres": {
    "position": "Sistemas",
    "email": "itorres@clienteejemplo.mx",
    "phone": "55 5550 0103",
    "signs": "Entrega accesos. Firma solo cuando suple a la responsable."
  },
  "Patricia Luna": {
    "position": "Cuentas por pagar",
    "email": "pluna@clienteejemplo.mx",
    "phone": "55 5550 0104",
    "signs": "No firma. Emite la orden de compra y recibe las facturas."
  },
  "Tres almacenistas": {
    "position": "Uno por almacén",
    "email": "Por medio de Laura Méndez",
    "phone": "",
    "signs": "No firman. Prueban cada hito con el guion de pruebas."
  },
  "Santiago": {
    "position": "Socio",
    "email": "cuenta@sistemasalamedida.mx",
    "phone": "55 5550 0111",
    "signs": "Esta acta, el plan del proyecto, solicitudes de cambio, avisos y actas de aceptación y de cierre."
  },
  "Socio operativo": {
    "position": "Socio",
    "email": "socio@sistemasalamedida.mx",
    "phone": "55 5550 0110",
    "signs": "Envía reportes y avisos desde la firma del plan del proyecto. Firma solo cuando suple al líder."
  }
}
