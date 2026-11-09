// Pantalla 9. Recordatorios (Flujo E).
import { useEffect, useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import type { TipoRecordatorio, Tono } from '@/lib/types';
import { useStore } from '@/lib/store';
import { PLANTILLAS, rellenar } from '@/lib/mensajes';
import { planEfectivo } from '@/lib/planes';
import { hoy, sumarDias } from '@/lib/formato';
import { pedirPermiso, programarAvisos } from '@/lib/notificaciones';
import { Aviso, Boton, C, Campo, Chips, Pantalla, Tarjeta, Titulo, s } from '@/ui/componentes';
import { avisar } from '@/ui/dialogos';
import * as Notifications from 'expo-notifications';

const TIPOS: { tipo: TipoRecordatorio; nombre: string }[] = [
  { tipo: 'antes', nombre: 'Antes del vencimiento' },
  { tipo: 'dia', nombre: 'El día del vencimiento' },
  { tipo: 'vencido', nombre: 'Después del vencimiento' },
];

export default function Recordatorios() {
  const st = useStore();
  const cfg = st.datos.config;
  const plan = planEfectivo(st.datos.negocio);
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [editando, setEditando] = useState<TipoRecordatorio>();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.getPermissionsAsync().then((p) => setPermiso(p.granted)).catch(() => setPermiso(false));
  }, []);

  const ejemplo = (t: TipoRecordatorio) => rellenar(cfg.plantillas[t], {
    cliente: 'María Quispe', negocio: st.datos.negocio?.nombre ?? 'Mi negocio', concepto: 'Blusa bordada', monto: 18000, saldo: 18000,
    vencimiento: t === 'antes' ? sumarDias(hoy(), cfg.diasAntes || 2) : t === 'dia' ? hoy() : sumarDias(hoy(), -3), enlace: 'cobroya.bo/p/AB12CD',
  });

  function cambiarTono(t: Tono) {
    st.guardarConfig({ tono: t, plantillas: { ...PLANTILLAS[t] } });
  }

  return (
    <Pantalla>
      {!plan.recordatoriosProgramados && (
        <Aviso tipo="alerta" texto="En el plan Gratis los recordatorios son manuales: usas el botón Recordar. Desde el plan Básico recibes el aviso diario con los cobros para recordar." />
      )}

      <Tarjeta>
        <Text style={s.titulo}>Aviso diario</Text>
        <Text style={[s.suave, { marginVertical: 6 }]}>
          Cada mañana CobroYa te avisa cuántos cobros toca recordar. Tú los envías desde Para hoy con un toque.
        </Text>
        <Chips
          etiqueta="Hora del aviso"
          opciones={[7, 8, 9, 10].map((h) => ({ valor: String(h), texto: `${h}:00` }))}
          valor={String(cfg.horaAviso)}
          onChange={(v) => st.guardarConfig({ horaAviso: Number(v) })}
        />
        {Platform.OS !== 'web' && permiso === false && (
          <Boton
            tipo="secundario"
            titulo="Activar notificaciones"
            onPress={async () => {
              const ok = await pedirPermiso();
              setPermiso(ok);
              if (ok) programarAvisos(st.datos);
              else avisar('Notificaciones desactivadas', 'Actívalas desde los ajustes del teléfono para recibir el aviso diario.');
            }}
          />
        )}
        {permiso && <Text style={{ color: C.verde, fontWeight: '600' }}>✓ Notificaciones activadas</Text>}
      </Tarjeta>

      <Tarjeta>
        <Text style={s.titulo}>Cuándo recordar</Text>
        <Chips
          etiqueta="Antes del vencimiento"
          opciones={[{ valor: '0', texto: 'No' }, { valor: '1', texto: '1 día antes' }, { valor: '2', texto: '2 días antes' }, { valor: '3', texto: '3 días antes' }, { valor: '5', texto: '5 días antes' }]}
          valor={String(cfg.diasAntes)}
          onChange={(v) => st.guardarConfig({ diasAntes: Number(v) })}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={s.etiqueta}>El día del vencimiento</Text>
          <Switch value={cfg.elDia} onValueChange={(v) => st.guardarConfig({ elDia: v })} trackColor={{ true: C.primario }} />
        </View>
        <Chips
          etiqueta="Después de vencido"
          opciones={[{ valor: '0', texto: 'No' }, { valor: '1', texto: 'Cada día' }, { valor: '3', texto: 'Cada 3 días' }, { valor: '7', texto: 'Cada semana' }]}
          valor={String(cfg.cadaDiasDespues)}
          onChange={(v) => st.guardarConfig({ cadaDiasDespues: Number(v) })}
        />
      </Tarjeta>

      <Titulo>Mensajes</Titulo>
      <Chips<Tono>
        etiqueta="Tono"
        opciones={[{ valor: 'amable', texto: 'Amable' }, { valor: 'neutro', texto: 'Neutro' }, { valor: 'firme', texto: 'Firme' }]}
        valor={cfg.tono}
        onChange={cambiarTono}
      />
      <Text style={[s.suave, { marginBottom: 10 }]}>
        Variables: {'{cliente} {negocio} {concepto} {monto} {saldo} {vencimiento} {enlace}'}
      </Text>
      {TIPOS.map(({ tipo, nombre }) => (
        <Tarjeta key={tipo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.etiqueta}>{nombre}</Text>
            <Boton
              compacto
              tipo="texto"
              titulo={editando === tipo ? 'Listo' : 'Editar'}
              onPress={() => {
                if (!plan.plantillasPropias) return avisar('Plantillas propias', 'Editar los mensajes está disponible en el plan Pro. Puedes elegir el tono en cualquier plan.');
                setEditando(editando === tipo ? undefined : tipo);
              }}
            />
          </View>
          {editando === tipo ? (
            <Campo
              etiqueta="Plantilla"
              multiline
              value={cfg.plantillas[tipo]}
              onChangeText={(t) => st.guardarConfig({ plantillas: { ...cfg.plantillas, [tipo]: t } })}
            />
          ) : (
            <View style={{ backgroundColor: '#E7FFDB', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 13, lineHeight: 19, color: C.texto }}>{ejemplo(tipo)}</Text>
            </View>
          )}
        </Tarjeta>
      ))}
      <Aviso texto="Los mensajes salen desde tu WhatsApp. Mantén un tono respetuoso: nunca publiques deudas ni escribas a terceros." />
    </Pantalla>
  );
}
