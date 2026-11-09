// Pantalla 2. Inicio (panel).
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { bs, fechaCorta } from '@/lib/formato';
import { paraHoy, recordadoHoy, resumen } from '@/lib/logica';
import { diasPruebaRestantes, enPrueba } from '@/lib/planes';
import { Aviso, Boton, C, FilaCobro, Pantalla, Tarjeta, Titulo, Vacio, s } from '@/ui/componentes';
import { useRecordar } from '@/ui/useRecordar';
import { MEDIO_NOMBRE } from '@/lib/documentos';

export default function Inicio() {
  const { datos } = useStore();
  const recordar = useRecordar();
  const r = resumen(datos);
  const hoyLista = paraHoy(datos);
  const n = datos.negocio!;

  const movimientos = [...datos.pagos]
    .sort((a, b) => (a.registrado < b.registrado ? 1 : -1))
    .slice(0, 6);

  return (
    <Pantalla>
      {enPrueba(n) && (
        <Aviso texto={`Prueba Pro: te quedan ${diasPruebaRestantes(n)} días con recordatorios y cuotas.`} />
      )}
      {datos.qrs.length === 0 && (
        <Tarjeta onPress={() => router.push('/negocio')} estilo={{ borderColor: C.ambar, backgroundColor: C.ambarClaro }}>
          <Text style={{ color: C.ambar, fontWeight: '700' }}>Falta tu QR de cobro</Text>
          <Text style={{ color: C.ambar, marginTop: 2 }}>Súbelo para que tus clientes puedan pagarte. Toca aquí.</Text>
        </Tarjeta>
      )}

      <Tarjeta estilo={{ backgroundColor: C.primario, borderColor: C.primario }} onPress={() => router.push('/cobros')}>
        <Text style={{ color: '#CCFBF1', fontSize: 13, fontWeight: '600' }}>Por cobrar</Text>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{bs(r.porCobrar)}</Text>
        <Text style={{ color: '#CCFBF1', fontSize: 13 }}>{r.nActivos} {r.nActivos === 1 ? 'cobro abierto' : 'cobros abiertos'}</Text>
      </Tarjeta>
      <View style={s.fila2}>
        <Tarjeta estilo={{ flex: 1, borderColor: r.vencido ? '#FCA5A5' : C.borde }} onPress={() => router.push({ pathname: '/cobros', params: { estado: 'vencido' } })}>
          <Text style={s.suave}>Vencido</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.rojo }}>{bs(r.vencido)}</Text>
          <Text style={s.suave}>{r.nVencidos} {r.nVencidos === 1 ? 'cobro' : 'cobros'}</Text>
        </Tarjeta>
        <Tarjeta estilo={{ flex: 1 }} onPress={() => router.push('/reportes')}>
          <Text style={s.suave}>Cobrado este mes</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.verde }}>{bs(r.cobradoMes)}</Text>
          <Text style={s.suave}>confirmado</Text>
        </Tarjeta>
      </View>

      <Titulo>Para hoy</Titulo>
      {hoyLista.porConfirmar.length === 0 && hoyLista.recordar.length === 0 && (
        <Vacio texto="Nada pendiente para hoy. 🎉" />
      )}
      {hoyLista.porConfirmar.map(({ pago, cobro }) => (
        <FilaCobro
          key={pago.id}
          d={datos}
          cobro={cobro}
          onPress={() => router.push({ pathname: '/cobro/[id]/pago', params: { id: cobro.id, pagoId: pago.id } })}
          derecha={
            <Boton compacto titulo={`Confirmar ${bs(pago.monto)}`} onPress={() => router.push({ pathname: '/cobro/[id]/pago', params: { id: cobro.id, pagoId: pago.id } })} />
          }
        />
      ))}
      {hoyLista.recordar.map((c) => {
        const ya = recordadoHoy(datos, c.id);
        return (
          <FilaCobro
            key={c.id}
            d={datos}
            cobro={c}
            onPress={() => router.push({ pathname: '/cobro/[id]', params: { id: c.id } })}
            derecha={
              <Boton compacto tipo={ya ? 'secundario' : 'whatsapp'} titulo={ya ? 'Recordado ✓' : 'Recordar'} onPress={() => recordar(c)} />
            }
          />
        );
      })}

      <Titulo>Últimos movimientos</Titulo>
      {movimientos.length === 0 ? (
        <Vacio
          texto="Todavía no registraste cobros. Crea el primero con el botón + de abajo."
          accion={<Boton titulo="+ Nuevo cobro" onPress={() => router.push('/nuevo-cobro')} />}
        />
      ) : (
        <Tarjeta estilo={{ paddingVertical: 4 }}>
          {movimientos.map((p) => {
            const c = datos.cobros.find((x) => x.id === p.cobroId);
            const cl = datos.clientes.find((x) => x.id === c?.clienteId);
            const color = p.estado === 'confirmado' ? C.verde : p.estado === 'rechazado' ? C.rojo : C.azul;
            const etiqueta = p.estado === 'confirmado' ? 'Pago confirmado' : p.estado === 'rechazado' ? 'Pago rechazado' : 'Por confirmar';
            return (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: C.texto }} numberOfLines={1}>{cl?.nombre ?? '—'} · {c?.concepto}</Text>
                  <Text style={s.suave}>{etiqueta} · {MEDIO_NOMBRE[p.medio]} · {fechaCorta(p.fecha)}</Text>
                </View>
                <Text style={{ fontWeight: '800', color }}>{p.estado === 'rechazado' ? '' : '+'}{bs(p.monto)}</Text>
              </View>
            );
          })}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
