// Funciones que usan el teléfono: imágenes, WhatsApp, portapapeles, compartir y PDF.
import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Linking, Platform } from 'react-native';
import { celularWhatsApp, uid } from './formato';

/** Guarda una copia de la imagen dentro de la app para que no se pierda si se borra de la galería. */
async function guardarCopia(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'imagenes');
    dir.create({ idempotent: true });
    const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const destino = new File(dir, `${uid()}.${ext}`);
    await new File(uri).copy(destino);
    return destino.uri;
  } catch {
    return uri;
  }
}

export async function elegirImagen(origen: 'galeria' | 'camara' = 'galeria'): Promise<string | undefined> {
  const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
  if (origen === 'camara') {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Activa el permiso de cámara para fotografiar el comprobante.');
      return undefined;
    }
  }
  const r = origen === 'camara'
    ? await ImagePicker.launchCameraAsync(opciones)
    : await ImagePicker.launchImageLibraryAsync(opciones);
  if (r.canceled || !r.assets?.length) return undefined;
  return guardarCopia(r.assets[0].uri);
}

/** Abre WhatsApp con el chat del cliente y el mensaje ya escrito (enlace wa.me, sin costo). */
export async function abrirWhatsApp(celular: string, texto: string): Promise<boolean> {
  const num = celularWhatsApp(celular);
  const url = `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('No se pudo abrir WhatsApp', 'Copia el mensaje y pégalo en el chat del cliente.');
    return false;
  }
}

export async function copiarTexto(texto: string): Promise<void> {
  await Clipboard.setStringAsync(texto);
}

export async function compartirArchivo(uri: string, titulo: string, mimeType?: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(uri, '_blank');
    return;
  }
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('No disponible', 'Este teléfono no permite compartir archivos.');
    return;
  }
  await Sharing.shareAsync(uri, { dialogTitle: titulo, mimeType });
}

/** Genera un PDF desde HTML y abre el menú para compartirlo. */
export async function compartirPdf(html: string, titulo: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await compartirArchivo(uri, titulo, 'application/pdf');
}

/** Guarda un CSV (se abre en Excel) y lo comparte. */
export async function compartirCsv(nombre: string, contenido: string): Promise<void> {
  const bom = '﻿'; // para que Excel muestre bien los acentos
  if (Platform.OS === 'web') {
    const blob = new Blob([bom + contenido], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    a.click();
    return;
  }
  const f = new File(Paths.cache, nombre);
  if (f.exists) f.delete();
  f.create();
  await f.write(bom + contenido);
  await compartirArchivo(f.uri, 'Exportar a Excel', 'text/csv');
}

export async function imagenABase64(uri: string): Promise<string | undefined> {
  try {
    if (uri.startsWith('data:')) return uri;
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      return await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(blob);
      });
    }
    const f = new File(uri);
    const b64 = await f.base64();
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return undefined;
  }
}
