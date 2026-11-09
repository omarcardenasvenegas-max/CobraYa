// Fechas locales 'AAAA-MM-DD' y montos en bolivianos.

const pad = (n: number) => String(n).padStart(2, '0');

export function hoy(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseFecha(f: string): Date {
  const [a, m, d] = f.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(f: string, dias: number): string {
  const d = parseFecha(f);
  d.setDate(d.getDate() + dias);
  return hoy(d);
}

/** Días de b menos a (positivo si b es posterior). */
export function diasEntre(a: string, b: string): number {
  return Math.round((parseFecha(b).getTime() - parseFecha(a).getTime()) / 86400000);
}

export function esFechaValida(f: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const d = parseFecha(f);
  return hoy(d) === f;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fechaCorta(f: string): string {
  const d = parseFecha(f);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function fechaLarga(f: string): string {
  const d = parseFecha(f);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "vence hoy", "vence en 3 días", "venció hace 2 días" */
export function textoVencimiento(venc: string, ref: string = hoy()): string {
  const d = diasEntre(ref, venc);
  if (d === 0) return 'vence hoy';
  if (d === 1) return 'vence mañana';
  if (d > 1) return `vence en ${d} días`;
  if (d === -1) return 'venció ayer';
  return `venció hace ${-d} días`;
}

/** 125000 -> "Bs 1.250" ; 125050 -> "Bs 1.250,50" */
export function bs(centavos: number): string {
  const neg = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const ent = Math.floor(abs / 100);
  const dec = abs % 100;
  const entStr = String(ent).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}Bs ${entStr}${dec ? ',' + pad(dec) : ''}`;
}

/** Convierte lo que escribe el usuario ("1.250,50", "1250.5", "1250") a centavos. NaN si no es válido. */
export function aCentavos(texto: string): number {
  let t = texto.trim().replace(/\s|bs/gi, '');
  if (!t) return NaN;
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Math.round(parseFloat(t) * 100);
}

/** Monto para precargar en un campo de texto: 125050 -> "1250,50" */
export function centavosATexto(c: number): string {
  const ent = Math.floor(c / 100);
  const dec = c % 100;
  return dec ? `${ent},${pad(dec)}` : String(ent);
}

/** Normaliza un celular boliviano para wa.me: "7123 4567" -> "59171234567" */
export function celularWhatsApp(cel: string): string {
  const dig = cel.replace(/\D/g, '');
  if (dig.length === 8) return '591' + dig;
  return dig;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Código corto de 6 caracteres sin letras ambiguas (cobroya.bo/p/AB12CD). */
export function codigoEnlace(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return s;
}
