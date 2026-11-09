import { Redirect, router, Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { C } from '@/ui/componentes';

const icono = (e: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{e}</Text>
);

export default function TabsLayout() {
  const { datos } = useStore();
  if (!datos.sesion || !datos.negocio) return <Redirect href="/bienvenida" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primario,
        tabBarInactiveTintColor: C.suave,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: C.texto },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 8 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', headerTitle: datos.negocio.nombre, tabBarIcon: icono('🏠') }} />
      <Tabs.Screen name="cobros" options={{ title: 'Cobros', tabBarIcon: icono('📋') }} />
      <Tabs.Screen
        name="nuevo"
        options={{
          title: 'Nuevo cobro',
          tabBarButton: () => (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nuevo cobro"
                onPress={() => router.push('/nuevo-cobro')}
                style={({ pressed }) => ({
                  marginTop: -22, width: 62, height: 62, borderRadius: 31, backgroundColor: pressed ? C.primarioOscuro : C.primario,
                  alignItems: 'center', justifyContent: 'center', elevation: 4,
                  shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
                })}
              >
                <Text style={{ color: '#fff', fontSize: 32, lineHeight: 34, fontWeight: '400' }}>+</Text>
              </Pressable>
              <Text style={{ fontSize: 11, color: C.primario, fontWeight: '700', marginTop: 2 }}>Nuevo cobro</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: icono('👥') }} />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: icono('☰') }} />
    </Tabs>
  );
}
