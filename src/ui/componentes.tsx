import React from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Cobro, Datos, EstadoCobro } from '@/lib/types';
import { ESTADO_INFO, estadoCobro, saldo, vencimientoEfectivo } from '@/lib/logica';
import { bs, textoVencimiento } from '@/lib/formato';

export const C = {
  primario: '#0F766E',
  primarioOscuro: '#115E59',
  primarioClaro: '#CCFBF1',
  fondo: '#F6F7F9',
  tarjeta: '#FFFFFF',
  texto: '#111827',
  suave: '#6B7280',
  borde: '#E5E7EB',
  rojo: '#B91C1C',
  rojoClaro: '#FEE2E2',
  verde: '#047857',
  verdeClaro: '#D1FAE5',
  azul: '#1D4ED8',
  ambar: '#B45309',
  ambarClaro: '#FEF3C7',
};

export function Pantalla({ children, scroll = true, estilo }: { children: React.ReactNode; scroll?: boolean; estilo?: ViewStyle }) {
  const ins = useSafeAreaInsets();
  if (!scroll) return <View style={[s.pantalla, estilo]}>{children}</View>;
  return (
    <ScrollView
      style={s.pantallaScroll}
      contentContainerStyle={[s.pantalla, { paddingBottom: 32 + ins.bottom }, estilo]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Tarjeta({ children, estilo, onPress }: { children: React.ReactNode; estilo?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.tarjeta, estilo, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.tarjeta, estilo]}>{children}</View>;
}

type TipoBoton = 'primario' | 'secundario' | 'peligro' | 'texto' | 'whatsapp';

export function Boton({
  titulo, onPress, tipo = 'primario', deshabilitado, cargando, estilo, compacto,
}: {
  titulo: string; onPress: () => void; tipo?: TipoBoton; deshabilitado?: boolean; cargando?: boolean; estilo?: ViewStyle; compacto?: boolean;
}) {
  const colores: Record<TipoBoton, { bg: string; fg: string; borde?: string }> = {
    primario: { bg: C.primario, fg: '#fff' },
    secundario: { bg: '#fff', fg: C.primario, borde: C.primario },
    peligro: { bg: '#fff', fg: C.rojo, borde: C.rojo },
    texto: { bg: 'transparent', fg: C.primario },
    whatsapp: { bg: '#25D366', fg: '#fff' },
  };
  const col = colores[tipo];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={deshabilitado || cargando}
      onPress={onPress}
      style={({ pressed }) => [
        s.boton,
        compacto && s.botonCompacto,
        { backgroundColor: col.bg, borderColor: col.borde ?? col.bg, borderWidth: col.borde ? 1.5 : 0 },
        (deshabilitado || pressed) && { opacity: deshabilitado ? 0.45 : 0.75 },
        estilo,
      ]}
    >
      {cargando ? <ActivityIndicator color={col.fg} /> : <Text style={[s.botonTexto, compacto && { fontSize: 14 }, { color: col.fg }]}>{titulo}</Text>}
    </Pressable>
  );
}

export function Campo({ etiqueta, ayuda, error, ...props }: TextInputProps & { etiqueta: string; ayuda?: string; error?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        {...props}
        style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, error ? { borderColor: C.rojo } : null, props.style]}
      />
      {error ? <Text style={[s.ayuda, { color: C.rojo }]}>{error}</Text> : ayuda ? <Text style={s.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({
  opciones, valor, onChange, etiqueta,
}: { opciones: { valor: T; texto: string }[]; valor: T | undefined; onChange: (v: T) => void; etiqueta?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {etiqueta ? <Text style={s.etiqueta}>{etiqueta}</Text> : null}
      <View style={s.chips}>
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <Pressable key={o.valor} onPress={() => onChange(o.valor)} style={[s.chip, activo && s.chipActivo]}>
              <Text style={[s.chipTexto, activo && { color: '#fff' }]}>{o.texto}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function EstadoBadge({ estado }: { estado: EstadoCobro }) {
  const i = ESTADO_INFO[estado];
  return (
    <View style={[s.badge, { backgroundColor: i.fondo }]}>
      <Text style={[s.badgeTexto, { color: i.color }]}>{i.nombre}</Text>
    </View>
  );
}

export function FilaCobro({ d, cobro, onPress, derecha }: { d: Datos; cobro: Cobro; onPress: () => void; derecha?: React.ReactNode }) {
  const cl = d.clientes.find((x) => x.id === cobro.clienteId);
  const e = estadoCobro(d, cobro);
  const sal = saldo(d, cobro);
  const venc = vencimientoEfectivo(d, cobro);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.fila, pressed && { opacity: 0.7 }]}>
      <View style={[s.barraEstado, { backgroundColor: ESTADO_INFO[e].color }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.filaTitulo} numberOfLines={1}>{cl?.nombre ?? 'Cliente'}</Text>
        <Text style={s.filaSub} numberOfLines={1}>{cobro.concepto}</Text>
        <Text style={[s.filaSub, e === 'vencido' && { color: C.rojo }]}>
          {e === 'pagado' || e === 'anulado' ? ESTADO_INFO[e].nombre : textoVencimiento(venc)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={s.filaMonto}>{bs(e === 'pagado' || e === 'anulado' ? cobro.monto : sal)}</Text>
        {derecha ?? <EstadoBadge estado={e} />}
      </View>
    </Pressable>
  );
}

export function Titulo({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <View style={s.tituloFila}>
      <Text style={s.titulo}>{children}</Text>
      {accion}
    </View>
  );
}

export function Vacio({ texto, accion }: { texto: string; accion?: React.ReactNode }) {
  return (
    <View style={s.vacio}>
      <Text style={s.vacioTexto}>{texto}</Text>
      {accion}
    </View>
  );
}

export function Aviso({ texto, tipo = 'info' }: { texto: string; tipo?: 'info' | 'alerta' | 'error' }) {
  const col = tipo === 'error' ? [C.rojoClaro, C.rojo] : tipo === 'alerta' ? [C.ambarClaro, C.ambar] : [C.primarioClaro, C.primarioOscuro];
  return (
    <View style={[s.aviso, { backgroundColor: col[0] }]}>
      <Text style={{ color: col[1], fontSize: 13, lineHeight: 18 }}>{texto}</Text>
    </View>
  );
}

export function Imagen({ uri, alto = 220, estilo }: { uri?: string; alto?: number; estilo?: ViewStyle }) {
  if (!uri) return null;
  return <Image source={{ uri }} style={[{ width: '100%', height: alto, borderRadius: 10, backgroundColor: '#eee' }, estilo as object]} resizeMode="contain" />;
}

export function Dato({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <View style={s.dato}>
      <Text style={s.datoEtiqueta}>{etiqueta}</Text>
      <Text style={[s.datoValor, color ? { color } : null]}>{valor}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  pantallaScroll: { flex: 1, backgroundColor: C.fondo },
  pantalla: { padding: 16, backgroundColor: C.fondo, flexGrow: 1 },
  tarjeta: {
    backgroundColor: C.tarjeta, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.borde,
  },
  boton: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  botonCompacto: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginVertical: 0 },
  botonTexto: { fontSize: 16, fontWeight: '700' },
  etiqueta: { fontSize: 13, fontWeight: '600', color: C.texto, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: C.borde, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: C.texto,
  },
  ayuda: { fontSize: 12, color: C.suave, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.borde, backgroundColor: '#fff' },
  chipActivo: { backgroundColor: C.primario, borderColor: C.primario },
  chipTexto: { fontSize: 14, color: C.texto, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTexto: { fontSize: 12, fontWeight: '700' },
  fila: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: C.borde, gap: 10,
  },
  barraEstado: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  filaTitulo: { fontSize: 15, fontWeight: '700', color: C.texto },
  filaSub: { fontSize: 13, color: C.suave, marginTop: 1 },
  filaMonto: { fontSize: 16, fontWeight: '800', color: C.texto },
  tituloFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  titulo: { fontSize: 17, fontWeight: '800', color: C.texto },
  vacio: { padding: 24, alignItems: 'center', gap: 12 },
  vacioTexto: { color: C.suave, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  aviso: { borderRadius: 10, padding: 12, marginBottom: 12 },
  dato: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  datoEtiqueta: { color: C.suave, fontSize: 14 },
  datoValor: { color: C.texto, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  fila2: { flexDirection: 'row', gap: 10 },
  grande: { fontSize: 30, fontWeight: '800', color: C.texto },
  suave: { color: C.suave, fontSize: 13 },
});
