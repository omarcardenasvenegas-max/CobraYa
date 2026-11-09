// Pruebas de las reglas de negocio (sin teléfono): npm test
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = mkdtempSync(join(tmpdir(), 'cobroya-test-'));
execSync(`npx tsc src/lib/formato.ts src/lib/logica.ts src/lib/planes.ts src/lib/mensajes.ts --outDir ${out} --module commonjs --target es2020 --skipLibCheck --strict --ignoreConfig`, { stdio: 'inherit' });
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(join(out, 'x.js'));
const F = require('./formato.js');
const L = require('./logica.js');
const P = require('./planes.js');
const M = require('./mensajes.js');

let n = 0;
const t = (nombre, fn) => { fn(); n++; console.log('✓', nombre); };

const HOY = '2026-11-09';
const base = () => ({
  version: 1, usuarios: [], qrs: [], clientes: [{ id: 'cl1', negocioId: 'n', nombre: 'María Quispe', celular: '71234567', notas: '', creado: HOY }],
  cobros: [], cuotas: [], pagos: [], recordatorios: [], config: M.CONFIG_INICIAL,
});
const cobro = (o = {}) => ({ id: 'c1', negocioId: 'n', clienteId: 'cl1', concepto: 'Blusa', monto: 10000, canal: 'whatsapp',
  fechaEmision: HOY, vencimiento: '2026-11-15', enlace: 'ABC123', enlacesAnteriores: [], anulado: false, notas: '', ...o });
const pago = (o = {}) => ({ id: 'p' + Math.random(), cobroId: 'c1', monto: 1000, fecha: HOY, medio: 'qr', origen: 'comerciante', estado: 'confirmado', registrado: new Date().toISOString(), ...o });

t('formato de bolivianos', () => {
  assert.equal(F.bs(125000), 'Bs 1.250');
  assert.equal(F.bs(125050), 'Bs 1.250,50');
  assert.equal(F.aCentavos('1.250,50'), 125050);
  assert.equal(F.aCentavos('1250.5'), 125050);
  assert.equal(F.aCentavos('1.250'), 125000);
  assert.ok(Number.isNaN(F.aCentavos('abc')));
  assert.equal(F.celularWhatsApp('7123 4567'), '59171234567');
});

t('estados: pendiente, vencido, parcial, por confirmar, pagado, anulado', () => {
  const d = base();
  d.cobros = [cobro()];
  assert.equal(L.estadoCobro(d, d.cobros[0], HOY), 'pendiente');
  assert.equal(L.estadoCobro(d, d.cobros[0], '2026-11-16'), 'vencido');
  d.pagos = [pago({ monto: 4000 })];
  assert.equal(L.estadoCobro(d, d.cobros[0], HOY), 'parcial');
  assert.equal(L.saldo(d, d.cobros[0]), 6000);
  d.pagos.push(pago({ monto: 6000, origen: 'cliente', estado: 'por_confirmar' }));
  assert.equal(L.estadoCobro(d, d.cobros[0], HOY), 'por_confirmar');
  assert.equal(L.saldo(d, d.cobros[0]), 6000, 'un pago por confirmar no reduce el saldo');
  d.pagos[1].estado = 'confirmado';
  assert.equal(L.estadoCobro(d, d.cobros[0], HOY), 'pagado');
  d.cobros[0].anulado = true;
  assert.equal(L.estadoCobro(d, d.cobros[0], HOY), 'anulado');
});

t('rechazo devuelve el cobro a su estado anterior', () => {
  const d = base();
  d.cobros = [cobro()];
  d.pagos = [pago({ origen: 'cliente', estado: 'rechazado', monto: 10000 })];
  assert.equal(L.estadoCobro(d, d.cobros[0], HOY), 'pendiente');
});

t('cuotas: división exacta y aplicación a la más antigua', () => {
  let i = 0;
  const q = L.generarCuotas('c1', 10000, 3, 'semanal', '2026-11-10', () => 'q' + i++);
  assert.deepEqual(q.map((x) => x.monto), [3333, 3333, 3334]);
  assert.deepEqual(q.map((x) => x.vencimiento), ['2026-11-10', '2026-11-17', '2026-11-24']);
  const d = base();
  d.cobros = [cobro({ vencimiento: '2026-11-24' })];
  d.cuotas = q;
  d.pagos = [pago({ monto: 4000 })];
  const cc = L.cuotasCalculadas(d, 'c1', HOY);
  assert.deepEqual(cc.map((x) => x.estado), ['pagada', 'parcial', 'pendiente']);
  assert.equal(L.vencimientoEfectivo(d, d.cobros[0], HOY), '2026-11-17');
  assert.equal(L.estadoCobro(d, d.cobros[0], '2026-11-18'), 'vencido', 'cuota impaga vencida marca el cobro como vencido');
});

t('cuotas mensuales respetan fin de mes', () => {
  const q = L.generarCuotas('c', 300, 3, 'mensual', '2026-01-31', () => 'x');
  assert.deepEqual(q.map((x) => x.vencimiento), ['2026-01-31', '2026-02-28', '2026-03-31']);
});

t('detección de pagos duplicados', () => {
  const d = base();
  d.cobros = [cobro(), cobro({ id: 'c2' })];
  d.pagos = [pago({ nroTransaccion: '0048213', monto: 5000 })];
  assert.ok(L.buscarDuplicado(d, 'c2', { monto: 999, fecha: '2026-11-01', nroTransaccion: '0048213' }));
  assert.ok(L.buscarDuplicado(d, 'c2', { monto: 5000, fecha: HOY }));
  assert.equal(L.buscarDuplicado(d, 'c2', { monto: 5001, fecha: HOY }), undefined);
});

t('recordatorios según configuración (2 días antes, el día, cada 3 días)', () => {
  const d = base();
  d.cobros = [cobro({ vencimiento: '2026-11-11' })];
  const c = d.cobros[0];
  assert.equal(L.tocaRecordarHoy(d, c, d.config, '2026-11-09'), true);
  assert.equal(L.tocaRecordarHoy(d, c, d.config, '2026-11-10'), false);
  assert.equal(L.tocaRecordarHoy(d, c, d.config, '2026-11-11'), true);
  assert.equal(L.tocaRecordarHoy(d, c, d.config, '2026-11-13'), false);
  assert.equal(L.tocaRecordarHoy(d, c, d.config, '2026-11-14'), true);
  assert.equal(L.tipoRecordatorio('2026-11-11', '2026-11-14'), 'vencido');
});

t('resumen del panel', () => {
  const d = base();
  d.cobros = [cobro(), cobro({ id: 'c2', vencimiento: '2026-11-01', monto: 5000 }), cobro({ id: 'c3', monto: 2000 })];
  d.pagos = [pago({ cobroId: 'c3', monto: 2000 }), pago({ cobroId: 'c1', monto: 1000, fecha: '2026-10-30' })];
  const r = L.resumen(d, HOY);
  assert.equal(r.porCobrar, 9000 + 5000);
  assert.equal(r.vencido, 5000);
  assert.equal(r.cobradoMes, 2000);
  assert.equal(r.nActivos, 2);
});

t('planes y prueba Pro de 14 días', () => {
  const neg = { id: 'n', nombre: 'X', rubro: '', celular: '', plan: 'gratis', fechaAlta: HOY };
  assert.equal(P.planEfectivo(neg, HOY).id, 'pro');
  assert.equal(P.planEfectivo(neg, '2026-11-23').id, 'gratis');
  assert.equal(P.PLANES.gratis.cobrosActivos, 15);
  assert.equal(P.PLANES.basico.precioMensual, 20);
  assert.equal(P.PLANES.pro.precioAnual, 500);
});

t('plantillas de mensaje', () => {
  const txt = M.rellenar(M.PLANTILLAS.amable.dia, { cliente: 'María Quispe', negocio: 'Modas Carla', concepto: 'Blusa', monto: 18000, saldo: 18000, vencimiento: HOY, enlace: 'cobroya.bo/p/AB12CD' });
  assert.ok(txt.startsWith('Hola María'));
  assert.ok(txt.includes('Bs 180') && txt.includes('cobroya.bo/p/AB12CD') && txt.includes('Modas Carla'));
});

console.log(`\n${n} pruebas pasaron.`);
