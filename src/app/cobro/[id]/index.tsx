// Pantalla 6. Detalle del cobro.
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import {
  cuotasCalculadas, ESTADO_INFO, estadoCobro, excedente, pagosDe, puedeAnular, puedeBorrar, puedeRegistrarPago, saldo,
  ultimoRecordatorio, vencimientoEfectivo,
} from '@/lib/logica';
import { bs, fechaLarga, textoVencimiento } from '@/lib/formato';
import { CANAL_NOMBRE, MEDIO_NOMBRE } from '@/lib/documentos';
import { enlacePago } from '@/lib/mensajes';
import { Boton, C, Dato, EstadoBadge, Imagen, Pantalla, Tarjeta, Titulo, Vacio, s } from '@/ui/componentes';
import { avisar, confirmar } from '@/ui/dialogos';
import { useRecordar } from '@/ui/useRecordar';

export default function DetalleCobro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const st = useStore();
  const { datos } = st;
  const recordar = useRecordar();
  const c = datos.cobros.find((x) => x.id === id);
  if (!c) return <Vacio texto="Este cobro ya no existe." />;
  const cl = datos.clientes.find((x) => x.id === c.clienteId);
  const e = estadoCobro(datos, c);
  const sal = saldo(datos, c);
  const exc = excedente(datos, c);
  const venc = vencimientoEfectivo(datos, c);
  const pagos = pagosDe(datos, c.id);
  const cuotas = cuotasCalculadas(datos, c.id);
  const ultRec = ultimoRecordatorio(datos, c.id);
  const activo = e !== 'pagado' && e !== 'anulado';

  return (
    <Pantalla>
      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: C.suave }}>{activo ? 'Saldo pendiente' : 'Monto'}</Text>
            <Text style={[s.grande, { color: ESTADO_INFO[e].color }]}>{bs(activo ? sal : c.monto)}</Text>
          </View>
          <EstadoBadge estado={e} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.texto, marginTop: 8 }}>{c.concepto}</Text>
        <Text
          style={{ color: C.primario, fontWeight: '600', marginTop: 2 }}
          onPress={() => cl && router.push({ pathname: '/cliente/[id]', params: { id: cl.id } })}
        >
          {cl?.nombre} ›
        </Text>
        <View style={{ marginTop: 10 }}>
          <Dato etiqueta="Monto total" valor={bs(c.monto)} />
          <Dato etiqueta="Cobrado" valor={bs(c.monto - sal)} color={C.verde} />
          {exc > 0 && <Dato etiqueta="Saldo a favor del cliente" valor={bs(exc)} color={C.azul} />}
          <Dato etiqueta="Vencimiento" valor={`${fechaLarga(venc)}${activo ? ' · ' + textoVencimiento(venc) : ''}`} color={e === 'vencido' ? C.rojo : undefined} />
          <Dato etiqueta="Canal" valor={CANAL_NOMBRE[c.canal]} />
          <Dato etiqueta="Emitido" valor={fechaLarga(c.fechaEmision)} />
          <Dato etiqueta="Enlace" valor={enlacePago(c).replace('https://', '')} />
          {ultRec?.fechaEnvio && <Dato etiqueta="Último recordatorio" valor={fechaLarga(ultRec.fechaEnvio.slice(0, 10))} />}
          {c.notas ? <Dato etiqueta="Notas" valor={c.notas} /> : null}
        </View>
      </Tarjeta>

      {puedeRegistrarPago(datos, c) && (
        <Boton titulo="Registrar pago" onPress={() => router.push({ pathname: '/cobro/[id]/pago', params: { id: c.id } })} />
      )}
      {activo && (
        <View style={s.fila2}>
          <Boton estilo={{ flex: 1 }} tipo="whatsapp" titulo="Recordar" onPress={() => recordar(c)} />
          <Boton estilo={{ flex: 1 }} tipo="secundario" titulo="Reenviar QR" onPress={() => router.push({ pathname: '/cobro/[id]/compartir', params: { id: c.id } })} />
        </View>
      )}

      {cuotas.length > 0 && (
        <>
          <Titulo>Cuotas</Titulo>
          <Tarjeta estilo={{ paddingVertical: 6 }}>
            {cuotas.map((q) => (
              <View key={q.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <View>
                  <Text style={{ fontWeight: '600', color: C.texto }}>{q.numero === 0 ? 'Anticipo' : `Cuota ${q.numero}`}</Text>
                  <Text style={s.suave}>{fechaLarga(q.vencimiento)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '700', color: C.texto }}>{bs(q.monto)}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: q.estado === 'pagada' ? C.verde : q.estado === 'vencida' ? C.rojo : q.estado === 'parcial' ? '#7C3AED' : C.ambar }}>
                    {q.estado === 'pagada' ? 'Pagada' : q.estado === 'vencida' ? 'Vencida' : q.estado === 'parcial' ? `Falta ${bs(q.saldo)}` : 'Pendiente'}
                  </Text>
                </View>
              </View>
            ))}
          </Tarjeta>
        </>
      )}

      <Titulo>Pagos y abonos</Titulo>
      {pagos.length === 0 ? (
        <Vacio texto="Todavía no hay pagos registrados." />
      ) : (
        pagos.map((p) => (
          <Tarjeta
            key={p.id}
            onPress={p.estado === 'por_confirmar' ? () => router.push({ pathname: '/cobro/[id]/pago', params: { id: c.id, pagoId: p.id } }) : undefined}
            estilo={p.estado === 'por_confirmar' ? { borderColor: C.azul } : undefined}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: C.texto }}>{bs(p.monto)} · {MEDIO_NOMBRE[p.medio]}</Text>
                <Text style={s.suave}>
                  {fechaLarga(p.fecha)} · {p.origen === 'cliente' ? 'Enviado por el cliente' : 'Registrado por ti'}
                  {p.nroTransaccion ? ` · Tx ${p.nroTransaccion}` : ''}
                </Text>
                {p.motivoRechazo ? <Text style={{ color: C.rojo, fontSize: 13 }}>Rechazado: {p.motivoRechazo}</Text> : null}
              </View>
              <Text style={{ fontWeight: '700', fontSize: 12, color: p.estado === 'confirmado' ? C.verde : p.estado === 'rechazado' ? C.rojo : C.azul }}>
                {p.estado === 'confirmado' ? 'Confirmado' : p.estado === 'rechazado' ? 'Rechazado' : 'Por confirmar ›'}
              </Text>
            </View>
            {p.comprobante ? <Imagen uri={p.comprobante} alto={140} estilo={{ marginTop: 8 }} /> : null}
          </Tarjeta>
        ))
      )}

      {activo && (
        <>
          <Titulo>Acciones</Titulo>
          <Boton tipo="secundario" titulo="Editar" onPress={() => router.push({ pathname: '/cobro/[id]/editar', params: { id: c.id } })} />
        </>
      )}
      {puedeAnular(datos, c) && (
        <Boton
          tipo="peligro"
          titulo="Anular cobro"
          onPress={() => confirmar('¿Anular este cobro?', 'Quedará en el historial como Anulado y su enlace de pago dejará de funcionar.', 'Anular', () => st.anularCobro(c.id), true)}
        />
      )}
      {puedeBorrar(datos, c) && (
        <Boton
          tipo="texto"
          titulo="Borrar cobro"
          onPress={() => confirmar('¿Borrar este cobro?', 'Se elimina por completo. Solo se puede porque no tiene pagos confirmados.', 'Borrar', () => {
            const r = st.borrarCobro(c.id);
            if (!r.ok) avisar('No se pudo borrar', r.error);
            else router.back();
          }, true)}
        />
      )}
    </Pantalla>
  );
}
