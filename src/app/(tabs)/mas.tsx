// Pantalla 10. Más.
import { router } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { diasPruebaRestantes, enPrueba, planEfectivo } from '@/lib/planes';
import { C, Pantalla, Tarjeta, s } from '@/ui/componentes';
import { confirmar } from '@/ui/dialogos';

const SOPORTE_WHATSAPP = '59170000000'; // TODO: número de soporte de CobroYa

function Opcion({ icono, titulo, sub, onPress, color }: { icono: string; titulo: string; sub?: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }, pressed && { opacity: 0.6 }]}>
      <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{icono}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: color ?? C.texto }}>{titulo}</Text>
        {sub ? <Text style={s.suave}>{sub}</Text> : null}
      </View>
      <Text style={{ color: C.suave, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

export default function Mas() {
  const st = useStore();
  const n = st.datos.negocio!;
  const plan = planEfectivo(n);
  const textoPlan = enPrueba(n) ? `Prueba Pro · ${diasPruebaRestantes(n)} días` : plan.nombre;

  return (
    <Pantalla>
      <Tarjeta estilo={{ paddingVertical: 4 }}>
        <Opcion icono="🏪" titulo="Mi negocio y QR" sub={`${n.nombre} · ${st.datos.qrs.length} QR`} onPress={() => router.push('/negocio')} />
        <Opcion icono="🔔" titulo="Recordatorios" sub="Cuándo recordar y mensajes" onPress={() => router.push('/recordatorios')} />
        <Opcion icono="📊" titulo="Reportes" sub="Panel, deudores y exportar" onPress={() => router.push('/reportes')} />
        <Opcion icono="⭐" titulo="Plan y suscripción" sub={textoPlan} onPress={() => router.push('/plan')} />
        <Opcion icono="💬" titulo="Ayuda por WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent('Hola, necesito ayuda con CobroYa')}`)} />
      </Tarjeta>
      <Tarjeta estilo={{ paddingVertical: 4 }}>
        <Opcion
          icono="🧪"
          titulo="Cargar datos de ejemplo"
          sub="Para probar la app con clientes y cobros ficticios"
          onPress={() => confirmar('Cargar ejemplo', 'Se agregan 4 clientes y 5 cobros de prueba.', 'Cargar', () => st.cargarEjemplo())}
        />
        <Opcion icono="🚪" titulo="Cerrar sesión" onPress={() => confirmar('Cerrar sesión', 'Tus datos quedan guardados en este teléfono.', 'Cerrar sesión', () => { st.cerrarSesion(); router.replace('/bienvenida'); })} />
        <Opcion
          icono="🗑️"
          color={C.rojo}
          titulo="Borrar todos los datos"
          onPress={() => confirmar('¿Borrar todo?', 'Se eliminan el negocio, clientes, cobros y pagos de este teléfono. No se puede deshacer.', 'Borrar todo', () => { st.borrarTodo(); router.replace('/bienvenida'); }, true)}
        />
      </Tarjeta>
      <Text style={[s.suave, { textAlign: 'center', marginTop: 8 }]}>CobroYa no recibe ni mueve tu dinero: tus clientes te pagan directo a tu cuenta.</Text>
      <Text style={[s.suave, { textAlign: 'center', marginTop: 4 }]}>Versión 1.0.0 (MVP)</Text>
    </Pantalla>
  );
}
