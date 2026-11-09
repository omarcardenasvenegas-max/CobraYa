import type { Negocio, PlanId } from './types';
import { diasEntre, hoy, sumarDias } from './formato';

export interface Plan {
  id: PlanId;
  nombre: string;
  precioMensual: number; // Bs
  precioAnual: number; // Bs (dos meses gratis)
  cobrosActivos: number; // Infinity = ilimitado
  clientes: number;
  qrs: number;
  recordatoriosProgramados: boolean;
  plantillasPropias: boolean;
  cuotas: boolean;
  logoEnComprobante: boolean;
  exportar: boolean;
  usuarios: number;
}

export const PLANES: Record<PlanId, Plan> = {
  gratis: {
    id: 'gratis', nombre: 'Gratis', precioMensual: 0, precioAnual: 0,
    cobrosActivos: 15, clientes: 30, qrs: 1,
    recordatoriosProgramados: false, plantillasPropias: false, cuotas: false,
    logoEnComprobante: false, exportar: false, usuarios: 1,
  },
  basico: {
    id: 'basico', nombre: 'Básico', precioMensual: 20, precioAnual: 200,
    cobrosActivos: 150, clientes: Infinity, qrs: 2,
    recordatoriosProgramados: true, plantillasPropias: false, cuotas: true,
    logoEnComprobante: true, exportar: true, usuarios: 1,
  },
  pro: {
    id: 'pro', nombre: 'Pro', precioMensual: 50, precioAnual: 500,
    cobrosActivos: Infinity, clientes: Infinity, qrs: 5,
    recordatoriosProgramados: true, plantillasPropias: true, cuotas: true,
    logoEnComprobante: true, exportar: true, usuarios: 3,
  },
};

export const DIAS_PRUEBA = 14;

export function finPrueba(n: Negocio): string {
  return sumarDias(n.fechaAlta, DIAS_PRUEBA);
}

export function enPrueba(n: Negocio, ref: string = hoy()): boolean {
  return n.plan === 'gratis' && diasEntre(ref, finPrueba(n)) > 0;
}

export function diasPruebaRestantes(n: Negocio, ref: string = hoy()): number {
  return Math.max(0, diasEntre(ref, finPrueba(n)));
}

/** Plan con el que se aplican los límites hoy (la prueba de 14 días da Pro). */
export function planEfectivo(n: Negocio | undefined, ref: string = hoy()): Plan {
  if (!n) return PLANES.gratis;
  if (enPrueba(n, ref)) return PLANES.pro;
  return PLANES[n.plan];
}

export function limiteTexto(v: number): string {
  return v === Infinity ? 'Ilimitados' : String(v);
}
