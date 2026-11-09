// Pantalla 3. Nuevo cobro (Flujo A, y Flujo F con cuotas y abonos).
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import type { Canal, MedioPago } from '@/lib/types';
import { useStore } from '@/lib/store';
import { aCentavos, bs, esFechaValida, fechaLarga, hoy, sumarDias } from '@/lib/formato';
import { Frecuencia } from '@/lib/logica';
import { planEfectivo } from '@/lib/planes';
import { Aviso, Boton, C, Campo, Chips, Pantalla, Tarjeta, s } from '@/ui/componentes';
import { avisar } from '@/ui/dialogos';

const CANALES: { valor: Canal; texto: string }[] = [
  { valor: 'whatsapp', texto: 'WhatsApp' },
  { valor: 'marketplace', texto: 'Marketplace' },
  { valor: 'tienda', texto: 'Tienda' },
  { valor: 'otro', texto: 'Otro' },
];

type OpVenc = '0' | '7' | '15' | '30' | 'fecha';

export default function NuevoCobro() {
  const st = useStore();
  const { datos } = st;
  const params = useLocalSearchParams<{ clienteId?: string }>();
  const plan = planEfectivo(datos.negocio);

  const [clienteId, setClienteId] = useState<string | undefined>(params.clienteId);
  const [busqueda, setBusqueda] = useState('');
  const [nuevoCel, setNuevoCel] = useState('');
  const [creando, setCreando] = useState(false);
  const [montoTxt, setMontoTxt] = useState('');
  const [concepto, setConcepto] = useState('');
  const [canal, setCanal] = useState<Canal>('whatsapp');
  const [opVenc, setOpVenc] = useState<OpVenc>('7');
  const [fechaTxt, setFechaTxt] = useState(sumarDias(hoy(), 7));
  const [enCuotas, setEnCuotas] = useState(false);
  const [nCuotas, setNCuotas] = useState('3');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('semanal');
  const [anticipoTxt, setAnticipoTxt] = useState('');
  const [medioAnticipo, setMedioAnticipo] = useState<MedioPago>('efectivo');
  const [intentado, setIntentado] = useState(false);

  const cliente = datos.clientes.find((c) => c.id === clienteId);
  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return datos.clientes.slice(0, 5);
    return datos.clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.celular.includes(q)).slice(0, 6);
  }, [busqueda, datos.clientes]);

  const monto = aCentavos(montoTxt);
  const anticipo = anticipoTxt.trim() ? aCentavos(anticipoTxt) : 0;
  const vencimiento = opVenc === 'fecha' ? fechaTxt : sumarDias(hoy(), Number(opVenc));
  const n = Math.max(2, Math.min(24, parseInt(nCuotas, 10) || 0));

  const errores = {
    cliente: !cliente ? 'Elige o crea un cliente' : '',
    monto: !(monto > 0) ? 'Escribe un monto válido, por ejemplo 150 o 150,50' : '',
    concepto: !concepto.trim() ? 'Escribe qué vendiste o qué servicio diste' : '',
    fecha: opVenc === 'fecha' && (!esFechaValida(fechaTxt) || fechaTxt < hoy()) ? 'Usa el formato AAAA-MM-DD, desde hoy en adelante' : '',
    anticipo: Number.isNaN(anticipo) || (monto > 0 && anticipo >= monto) ? 'El anticipo debe ser menor al monto' : '',
  };
  const valido = Object.values(errores).every((e) => !e);

  function crearClienteRapido() {
    const r = st.crearCliente({ nombre: busqueda, celular: nuevoCel.replace(/\D/g, '') });
    if (!r.ok) return avisar('No se pudo crear', r.error);
    setClienteId(r.valor.id);
    setCreando(false);
    setBusqueda('');
    setNuevoCel('');
  }

  function crear() {
    setIntentado(true);
    if (!valido || !cliente) return;
    const r = st.crearCobro({
      clienteId: cliente.id, concepto, monto, canal, vencimiento,
      cuotas: enCuotas ? { n, frecuencia } : undefined,
      anticipo: enCuotas && anticipo > 0 ? { monto: anticipo, medio: medioAnticipo } : undefined,
    });
    if (!r.ok) {
      avisar('No se pudo crear el cobro', r.error);
      return;
    }
    router.replace({ pathname: '/cobro/[id]/compartir', params: { id: r.valor.id, nuevo: '1' } });
  }

  const err = (k: keyof typeof errores) => (intentado ? errores[k] : '') || undefined;

  return (
    <Pantalla>
      <Tarjeta>
        <Text style={s.etiqueta}>Cliente</Text>
        {cliente ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.texto }}>{cliente.nombre}</Text>
              <Text style={s.suave}>{cliente.celular || 'Sin celular'}</Text>
            </View>
            <Boton compacto tipo="texto" titulo="Cambiar" onPress={() => setClienteId(undefined)} />
          </View>
        ) : (
          <>
            <Campo etiqueta="Buscar o crear" placeholder="Nombre o celular" value={busqueda} onChangeText={(t) => { setBusqueda(t); setCreando(false); }} error={err('cliente')} />
            {coincidencias.map((c) => (
              <Pressable key={c.id} onPress={() => setClienteId(c.id)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ fontWeight: '600', color: C.texto }}>{c.nombre}</Text>
                <Text style={s.suave}>{c.celular}</Text>
              </Pressable>
            ))}
            {busqueda.trim().length >= 2 && !creando && (
              <Boton tipo="secundario" titulo={`+ Crear "${busqueda.trim()}"`} onPress={() => setCreando(true)} />
            )}
            {creando && (
              <View style={{ marginTop: 8 }}>
                <Campo etiqueta="Celular del cliente" placeholder="71234567" keyboardType="phone-pad" value={nuevoCel} onChangeText={setNuevoCel} ayuda="Para enviarle el cobro por WhatsApp" />
                <Boton titulo="Guardar cliente" onPress={crearClienteRapido} />
              </View>
            )}
          </>
        )}
      </Tarjeta>

      <Tarjeta>
        <Campo etiqueta="Monto (Bs)" placeholder="0" keyboardType="decimal-pad" value={montoTxt} onChangeText={setMontoTxt} error={err('monto')} style={{ fontSize: 24, fontWeight: '800' }} />
        <Campo etiqueta="Concepto" placeholder="Ej. Blusa bordada talla M" value={concepto} onChangeText={setConcepto} error={err('concepto')} />
        <Chips etiqueta="Canal de venta" opciones={CANALES} valor={canal} onChange={setCanal} />
        <Chips<OpVenc>
          etiqueta={enCuotas ? 'Vencimiento de la primera cuota' : 'Vencimiento'}
          opciones={[
            { valor: '0', texto: 'Hoy' }, { valor: '7', texto: '7 días' }, { valor: '15', texto: '15 días' },
            { valor: '30', texto: '30 días' }, { valor: 'fecha', texto: 'Elegir fecha' },
          ]}
          valor={opVenc}
          onChange={setOpVenc}
        />
        {opVenc === 'fecha' ? (
          <Campo etiqueta="Fecha (AAAA-MM-DD)" value={fechaTxt} onChangeText={setFechaTxt} placeholder="2026-12-15" error={err('fecha')} />
        ) : (
          <Text style={[s.suave, { marginTop: -6, marginBottom: 8 }]}>Vence el {fechaLarga(vencimiento)}</Text>
        )}
      </Tarjeta>

      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: C.texto, fontSize: 15 }}>Pagar en cuotas</Text>
            <Text style={s.suave}>Divide el saldo y registra un anticipo</Text>
          </View>
          <Switch
            value={enCuotas}
            onValueChange={(v) => {
              if (v && !plan.cuotas) return avisar('Función del plan Básico', 'Las cuotas y abonos están disponibles desde el plan Básico (Bs 20/mes).');
              setEnCuotas(v);
            }}
            trackColor={{ true: C.primario }}
          />
        </View>
        {enCuotas && (
          <View style={{ marginTop: 14 }}>
            <Chips etiqueta="Número de cuotas" opciones={['2', '3', '4', '6', '12'].map((x) => ({ valor: x, texto: x }))} valor={nCuotas} onChange={setNCuotas} />
            <Chips<Frecuencia>
              etiqueta="Frecuencia"
              opciones={[{ valor: 'semanal', texto: 'Semanal' }, { valor: 'quincenal', texto: 'Quincenal' }, { valor: 'mensual', texto: 'Mensual' }]}
              valor={frecuencia}
              onChange={setFrecuencia}
            />
            <Campo etiqueta="Anticipo recibido hoy (opcional)" placeholder="0" keyboardType="decimal-pad" value={anticipoTxt} onChangeText={setAnticipoTxt} error={err('anticipo')} />
            {anticipo > 0 && (
              <Chips<MedioPago>
                etiqueta="Medio del anticipo"
                opciones={[{ valor: 'efectivo', texto: 'Efectivo' }, { valor: 'qr', texto: 'QR' }, { valor: 'transferencia', texto: 'Transferencia' }]}
                valor={medioAnticipo}
                onChange={setMedioAnticipo}
              />
            )}
            {monto > 0 && (
              <Aviso texto={`${n} cuotas de ${bs(Math.floor((monto - (anticipo || 0)) / n))} aprox. Cada cuota tiene su propio recordatorio.`} />
            )}
          </View>
        )}
      </Tarjeta>

      <Boton titulo="Crear y enviar" onPress={crear} deshabilitado={intentado && !valido} />
    </Pantalla>
  );
}
