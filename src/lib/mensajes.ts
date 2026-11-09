// Textos que se envían al cliente por WhatsApp, Marketplace o Messenger.
import type { Cliente, Cobro, ConfigRecordatorios, Negocio, TipoRecordatorio, Tono } from './types';
import { bs, fechaLarga } from './formato';

export const URL_PAGO = 'https://cobroya.bo/p/';

export function enlacePago(c: Cobro): string {
  return URL_PAGO + c.enlace;
}

export const PLANTILLAS: Record<Tono, Record<TipoRecordatorio, string>> = {
  amable: {
    antes: 'Hola {cliente} 😊, te recuerdo que el {vencimiento} vence tu pago de {saldo} por {concepto}. Puedes pagar con el QR aquí: {enlace} ¡Gracias! — {negocio}',
    dia: 'Hola {cliente} 😊, hoy vence tu pago de {saldo} por {concepto}. Te dejo el QR para pagar: {enlace} ¡Muchas gracias! — {negocio}',
    vencido: 'Hola {cliente}, ¿cómo estás? Tu pago de {saldo} por {concepto} venció el {vencimiento}. Cuando puedas, aquí está el QR: {enlace} Si ya pagaste, sube tu comprobante en el mismo enlace. Gracias — {negocio}',
  },
  neutro: {
    antes: 'Hola {cliente}. Recordatorio: el {vencimiento} vence el pago de {saldo} por {concepto}. QR y detalle: {enlace} — {negocio}',
    dia: 'Hola {cliente}. Hoy vence el pago de {saldo} por {concepto}. QR y detalle: {enlace} — {negocio}',
    vencido: 'Hola {cliente}. El pago de {saldo} por {concepto} venció el {vencimiento}. Puedes pagar aquí: {enlace} Si ya pagaste, sube tu comprobante en el enlace. — {negocio}',
  },
  firme: {
    antes: 'Estimado/a {cliente}: le recordamos que el {vencimiento} vence su pago de {saldo} por {concepto}. Pague con QR aquí: {enlace} — {negocio}',
    dia: 'Estimado/a {cliente}: hoy vence su pago de {saldo} por {concepto}. Le pedimos realizarlo hoy mediante el QR: {enlace} — {negocio}',
    vencido: 'Estimado/a {cliente}: su pago de {saldo} por {concepto} está vencido desde el {vencimiento}. Le pedimos regularizarlo a la brevedad: {enlace} Si ya pagó, suba su comprobante en el enlace. — {negocio}',
  },
};

export const CONFIG_INICIAL: ConfigRecordatorios = {
  diasAntes: 2,
  elDia: true,
  cadaDiasDespues: 3,
  tono: 'amable',
  plantillas: { ...PLANTILLAS.amable },
  horaAviso: 8,
};

export interface Variables {
  cliente: string;
  negocio: string;
  concepto: string;
  monto: number;
  saldo: number;
  vencimiento: string;
  enlace: string;
}

export function rellenar(plantilla: string, v: Variables): string {
  return plantilla
    .replace(/\{cliente\}/g, primerNombre(v.cliente))
    .replace(/\{negocio\}/g, v.negocio)
    .replace(/\{concepto\}/g, v.concepto)
    .replace(/\{monto\}/g, bs(v.monto))
    .replace(/\{saldo\}/g, bs(v.saldo))
    .replace(/\{vencimiento\}/g, fechaLarga(v.vencimiento))
    .replace(/\{enlace\}/g, v.enlace);
}

export function primerNombre(n: string): string {
  return n.trim().split(/\s+/)[0] ?? n;
}

export function mensajeCobro(n: Negocio, cl: Cliente, c: Cobro, saldoActual: number, cuotasTexto?: string): string {
  const lineas = [
    `Hola ${primerNombre(cl.nombre)} 👋, te envío el detalle de tu compra en *${n.nombre}*:`,
    '',
    `🧾 ${c.concepto}`,
    `💵 Monto: *${bs(saldoActual)}*`,
    `📅 Vence: ${fechaLarga(c.vencimiento)}`,
  ];
  if (cuotasTexto) lineas.push(`📆 ${cuotasTexto}`);
  lineas.push(
    '',
    `Paga escaneando el QR desde la app de tu banco (escribe el monto exacto). Detalle y QR aquí: ${enlacePago(c)}`,
    '',
    'Cuando pagues, toca "Ya pagué" en el enlace y sube tu comprobante. ¡Gracias!',
  );
  return lineas.join('\n');
}

export function mensajeRecordarTodo(n: Negocio, cl: Cliente, items: { cobro: Cobro; saldo: number; venc: string }[]): string {
  const total = items.reduce((s, i) => s + i.saldo, 0);
  const lineas = [
    `Hola ${primerNombre(cl.nombre)} 👋, te comparto el resumen de tus pagos pendientes con *${n.nombre}*:`,
    '',
    ...items.map((i) => `• ${i.cobro.concepto}: ${bs(i.saldo)} (vence ${fechaLarga(i.venc)}) ${enlacePago(i.cobro)}`),
    '',
    `Total pendiente: *${bs(total)}*`,
    'Puedes pagar con el QR de cada enlace. ¡Gracias!',
  ];
  return lineas.join('\n');
}

export function mensajeComprobante(n: Negocio, cl: Cliente, c: Cobro, montoPagado: number, saldoRestante: number, fecha: string): string {
  const lineas = [
    `Hola ${primerNombre(cl.nombre)}, recibimos tu pago. ¡Gracias! 🙌`,
    '',
    `Comprobante de *${n.nombre}*`,
    `🧾 ${c.concepto}`,
    `✅ Pagado: ${bs(montoPagado)} el ${fechaLarga(fecha)}`,
    saldoRestante > 0 ? `Saldo pendiente: ${bs(saldoRestante)}` : 'Cuenta saldada. ✔️',
  ];
  return lineas.join('\n');
}

export const MOTIVOS_RECHAZO = [
  'No encuentro el pago en mi banco',
  'El monto no coincide',
  'El comprobante no se ve bien',
  'El comprobante ya fue usado en otro pago',
];
