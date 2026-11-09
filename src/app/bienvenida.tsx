// Pantalla 1. Bienvenida y registro.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { elegirImagen } from '@/lib/dispositivo';
import { bs, fechaLarga, sumarDias, hoy } from '@/lib/formato';
import { Aviso, Boton, C, Campo, Chips, Imagen, Pantalla, Tarjeta, s } from '@/ui/componentes';

const RUBROS = ['Venta por redes', 'Taller', 'Servicios profesionales', 'Distribuidora', 'Tienda', 'Otro'];
const BANCOS = ['BNB', 'BCP', 'Banco Unión', 'Banco Mercantil Santa Cruz', 'BancoSol', 'Banco Ganadero', 'Banco Económico', 'Banco FIE', 'Tigo Money', 'Otro'];

export default function Bienvenida() {
  const st = useStore();
  const { datos } = st;
  const pasoInicial = datos.sesion && !datos.negocio ? 2 : 0;
  const [paso, setPaso] = useState(pasoInicial);
  const [celular, setCelular] = useState('');
  const [codigo, setCodigo] = useState('');
  const codigoEnviado = useMemo(() => String(Math.floor(100000 + Math.random() * 900000)), []);
  const [nombre, setNombre] = useState('');
  const [rubro, setRubro] = useState<string>('');
  const [banco, setBanco] = useState('');
  const [tipoQr, setTipoQr] = useState<'fijo' | 'por_monto'>('fijo');
  const [qr, setQr] = useState<string>();
  const [logo, setLogo] = useState<string>();
  const [error, setError] = useState('');

  const celularValido = /^[67]\d{7}$/.test(celular.replace(/\D/g, ''));

  function verificarCodigo() {
    if (codigo !== codigoEnviado) {
      setError('El código no coincide. Revisa e intenta de nuevo.');
      return;
    }
    setError('');
    st.iniciarSesion(celular.replace(/\D/g, ''));
    if (datos.negocio) router.replace('/');
    else setPaso(2);
  }

  function terminar() {
    st.crearNegocio({ nombre: nombre.trim(), rubro: rubro || 'Otro', logo });
    if (qr) st.guardarQr({ banco: banco || 'Mi banco', imagen: qr, tipo: tipoQr });
    setPaso(5);
  }

  const encabezado = (
    <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 24 }}>
      <Text style={{ fontSize: 34, fontWeight: '900', color: C.primario }}>CobroYa</Text>
      <Text style={[s.suave, { fontSize: 15, marginTop: 4, textAlign: 'center' }]}>Cobra con QR y deja que CobroYa recuerde por ti.</Text>
    </View>
  );

  return (
    <Pantalla>
      {encabezado}

      {paso === 0 && (
        <Tarjeta>
          <Text style={s.titulo}>Ingresa con tu celular</Text>
          <Text style={[s.suave, { marginBottom: 14, marginTop: 4 }]}>Te enviaremos un código de 6 dígitos.</Text>
          <Campo etiqueta="Número de celular" placeholder="71234567" keyboardType="phone-pad" value={celular} onChangeText={setCelular} maxLength={11} />
          <Boton titulo="Enviar código" deshabilitado={!celularValido} onPress={() => { setPaso(1); setError(''); }} />
        </Tarjeta>
      )}

      {paso === 1 && (
        <Tarjeta>
          <Text style={s.titulo}>Escribe el código</Text>
          <Text style={[s.suave, { marginBottom: 14, marginTop: 4 }]}>Enviado al +591 {celular}</Text>
          <Aviso texto={`Versión local: tu código es ${codigoEnviado}. Cuando se conecte el servidor llegará por SMS o WhatsApp.`} tipo="alerta" />
          <Campo etiqueta="Código de 6 dígitos" placeholder="000000" keyboardType="number-pad" value={codigo} onChangeText={setCodigo} maxLength={6} error={error} />
          <Boton titulo="Continuar" deshabilitado={codigo.length !== 6} onPress={verificarCodigo} />
          <Boton titulo="Cambiar número" tipo="texto" onPress={() => setPaso(0)} />
        </Tarjeta>
      )}

      {paso === 2 && (
        <Tarjeta>
          <Text style={s.suave}>Paso 1 de 3</Text>
          <Text style={[s.titulo, { marginBottom: 14 }]}>Tu negocio</Text>
          <Campo etiqueta="Nombre del negocio" placeholder="Ej. Modas Carla" value={nombre} onChangeText={setNombre} />
          <Chips etiqueta="Rubro" opciones={RUBROS.map((r) => ({ valor: r, texto: r }))} valor={rubro} onChange={setRubro} />
          <Boton titulo="Siguiente" deshabilitado={nombre.trim().length < 2} onPress={() => setPaso(3)} />
        </Tarjeta>
      )}

      {paso === 3 && (
        <Tarjeta>
          <Text style={s.suave}>Paso 2 de 3</Text>
          <Text style={s.titulo}>Sube el QR de tu banco</Text>
          <Text style={[s.suave, { marginVertical: 8 }]}>
            Saca una captura del QR de cobro desde la app de tu banco. Tus clientes te pagan directo a tu cuenta: CobroYa no toca tu dinero.
          </Text>
          <Chips etiqueta="Banco" opciones={BANCOS.map((b) => ({ valor: b, texto: b }))} valor={banco} onChange={setBanco} />
          <Chips
            etiqueta="Tipo de QR"
            opciones={[{ valor: 'fijo', texto: 'Fijo (el cliente escribe el monto)' }, { valor: 'por_monto', texto: 'Con monto' }]}
            valor={tipoQr}
            onChange={setTipoQr}
          />
          <Imagen uri={qr} />
          <Boton titulo={qr ? 'Cambiar imagen' : 'Elegir imagen del QR'} tipo="secundario" onPress={async () => setQr(await elegirImagen() ?? qr)} />
          <Boton titulo="Siguiente" deshabilitado={!qr} onPress={() => setPaso(4)} />
          <Boton titulo="Lo subo después" tipo="texto" onPress={() => setPaso(4)} />
        </Tarjeta>
      )}

      {paso === 4 && (
        <Tarjeta>
          <Text style={s.suave}>Paso 3 de 3 · opcional</Text>
          <Text style={s.titulo}>Logo de tu negocio</Text>
          <Text style={[s.suave, { marginVertical: 8 }]}>Aparece en tu página de pago y en los comprobantes.</Text>
          <Imagen uri={logo} alto={120} />
          <Boton titulo={logo ? 'Cambiar logo' : 'Elegir logo'} tipo="secundario" onPress={async () => setLogo(await elegirImagen() ?? logo)} />
          <Boton titulo="Terminar" onPress={terminar} />
        </Tarjeta>
      )}

      {paso === 5 && (
        <>
          <Text style={[s.titulo, { textAlign: 'center' }]}>¡Listo! Así ve tu cliente un cobro</Text>
          <Text style={[s.suave, { textAlign: 'center', marginBottom: 12 }]}>Ejemplo · no se guarda</Text>
          <Tarjeta estilo={{ backgroundColor: '#E7FFDB', borderColor: '#B7E4A6' }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: C.texto }}>
              Hola María 👋, te envío el detalle de tu compra en <Text style={{ fontWeight: '800' }}>{datos.negocio?.nombre ?? nombre}</Text>:{'\n\n'}
              🧾 Blusa bordada talla M{'\n'}
              💵 Monto: <Text style={{ fontWeight: '800' }}>{bs(18000)}</Text>{'\n'}
              📅 Vence: {fechaLarga(sumarDias(hoy(), 7))}{'\n\n'}
              Paga escaneando el QR desde la app de tu banco. Detalle y QR aquí: cobroya.bo/p/AB12CD
            </Text>
          </Tarjeta>
          <Boton titulo="Crear mi primer cobro" onPress={() => { router.replace('/'); router.push('/nuevo-cobro'); }} />
          <Boton titulo="Ir al inicio" tipo="texto" onPress={() => router.replace('/')} />
        </>
      )}
    </Pantalla>
  );
}
