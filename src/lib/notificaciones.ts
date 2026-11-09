// Aviso diario al comerciante ("Tienes 4 cobros para recordar hoy (Bs 1.250)").
// Se programan avisos locales para los próximos 14 días con lo que toca recordar cada día,
// y se reprograman cada vez que cambian los datos. No necesita servidor.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Datos } from './types';
import { bs, hoy, parseFecha, sumarDias } from './formato';
import { proyeccionRecordatorios } from './logica';
import { planEfectivo } from './planes';

const DIAS = 14;

export function configurarNotificaciones() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('recordatorios', {
      name: 'Recordatorios de cobro',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

export async function pedirPermiso(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

export async function programarAvisos(d: Datos): Promise<void> {
  if (Platform.OS === 'web' || !d.negocio) return;
  try {
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    // El plan Gratis tiene recordatorios manuales: sin aviso programado.
    if (!planEfectivo(d.negocio).recordatoriosProgramados) return;
    const ahora = new Date();
    for (let i = 0; i < DIAS; i++) {
      const fecha = sumarDias(hoy(), i);
      const cuando = parseFecha(fecha);
      cuando.setHours(d.config.horaAviso, 0, 0, 0);
      if (cuando <= ahora) continue;
      const { cantidad, total } = proyeccionRecordatorios(d, fecha);
      if (!cantidad) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'CobroYa · Para hoy',
          body: `Tienes ${cantidad} ${cantidad === 1 ? 'cobro' : 'cobros'} para recordar hoy (${bs(total)})`,
          data: { ruta: '/' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: 'recordatorios' },
      });
    }
  } catch {
    // Las notificaciones son una ayuda; si fallan, la pantalla "Para hoy" sigue funcionando.
  }
}
