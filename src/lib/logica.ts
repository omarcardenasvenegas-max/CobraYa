// Reglas de negocio del MVP. Funciones puras: sin React ni APIs del teléfono, para poder probarlas.
import type {
  Cobro, ConfigRecordatorios, Cuota, Datos, EstadoCobro, Pago, TipoRecordatorio,
} from './types';
import { diasEntre, hoy, sumarDias } from './formato';

export const ESTADO_INFO: Record<EstadoCobro, { nombre: string; color: string; fondo: string }> = {
  pendiente: { nombre: 'Pendiente', color: '#B45309', fondo: '#FEF3C7' },
  por_confirmar: { nombre: 'Por confirmar', color: '#1D4ED8', fondo: '#DBEAFE' },
  parcial: { nombre: 'Pago parcial', color: '#7C3AED', fondo: '#EDE9FE' },
  vencido: { nombre: 'Vencido', color: '#B91C1C', fondo: '#FEE2E2' },
  pagado: { nombre: 'Pagado', color: '#047857', fondo: '#D1FAE5' },
  anulado: { nombre: 'Anulado', color: '#4B5563', fondo: '#E5E7EB' },
};

export function pagosDe(d: Datos, cobroId: string): Pago[] {
  return d.pagos
    .filter((p) => p.cobroId === cobroId)
    .sort((a, b) => (a.registrado < b.registrado ? 1 : -1));
}

export function cuotasDe(d: Datos, cobroId: string): Cuota[] {
  return d.cuotas.filter((c) => c.cobroId === cobroId).sort((a, b) => a.numero - b.numero);
}

/** Suma de pagos confirmados. Un pago por confirmar no reduce el saldo. */
export function cobrado(d: Datos, cobroId: string): number {
  return d.pagos
    .filter((p) => p.cobroId === cobroId && p.estado === 'confirmado')
    .reduce((s, p) => s + p.monto, 0);
}

export function saldo(d: Datos, c: Cobro): number {
  return Math.max(0, c.monto - cobrado(d, c.id));
}

export function excedente(d: Datos, c: Cobro): number {
  return Math.max(0, cobrado(d, c.id) - c.monto);
}

export type EstadoCuota = 'pagada' | 'parcial' | 'pendiente' | 'vencida';
export interface CuotaCalculada extends Cuota {
  pagado: number;
  saldo: number;
  estado: EstadoCuota;
}

/** Aplica los pagos confirmados a la cuota más antigua pendiente. */
export function cuotasCalculadas(d: Datos, cobroId: string, ref: string = hoy()): CuotaCalculada[] {
  let disponible = cobrado(d, cobroId);
  return cuotasDe(d, cobroId).map((q) => {
    const pagado = Math.min(q.monto, disponible);
    disponible -= pagado;
    const s = q.monto - pagado;
    let estado: EstadoCuota;
    if (s <= 0) estado = 'pagada';
    else if (q.vencimiento < ref) estado = 'vencida';
    else if (pagado > 0) estado = 'parcial';
    else estado = 'pendiente';
    return { ...q, pagado, saldo: s, estado };
  });
}

/** Fecha que manda para vencido y recordatorios: la cuota impaga más antigua o el vencimiento del cobro. */
export function vencimientoEfectivo(d: Datos, c: Cobro, ref: string = hoy()): string {
  const cuotas = cuotasCalculadas(d, c.id, ref);
  if (cuotas.length) {
    const prox = cuotas.find((q) => q.saldo > 0);
    return prox ? prox.vencimiento : c.vencimiento;
  }
  return c.vencimiento;
}

export function tienePagoPorConfirmar(d: Datos, cobroId: string): boolean {
  return d.pagos.some((p) => p.cobroId === cobroId && p.estado === 'por_confirmar');
}

export function estadoCobro(d: Datos, c: Cobro, ref: string = hoy()): EstadoCobro {
  if (c.anulado) return 'anulado';
  const cob = cobrado(d, c.id);
  if (cob >= c.monto) return 'pagado';
  if (tienePagoPorConfirmar(d, c.id)) return 'por_confirmar';
  if (vencimientoEfectivo(d, c, ref) < ref) return 'vencido';
  if (cob > 0) return 'parcial';
  return 'pendiente';
}

export function esActivo(e: EstadoCobro): boolean {
  return e !== 'pagado' && e !== 'anulado';
}

export function cobrosActivos(d: Datos, ref: string = hoy()): Cobro[] {
  return d.cobros.filter((c) => esActivo(estadoCobro(d, c, ref)));
}

/** Se puede borrar solo si no tiene pagos confirmados; si los tiene, solo anular. */
export function puedeBorrar(d: Datos, c: Cobro): boolean {
  return cobrado(d, c.id) === 0;
}

export function puedeAnular(d: Datos, c: Cobro): boolean {
  const e = estadoCobro(d, c);
  return e !== 'pagado' && e !== 'anulado';
}

export function puedeRegistrarPago(d: Datos, c: Cobro): boolean {
  const e = estadoCobro(d, c);
  return e === 'pendiente' || e === 'vencido' || e === 'parcial' || e === 'por_confirmar';
}

export type Frecuencia = 'semanal' | 'quincenal' | 'mensual';

function siguienteFecha(f: string, frec: Frecuencia, k: number): string {
  if (frec === 'semanal') return sumarDias(f, 7 * k);
  if (frec === 'quincenal') return sumarDias(f, 15 * k);
  const [a, m, dia] = f.split('-').map(Number);
  const fecha = new Date(a, m - 1 + k, 1);
  const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  fecha.setDate(Math.min(dia, ultimo));
  return hoy(fecha);
}

/** Divide un monto en n cuotas iguales; el resto de centavos va en la última. */
export function generarCuotas(
  cobroId: string, monto: number, n: number, frec: Frecuencia, primerVenc: string, nuevoId: () => string,
): Cuota[] {
  const base = Math.floor(monto / n);
  return Array.from({ length: n }, (_, i) => ({
    id: nuevoId(),
    cobroId,
    numero: i + 1,
    monto: i === n - 1 ? monto - base * (n - 1) : base,
    vencimiento: siguienteFecha(primerVenc, frec, i),
  }));
}

/** Aviso de posible doble registro: mismo nº de transacción, o mismo monto y fecha para ese cliente. */
export function buscarDuplicado(
  d: Datos, cobroId: string, nuevo: { monto: number; fecha: string; nroTransaccion?: string }, ignorarPagoId?: string,
): Pago | undefined {
  const cobro = d.cobros.find((c) => c.id === cobroId);
  if (!cobro) return undefined;
  const cobrosCliente = new Set(d.cobros.filter((c) => c.clienteId === cobro.clienteId).map((c) => c.id));
  const nro = nuevo.nroTransaccion?.trim();
  return d.pagos.find((p) => {
    if (p.id === ignorarPagoId || p.estado === 'rechazado') return false;
    if (nro && p.nroTransaccion?.trim() === nro) return true;
    return cobrosCliente.has(p.cobroId) && p.monto === nuevo.monto && p.fecha === nuevo.fecha;
  });
}

// ---------- Recordatorios ----------

export function tipoRecordatorio(venc: string, ref: string = hoy()): TipoRecordatorio {
  const dd = diasEntre(ref, venc);
  if (dd > 0) return 'antes';
  if (dd === 0) return 'dia';
  return 'vencido';
}

/** ¿La configuración pide recordar este cobro hoy? */
export function tocaRecordarHoy(d: Datos, c: Cobro, cfg: ConfigRecordatorios, ref: string = hoy()): boolean {
  const e = estadoCobro(d, c, ref);
  if (e === 'pagado' || e === 'anulado' || e === 'por_confirmar') return false;
  const dd = diasEntre(ref, vencimientoEfectivo(d, c, ref));
  if (dd > 0) return cfg.diasAntes > 0 && dd === cfg.diasAntes;
  if (dd === 0) return cfg.elDia;
  return cfg.cadaDiasDespues > 0 && (-dd) % cfg.cadaDiasDespues === 0;
}

export function recordadoHoy(d: Datos, cobroId: string, ref: string = hoy()): boolean {
  return d.recordatorios.some((r) => r.cobroId === cobroId && r.fechaEnvio && r.fechaEnvio.slice(0, 10) === ref);
}

export function ultimoRecordatorio(d: Datos, cobroId: string) {
  return d.recordatorios
    .filter((r) => r.cobroId === cobroId && r.fechaEnvio)
    .sort((a, b) => ((a.fechaEnvio ?? '') < (b.fechaEnvio ?? '') ? 1 : -1))[0];
}

// ---------- Panel y reportes ----------

export interface Resumen {
  porCobrar: number;
  vencido: number;
  cobradoMes: number;
  nVencidos: number;
  nActivos: number;
}

export function resumen(d: Datos, ref: string = hoy()): Resumen {
  let porCobrar = 0, vencido = 0, nVencidos = 0, nActivos = 0;
  for (const c of d.cobros) {
    const e = estadoCobro(d, c, ref);
    if (!esActivo(e)) continue;
    const s = saldo(d, c);
    nActivos++;
    porCobrar += s;
    if (e === 'vencido') { vencido += s; nVencidos++; }
  }
  const mes = ref.slice(0, 7);
  const anulados = new Set(d.cobros.filter((c) => c.anulado).map((c) => c.id));
  const cobradoMes = d.pagos
    .filter((p) => p.estado === 'confirmado' && p.fecha.slice(0, 7) === mes && !anulados.has(p.cobroId))
    .reduce((s, p) => s + p.monto, 0);
  return { porCobrar, vencido, cobradoMes, nVencidos, nActivos };
}

export function saldoCliente(d: Datos, clienteId: string, ref: string = hoy()): number {
  return d.cobros
    .filter((c) => c.clienteId === clienteId && esActivo(estadoCobro(d, c, ref)))
    .reduce((s, c) => s + saldo(d, c), 0);
}

/** Cobros que necesitan acción hoy: pagos por confirmar, vencen hoy, toca recordar. */
export function paraHoy(d: Datos, ref: string = hoy()) {
  const porConfirmar = d.pagos
    .filter((p) => p.estado === 'por_confirmar')
    .map((p) => ({ pago: p, cobro: d.cobros.find((c) => c.id === p.cobroId)! }))
    .filter((x) => x.cobro && !x.cobro.anulado);
  const recordar = d.cobros.filter((c) => {
    const e = estadoCobro(d, c, ref);
    if (!esActivo(e) || e === 'por_confirmar') return false;
    return vencimientoEfectivo(d, c, ref) === ref || tocaRecordarHoy(d, c, d.config, ref);
  });
  return { porConfirmar, recordar };
}

/** Cobros que tocará recordar en una fecha futura (para programar el aviso diario de las 8:00). */
export function proyeccionRecordatorios(d: Datos, fecha: string) {
  const lista = d.cobros.filter((c) => tocaRecordarHoy(d, c, d.config, fecha));
  return { cantidad: lista.length, total: lista.reduce((s, c) => s + saldo(d, c), 0) };
}
