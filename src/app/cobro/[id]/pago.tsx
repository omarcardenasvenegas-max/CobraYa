// Pantalla 7. Registrar pago / conciliar (Flujos C y D).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import type { MedioPago, Pago } from '@/lib/types';
import { useStore } from '@/lib/store';
import { buscarDuplicado, saldo } from '@/lib/logica';
import { aCentavos, bs, centavosATexto, esFechaValida, fechaLarga, hoy } from '@/lib/formato';
import { abrirWhatsApp, compartirPdf, elegirImagen, imagenABase64 } from '@/lib/dispositivo';
import { htmlComprobante, MEDIO_NOMBRE } from '@/lib/documentos';
import { mensajeComprobante, MOTIVOS_RECHAZO } from '@/lib/mensajes';
import { planEfectivo } from '@/lib/planes';
import { Aviso, Boton, C, Campo, Chips, Dato, Imagen, Pantalla, Tarjeta, Vacio, s } from '@/ui/componentes';
import { confirmar } from '@/ui/dialogos';

export default function RegistrarPago() {
  const { id, pagoId } = useLocalSearchParams<{ id: string; pagoId?: string }>();
  const st = useStore();
  const { datos } = st;
  const c = datos.cobros.find((x) => x.id === id);
  const pagoCliente = pagoId ? datos.pagos.find((p) => p.id === pagoId) : undefined;
  const sal = c ? saldo(datos, c) : 0;

  const [montoTxt, setMontoTxt] = useState(centavosATexto(pagoCliente?.monto ?? sal));
  const [fecha, setFecha] = useState(pagoCliente?.fecha ?? hoy());
  const [medio, setMedio] = useState<MedioPago>(pagoCliente?.medio ?? 'qr');
  const [comprobante, setComprobante] = useState<string | undefined>(pagoCliente?.comprobante);
  const [nro, setNro] = useState(pagoCliente?.nroTransaccion ?? '');
  const [delCliente, setDelCliente] = useState(false);
  const [motivo, setMotivo] = useState<string>();
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [listo, setListo] = useState<Pago | 'rechazado' | 'por_confirmar'>();
  const [intentado, setIntentado] = useState(false);

  if (!c || !datos.negocio) return <Vacio texto="Cobro no encontrado." />;
  const n = datos.negocio;
  const cl = datos.clientes.find((x) => x.id === c.clienteId)!;
  const monto = aCentavos(montoTxt);
  const fechaOk = esFechaValida(fecha) && fecha <= hoy();
  const valido = monto > 0 && fechaOk;
  const duplicado = valido ? buscarDuplicado(datos, c.id, { monto, fecha, nroTransaccion: nro }, pagoCliente?.id) : undefined;
  const modoRevision = pagoCliente?.estado === 'por_confirmar';

  // ---- Paso final: ofrecer comprobante de venta ----
  if (listo) {
    if (listo === 'rechazado' || listo === 'por_confirmar') {
      return (
        <Pantalla>
          <Tarjeta>
            <Text style={s.titulo}>{listo === 'rechazado' ? 'Pago rechazado' : 'Comprobante guardado'}</Text>
            <Text style={[s.suave, { marginTop: 6 }]}>
              {listo === 'rechazado'
                ? 'El cobro vuelve a su estado anterior. El comprobante queda guardado como respaldo.'
                : 'Quedó Por confirmar. Confírmalo cuando veas el dinero en tu banco.'}
            </Text>
          </Tarjeta>
          {listo === 'rechazado' && cl.celular ? (
            <Boton
              tipo="whatsapp"
              titulo="Avisar al cliente por WhatsApp"
              onPress={() => abrirWhatsApp(cl.celular, `Hola ${cl.nombre.split(' ')[0]}, revisé tu comprobante de ${c.concepto} y no pude confirmarlo: ${motivo}. ¿Me ayudas a revisarlo? Gracias — ${n.nombre}`)}
            />
          ) : null}
          <Boton titulo="Volver al cobro" onPress={() => router.back()} />
        </Pantalla>
      );
    }
    const restante = saldo(datos, c);
    const plan = planEfectivo(n);
    return (
      <Pantalla>
        <Tarjeta estilo={{ borderColor: C.verde }}>
          <Text style={[s.titulo, { color: C.verde }]}>✓ Pago confirmado</Text>
          <Text style={[s.grande, { marginTop: 6 }]}>{bs(listo.monto)}</Text>
          <Text style={s.suave}>{restante > 0 ? `Saldo pendiente: ${bs(restante)} (Pago parcial)` : 'El cobro quedó Pagado.'}</Text>
        </Tarjeta>
        <Text style={[s.etiqueta, { marginTop: 4 }]}>¿Enviar comprobante de venta al cliente?</Text>
        <Boton
          tipo="whatsapp"
          titulo="Enviar comprobante por WhatsApp"
          deshabilitado={!cl.celular}
          onPress={() => abrirWhatsApp(cl.celular, mensajeComprobante(n, cl, c, listo.monto, restante, listo.fecha))}
        />
        <Boton
          tipo="secundario"
          titulo="Compartir comprobante en PDF"
          onPress={async () => {
            const logo = n.logo ? await imagenABase64(n.logo) : undefined;
            await compartirPdf(htmlComprobante(n, cl, c, listo, restante, logo, plan.logoEnComprobante), 'Comprobante de pago');
          }}
        />
        <Boton tipo="texto" titulo="Listo" onPress={() => router.back()} />
      </Pantalla>
    );
  }

  function guardar() {
    setIntentado(true);
    if (!valido || !c) return;
    const ejecutar = () => {
      const exceso = monto - sal;
      const seguir = () => {
        if (modoRevision && pagoCliente) {
          st.confirmarPago(pagoCliente.id, { monto, nroTransaccion: nro.trim() || undefined });
          if (exceso > 0) st.editarCobro(c.id, { notas: notaExceso(c.notas, exceso) });
          setListo({ ...pagoCliente, monto, estado: 'confirmado' });
          return;
        }
        const p = st.registrarPago({
          cobroId: c.id, monto, fecha, medio, comprobante, nroTransaccion: nro, origen: delCliente ? 'cliente' : 'comerciante',
        });
        if (exceso > 0 && !delCliente) st.editarCobro(c.id, { notas: notaExceso(c.notas, exceso) });
        setListo(delCliente ? 'por_confirmar' : p);
      };
      if (exceso > 0 && !delCliente) {
        confirmar(
          'El pago es mayor al saldo',
          `¿Registrar ${bs(exceso)} de más como saldo a favor? Se anotará en las notas del cobro.`,
          'Registrar', seguir,
        );
      } else seguir();
    };
    if (duplicado) {
      confirmar(
        'Posible pago duplicado',
        `Ya existe un pago de ${bs(duplicado.monto)} del ${fechaLarga(duplicado.fecha)}${duplicado.nroTransaccion ? ` (Tx ${duplicado.nroTransaccion})` : ''} para este cliente. ¿Registrar de todos modos?`,
        'Sí, registrar', ejecutar,
      );
    } else ejecutar();
  }

  function rechazar() {
    if (!pagoCliente || !motivo) return;
    st.rechazarPago(pagoCliente.id, motivo);
    setListo('rechazado');
  }

  return (
    <Pantalla>
      <Tarjeta>
        <Text style={s.suave}>{cl.nombre} · {c.concepto}</Text>
        <Dato etiqueta="Saldo esperado" valor={bs(sal)} />
        {modoRevision && <Dato etiqueta="El cliente dice que pagó" valor={bs(pagoCliente!.monto)} color={C.azul} />}
      </Tarjeta>

      {modoRevision && (
        <>
          <Aviso tipo="alerta" texto="Antes de confirmar, revisa en la app de tu banco que el dinero llegó. Los comprobantes pueden estar editados." />
          {pagoCliente!.comprobante ? <Imagen uri={pagoCliente!.comprobante} alto={320} estilo={{ marginBottom: 12 }} /> : <Aviso texto="El cliente no adjuntó imagen." />}
        </>
      )}

      <Tarjeta>
        <Campo etiqueta="Monto recibido (Bs)" keyboardType="decimal-pad" value={montoTxt} onChangeText={setMontoTxt} error={intentado && !(monto > 0) ? 'Monto no válido' : undefined} style={{ fontSize: 22, fontWeight: '800' }} />
        {!modoRevision && (
          <>
            <Campo etiqueta="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} error={intentado && !fechaOk ? 'Fecha no válida o futura' : undefined} />
            <Chips<MedioPago>
              etiqueta="Medio"
              opciones={(['qr', 'efectivo', 'transferencia'] as MedioPago[]).map((m) => ({ valor: m, texto: MEDIO_NOMBRE[m] }))}
              valor={medio}
              onChange={setMedio}
            />
          </>
        )}
        <Campo etiqueta="Nº de transacción (opcional)" value={nro} onChangeText={setNro} placeholder="Ej. 0048213" />
        {!modoRevision && (
          <>
            <Text style={s.etiqueta}>Foto del comprobante (opcional)</Text>
            <Imagen uri={comprobante} alto={180} estilo={{ marginBottom: 6 }} />
            <View style={s.fila2}>
              <Boton estilo={{ flex: 1 }} compacto tipo="secundario" titulo="Galería" onPress={async () => setComprobante(await elegirImagen('galeria') ?? comprobante)} />
              <Boton estilo={{ flex: 1 }} compacto tipo="secundario" titulo="Cámara" onPress={async () => setComprobante(await elegirImagen('camara') ?? comprobante)} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 }}>
              <Switch value={delCliente} onValueChange={setDelCliente} trackColor={{ true: C.primario }} />
              <Text style={{ flex: 1, color: C.texto }}>Me lo mandó el cliente y aún no lo verifiqué en mi banco (queda Por confirmar)</Text>
            </View>
          </>
        )}
      </Tarjeta>

      {duplicado && (
        <Aviso tipo="alerta" texto={`Ojo: ya hay un pago de ${bs(duplicado.monto)} del ${fechaLarga(duplicado.fecha)}${duplicado.nroTransaccion ? ` con Tx ${duplicado.nroTransaccion}` : ''} para este cliente.`} />
      )}

      <Boton titulo={modoRevision ? 'Confirmar pago' : delCliente ? 'Guardar por confirmar' : 'Registrar pago'} onPress={guardar} />

      {modoRevision && (
        <>
          {!mostrarRechazo ? (
            <Boton tipo="peligro" titulo="Rechazar" onPress={() => setMostrarRechazo(true)} />
          ) : (
            <Tarjeta estilo={{ borderColor: C.rojo }}>
              <Chips etiqueta="Motivo del rechazo" opciones={MOTIVOS_RECHAZO.map((m) => ({ valor: m, texto: m }))} valor={motivo} onChange={setMotivo} />
              <Boton tipo="peligro" titulo="Rechazar pago" deshabilitado={!motivo} onPress={rechazar} />
            </Tarjeta>
          )}
        </>
      )}
    </Pantalla>
  );
}

function notaExceso(notas: string, exceso: number): string {
  const linea = `Saldo a favor del cliente: ${bs(exceso)} (${fechaLarga(hoy())})`;
  return notas ? `${notas}\n${linea}` : linea;
}
