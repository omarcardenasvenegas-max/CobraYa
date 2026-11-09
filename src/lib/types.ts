// Modelo de datos del MVP de CobroYa (8 entidades).
// Montos en centavos (enteros) para evitar errores de redondeo. Fechas como 'AAAA-MM-DD'.

export type PlanId = 'gratis' | 'basico' | 'pro';
export type Canal = 'whatsapp' | 'marketplace' | 'tienda' | 'otro';
export type MedioPago = 'qr' | 'efectivo' | 'transferencia';
export type OrigenPago = 'cliente' | 'comerciante';
export type EstadoPago = 'por_confirmar' | 'confirmado' | 'rechazado';
export type TipoRecordatorio = 'antes' | 'dia' | 'vencido';
export type Tono = 'amable' | 'neutro' | 'firme';
export type Rol = 'dueno' | 'ayudante';

/** Estado visible de un cobro. Se calcula, no se guarda (salvo "anulado"). */
export type EstadoCobro =
  | 'pendiente'
  | 'por_confirmar'
  | 'parcial'
  | 'vencido'
  | 'pagado'
  | 'anulado';

export interface Negocio {
  id: string;
  nombre: string;
  rubro: string;
  logo?: string; // uri local
  celular: string;
  plan: PlanId;
  fechaAlta: string; // inicio de la prueba Pro de 14 días
  /** Solicitud de cambio de plan pagada por QR y pendiente de verificación. */
  solicitudPlan?: { plan: PlanId; periodo: 'mensual' | 'anual'; comprobante?: string; fecha: string };
}

export interface Usuario {
  id: string;
  negocioId: string;
  celular: string;
  nombre: string;
  rol: Rol;
}

export interface QrCobro {
  id: string;
  negocioId: string;
  banco: string;
  imagen: string; // uri local de la imagen del QR interoperable
  tipo: 'fijo' | 'por_monto';
  activo: boolean;
  porDefecto: boolean;
}

export interface Cliente {
  id: string;
  negocioId: string;
  nombre: string;
  celular: string;
  notas: string;
  creado: string;
}

export interface Cobro {
  id: string;
  negocioId: string;
  clienteId: string;
  concepto: string;
  monto: number; // centavos
  canal: Canal;
  fechaEmision: string;
  vencimiento: string;
  /** Código del enlace corto (cobroya.bo/p/CODIGO). Cambia si se edita el monto. */
  enlace: string;
  enlacesAnteriores: string[];
  anulado: boolean;
  qrId?: string;
  notas: string;
}

export interface Cuota {
  id: string;
  cobroId: string;
  numero: number;
  monto: number; // centavos
  vencimiento: string;
}

export interface Pago {
  id: string;
  cobroId: string;
  monto: number; // centavos
  fecha: string;
  medio: MedioPago;
  comprobante?: string; // uri local
  nroTransaccion?: string;
  origen: OrigenPago;
  estado: EstadoPago;
  motivoRechazo?: string;
  registrado: string; // ISO
}

export interface Recordatorio {
  id: string;
  cobroId: string;
  tipo: TipoRecordatorio;
  fechaProgramada: string;
  fechaEnvio?: string; // ISO
}

export interface ConfigRecordatorios {
  diasAntes: number; // 0 = no recordar antes
  elDia: boolean;
  cadaDiasDespues: number; // 0 = no recordar después
  tono: Tono;
  plantillas: Record<TipoRecordatorio, string>;
  horaAviso: number; // hora del aviso diario al comerciante (8 = 8:00)
}

export interface Datos {
  version: 1;
  sesion?: { usuarioId: string };
  negocio?: Negocio;
  usuarios: Usuario[];
  qrs: QrCobro[];
  clientes: Cliente[];
  cobros: Cobro[];
  cuotas: Cuota[];
  pagos: Pago[];
  recordatorios: Recordatorio[];
  config: ConfigRecordatorios;
}
