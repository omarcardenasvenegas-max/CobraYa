import { Alert, Platform } from 'react-native';

export function avisar(titulo: string, mensaje?: string) {
  if (Platform.OS === 'web') {
    window.alert(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
    return;
  }
  Alert.alert(titulo, mensaje);
}

export function confirmar(titulo: string, mensaje: string, textoSi: string, onSi: () => void, peligro = false) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) onSi();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoSi, style: peligro ? 'destructive' : 'default', onPress: onSi },
  ]);
}
