import { Redirect } from 'expo-router';

// El botón central de la barra abre el formulario como modal; esta ruta solo existe para la pestaña.
export default function NuevoTab() {
  return <Redirect href="/nuevo-cobro" />;
}
