// Editar un cobro. Cambiar el monto genera un enlace nuevo y desactiva el anterior.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import type { Canal } from '@/lib/types';
import { useStore } from '@/lib/store';
import { aCentavos, centavosATexto, esFechaValida } from '@/lib/formato';
import { cobrado, cuotasDe } from '@/lib/logica';
import { CANAL_NOMBRE } from '@/lib/documentos';
import { Aviso, Boton, Campo, Chips, Pantalla, Tarjeta, Vacio } from '@/ui/componentes';
import { avisar, confirmar } from '@/ui/dialogos';

export default function EditarCobro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const st = useStore();
  const c = st.datos.cobros.find((x) => x.id === id);
  const [concepto, setConcepto] = useState(c?.concepto ?? '');
  const [montoTxt, setMontoTxt] = useState(c ? centavosATexto(c.monto) : '');
  const [canal, setCanal] = useState<Canal>(c?.canal ?? 'whatsapp');
  const [venc, setVenc] = useState(c?.vencimiento ?? '');
  const [notas, setNotas] = useState(c?.notas ?? '');
  if (!c) return <Vacio texto="Cobro no encontrado." />;
  const tieneCuotas = cuotasDe(st.datos, c.id).length > 0;
  const monto = aCentavos(montoTxt);
  const cob = cobrado(st.datos, c.id);

  function guardar() {
    if (!c) return;
    if (!(monto > 0) || !concepto.trim() || (!tieneCuotas && !esFechaValida(venc))) {
      avisar('Revisa los datos', 'Monto, concepto y fecha (AAAA-MM-DD) son obligatorios.');
      return;
    }
    if (monto < cob) {
      avisar('Monto muy bajo', 'El monto no puede ser menor a lo ya cobrado.');
      return;
    }
    const aplicar = () => {
      st.editarCobro(c.id, { concepto, monto, canal, notas, ...(tieneCuotas ? {} : { vencimiento: venc }) });
      router.back();
    };
    if (monto !== c.monto) {
      confirmar('Cambiar el monto', 'Se generará un enlace de pago nuevo y el anterior dejará de funcionar. Reenvía el cobro al cliente.', 'Continuar', aplicar);
    } else aplicar();
  }

  return (
    <Pantalla>
      <Tarjeta>
        <Campo etiqueta="Concepto" value={concepto} onChangeText={setConcepto} />
        <Campo etiqueta="Monto (Bs)" keyboardType="decimal-pad" value={montoTxt} onChangeText={setMontoTxt} />
        {monto !== c.monto && monto > 0 && <Aviso tipo="alerta" texto="Al cambiar el monto se crea un enlace nuevo." />}
        <Chips etiqueta="Canal" opciones={(Object.keys(CANAL_NOMBRE) as Canal[]).map((k) => ({ valor: k, texto: CANAL_NOMBRE[k] }))} valor={canal} onChange={setCanal} />
        {tieneCuotas ? (
          <Aviso texto="Este cobro tiene cuotas: los vencimientos se manejan por cuota." />
        ) : (
          <Campo etiqueta="Vencimiento (AAAA-MM-DD)" value={venc} onChangeText={setVenc} />
        )}
        <Campo etiqueta="Notas" value={notas} onChangeText={setNotas} multiline />
      </Tarjeta>
      <Boton titulo="Guardar cambios" onPress={guardar} />
    </Pantalla>
  );
}
