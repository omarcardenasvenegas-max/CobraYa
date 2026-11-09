// Pantalla 8b. Ficha del cliente.
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { esActivo, estadoCobro, saldo, saldoCliente, vencimientoEfectivo } from '@/lib/logica';
import { bs } from '@/lib/formato';
import { abrirWhatsApp } from '@/lib/dispositivo';
import { mensajeRecordarTodo } from '@/lib/mensajes';
import { Boton, C, FilaCobro, Pantalla, Tarjeta, Titulo, Vacio, s } from '@/ui/componentes';

export default function FichaCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const st = useStore();
  const { datos } = st;
  const cl = datos.clientes.find((x) => x.id === id);
  if (!cl || !datos.negocio) return <Vacio texto="Cliente no encontrado." />;
  const cobros = datos.cobros.filter((c) => c.clienteId === cl.id);
  const abiertos = cobros.filter((c) => esActivo(estadoCobro(datos, c)));
  const historial = cobros.filter((c) => !esActivo(estadoCobro(datos, c)));
  const total = saldoCliente(datos, cl.id);

  function recordarTodo() {
    if (!cl || !datos.negocio) return;
    const items = abiertos.map((c) => ({ cobro: c, saldo: saldo(datos, c), venc: vencimientoEfectivo(datos, c) }));
    abrirWhatsApp(cl.celular, mensajeRecordarTodo(datos.negocio, cl, items)).then((ok) => {
      if (ok) for (const c of abiertos) st.registrarRecordatorio(c.id, estadoCobro(datos, c) === 'vencido' ? 'vencido' : 'antes');
    });
  }

  return (
    <Pantalla>
      <Tarjeta>
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.texto }}>{cl.nombre}</Text>
        <Text style={s.suave}>{cl.celular || 'Sin celular'}</Text>
        {cl.notas ? <Text style={{ marginTop: 6, color: C.texto }}>{cl.notas}</Text> : null}
        <Text style={[s.suave, { marginTop: 12 }]}>Saldo total</Text>
        <Text style={[s.grande, { color: total > 0 ? C.texto : C.verde }]}>{total > 0 ? bs(total) : 'Al día'}</Text>
      </Tarjeta>
      {abiertos.length > 0 && cl.celular ? (
        <Boton tipo="whatsapp" titulo={`Recordar todo (${abiertos.length})`} onPress={recordarTodo} />
      ) : null}
      <View style={s.fila2}>
        <Boton estilo={{ flex: 1 }} titulo="+ Nuevo cobro" onPress={() => router.push({ pathname: '/nuevo-cobro', params: { clienteId: cl.id } })} />
        <Boton estilo={{ flex: 1 }} tipo="secundario" titulo="Editar" onPress={() => router.push({ pathname: '/cliente/nuevo', params: { id: cl.id } })} />
      </View>

      <Titulo>Cobros abiertos</Titulo>
      {abiertos.length === 0 ? <Vacio texto="No tiene cobros pendientes." /> : abiertos.map((c) => (
        <FilaCobro key={c.id} d={datos} cobro={c} onPress={() => router.push({ pathname: '/cobro/[id]', params: { id: c.id } })} />
      ))}
      <Titulo>Historial</Titulo>
      {historial.length === 0 ? <Vacio texto="Sin historial todavía." /> : historial.map((c) => (
        <FilaCobro key={c.id} d={datos} cobro={c} onPress={() => router.push({ pathname: '/cobro/[id]', params: { id: c.id } })} />
      ))}
    </Pantalla>
  );
}
