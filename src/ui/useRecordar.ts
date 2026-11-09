import type { Cobro } from '@/lib/types';
import { useStore } from '@/lib/store';
import { abrirWhatsApp } from '@/lib/dispositivo';
import { enlacePago, rellenar } from '@/lib/mensajes';
import { saldo, tipoRecordatorio, vencimientoEfectivo } from '@/lib/logica';
import { avisar } from './dialogos';

/** Devuelve una función que abre WhatsApp con la plantilla adecuada (antes, el día o vencido) y registra el envío. */
export function useRecordar() {
  const st = useStore();
  return async (c: Cobro) => {
    const d = st.datos;
    const cl = d.clientes.find((x) => x.id === c.clienteId);
    if (!cl || !d.negocio) return;
    if (!cl.celular) {
      avisar('Falta el celular', 'Agrega el número del cliente para poder enviarle el recordatorio.');
      return;
    }
    const venc = vencimientoEfectivo(d, c);
    const tipo = tipoRecordatorio(venc);
    const texto = rellenar(d.config.plantillas[tipo], {
      cliente: cl.nombre, negocio: d.negocio.nombre, concepto: c.concepto, monto: c.monto,
      saldo: saldo(d, c), vencimiento: venc, enlace: enlacePago(c),
    });
    const ok = await abrirWhatsApp(cl.celular, texto);
    if (ok) st.registrarRecordatorio(c.id, tipo);
  };
}
