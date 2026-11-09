// Pantalla 8a. Clientes, ordenados por saldo pendiente.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { saldoCliente } from '@/lib/logica';
import { bs } from '@/lib/formato';
import { planEfectivo, limiteTexto } from '@/lib/planes';
import { Boton, C, Campo, Vacio, s } from '@/ui/componentes';

export default function Clientes() {
  const { datos } = useStore();
  const [q, setQ] = useState('');
  const plan = planEfectivo(datos.negocio);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return datos.clientes
      .filter((c) => !t || c.nombre.toLowerCase().includes(t) || c.celular.includes(t))
      .map((c) => ({ c, saldo: saldoCliente(datos, c.id) }))
      .sort((a, b) => b.saldo - a.saldo || a.c.nombre.localeCompare(b.c.nombre));
  }, [datos, q]);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Campo etiqueta="Buscar" placeholder="Nombre o celular" value={q} onChangeText={setQ} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={s.suave}>{datos.clientes.length} {datos.clientes.length === 1 ? 'cliente' : 'clientes'}{plan.clientes !== Infinity ? ` de ${limiteTexto(plan.clientes)}` : ''}</Text>
          <Boton compacto titulo="+ Cliente" onPress={() => router.push('/cliente/nuevo')} />
        </View>
      </View>
      <FlatList
        data={lista}
        keyExtractor={(x) => x.c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: item.c.id } })} style={({ pressed }) => [s.fila, pressed && { opacity: 0.7 }]}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primarioClaro, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.primarioOscuro, fontWeight: '800' }}>{item.c.nombre.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.filaTitulo}>{item.c.nombre}</Text>
              <Text style={s.filaSub}>{item.c.celular || 'Sin celular'}</Text>
            </View>
            <Text style={[s.filaMonto, { color: item.saldo > 0 ? C.texto : C.suave }]}>{item.saldo > 0 ? bs(item.saldo) : 'Al día'}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Vacio texto="Aún no tienes clientes. Se crean solos al hacer un cobro, o agrégalos aquí." />}
      />
    </View>
  );
}
