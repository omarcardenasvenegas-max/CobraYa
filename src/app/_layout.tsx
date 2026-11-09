import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '@/lib/store';
import { configurarNotificaciones, programarAvisos } from '@/lib/notificaciones';
import { C } from '@/ui/componentes';

configurarNotificaciones();

function Navegacion() {
  const { cargado, datos } = useStore();

  // Reprograma el aviso diario de las 8:00 cuando cambian los cobros o la configuración.
  useEffect(() => {
    if (!cargado) return;
    const t = setTimeout(() => programarAvisos(datos), 1500);
    return () => clearTimeout(t);
  }, [cargado, datos.cobros, datos.pagos, datos.config, datos.cuotas]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cargado) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.fondo }}>
        <ActivityIndicator color={C.primario} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: C.primario,
        headerTitleStyle: { color: C.texto, fontWeight: '700' },
        contentStyle: { backgroundColor: C.fondo },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
      <Stack.Screen name="nuevo-cobro" options={{ title: 'Nuevo cobro', presentation: 'modal' }} />
      <Stack.Screen name="cobro/[id]/index" options={{ title: 'Detalle del cobro' }} />
      <Stack.Screen name="cobro/[id]/compartir" options={{ title: 'Compartir cobro' }} />
      <Stack.Screen name="cobro/[id]/pago" options={{ title: 'Registrar pago' }} />
      <Stack.Screen name="cobro/[id]/editar" options={{ title: 'Editar cobro' }} />
      <Stack.Screen name="cliente/[id]" options={{ title: 'Cliente' }} />
      <Stack.Screen name="cliente/nuevo" options={{ title: 'Cliente', presentation: 'modal' }} />
      <Stack.Screen name="recordatorios" options={{ title: 'Recordatorios' }} />
      <Stack.Screen name="negocio" options={{ title: 'Mi negocio y QR' }} />
      <Stack.Screen name="reportes" options={{ title: 'Reportes' }} />
      <Stack.Screen name="plan" options={{ title: 'Plan y suscripción' }} />
      <Stack.Screen name="p/[codigo]" options={{ title: 'Página de pago' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Navegacion />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
