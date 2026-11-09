// Crear o editar un cliente, con importación desde los contactos del teléfono.
import { Contact } from 'expo-contacts';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import { useStore } from '@/lib/store';
import { Boton, Campo, Pantalla, Tarjeta } from '@/ui/componentes';
import { avisar, confirmar } from '@/ui/dialogos';

export default function ClienteForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const st = useStore();
  const existente = id ? st.datos.clientes.find((c) => c.id === id) : undefined;
  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [celular, setCelular] = useState(existente?.celular ?? '');
  const [notas, setNotas] = useState(existente?.notas ?? '');

  async function desdeContactos() {
    try {
      const c = await Contact.presentPicker();
      if (!c) return;
      const nombreC = await c.getFullName();
      const tels = await c.getPhones();
      setNombre(nombreC || nombre);
      const num = (tels[0]?.number ?? '').replace(/\D/g, '').replace(/^591/, '');
      if (num) setCelular(num);
    } catch {
      avisar('No se pudo abrir tus contactos', 'Escribe el nombre y el celular a mano.');
    }
  }

  function guardar() {
    if (nombre.trim().length < 2) return avisar('Falta el nombre', 'Escribe el nombre del cliente.');
    const cel = celular.replace(/\D/g, '');
    if (existente) {
      st.actualizarCliente(existente.id, { nombre: nombre.trim(), celular: cel, notas });
      router.back();
      return;
    }
    const r = st.crearCliente({ nombre, celular: cel, notas });
    if (!r.ok) return avisar('No se pudo crear', r.error);
    router.back();
  }

  return (
    <Pantalla>
      {Platform.OS !== 'web' && !existente && (
        <Boton tipo="secundario" titulo="Elegir de mis contactos" onPress={desdeContactos} />
      )}
      <Tarjeta estilo={{ marginTop: 8 }}>
        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej. María Quispe" />
        <Campo etiqueta="Celular" value={celular} onChangeText={setCelular} keyboardType="phone-pad" placeholder="71234567" ayuda="Se usa para enviar cobros y recordatorios por WhatsApp" />
        <Campo etiqueta="Notas" value={notas} onChangeText={setNotas} multiline placeholder="Dirección, referencia, preferencias…" />
      </Tarjeta>
      <Boton titulo="Guardar" onPress={guardar} />
      {existente && (
        <Boton
          tipo="texto"
          titulo="Eliminar cliente"
          onPress={() => confirmar('¿Eliminar cliente?', 'Solo se puede si no tiene cobros.', 'Eliminar', () => {
            const r = st.eliminarCliente(existente.id);
            if (!r.ok) avisar('No se pudo eliminar', r.error);
            else router.dismissAll();
          }, true)}
        />
      )}
    </Pantalla>
  );
}
