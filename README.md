# CobroYa · App móvil (MVP)

App para que comerciantes, talleres, profesionales y distribuidores de Bolivia registren quién les debe, envíen cobros con el QR de su banco por WhatsApp, recuerden a sus clientes y concilien los pagos.

**CobroYa no recibe ni mueve dinero.** El cliente paga directo a la cuenta del comerciante escaneando el QR interoperable de su banco; el comerciante confirma el pago a mano.

Hecha con **Expo (React Native) + TypeScript + Expo Router**. Android primero; también corre en iOS y en web.

## Probarla en 5 minutos

Requisitos: [Node.js 20 o superior](https://nodejs.org) y la app **Expo Go** en tu celular Android (Play Store).

```bash
cd cobroya
npm install
npx expo start
```

Escanea el QR que aparece en la terminal con Expo Go. Para probar rápido: regístrate (el código de 6 dígitos aparece en pantalla en esta versión) y luego en **Más › Cargar datos de ejemplo**.

Para verla en el navegador: `npx expo start --web`.

## Generar el APK para instalar en Android

```bash
npm install -g eas-cli
eas login            # cuenta gratuita de expo.dev
eas build -p android --profile preview
```

Al terminar, EAS da un enlace para descargar el `.apk`. Para publicar en Play Store: `eas build -p android --profile production` y luego `eas submit -p android`.

## Qué incluye (según el diseño del MVP)

| # | Pantalla | Archivo |
|---|----------|---------|
| 1 | Bienvenida y registro (celular, código, negocio, QR, logo, ejemplo) | `src/app/bienvenida.tsx` |
| 2 | Inicio: Por cobrar, Vencido, Cobrado este mes, Para hoy, movimientos | `src/app/(tabs)/index.tsx` |
| 3 | Nuevo cobro (cliente al vuelo, canal, vencimiento, cuotas y anticipo) | `src/app/nuevo-cobro.tsx` |
| 4 | Compartir cobro (WhatsApp, copiar texto, imagen del QR, otra app) | `src/app/cobro/[id]/compartir.tsx` |
| 5 | Lista de cobros con pestañas por estado, buscador y filtros | `src/app/(tabs)/cobros.tsx` |
| 6 | Detalle del cobro (pagos, cuotas, recordar, editar, anular) | `src/app/cobro/[id]/index.tsx` |
| 7 | Registrar pago / conciliar (confirmar o rechazar con motivo) | `src/app/cobro/[id]/pago.tsx` |
| 8 | Clientes y ficha del cliente ("Recordar todo") | `src/app/(tabs)/clientes.tsx`, `src/app/cliente/` |
| 9 | Recordatorios (cuándo, tono, plantillas, aviso diario 8:00) | `src/app/recordatorios.tsx` |
| 10 | Más: Mi negocio y QR, Reportes, Plan, Ayuda, Cerrar sesión | `src/app/(tabs)/mas.tsx`, `negocio.tsx`, `reportes.tsx`, `plan.tsx` |
| 11 | Página de pago del cliente (QR, "Ya pagué, subir comprobante") | `src/app/p/[codigo].tsx` |

Flujos A–F, los 6 estados (Pendiente, Por confirmar, Pago parcial, Vencido, Pagado, Anulado) y las reglas de negocio están en `src/lib/logica.ts`. Planes Gratis / Básico Bs 20 / Pro Bs 50 con prueba Pro de 14 días en `src/lib/planes.ts`.

Reglas implementadas: Vencido se calcula solo; el saldo solo baja con pagos confirmados; pagos parciales y "saldo a favor"; un cobro con pagos confirmados no se borra, solo se anula; editar el monto genera un enlace nuevo; los comprobantes rechazados se guardan; aviso de pagos duplicados (mismo nº de transacción o mismo monto y fecha); cuotas aplicadas a la más antigua; moneda Bs con dos decimales.

## Cómo está organizado

```
src/app/        pantallas (cada archivo es una ruta de Expo Router)
src/lib/        modelo de datos, reglas de negocio, mensajes, planes, PDF/Excel, notificaciones
src/ui/         componentes visuales comunes
supabase/       esquema de base de datos para la fase con servidor (probado en PostgreSQL 16)
scripts/        pruebas de las reglas de negocio
```

Comandos útiles: `npm run typecheck` (revisa tipos) y `npm test` (10 pruebas de reglas de negocio).

## Lo que falta para producción (necesita servidor y cuentas)

Esta versión guarda todo **en el teléfono** y funciona sin internet. Para lanzar hacen falta:

1. **Servidor Supabase**: crear el proyecto, ejecutar `supabase/schema.sql`, crear los buckets `qrs`, `logos` y `comprobantes`, y sincronizar los datos desde `src/lib/store.tsx`.
2. **Código por SMS o WhatsApp** al registrarse (hoy el código se muestra en pantalla). Supabase Auth con un proveedor de SMS (por ejemplo Twilio).
3. **Página de pago pública en `cobroya.bo/p/CODIGO`**: la misma pantalla `src/app/p/[codigo].tsx` se publica como web (`npx expo export -p web`) y lee el cobro con la función `pagina_pago` del esquema. Hoy funciona como vista previa dentro de la app.
4. **Notificación cuando el cliente sube un comprobante** (push con Firebase Cloud Messaging / Expo Push).
5. **Datos de la empresa**: dominio `cobroya.bo`, número de WhatsApp de soporte (`src/app/(tabs)/mas.tsx`) y QR bancario de CobroYa para cobrar las suscripciones (`src/app/plan.tsx`).

Fase 2 (después del MVP, según el diseño): QR dinámico y conciliación automática con bancos, API de WhatsApp Business, catálogo, iOS y facturación electrónica.
