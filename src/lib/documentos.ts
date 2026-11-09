// Comprobante de venta (PDF) y reportes (PDF y CSV para Excel).
import type { Canal, Cliente, Cobro, Datos, MedioPago, Negocio, Pago } from './types';
import { bs, fechaLarga, hoy } from './formato';
import { ESTADO_INFO, estadoCobro, saldo, saldoCliente, resumen, vencimientoEfectivo } from './logica';

export const CANAL_NOMBRE: Record<Canal, string> = {
  whatsapp: 'WhatsApp', marketplace: 'Marketplace', tienda: 'Tienda', otro: 'Otro',
};
export const MEDIO_NOMBRE: Record<MedioPago, string> = {
  qr: 'QR', efectivo: 'Efectivo', transferencia: 'Transferencia',
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const ESTILO = `
  body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#111827;margin:32px}
  h1{font-size:22px;margin:0} h2{font-size:16px;margin:24px 0 8px}
  .muted{color:#6B7280;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  th,td{text-align:left;padding:6px;border-bottom:1px solid #E5E7EB} th{background:#F3F4F6}
  .r{text-align:right} .tot{font-size:28px;font-weight:700;color:#0F766E}
  .cab{display:flex;align-items:center;gap:12px;margin-bottom:16px} .cab img{width:56px;height:56px;border-radius:8px;object-fit:cover}
  .cards{display:flex;gap:12px} .card{flex:1;border:1px solid #E5E7EB;border-radius:8px;padding:10px}
`;

export function htmlComprobante(
  n: Negocio, cl: Cliente, c: Cobro, pago: Pago, saldoRestante: number, logoDataUri: string | undefined, conLogo: boolean,
): string {
  const cabecera = conLogo && logoDataUri ? `<img src="${logoDataUri}"/>` : '';
  return `<html><head><meta charset="utf-8"/><style>${ESTILO}</style></head><body>
  <div class="cab">${cabecera}<div><h1>${esc(n.nombre)}</h1><div class="muted">${esc(n.rubro)} · ${esc(n.celular)}</div></div></div>
  <h2>Comprobante de pago</h2>
  <div class="muted">Fecha: ${fechaLarga(pago.fecha)} · Nº ${pago.id.slice(-6).toUpperCase()}</div>
  <table>
    <tr><th>Cliente</th><td>${esc(cl.nombre)}</td></tr>
    <tr><th>Concepto</th><td>${esc(c.concepto)}</td></tr>
    <tr><th>Monto total</th><td>${bs(c.monto)}</td></tr>
    <tr><th>Pagado ahora</th><td>${bs(pago.monto)} (${MEDIO_NOMBRE[pago.medio]}${pago.nroTransaccion ? ' · Tx ' + esc(pago.nroTransaccion) : ''})</td></tr>
    <tr><th>Saldo pendiente</th><td>${saldoRestante > 0 ? bs(saldoRestante) : 'Cancelado'}</td></tr>
  </table>
  <p class="tot">${bs(pago.monto)}</p>
  <p class="muted">${conLogo ? '' : 'Generado con CobroYa · cobroya.bo · '}Este comprobante no es una factura.</p>
  </body></html>`;
}

export function htmlReporte(d: Datos, n: Negocio): string {
  const r = resumen(d);
  const t = hoy();
  const activos = d.cobros.filter((c) => !['pagado', 'anulado'].includes(estadoCobro(d, c)));
  const filas = activos
    .sort((a, b) => saldo(d, b) - saldo(d, a))
    .map((c) => {
      const cl = d.clientes.find((x) => x.id === c.clienteId);
      return `<tr><td>${esc(cl?.nombre ?? '')}</td><td>${esc(c.concepto)}</td><td>${CANAL_NOMBRE[c.canal]}</td><td>${fechaLarga(vencimientoEfectivo(d, c))}</td><td>${ESTADO_INFO[estadoCobro(d, c)].nombre}</td><td class="r">${bs(saldo(d, c))}</td></tr>`;
    }).join('');
  const porCanal = porCanalResumen(d)
    .map((x) => `<tr><td>${CANAL_NOMBRE[x.canal]}</td><td class="r">${x.cantidad}</td><td class="r">${bs(x.porCobrar)}</td><td class="r">${bs(x.cobrado)}</td></tr>`).join('');
  const deudores = deudoresResumen(d)
    .map((x) => `<tr><td>${esc(x.cliente.nombre)}</td><td>${esc(x.cliente.celular)}</td><td class="r">${bs(x.saldo)}</td></tr>`).join('');
  return `<html><head><meta charset="utf-8"/><style>${ESTILO}</style></head><body>
  <h1>${esc(n.nombre)} · Reporte de cobros</h1><div class="muted">Al ${fechaLarga(t)}</div>
  <div class="cards" style="margin-top:16px">
    <div class="card"><div class="muted">Por cobrar</div><b>${bs(r.porCobrar)}</b></div>
    <div class="card"><div class="muted">Vencido</div><b style="color:#B91C1C">${bs(r.vencido)}</b></div>
    <div class="card"><div class="muted">Cobrado este mes</div><b style="color:#047857">${bs(r.cobradoMes)}</b></div>
  </div>
  <h2>Por canal de venta</h2><table><tr><th>Canal</th><th class="r">Cobros</th><th class="r">Por cobrar</th><th class="r">Cobrado</th></tr>${porCanal}</table>
  <h2>Deudores</h2><table><tr><th>Cliente</th><th>Celular</th><th class="r">Saldo</th></tr>${deudores}</table>
  <h2>Cobros abiertos</h2><table><tr><th>Cliente</th><th>Concepto</th><th>Canal</th><th>Vence</th><th>Estado</th><th class="r">Saldo</th></tr>${filas}</table>
  </body></html>`;
}

export function porCanalResumen(d: Datos) {
  const canales: Canal[] = ['whatsapp', 'marketplace', 'tienda', 'otro'];
  return canales.map((canal) => {
    const lista = d.cobros.filter((c) => c.canal === canal && !c.anulado);
    const ids = new Set(lista.map((c) => c.id));
    return {
      canal,
      cantidad: lista.length,
      porCobrar: lista.filter((c) => estadoCobro(d, c) !== 'pagado').reduce((s, c) => s + saldo(d, c), 0),
      cobrado: d.pagos.filter((p) => ids.has(p.cobroId) && p.estado === 'confirmado').reduce((s, p) => s + p.monto, 0),
    };
  }).filter((x) => x.cantidad > 0);
}

export function deudoresResumen(d: Datos) {
  return d.clientes
    .map((cliente) => ({ cliente, saldo: saldoCliente(d, cliente.id) }))
    .filter((x) => x.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);
}

const csvCampo = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV separado por punto y coma (lo que espera Excel en configuración regional de Bolivia). */
export function csvCobros(d: Datos): string {
  const cab = ['Cliente', 'Celular', 'Concepto', 'Canal', 'Emisión', 'Vencimiento', 'Estado', 'Monto (Bs)', 'Cobrado (Bs)', 'Saldo (Bs)', 'Enlace'];
  const filas = d.cobros.map((c) => {
    const cl = d.clientes.find((x) => x.id === c.clienteId);
    const s = saldo(d, c);
    const num = (x: number) => (x / 100).toFixed(2).replace('.', ',');
    return [
      cl?.nombre ?? '', cl?.celular ?? '', c.concepto, CANAL_NOMBRE[c.canal], c.fechaEmision, vencimientoEfectivo(d, c),
      ESTADO_INFO[estadoCobro(d, c)].nombre, num(c.monto), num(c.monto - s), num(s), 'cobroya.bo/p/' + c.enlace,
    ];
  });
  return [cab, ...filas].map((f) => f.map(csvCampo).join(';')).join('\n');
}
