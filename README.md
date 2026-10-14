# Grupo Multiservicios Deportivo JL 🏀🏐⚽⚾
### Centro de Gestión Deportiva PWA (Progressive Web App) en Tiempo Real con Supabase

Bienvenido al sistema oficial de **Grupo Multiservicios Deportivo JL**, una plataforma moderna de alto rendimiento diseñada para la administración y transmisión en vivo de torneos multidisciplinares (Baloncesto, Voleibol, Fútbol Sala, Béisbol, etc.).

---

## 🚀 Características Principales

- **Arquitectura en la Nube con Supabase Realtime:** Cualquier punto anotado en la mesa técnica se transmite instantáneamente a todos los teléfonos móviles sin recargar la página.
- **Progressive Web App (PWA):** Instalable en Android, iPhone y computadoras como una app nativa con icono de acceso directo en pantalla de inicio.
- **Funcionamiento Offline de Respaldo:** Gracias al Service Worker (`sw.js`), si se pierde la conexión a internet, la app continúa operando con los últimos datos guardados en caché.
- **Diseño Ultra-Premium:** Estética oscura deportiva de lujo con colores corporativos Granate / Borgoña (`#800020`), Acentos Dorados (`#D4AF37`) y el escudo oficial del Grupo Multiservicios Deportivo JL.

---

## 🌐 Los 3 Métodos de Acceso (Roles)

### 1. Vista Pública (Aficionados, Atletas y Fanáticos)
- **Acceso:** Enlace directo desde navegador o PWA instalada.
- **Funcionalidades:**
  - **Selector de Disciplinas:** Baloncesto, Voleibol, Fútbol Sala, Béisbol 5.
  - **Marcador en Vivo (Hero LIVE):** Marcador LED de estadio con desglose parcial por cuartos/sets (Q1, Q2, Q3, Q4 y Total), reloj y sede oficial (ej. *Gimnasio Pablo Higuerey*).
  - **Calendario & Resultados:** Filtros por En Vivo, Hoy, Programados, Finalizados y buscador rápido.
  - **Tablas de Posiciones Automáticas:** Grupo A y Grupo B con clasificación oficial (JJ, JG, JP, PF, PC, DP, PTS) y zona de playoffs destacada.
  - **Rosters & Plantillas:** Tarjetas de equipos con consulta de atletas (Cédula, Edad, Camiseta/Dorsal, Posición y Rol).

### 2. Vista de Delegado / Entrenador
- **Acceso:** Botón **ACCESO DELEGADO** en el encabezado.
- **Credenciales Demo:**
  - Seleccione su equipo (ej. *Broncos de Higuerey*, *Centauros del Este*, *Espartanos JL*).
  - **PIN de Seguridad:** `2024`
- **Funcionalidades:**
  - **Gestión de Roster:** Inscribir nuevos atletas con cálculo automático de edad por fecha de nacimiento, editar datos o dar de baja.
  - **Ficha de Partidos:** Consulta de próximos encuentros de su equipo en fase de grupos o eliminatorias.
  - **Exportación:** Descarga de la lista de atletas en formato CSV.
  - **Canal de Comunicación:** Datos de contacto directo con la organización GMD JL.

### 3. Vista de Superadministrador (Control Master)
- **Acceso:** Botón **CONFIGURAR** en el encabezado.
- **Credenciales Demo:**
  - **Correo:** `admin@gmdjl.com`
  - **Contraseña:** `admin2024`
- **Flujo Operativo (Los 4 Pasos):**
  - **Paso 1: Configurar Disciplinas y Categorías:** Activar/desactivar deportes, crear nuevas categorías (ej. *Baloncesto Sub-14*, *Voleibol Femenino*).
  - **Paso 2: Carga de Datos (Excel / CSV y Manual):**
    - Descarga en 1 clic de plantillas oficiales: `ROSTER_Y_EQUIPOS.csv`, `CONFIG_GRUPOS.csv`, `CALENDARIO_Y_RESULTADOS.csv`.
    - Zona de importación masiva arrastrando o seleccionando el archivo CSV.
    - Formularios de carga manual para nuevos equipos y programación de partidos.
  - **Paso 3: Mesa de Anotación / Marcador en Vivo:**
    - Selector del partido del día.
    - Cambio de estado a `EN CURSO (LIVE)` o `FINALIZADO`.
    - Botones de anotación rápida (`+1`, `+2`, `+3`, `-1`) por cuarto o set.
    - Cronómetro digital de partido (Iniciar / Pausar / Reiniciar).
    - Botón **⚡ GUARDAR Y TRANSMITIR (REALTIME)** conectado a Supabase.
  - **Paso 4: Automatización de la Tabla de Posiciones:**
    - Cálculo automático con reglas oficiales: **2 PTS al ganador**, **1 PT al perdedor**.
    - Suma de Puntos a Favor (PF), Puntos en Contra (PC) y Diferencia de Puntos (DP = PF - PC).
    - Reordenamiento instantáneo por `PTS desc -> DP desc -> PF desc`.
    - Botón de recalcular todo y exportación a Excel / CSV.

---

## 🗄️ Estructura del Proyecto

```
e:/Grupo Multiservicios Deportivos JL/
├── assets/
│   ├── logo.png                 # Escudo oficial de alta resolución GMD JL
│   ├── icon-192.png             # Icono PWA para móviles (192x192)
│   ├── icon-512.png             # Icono PWA para pantalla de inicio (512x512)
│   ├── apple-touch-icon.png     # Icono optimizado para iOS Safari
│   ├── banner_baloncesto.jpg   # Banner cinematográfico de Baloncesto
│   ├── banner_voleibol.jpg     # Banner cinematográfico de Voleibol
│   └── banner_futsal.jpg       # Banner cinematográfico de Fútbol Sala
├── js/
│   ├── store.js                # Gestor de estado local reactivo y BroadcastChannel
│   ├── standings.js            # Motor de cálculo y ordenamiento de posiciones
│   ├── csv-importer.js         # Lector y validador de archivos CSV de Excel
│   ├── supabase.js             # Cliente Supabase, Realtime y Generador SQL
│   └── app.js                  # Orquestador UI, enrutador y Mesa de Anotación
├── templates/
│   ├── ROSTER_Y_EQUIPOS.csv    # Plantilla estándar para rosters y jugadores
│   ├── CONFIG_GRUPOS.csv       # Plantilla para equipos, sedes y grupos
│   └── CALENDARIO_Y_RESULTADOS.csv # Plantilla para calendario y marcadores
├── index.html                  # Página principal de la PWA
├── styles.css                  # Sistema de diseño deportivo dark/gold
├── manifest.webmanifest        # Manifiesto oficial PWA
├── sw.js                       # Service Worker con caché offline
└── package.json                # Configuración y comandos de ejecución
```

---

## ⚡ Cómo Ejecutar Localmente

### Opción 1: Con Python (Ya verificado y funcionando)
```bash
python -m http.server 8080
```
Luego abra en su navegador: `http://localhost:8080/index.html`

### Opción 2: Con Node.js / NPM
```bash
npm run serve
```

---

## ☁️ Conexión con Supabase en la Nube

1. En el panel de **SuperAdmin**, haga clic en el botón superior **Conexión Supabase**.
2. Haga clic en **📋 Ver Script SQL para Supabase**.
3. Copie el código generado y péguelo en el **SQL Editor** de su consola de Supabase y presione **Run**. Esto creará automáticamente las tablas con Row Level Security y habilitará la publicación Realtime.
4. Ingrese su `Project URL` y `Anon Key` en el formulario y presione **Guardar y Probar Conexión**.

¡Todo el sistema estará conectado y transmitiendo en vivo a nivel mundial!
