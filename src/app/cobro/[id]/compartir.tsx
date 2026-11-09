// Pantalla 4. Compartir cobro.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useStore } from '@/lib/store';
import { abrirWhatsApp, compartirArchivo, copiarTexto } from '@/lib/dispositivo';
import { enlacePago, mensajeCobro } from '@/lib/mensajes';
import { cuotasCalculadas, saldo } from '@/lib/logica';
import { bs } from '@/lib/formato';
import { Aviso, Boton, C, Imagen, Pantalla, Tarjeta, Vacio, s } from '@/ui/componentes';
import { Share } from 'react-native';

export default function Compartir() {
  const { id, nuevo } = useLocalSearchParams<{ id: string; nuevo?: string }>();
  const { datos } = useStore();
  const [copiado, setCopiado] = useState(false);
  const c = datos.cobros.find((x) => x.id === id);
  if (!c || !datos.negocio) return <Vacio texto="Cobro no encontrado" />;
  const cl = datos.clientes.find((x) => x.id === c.clienteId)!;
  const qr = datos.qrs.find((q) => q.id === c.qrId) ?? datos.qrs.find((q) => q.porDefecto) ?? datos.qrs[0];
  const cuotas = cuotasCalculadas(datos, c.id).filter((q) => q.numero > 0);
  const cuotasTexto = cuotas.length ? `${cuotas.length} cuotas de ${bs(cuotas[0].monto)}` : undefined;
  const texto = mensajeCobro(datos.negocio, cl, c, saldo(datos, c), cuotasTexto);

  return (
    <Pantalla>
      {nuevo ? <Aviso texto="Cobro creado en estado Pendiente. Ahora envíaselo a tu cliente." /> : null}
      <Text style={[s.suave, { marginBottom: 6 }]}>Vista previa del mensaje para {cl.nombre}</Text>
      <Tarjeta estilo={{ backgroundColor: '#E7FFDB', borderColor: '#B7E4A6' }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: C.texto }}>{texto}</Text>
      </Tarjeta>
      {qr ? (
        <Tarjeta>
          <Text style={[s.etiqueta, { textAlign: 'center' }]}>QR de cobro · {qr.banco}</Text>
          <Imagen uri={qr.imagen} alto={240} />
          <Text style={[s.grande, { textAlign: 'center', marginTop: 8 }]}>{bs(saldo(datos, c))}</Text>
        </Tarjeta>
      ) : (
        <Aviso tipo="alerta" texto="Aún no subiste tu QR. El cliente verá el enlace pero no podrá escanear. Súbelo en Más › Mi negocio y QR." />
      )}

      <Boton
        tipo="whatsapp"
        titulo="Enviar por WhatsApp"
        deshabilitado={!cl.celular}
        onPress={() => abrirWhatsApp(cl.celular, texto)}
      />
      {!cl.celular && <Text style={[s.suave, { textAlign: 'center' }]}>Agrega el celular del cliente para enviarlo por WhatsApp.</Text>}
      <Boton
        tipo="secundario"
        titulo={copiado ? 'Texto copiado ✓' : 'Copiar texto (Marketplace / Messenger)'}
        onPress={async () => { await copiarTexto(texto); setCopiado(true); }}
      />
      {qr && (
        <Boton tipo="secundario" titulo="Compartir imagen del QR" onPress={() => compartirArchivo(qr.imagen, 'QR de cobro', 'image/jpeg')} />
      )}
      <Boton tipo="secundario" titulo="Compartir con otra app" onPress={() => Share.share({ message: texto })} />
      <Boton tipo="texto" titulo="Ver página de pago del cliente" onPress={() => router.push({ pathname: '/p/[codigo]', params: { codigo: c.enlace } })} />
      <Text style={[s.suave, { textAlign: 'center' }]}>{enlacePago(c)}</Text>
      <Boton tipo="texto" titulo="Listo" onPress={() => router.replace({ pathname: '/cobro/[id]', params: { id: c.id } })} />
    </Pantalla>
  );
}
