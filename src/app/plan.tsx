// Plan y pago de la suscripción (también por QR, conciliado igual que cualquier cobro).
import { useState } from 'react';
import { Text, View } from 'react-native';
import type { PlanId } from '@/lib/types';
import { useStore } from '@/lib/store';
import { diasPruebaRestantes, enPrueba, limiteTexto, PLANES } from '@/lib/planes';
import { elegirImagen } from '@/lib/dispositivo';
import { fechaLarga } from '@/lib/formato';
import { Aviso, Boton, C, Chips, Imagen, Pantalla, Tarjeta, s } from '@/ui/componentes';

const si = (b: boolean) => (b ? 'Sí' : 'No');

export default function Plan() {
  const st = useStore();
  const n = st.datos.negocio!;
  const [elegido, setElegido] = useState<PlanId>();
  const [periodo, setPeriodo] = useState<'mensual' | 'anual'>('mensual');
  const [comprobante, setComprobante] = useState<string>();
  const sol = n.solicitudPlan;

  return (
    <Pantalla>
      <Tarjeta>
        <Text style={s.suave}>Tu plan</Text>
        <Text style={s.grande}>{PLANES[n.plan].nombre}</Text>
        {enPrueba(n) && <Text style={{ color: C.primario, fontWeight: '700' }}>Prueba Pro activa: {diasPruebaRestantes(n)} días restantes</Text>}
      </Tarjeta>
      {sol && (
        <Aviso texto={`Pago del plan ${PLANES[sol.plan].nombre} (${sol.periodo}) enviado el ${fechaLarga(sol.fecha)}. Lo activamos cuando confirmemos el pago en nuestra cuenta.`} />
      )}

      {(['gratis', 'basico', 'pro'] as PlanId[]).map((id) => {
        const p = PLANES[id];
        const actual = n.plan === id;
        return (
          <Tarjeta key={id} estilo={elegido === id ? { borderColor: C.primario, borderWidth: 2 } : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.texto }}>{p.nombre}</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.primario }}>Bs {p.precioMensual}<Text style={s.suave}>/mes</Text></Text>
            </View>
            <Text style={s.suave}>Cobros activos: {limiteTexto(p.cobrosActivos)} · Clientes: {limiteTexto(p.clientes)} · QR: {p.qrs}</Text>
            <Text style={s.suave}>Recordatorios: {p.plantillasPropias ? 'programados, plantillas propias' : p.recordatoriosProgramados ? 'programados con plantillas' : 'manuales'}</Text>
            <Text style={s.suave}>Cuotas y abonos: {si(p.cuotas)} · Comprobante: {p.logoEnComprobante ? 'con tu logo' : 'marca CobroYa'}</Text>
            <Text style={s.suave}>Exportar Excel/PDF: {si(p.exportar)} · Usuarios: {p.usuarios}</Text>
            {id !== 'gratis' && !actual && (
              <Boton compacto tipo={elegido === id ? 'primario' : 'secundario'} estilo={{ marginTop: 10 }} titulo={`Elegir ${p.nombre}`} onPress={() => setElegido(id)} />
            )}
            {actual && <Text style={{ color: C.verde, fontWeight: '700', marginTop: 8 }}>Plan actual</Text>}
          </Tarjeta>
        );
      })}

      {elegido && (
        <Tarjeta>
          <Text style={s.titulo}>Pagar plan {PLANES[elegido].nombre}</Text>
          <Chips<'mensual' | 'anual'>
            opciones={[
              { valor: 'mensual', texto: `Mensual · Bs ${PLANES[elegido].precioMensual}` },
              { valor: 'anual', texto: `Anual · Bs ${PLANES[elegido].precioAnual} (2 meses gratis)` },
            ]}
            valor={periodo}
            onChange={setPeriodo}
          />
          <Text style={[s.suave, { marginBottom: 8 }]}>
            1. Escanea el QR de CobroYa desde la app de tu banco y paga Bs {periodo === 'anual' ? PLANES[elegido].precioAnual : PLANES[elegido].precioMensual}.{'\n'}
            2. Sube la captura del comprobante.{'\n'}
            3. Activamos tu plan cuando confirmemos el pago.
          </Text>
          <Aviso tipo="alerta" texto="El QR de cobro de CobroYa se mostrará aquí cuando esté habilitada la cuenta bancaria de la empresa." />
          <Imagen uri={comprobante} alto={180} />
          <Boton tipo="secundario" titulo={comprobante ? 'Cambiar comprobante' : 'Subir comprobante'} onPress={async () => setComprobante(await elegirImagen() ?? comprobante)} />
          <Boton titulo="Enviar comprobante" deshabilitado={!comprobante} onPress={() => { st.solicitarPlan(elegido, periodo, comprobante); setElegido(undefined); setComprobante(undefined); }} />
        </Tarjeta>
      )}
    </Pantalla>
  );
}
