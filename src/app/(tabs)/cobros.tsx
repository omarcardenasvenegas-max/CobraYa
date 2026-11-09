// Pantalla 5. Lista de cobros.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { Canal, EstadoCobro } from '@/lib/types';
import { useStore } from '@/lib/store';
import { estadoCobro, saldo, vencimientoEfectivo } from '@/lib/logica';
import { bs, hoy, sumarDias } from '@/lib/formato';
import { C, Campo, Chips, FilaCobro, Vacio, s } from '@/ui/componentes';

type Pestana = 'pendientes' | 'por_confirmar' | 'vencido' | 'pagados' | 'todos';
type FiltroFecha = 'todas' | 'hoy' | 'semana' | 'mes';

const PESTANAS: { valor: Pestana; texto: string }[] = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'por_confirmar', texto: 'Por confirmar' },
  { valor: 'vencido', texto: 'Vencidos' },
  { valor: 'pagados', texto: 'Pagados' },
  { valor: 'todos', texto: 'Todos' },
];

const coincide = (p: Pestana, e: EstadoCobro) => {
  if (p === 'todos') return true;
  if (p === 'pendientes') return e === 'pendiente' || e === 'parcial';
  if (p === 'pagados') return e === 'pagado';
  return p === e;
};

export default function Cobros() {
  const { datos } = useStore();
  const params = useLocalSearchParams<{ estado?: string }>();
  const [pestana, setPestana] = useState<Pestana>('pendientes');
  const [q, setQ] = useState('');
  const [canal, setCanal] = useState<Canal | 'todos'>('todos');
  const [fecha, setFecha] = useState<FiltroFecha>('todas');
  const [verFiltros, setVerFiltros] = useState(false);

  useEffect(() => {
    if (params.estado && PESTANAS.some((p) => p.valor === params.estado)) setPestana(params.estado as Pestana);
  }, [params.estado]);

  const conteo = useMemo(() => {
    const r: Record<Pestana, number> = { pendientes: 0, por_confirmar: 0, vencido: 0, pagados: 0, todos: 0 };
    for (const c of datos.cobros) {
      const e = estadoCobro(datos, c);
      for (const p of PESTANAS) if (coincide(p.valor, e)) r[p.valor]++;
    }
    return r;
  }, [datos]);

  const lista = useMemo(() => {
    const t = hoy();
    const texto = q.trim().toLowerCase();
    return datos.cobros
      .filter((c) => coincide(pestana, estadoCobro(datos, c)))
      .filter((c) => canal === 'todos' || c.canal === canal)
      .filter((c) => {
        if (fecha === 'todas') return true;
        const v = vencimientoEfectivo(datos, c);
        if (fecha === 'hoy') return v === t;
        if (fecha === 'semana') return v >= t && v <= sumarDias(t, 7);
        return v.slice(0, 7) === t.slice(0, 7);
      })
      .filter((c) => {
        if (!texto) return true;
        const cl = datos.clientes.find((x) => x.id === c.clienteId);
        return c.concepto.toLowerCase().includes(texto) || (cl?.nombre.toLowerCase().includes(texto) ?? false) || (cl?.celular.includes(texto) ?? false);
      })
      .sort((a, b) => (vencimientoEfectivo(datos, a) < vencimientoEfectivo(datos, b) ? -1 : 1));
  }, [datos, pestana, canal, fecha, q]);

  const total = lista.reduce((acc, c) => acc + (pestana === 'pagados' ? c.monto : saldo(datos, c)), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Chips
          opciones={PESTANAS.map((p) => ({ valor: p.valor, texto: `${p.texto} (${conteo[p.valor]})` }))}
          valor={pestana}
          onChange={setPestana}
        />
        <Campo etiqueta="Buscar" placeholder="Cliente, concepto o celular" value={q} onChangeText={setQ} />
        <Text onPress={() => setVerFiltros(!verFiltros)} style={{ color: C.primario, fontWeight: '700', marginBottom: 10 }}>
          {verFiltros ? 'Ocultar filtros ▲' : 'Filtrar por canal y fecha ▼'}
        </Text>
        {verFiltros && (
          <>
            <Chips<Canal | 'todos'>
              etiqueta="Canal"
              opciones={[{ valor: 'todos', texto: 'Todos' }, { valor: 'whatsapp', texto: 'WhatsApp' }, { valor: 'marketplace', texto: 'Marketplace' }, { valor: 'tienda', texto: 'Tienda' }, { valor: 'otro', texto: 'Otro' }]}
              valor={canal}
              onChange={setCanal}
            />
            <Chips<FiltroFecha>
              etiqueta="Vencimiento"
              opciones={[{ valor: 'todas', texto: 'Todas' }, { valor: 'hoy', texto: 'Hoy' }, { valor: 'semana', texto: 'Próximos 7 días' }, { valor: 'mes', texto: 'Este mes' }]}
              valor={fecha}
              onChange={setFecha}
            />
          </>
        )}
        <Text style={[s.suave, { marginBottom: 8 }]}>{lista.length} {lista.length === 1 ? 'cobro' : 'cobros'} · {bs(total)}</Text>
      </View>
      <FlatList
        data={lista}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <FilaCobro d={datos} cobro={item} onPress={() => router.push({ pathname: '/cobro/[id]', params: { id: item.id } })} />
        )}
        ListEmptyComponent={<Vacio texto="No hay cobros en esta lista." />}
      />
    </View>
  );
}
