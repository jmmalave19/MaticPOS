# Migración de Next.js a React Router v7 (SPA + Vite)

Plan de modernización técnica para transformar el sistema integral de inventario y punto de venta **StockVenta** desde Next.js App Router a una arquitectura Single Page Application (SPA) ultraligera con **React Router v7** y **Vite**, optimizando tiempos de carga, respuesta táctil offline y estructurando navegación por URLs directas para cada módulo.

## Decisiones Críticas y Confirmaciones del Usuario

> [!IMPORTANT]
> A continuación se resumen las decisiones arquitectónicas acordadas para la transición a React Router v7:

- **Arquitectura de Ejecución**: **SPA con Vite (`react-router` v7)**. Se elimina la sobrecarga del servidor Node.js/Next.js en tiempo de ejecución, permitiendo que la aplicación se compile como activos estáticos de alto rendimiento, ideales para PWA offline-first en terminales de punto de venta.
- **Estructura de Navegación**: **Rutas individuales con URLs independientes**. Cada módulo del sistema tendrá su propia ruta en el historial del navegador (`/pos`, `/inventario`, `/reportes`, `/caja`, `/ajustes`), permitiendo acceso directo, marcadores y recargas sin perder el estado de la aplicación.
- **Cero Pérdida de Funcionalidades**: Se preserva al 100% la lógica de negocio MVC (Controladores, Modelos, Servicios Firestore, Almacenamiento Local, DolarAPI y configuración multimoneda).

---

## 1. Visión General y Concepto Central

- **Propósito**: Modernizar la infraestructura de empaquetado y enrutamiento de StockVenta para brindar máxima velocidad de respuesta en cajas registradoras y dispositivos móviles comerciales, reduciendo el consumo de memoria del proceso de desarrollo y garantizando independencia operativa en modo sin conexión.
- **Usuario Objetivo**: Administradores de comercio, cajeros y personal de inventario que requieren agilidad sin demoras en la lectura de códigos de barra, cobro y consulta de existencias.
- **Valor Agregado**:
  - Navegación instantánea entre módulos sin recarga de página mediante el nuevo motor de enrutamiento de React Router v7.
  - Mayor estabilidad y menor huella de memoria (resolviendo de raíz problemas de concurrencia de caché de compilación observados en Next.js).
  - URLs compartibles y soporte nativo para botones Atrás/Adelante del dispositivo.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujos Clave de Navegación
1. **Ruta Raíz (`/`)**: Redirección inteligente al módulo de venta rápida (`/pos`) si la jornada está abierta, o a la apertura de caja si se requiere iniciar turno.
2. **Punto de Venta (`/pos`)**: Catálogo táctil, barra de búsqueda con lector de código de barras vía cámara, resumen de carrito, cobro bimoneda (Bs. y USD).
3. **Inventario (`/inventario`)**: Listado de productos, filtros por categoría y stock bajo, modal de creación/edición, ajuste de existencias.
4. **Reportes de Venta (`/reportes`)**: Métricas de ventas del día, desglose por método de pago, comisiones de vendedores y exportación.
5. **Jornada de Trabajo / Caja (`/caja`)**: Apertura y cierre de sesión, arqueo de caja y balance financiero.
6. **Ajustes del Sistema (`/ajustes`)**: Tasa de cambio (Manual / Automática vía DolarAPI), cálculo de comisión (con switch interactivo), copias de seguridad e instalación de la PWA.

### Identidad Visual y Ergonomía Móvil
- **Paleta y Contrastes**: Mantener la estética Slate sobria del proyecto (fondos neutros limpios `slate-100/70`, tarjetas `white` con bordes sutiles `slate-200`, contrastes de acento en `slate-900`).
- **Navegación Inferior Móvil (`BottomNav`)**: Mantener la barra fija ergonómica en el tercio inferior del viewport, con enlaces de enrutamiento activos (`NavLink` de React Router) que destacan el módulo actual con feedback táctil.
- **Cabecera Unificada (`Header`)**: Barra superior fija compacta (<56px) con el título de la app, estado de sincronización y acceso al lector de código de barras.

---

## 3. Decisiones de Producto y Compensaciones Técnicas

- **React Router v7 en Modo SPA (Client Data Routing)**:
  - *Enfoque*: Configuración con `createBrowserRouter` o configuración de rutas de React Router v7 junto con `vite-plugin-pwa`.
  - *Por qué*: StockVenta es una aplicación interactiva de gestión donde la persistencia reside en el cliente (LocalStorage + IndexedDB + Firebase Firestore SDK). El SSR de Next.js añade complejidad innecesaria para un POS que opera primariamente en dispositivos locales.
  - *Alternativa descartada*: React Router v7 Framework Mode con SSR (requiere servidor Node continuo y mayor consumo de recursos en AI Studio).

- **Mantenimiento del Patrón MVC**:
  - Los controladores (`usePOSController`, `useInventoryController`, `useSessionController`, `useReportsController`, `useSettingsController`) se mantienen como la capa central de orquestación, proporcionando estado reactivo y desacoplamiento limpio de la interfaz.

- **Persistencia y Compatibilidad con Firebase**:
  - El SDK de cliente de Firebase Firestore (`firestore.service.ts`) funciona de manera idéntica y nativa en Vite sin requerir directivas `'use client'` ni polyfills complejos.

---

## 4. Arquitectura Técnica y Estrategia de Implementación

### Diagrama de Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                    Navegador / Dispositivo                   │
│   (PWA Service Worker + Caché de Activos Estáticos Vite)     │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                  React Router v7 (SPA Engine)                │
│                                                              │
│  /           ──> Redirección condicional a /pos             │
│  /pos        ──> Punto de Venta (POSView)                   │
│  /inventario ──> Gestión de Catálogo (InventoryView)        │
│  /reportes   ──> Métricas y Cierres (ReportsView)           │
│  /caja       ──> Sesiones de Jornada (SessionView)          │
│  /ajustes    ──> Configuración y Tasas (SettingsView)       │
└──────────────────────────────┬───────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐     ┌────────────────────────┐
│     Controladores (MVC)      │     │  Vistas y Componentes  │
│  • usePOSController          │◄────┤  • BottomNav           │
│  • useInventoryController    │     │  • Header              │
│  • useSessionController      │     │  • Modales y Toasts    │
│  • useReportsController      │     │  • Lector de Barras    │
│  • useSettingsController     │     │                        │
└──────────────┬───────────────┘     └────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                 Capa de Servicios y Datos                    │
│  • StorageService (LocalStorage + Respaldo JSON)             │
│  • FirestoreService (Base de datos en la nube en tiempo real)│
│  • DolarApiService (Tasa Oficial ve.dolarapi.com)            │
└──────────────────────────────────────────────────────────────┘
```

### Fases de Ejecución

1. **Configuración de Dependencias y Empaquetador Vite**:
   - Reemplazar dependencias de Next.js por `react-router` (v7), `@react-router/dev` (o `react-router-dom` v7 para SPA con Vite), `@vitejs/plugin-react`, `vite-plugin-pwa`.
   - Crear `vite.config.ts` y `index.html` con las etiquetas de viewport, PWA y fuentes del sistema.
   - Ajustar `package.json` para ejecutar `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`.

2. **Estructuración de Rutas y Layout**:
   - Crear el layout raíz (`RootLayout`) con `Outlet` de React Router, conteniendo el `Header`, el contenedor principal de vistas y el `BottomNav`.
   - Definir las rutas:
     - `/` -> Redirige a `/pos`
     - `/pos` -> POSView
     - `/inventario` -> InventoryView
     - `/reportes` -> ReportsView
     - `/caja` -> SessionView
     - `/ajustes` -> SettingsView
   - Integrar `NavLink` en `BottomNav` para destacar visualmente el icono activo según la URL.

3. **Migración de Componentes y Limpieza de directivas Next.js**:
   - Retirar directivas obsoletas `'use client'` que ya no son necesarias en Vite SPA.
   - Reemplazar importaciones de `next/navigation` o `next/image` por componentes estándar (`<img>` con optimizaciones de carga y `useNavigate` de `react-router`).

4. **Verificación PWA y Conectividad**:
   - Configurar `vite-plugin-pwa` para registrar el Service Worker y el manifiesto.
   - Probar funcionamiento sin conexión y sincronización reactiva con Firestore.
   - Ejecutar linter y compilación estática (`vite build`).
