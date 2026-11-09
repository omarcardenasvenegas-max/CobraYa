// Estado de la app guardado en el teléfono (funciona sin internet).
// La capa de sincronización con Supabase se conecta aquí en la siguiente fase (ver supabase/schema.sql).
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Canal, Cliente, Cobro, ConfigRecordatorios, Datos, MedioPago, Negocio, OrigenPago, Pago, PlanId, QrCobro,
  TipoRecordatorio,
} from './types';
import { codigoEnlace, hoy, sumarDias, uid } from './formato';
import { CONFIG_INICIAL } from './mensajes';
import { cobrosActivos, Frecuencia, generarCuotas, puedeBorrar } from './logica';
import { planEfectivo } from './planes';

const CLAVE = 'cobroya:datos:v1';

export const DATOS_VACIOS: Datos = {
  version: 1,
  usuarios: [],
  qrs: [],
  clientes: [],
  cobros: [],
  cuotas: [],
  pagos: [],
  recordatorios: [],
  config: CONFIG_INICIAL,
};

export interface NuevoCobro {
  clienteId: string;
  concepto: string;
  monto: number;
  canal: Canal;
  vencimiento: string;
  cuotas?: { n: number; frecuencia: Frecuencia };
  anticipo?: { monto: number; medio: MedioPago };
}

export interface NuevoPago {
  cobroId: string;
  monto: number;
  fecha: string;
  medio: MedioPago;
  comprobante?: string;
  nroTransaccion?: string;
  origen: OrigenPago;
}

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

interface Store {
  datos: Datos;
  cargado: boolean;
  iniciarSesion(celular: string): void;
  crearNegocio(n: { nombre: string; rubro: string; logo?: string }): void;
  actualizarNegocio(c: Partial<Negocio>): void;
  guardarQr(q: Omit<QrCobro, 'id' | 'negocioId' | 'activo' | 'porDefecto'> & { id?: string }): Resultado<QrCobro>;
  qrPorDefecto(id: string): void;
  eliminarQr(id: string): void;
  crearCliente(c: { nombre: string; celular: string; notas?: string }): Resultado<Cliente>;
  actualizarCliente(id: string, c: Partial<Cliente>): void;
  eliminarCliente(id: string): Resultado<true>;
  crearCobro(c: NuevoCobro): Resultado<Cobro>;
  editarCobro(id: string, c: { concepto?: string; monto?: number; canal?: Canal; vencimiento?: string; notas?: string }): void;
  anularCobro(id: string): void;
  borrarCobro(id: string): Resultado<true>;
  registrarPago(p: NuevoPago): Pago;
  confirmarPago(id: string, cambios?: { monto?: number; nroTransaccion?: string }): void;
  rechazarPago(id: string, motivo: string): void;
  registrarRecordatorio(cobroId: string, tipo: TipoRecordatorio): void;
  guardarConfig(c: Partial<ConfigRecordatorios>): void;
  solicitarPlan(plan: PlanId, periodo: 'mensual' | 'anual', comprobante?: string): void;
  cerrarSesion(): void;
  cargarEjemplo(): void;
  borrarTodo(): void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Datos>(DATOS_VACIOS);
  const [cargado, setCargado] = useState(false);
  const ref = useRef(datos);
  ref.current = datos;

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((t) => {
        if (t) {
          const d = JSON.parse(t) as Datos;
          setDatos({ ...DATOS_VACIOS, ...d, config: { ...CONFIG_INICIAL, ...d.config } });
        }
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  useEffect(() => {
    if (!cargado) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(CLAVE, JSON.stringify(datos)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [datos, cargado]);

  const act = useCallback((fn: (d: Datos) => Datos) => {
    const nuevo = fn(ref.current);
    ref.current = nuevo;
    setDatos(nuevo);
  }, []);

  const store = useMemo<Store>(() => ({
    datos,
    cargado,

    iniciarSesion(celular) {
      act((d) => {
        const existente = d.usuarios.find((u) => u.celular === celular);
        if (existente) return { ...d, sesion: { usuarioId: existente.id } };
        const u = { id: uid(), negocioId: d.negocio?.id ?? '', celular, nombre: '', rol: 'dueno' as const };
        return { ...d, usuarios: [...d.usuarios, u], sesion: { usuarioId: u.id } };
      });
    },

    crearNegocio({ nombre, rubro, logo }) {
      act((d) => {
        const u = d.usuarios.find((x) => x.id === d.sesion?.usuarioId);
        const n: Negocio = {
          id: uid(), nombre, rubro, logo, celular: u?.celular ?? '', plan: 'gratis', fechaAlta: hoy(),
        };
        return {
          ...d,
          negocio: n,
          usuarios: d.usuarios.map((x) => (x.id === u?.id ? { ...x, negocioId: n.id } : x)),
          qrs: d.qrs.map((q) => ({ ...q, negocioId: n.id })),
        };
      });
    },

    actualizarNegocio(c) {
      act((d) => (d.negocio ? { ...d, negocio: { ...d.negocio, ...c } } : d));
    },

    guardarQr(q) {
      const d = ref.current;
      if (q.id) {
        const actual = d.qrs.find((x) => x.id === q.id)!;
        const nuevo = { ...actual, ...q } as QrCobro;
        act((dd) => ({ ...dd, qrs: dd.qrs.map((x) => (x.id === q.id ? nuevo : x)) }));
        return { ok: true, valor: nuevo };
      }
      const limite = planEfectivo(d.negocio).qrs;
      if (d.qrs.length >= limite) {
        return { ok: false, error: `Tu plan permite ${limite} QR. Cambia de plan para agregar más.` };
      }
      const nuevo: QrCobro = {
        id: uid(), negocioId: d.negocio?.id ?? '', banco: q.banco, imagen: q.imagen, tipo: q.tipo,
        activo: true, porDefecto: d.qrs.length === 0,
      };
      act((dd) => ({ ...dd, qrs: [...dd.qrs, nuevo] }));
      return { ok: true, valor: nuevo };
    },

    qrPorDefecto(id) {
      act((d) => ({ ...d, qrs: d.qrs.map((q) => ({ ...q, porDefecto: q.id === id })) }));
    },

    eliminarQr(id) {
      act((d) => {
        const qrs = d.qrs.filter((q) => q.id !== id);
        if (qrs.length && !qrs.some((q) => q.porDefecto)) qrs[0] = { ...qrs[0], porDefecto: true };
        return { ...d, qrs };
      });
    },

    crearCliente({ nombre, celular, notas }) {
      const d = ref.current;
      const limite = planEfectivo(d.negocio).clientes;
      if (d.clientes.length >= limite) {
        return { ok: false, error: `El plan Gratis permite ${limite} clientes. Pasa al plan Básico para tener clientes ilimitados.` };
      }
      const c: Cliente = {
        id: uid(), negocioId: d.negocio?.id ?? '', nombre: nombre.trim(), celular: celular.trim(), notas: notas ?? '', creado: hoy(),
      };
      act((dd) => ({ ...dd, clientes: [...dd.clientes, c] }));
      return { ok: true, valor: c };
    },

    actualizarCliente(id, c) {
      act((d) => ({ ...d, clientes: d.clientes.map((x) => (x.id === id ? { ...x, ...c } : x)) }));
    },

    eliminarCliente(id) {
      if (ref.current.cobros.some((c) => c.clienteId === id)) {
        return { ok: false, error: 'Este cliente tiene cobros registrados. No se puede eliminar.' };
      }
      act((d) => ({ ...d, clientes: d.clientes.filter((x) => x.id !== id) }));
      return { ok: true, valor: true };
    },

    crearCobro(nc) {
      const d = ref.current;
      const plan = planEfectivo(d.negocio);
      if (cobrosActivos(d).length >= plan.cobrosActivos) {
        return {
          ok: false,
          error: `Llegaste al límite de ${plan.cobrosActivos} cobros activos de tu plan ${plan.nombre}. Cambia de plan para seguir creando cobros.`,
        };
      }
      if ((nc.cuotas || nc.anticipo) && !plan.cuotas) {
        return { ok: false, error: 'Las cuotas y abonos están disponibles desde el plan Básico.' };
      }
      const qr = d.qrs.find((q) => q.porDefecto) ?? d.qrs[0];
      const cobro: Cobro = {
        id: uid(), negocioId: d.negocio?.id ?? '', clienteId: nc.clienteId, concepto: nc.concepto.trim(),
        monto: nc.monto, canal: nc.canal, fechaEmision: hoy(), vencimiento: nc.vencimiento,
        enlace: codigoEnlace(), enlacesAnteriores: [], anulado: false, qrId: qr?.id, notas: '',
      };
      const anticipo = nc.anticipo && nc.anticipo.monto > 0 ? nc.anticipo : undefined;
      const restante = cobro.monto - (anticipo?.monto ?? 0);
      const cuotas = nc.cuotas && nc.cuotas.n > 1
        ? generarCuotas(cobro.id, restante, nc.cuotas.n, nc.cuotas.frecuencia, nc.vencimiento, uid)
        : [];
      if (cuotas.length) cobro.vencimiento = cuotas[cuotas.length - 1].vencimiento;
      // Con anticipo y cuotas, el anticipo se registra como cuota 0 ya pagada para que se aplique primero.
      if (anticipo && cuotas.length) {
        cuotas.unshift({ id: uid(), cobroId: cobro.id, numero: 0, monto: anticipo.monto, vencimiento: hoy() });
      }
      const pagos: Pago[] = anticipo
        ? [{
            id: uid(), cobroId: cobro.id, monto: anticipo.monto, fecha: hoy(), medio: anticipo.medio,
            origen: 'comerciante', estado: 'confirmado', registrado: new Date().toISOString(),
          }]
        : [];
      act((dd) => ({ ...dd, cobros: [cobro, ...dd.cobros], cuotas: [...dd.cuotas, ...cuotas], pagos: [...dd.pagos, ...pagos] }));
      return { ok: true, valor: cobro };
    },

    editarCobro(id, cambios) {
      act((d) => {
        const c = d.cobros.find((x) => x.id === id);
        if (!c) return d;
        const nuevo: Cobro = { ...c, ...cambios };
        let cuotas = d.cuotas;
        if (cambios.monto !== undefined && cambios.monto !== c.monto) {
          // Regla: editar el monto genera un enlace nuevo y desactiva el anterior.
          nuevo.enlacesAnteriores = [...c.enlacesAnteriores, c.enlace];
          nuevo.enlace = codigoEnlace();
          const propias = d.cuotas.filter((q) => q.cobroId === id).sort((a, b) => a.numero - b.numero);
          if (propias.length) {
            const fijas = propias.filter((q) => q.numero === 0);
            const variables = propias.filter((q) => q.numero > 0);
            const resto = nuevo.monto - fijas.reduce((s, q) => s + q.monto, 0);
            const base = Math.floor(resto / variables.length);
            const recalculadas = variables.map((q, i) => ({
              ...q, monto: i === variables.length - 1 ? resto - base * (variables.length - 1) : base,
            }));
            cuotas = [...d.cuotas.filter((q) => q.cobroId !== id), ...fijas, ...recalculadas];
          }
        }
        return { ...d, cobros: d.cobros.map((x) => (x.id === id ? nuevo : x)), cuotas };
      });
    },

    anularCobro(id) {
      act((d) => ({ ...d, cobros: d.cobros.map((x) => (x.id === id ? { ...x, anulado: true } : x)) }));
    },

    borrarCobro(id) {
      const d = ref.current;
      const c = d.cobros.find((x) => x.id === id);
      if (!c) return { ok: false, error: 'No existe el cobro.' };
      if (!puedeBorrar(d, c)) return { ok: false, error: 'Este cobro tiene pagos confirmados: solo se puede anular.' };
      act((dd) => ({
        ...dd,
        cobros: dd.cobros.filter((x) => x.id !== id),
        cuotas: dd.cuotas.filter((x) => x.cobroId !== id),
        recordatorios: dd.recordatorios.filter((x) => x.cobroId !== id),
        // Los comprobantes de clientes (aunque rechazados) se conservan como respaldo.
        pagos: dd.pagos.filter((x) => x.cobroId !== id || x.origen === 'cliente'),
      }));
      return { ok: true, valor: true };
    },

    registrarPago(np) {
      const p: Pago = {
        id: uid(), ...np,
        nroTransaccion: np.nroTransaccion?.trim() || undefined,
        estado: np.origen === 'comerciante' ? 'confirmado' : 'por_confirmar',
        registrado: new Date().toISOString(),
      };
      act((d) => ({ ...d, pagos: [...d.pagos, p] }));
      return p;
    },

    confirmarPago(id, cambios) {
      act((d) => ({
        ...d,
        pagos: d.pagos.map((p) => (p.id === id ? { ...p, ...cambios, estado: 'confirmado', motivoRechazo: undefined } : p)),
      }));
    },

    rechazarPago(id, motivo) {
      act((d) => ({ ...d, pagos: d.pagos.map((p) => (p.id === id ? { ...p, estado: 'rechazado', motivoRechazo: motivo } : p)) }));
    },

    registrarRecordatorio(cobroId, tipo) {
      act((d) => ({
        ...d,
        recordatorios: [...d.recordatorios, { id: uid(), cobroId, tipo, fechaProgramada: hoy(), fechaEnvio: new Date().toISOString() }],
      }));
    },

    guardarConfig(c) {
      act((d) => ({ ...d, config: { ...d.config, ...c } }));
    },

    solicitarPlan(plan, periodo, comprobante) {
      act((d) => (d.negocio ? { ...d, negocio: { ...d.negocio, solicitudPlan: { plan, periodo, comprobante, fecha: hoy() } } } : d));
    },

    cerrarSesion() {
      act((d) => ({ ...d, sesion: undefined }));
    },

    cargarEjemplo() {
      act((d) => agregarEjemplo(d));
    },

    borrarTodo() {
      act(() => DATOS_VACIOS);
    },
  }), [datos, cargado, act]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}

/** Datos de demostración para probar la app rápidamente. */
function agregarEjemplo(d: Datos): Datos {
  const nid = d.negocio?.id ?? '';
  const t = hoy();
  const cl = (nombre: string, celular: string): Cliente => ({ id: uid(), negocioId: nid, nombre, celular, notas: '', creado: t });
  const clientes = [cl('María Quispe', '71234567'), cl('Taller Don Jorge', '76543210'), cl('Lucía Fernández', '68811223'), cl('Tienda El Prado', '70011122')];
  const cob = (i: number, concepto: string, monto: number, canal: Canal, venc: string): Cobro => ({
    id: uid(), negocioId: nid, clienteId: clientes[i].id, concepto, monto, canal, fechaEmision: sumarDias(t, -10),
    vencimiento: venc, enlace: codigoEnlace(), enlacesAnteriores: [], anulado: false, qrId: d.qrs[0]?.id, notas: '',
  });
  const cobros = [
    cob(0, 'Blusa bordada talla M', 18000, 'marketplace', t),
    cob(1, 'Repuestos de frenos', 65000, 'tienda', sumarDias(t, -4)),
    cob(2, 'Clases de matemática – noviembre', 40000, 'whatsapp', sumarDias(t, 2)),
    cob(3, 'Pedido 24 cajas de galletas', 125000, 'otro', sumarDias(t, 12)),
    cob(0, 'Zapatos deportivos', 32000, 'whatsapp', sumarDias(t, -20)),
  ];
  const ahora = new Date().toISOString();
  const pagos: Pago[] = [
    { id: uid(), cobroId: cobros[1].id, monto: 30000, fecha: sumarDias(t, -6), medio: 'efectivo', origen: 'comerciante', estado: 'confirmado', registrado: ahora },
    { id: uid(), cobroId: cobros[3].id, monto: 50000, fecha: t, medio: 'qr', origen: 'cliente', estado: 'por_confirmar', nroTransaccion: '0048213', registrado: ahora },
    { id: uid(), cobroId: cobros[4].id, monto: 32000, fecha: sumarDias(t, -18), medio: 'qr', origen: 'comerciante', estado: 'confirmado', registrado: ahora },
  ];
  return {
    ...d,
    clientes: [...d.clientes, ...clientes],
    cobros: [...cobros, ...d.cobros],
    pagos: [...d.pagos, ...pagos],
  };
}

