// Mi negocio y QR de cobro.
import { useState } from 'react';
import { Text, View } from 'react-native';
import type { QrCobro } from '@/lib/types';
import { useStore } from '@/lib/store';
import { elegirImagen } from '@/lib/dispositivo';
import { limiteTexto, planEfectivo } from '@/lib/planes';
import { Aviso, Boton, C, Campo, Chips, Imagen, Pantalla, Tarjeta, Titulo, s } from '@/ui/componentes';
import { avisar, confirmar } from '@/ui/dialogos';

const BANCOS = ['BNB', 'BCP', 'Banco Unión', 'Banco Mercantil Santa Cruz', 'BancoSol', 'Banco Ganadero', 'Banco Económico', 'Banco FIE', 'Tigo Money', 'Otro'];

export default function Negocio() {
  const st = useStore();
  const n = st.datos.negocio!;
  const plan = planEfectivo(n);
  const [nombre, setNombre] = useState(n.nombre);
  const [rubro, setRubro] = useState(n.rubro);
  const [nuevo, setNuevo] = useState<Partial<QrCobro> | null>(null);

  async function guardarNuevoQr() {
    if (!nuevo?.imagen || !nuevo.banco) return avisar('Faltan datos', 'Elige el banco y la imagen del QR.');
    const r = st.guardarQr({ banco: nuevo.banco, imagen: nuevo.imagen, tipo: nuevo.tipo ?? 'fijo' });
    if (!r.ok) return avisar('No se pudo agregar', r.error);
    setNuevo(null);
  }

  return (
    <Pantalla>
      <Tarjeta>
        <Campo etiqueta="Nombre del negocio" value={nombre} onChangeText={setNombre} />
        <Campo etiqueta="Rubro" value={rubro} onChangeText={setRubro} />
        <Text style={s.etiqueta}>Logo</Text>
        <Imagen uri={n.logo} alto={100} estilo={{ marginBottom: 6 }} />
        <Boton compacto tipo="secundario" titulo={n.logo ? 'Cambiar logo' : 'Subir logo'} onPress={async () => {
          const uri = await elegirImagen();
          if (uri) st.actualizarNegocio({ logo: uri });
        }} />
        <Text style={[s.suave, { marginTop: 10 }]}>Celular: +591 {n.celular}</Text>
        <Boton titulo="Guardar" deshabilitado={nombre.trim().length < 2} onPress={() => { st.actualizarNegocio({ nombre: nombre.trim(), rubro }); avisar('Guardado'); }} />
      </Tarjeta>

      <Titulo>QR de cobro ({st.datos.qrs.length} de {limiteTexto(plan.qrs)})</Titulo>
      <Aviso texto="Usa el QR interoperable que genera la app de tu banco. Tus clientes pagan directo a tu cuenta; CobroYa solo guarda y comparte la imagen." />
      {st.datos.qrs.map((q) => (
        <Tarjeta key={q.id} estilo={q.porDefecto ? { borderColor: C.primario } : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontWeight: '700', color: C.texto }}>{q.banco} · {q.tipo === 'fijo' ? 'Fijo' : 'Con monto'}</Text>
            {q.porDefecto && <Text style={{ color: C.primario, fontWeight: '700' }}>Por defecto</Text>}
          </View>
          <Imagen uri={q.imagen} alto={200} />
          <View style={[s.fila2, { marginTop: 8 }]}>
            {!q.porDefecto && <Boton estilo={{ flex: 1 }} compacto tipo="secundario" titulo="Usar por defecto" onPress={() => st.qrPorDefecto(q.id)} />}
            <Boton estilo={{ flex: 1 }} compacto tipo="secundario" titulo="Cambiar imagen" onPress={async () => {
              const uri = await elegirImagen();
              if (uri) st.guardarQr({ id: q.id, banco: q.banco, imagen: uri, tipo: q.tipo });
            }} />
            <Boton estilo={{ flex: 1 }} compacto tipo="peligro" titulo="Quitar" onPress={() => confirmar('¿Quitar este QR?', 'Los cobros nuevos usarán otro QR.', 'Quitar', () => st.eliminarQr(q.id), true)} />
          </View>
        </Tarjeta>
      ))}

      {nuevo ? (
        <Tarjeta>
          <Chips etiqueta="Banco" opciones={BANCOS.map((b) => ({ valor: b, texto: b }))} valor={nuevo.banco} onChange={(b) => setNuevo({ ...nuevo, banco: b })} />
          <Chips<'fijo' | 'por_monto'>
            etiqueta="Tipo"
            opciones={[{ valor: 'fijo', texto: 'Fijo' }, { valor: 'por_monto', texto: 'Con monto' }]}
            valor={nuevo.tipo ?? 'fijo'}
            onChange={(t) => setNuevo({ ...nuevo, tipo: t })}
          />
          <Imagen uri={nuevo.imagen} />
          <Boton tipo="secundario" titulo="Elegir imagen" onPress={async () => setNuevo({ ...nuevo, imagen: (await elegirImagen()) ?? nuevo.imagen })} />
          <Boton titulo="Guardar QR" onPress={guardarNuevoQr} />
          <Boton tipo="texto" titulo="Cancelar" onPress={() => setNuevo(null)} />
        </Tarjeta>
      ) : (
        <Boton tipo="secundario" titulo="+ Agregar QR" onPress={() => setNuevo({ tipo: 'fijo' })} />
      )}
    </Pantalla>
  );
}
