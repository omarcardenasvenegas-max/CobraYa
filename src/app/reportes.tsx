// Panel y reportes: total por cobrar, vencido, cobrado del mes, deudores; exportar a Excel o PDF.
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { resumen } from '@/lib/logica';
import { bs, hoy } from '@/lib/formato';
import { CANAL_NOMBRE, csvCobros, deudoresResumen, htmlReporte, porCanalResumen } from '@/lib/documentos';
import { compartirCsv, compartirPdf } from '@/lib/dispositivo';
import { planEfectivo } from '@/lib/planes';
import { Aviso, Boton, C, Dato, Pantalla, Tarjeta, Titulo, Vacio, s } from '@/ui/componentes';

export default function Reportes() {
  const { datos } = useStore();
  const r = resumen(datos);
  const plan = planEfectivo(datos.negocio);
  const canales = porCanalResumen(datos);
  const deudores = deudoresResumen(datos);

  return (
    <Pantalla>
      <Tarjeta>
        <Dato etiqueta="Por cobrar" valor={bs(r.porCobrar)} />
        <Dato etiqueta="Vencido" valor={bs(r.vencido)} color={C.rojo} />
        <Dato etiqueta="Cobrado este mes" valor={bs(r.cobradoMes)} color={C.verde} />
        <Dato etiqueta="Cobros abiertos" valor={String(r.nActivos)} />
      </Tarjeta>

      {plan.exportar ? (
        <View style={s.fila2}>
          <Boton estilo={{ flex: 1 }} tipo="secundario" titulo="Exportar Excel" onPress={() => compartirCsv(`cobroya-${hoy()}.csv`, csvCobros(datos))} />
          <Boton estilo={{ flex: 1 }} tipo="secundario" titulo="Exportar PDF" onPress={() => compartirPdf(htmlReporte(datos, datos.negocio!), 'Reporte de cobros')} />
        </View>
      ) : (
        <Aviso tipo="alerta" texto="Exportar a Excel y PDF está disponible desde el plan Básico." />
      )}

      <Titulo>Por canal de venta</Titulo>
      {canales.length === 0 ? <Vacio texto="Sin datos todavía." /> : (
        <Tarjeta>
          {canales.map((c) => (
            <View key={c.canal} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ fontWeight: '700', color: C.texto }}>{CANAL_NOMBRE[c.canal]} · {c.cantidad} {c.cantidad === 1 ? 'cobro' : 'cobros'}</Text>
              <Text style={s.suave}>Por cobrar {bs(c.porCobrar)} · Cobrado {bs(c.cobrado)}</Text>
            </View>
          ))}
        </Tarjeta>
      )}

      <Titulo>Deudores</Titulo>
      {deudores.length === 0 ? <Vacio texto="Nadie te debe. 🎉" /> : (
        <Tarjeta estilo={{ paddingVertical: 4 }}>
          {deudores.map((x) => (
            <Text
              key={x.cliente.id}
              onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: x.cliente.id } })}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', color: C.texto, fontSize: 15 }}
            >
              {x.cliente.nombre} · <Text style={{ fontWeight: '800' }}>{bs(x.saldo)}</Text>
            </Text>
          ))}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
