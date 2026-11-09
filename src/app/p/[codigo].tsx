// Pantalla 11. Página de pago del cliente (Flujo B).
// Es una ruta web (cobroya.bo/p/CODIGO) que no pide registro. En esta versión local se usa como vista
// previa dentro de la app; al conectar Supabase, la misma pantalla lee el cobro del servidor.
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { estadoCobro, pagosDe, saldo, vencimientoEfectivo } from '@/lib/logica';
import { aCentavos, bs, fechaLarga, hoy } from '@/lib/formato';
import { compartirArchivo, elegirImagen } from '@/lib/dispositivo';
import { Aviso, Boton, C, Campo, Imagen, Pantalla, Tarjeta, Vacio, s } from '@/ui/componentes';

export default function PaginaPago() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const st = useStore();
  const { datos } = st;
  const [subiendo, setSubiendo] = useState(false);
  const [comprobante, setComprobante] = useState<string>();
  const [montoTxt, setMontoTxt] = useState('');
  const [enviado, setEnviado] = useState(false);

  const c = datos.cobros.find((x) => x.enlace === codigo?.toUpperCase());
  const viejo = datos.cobros.some((x) => x.enlacesAnteriores.includes(codigo?.toUpperCase() ?? ''));
  const n = datos.negocio;

  if (!c || !n) {
    return <Vacio texto={viejo ? 'Este enlace fue reemplazado por uno nuevo. Pide al negocio el enlace actualizado.' : 'Enlace de pago no encontrado.'} />;
  }
  const e = estadoCobro(datos, c);
  const qr = datos.qrs.find((q) => q.id === c.qrId) ?? datos.qrs.find((q) => q.porDefecto) ?? datos.qrs[0];
  const sal = saldo(datos, c);
  const ultimoRechazo = pagosDe(datos, c.id).find((p) => p.origen === 'cliente' && p.estado === 'rechazado');
  const pendienteConfirmar = pagosDe(datos, c.id).some((p) => p.origen === 'cliente' && p.estado === 'por_confirmar');

  function enviar() {
    if (!c || !comprobante) return;
    const m = aCentavos(montoTxt);
    st.registrarPago({ cobroId: c.id, monto: m > 0 ? m : sal, fecha: hoy(), medio: 'qr', comprobante, origen: 'cliente' });
    setEnviado(true);
    setSubiendo(false);
  }

  return (
    <Pantalla>
      <Aviso texto="Vista previa: así ve tu cliente la página de pago. No necesita instalar nada ni registrarse." />
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        {n.logo ? <Image source={{ uri: n.logo }} style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 6 }} /> : null}
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.texto }}>{n.nombre}</Text>
      </View>

      {e === 'anulado' ? (
        <Tarjeta><Text style={s.titulo}>Este cobro fue anulado.</Text></Tarjeta>
      ) : e === 'pagado' ? (
        <Tarjeta estilo={{ borderColor: C.verde }}>
          <Text style={[s.titulo, { color: C.verde }]}>✓ Pagado. ¡Gracias!</Text>
          <Text style={s.suave}>{c.concepto} · {bs(c.monto)}</Text>
        </Tarjeta>
      ) : (
        <>
          <Tarjeta>
            <Text style={s.suave}>{c.concepto}</Text>
            <Text style={{ fontSize: 40, fontWeight: '900', color: C.texto }}>{bs(sal)}</Text>
            <Text style={[s.suave, e === 'vencido' && { color: C.rojo }]}>Vence el {fechaLarga(vencimientoEfectivo(datos, c))}</Text>
          </Tarjeta>

          {ultimoRechazo && !pendienteConfirmar && !enviado && (
            <Aviso tipo="error" texto={`Tu comprobante anterior no pudo confirmarse: ${ultimoRechazo.motivoRechazo}. Puedes subir otro.`} />
          )}
          {(enviado || pendienteConfirmar) && (
            <Aviso texto="Recibimos tu comprobante. El negocio lo confirmará cuando vea el pago en su banco." />
          )}

          {qr ? (
            <Tarjeta>
              <Text style={[s.etiqueta, { textAlign: 'center' }]}>Escanea con la app de tu banco</Text>
              <Imagen uri={qr.imagen} alto={300} />
              {qr.tipo === 'fijo' && (
                <Text style={[s.suave, { textAlign: 'center', marginTop: 6 }]}>Escribe el monto exacto: <Text style={{ fontWeight: '800', color: C.texto }}>{bs(sal)}</Text></Text>
              )}
              <Boton tipo="secundario" titulo="Guardar QR" onPress={() => compartirArchivo(qr.imagen, 'Guardar QR', 'image/jpeg')} />
            </Tarjeta>
          ) : (
            <Aviso tipo="alerta" texto="El negocio aún no cargó su QR." />
          )}

          {!enviado && !pendienteConfirmar && !subiendo && (
            <Boton titulo="Ya pagué, subir comprobante" onPress={() => setSubiendo(true)} />
          )}
          {subiendo && (
            <Tarjeta>
              <Imagen uri={comprobante} alto={220} />
              <Boton tipo="secundario" titulo={comprobante ? 'Cambiar captura' : 'Elegir captura del comprobante'} onPress={async () => setComprobante(await elegirImagen() ?? comprobante)} />
              <Campo etiqueta="Monto pagado (opcional)" keyboardType="decimal-pad" placeholder={String(sal / 100)} value={montoTxt} onChangeText={setMontoTxt} />
              <Boton titulo="Enviar comprobante" deshabilitado={!comprobante} onPress={enviar} />
            </Tarjeta>
          )}
        </>
      )}
      <Text style={[s.suave, { textAlign: 'center', marginTop: 16 }]}>Pagas directo a la cuenta de {n.nombre}. CobroYa no recibe tu dinero.</Text>
    </Pantalla>
  );
}
