// store.js - Gestor de Estado Local y Sincronización para Grupo Multiservicios Deportivo JL

const STORAGE_KEY = 'gmd_jl_tournament_data_v1';
const DISCIPLINAS_CONFIG_KEY = 'gmd_disciplinas_config';
const GLOBAL_CONFIG_KEY = 'gmd_config_global';
const CHANNEL_NAME = 'gmd_jl_broadcast_bus';

// BroadcastChannel for instant inter-tab/inter-window realtime synchronization
const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

/**
 * Manejo de Limpieza de Emergencia de localStorage:
 * Purga inmediatamente cualquier clave huérfana o dato previo de torneos locales
 * para garantizar que la app funcione exclusivamente con Supabase Cloud.
 */
function emergencyQuotaCleanup() {
  if (typeof localStorage === 'undefined') return 0;
  let bytesFreed = 0;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith('teams_') || k.startsWith('gmd_teams_') ||
        k.startsWith('matches_') || k.startsWith('gmd_matches_') ||
        k.startsWith('athletes_') || k.startsWith('gmd_athletes_') ||
        k.startsWith('temp_') || k.startsWith('debug_') || k.startsWith('cache_') ||
        k === 'gmd_jl_tournament_data_v1' ||
        k === 'gmd_disciplinas_config' ||
        k === 'gmd_config_global'
      )) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        const val = localStorage.getItem(key);
        if (val) bytesFreed += val.length;
        localStorage.removeItem(key);
      } catch (_) {}
    });
    if (bytesFreed > 0) {
      console.info(`[emergencyQuotaCleanup] Claves locales purgadas: ${(bytesFreed / 1024).toFixed(1)} KB liberados.`);
    }
  } catch (e) {
    console.warn('[emergencyQuotaCleanup] Error global:', e);
  }
  return bytesFreed;
}
if (typeof window !== 'undefined') {
  window.emergencyQuotaCleanup = emergencyQuotaCleanup;
}

/**
 * Persistencia local desactivada:
 * GRUPO MULTISERVICIOS DEPORTIVOS JL utiliza exclusivamente Supabase Cloud como única fuente de verdad.
 */
function safeLocalStorageSetItem(key, value) {
  // No-op para evitar desincronizaciones entre navegadores
  return true;
}
if (typeof window !== 'undefined') {
  window.safeLocalStorageSetItem = safeLocalStorageSetItem;
}

/**
 * Función de Compresión Automática de Imágenes mediante Canvas:
 * Redimensiona a un máximo de 120 x 120 píxeles y comprime a JPEG calidad 0.6 (60%).
 * Devuelve una cadena Base64 ultraliviana (de apenas unos cuantos KB) evitando saturar el localStorage.
 * Soporta patrón con Callback y Promesa (async/await).
 *
 * @param {File|Blob|string} fileOrUrl Archivo, Blob o URL/Base64 de la imagen
 * @param {number} [maxWidth=120] Ancho máximo en px (120 por defecto)
 * @param {number} [maxHeight=120] Alto máximo en px (120 por defecto)
 * @param {number} [quality=0.6] Calidad de compresión JPEG (0.6 = 60%)
 * @param {Function} [callback] Callback opcional (compressedBase64)
 * @returns {Promise<string>} Promesa que resuelve la cadena Base64 ultraligera
 */
function compressImage(fileOrUrl, maxWidth = 120, maxHeight = 120, quality = 0.6, callback = null) {
  return new Promise((resolve) => {
    try {
      const handleResult = (result) => {
        if (typeof callback === 'function') {
          try { callback(result); } catch (cbErr) { console.warn('Error en callback de compressImage:', cbErr); }
        }
        resolve(result);
      };

      if (!fileOrUrl) {
        handleResult('');
        return;
      }

      // Si ya es una ruta relativa de assets o URL remota http/https, no consume base64
      if (typeof fileOrUrl === 'string') {
        const trimmed = fileOrUrl.trim();
        if (
          trimmed.startsWith('http://') ||
          trimmed.startsWith('https://') ||
          trimmed.startsWith('./') ||
          trimmed.startsWith('/') ||
          trimmed.startsWith('assets/')
        ) {
          handleResult(trimmed);
          return;
        }
        if (!trimmed.startsWith('data:')) {
          handleResult(trimmed);
          return;
        }
      }

      // Entorno sin soporte de Canvas (ej. Node o test)
      if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
        if (typeof fileOrUrl === 'string') {
          handleResult(fileOrUrl);
        } else if (typeof FileReader !== 'undefined' && fileOrUrl instanceof Blob) {
          const r = new FileReader();
          r.onload = (ev) => handleResult(ev.target.result || '');
          r.onerror = () => handleResult('');
          r.readAsDataURL(fileOrUrl);
        } else {
          handleResult('');
        }
        return;
      }

      let finished = false;
      const finishOnce = (output) => {
        if (!finished) {
          finished = true;
          clearTimeout(safetyTimer);
          handleResult(output);
        }
      };

      // Timeout de seguridad por si la imagen tarda o se congela
      const safetyTimer = setTimeout(() => {
        if (typeof fileOrUrl === 'string') {
          finishOnce(fileOrUrl.length > 20000 ? fileOrUrl.slice(0, 20000) : fileOrUrl);
        } else {
          finishOnce('');
        }
      }, 4000);

      const processImg = (img) => {
        try {
          let width = img.naturalWidth || img.width || maxWidth;
          let height = img.naturalHeight || img.height || maxHeight;

          // Redimensionar preservando la relación de aspecto sin superar 120 x 120
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          width = Math.max(1, width);
          height = Math.max(1, height);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Fondo blanco para evitar fondos negros por transparencia en JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Exportar con compresión obligatoria: canvas.toDataURL('image/jpeg', 0.6)
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            finishOnce(dataUrl);
          } else {
            finishOnce(typeof fileOrUrl === 'string' ? fileOrUrl : '');
          }
        } catch (err) {
          console.warn('[compressImage] Error en compresión Canvas:', err);
          finishOnce(typeof fileOrUrl === 'string' ? fileOrUrl : '');
        }
      };

      if (typeof Image === 'undefined') {
        finishOnce(typeof fileOrUrl === 'string' ? fileOrUrl : '');
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImg(img);
      img.onerror = (err) => {
        console.warn('[compressImage] Error al cargar Image:', err);
        finishOnce(typeof fileOrUrl === 'string' ? fileOrUrl : '');
      };

      if (typeof Blob !== 'undefined' && fileOrUrl instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.onerror = () => finishOnce('');
        reader.readAsDataURL(fileOrUrl);
      } else if (typeof fileOrUrl === 'string') {
        img.src = fileOrUrl;
        if (img.complete && img.naturalWidth > 0) {
          processImg(img);
        }
      } else {
        finishOnce('');
      }
    } catch (outerErr) {
      console.warn('[compressImage] Error general capturado:', outerErr);
      const fallback = typeof fileOrUrl === 'string' ? fileOrUrl : '';
      if (typeof callback === 'function') {
        try { callback(fallback); } catch (_) {}
      }
      resolve(fallback);
    }
  });
}
if (typeof window !== 'undefined') {
  window.compressImage = compressImage;
  window.compressImageToBase64 = compressImage;
}

// Initial Seed Data matching the user's Excel specifications
const DEFAULT_SEED_DATA = {
  disciplinas: [
    {
      id: 'baloncesto-master',
      nombre: 'Baloncesto',
      categoria: 'Torneo Master / Libre',
      icono: '🏀',
      avatar: './assets/banner_baloncesto.jpg',
      banner: './assets/banner_baloncesto.jpg',
      color: '#D4AF37',
      activa: true,
      reglas: { periodos: 4, nombrePeriodo: 'Cuarto', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 10 }
    },
    {
      id: 'voleibol-femenino',
      nombre: 'Voleibol',
      categoria: 'Femenino Libre',
      icono: '🏐',
      avatar: './assets/banner_voleibol.jpg',
      banner: './assets/banner_voleibol.jpg',
      color: '#38BDF8',
      activa: true,
      reglas: { periodos: 3, nombrePeriodo: 'Set', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 25 }
    },
    {
      id: 'futsal-copa',
      nombre: 'Futbol Sala',
      categoria: 'Copa JL Multiservicios',
      icono: '⚽',
      avatar: './assets/banner_futsal.jpg',
      banner: './assets/banner_futsal.jpg',
      color: '#10B981',
      activa: true,
      reglas: { periodos: 2, nombrePeriodo: 'Tiempo', ptsGanador: 3, ptsPerdedor: 0, ptsEmpate: 1, duracionMin: 20 }
    },
    {
      id: 'softbol-master',
      nombre: 'Sotfbol',
      categoria: 'Torneo Master / Modificado',
      icono: '🥎',
      avatar: './assets/logo.png',
      banner: './assets/logo.png',
      color: '#F59E0B',
      activa: true,
      reglas: { periodos: 7, nombrePeriodo: 'Inning', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 15 }
    }
  ],

  equipos: [
    {
      id: 'EQ-01',
      nombre: 'Gigantes de Caripito',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo A',
      sedePrincipal: 'Domo Bolivariano',
      siglas: 'GDC',
      logoUrl: './assets/logo.png',
      color: '#D97706',
      delegadoNombre: 'Prof. Carlos Mendoza',
      delegadoCedula: '14589123',
      delegadoTelefono: '+58 414-8765432',
      delegadoEmail: 'delegado.gigantes@gmdjl.com',
      pin: '2024',
      entrenador: 'Prof. Carlos Mendoza',
      asistente: 'Lic. Andrés Silva',
      utilero: 'Carlos Ramos'
    },
    {
      id: 'EQ-02',
      nombre: 'Tigres de la Sabana',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo A',
      sedePrincipal: 'Gimnasio Pablo Higuerey',
      siglas: 'TDS',
      logoUrl: './assets/logo.png',
      color: '#EA580C',
      delegadoNombre: 'Lic. Manuel Velásquez',
      delegadoCedula: '15987654',
      delegadoTelefono: '+58 424-8123456',
      delegadoEmail: 'delegado.tigres@gmdjl.com',
      pin: '2024',
      entrenador: 'Lic. Manuel Velásquez',
      asistente: 'Prof. Javier Pinto',
      utilero: 'Ramón Díaz'
    },
    {
      id: 'EQ-03',
      nombre: 'Monagas BBC',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo B',
      sedePrincipal: 'Complejo Deportivo JL',
      siglas: 'MON',
      logoUrl: './assets/logo.png',
      color: '#1E3A8A',
      delegadoNombre: 'Ing. Pedro Castillo',
      delegadoCedula: '13456789',
      delegadoTelefono: '+58 416-9281726',
      delegadoEmail: 'delegado.monagas@gmdjl.com',
      pin: '2024',
      entrenador: 'Ing. Pedro Castillo',
      asistente: 'Lic. Héctor Carreño',
      utilero: 'José Barrios'
    },
    {
      id: 'EQ-04',
      nombre: 'Indios de Punceres',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo B',
      sedePrincipal: 'Cancha Los Robles',
      siglas: 'IDP',
      logoUrl: './assets/logo.png',
      color: '#9E1B32',
      delegadoNombre: 'Téc. Nelson Figueroa',
      delegadoCedula: '17890123',
      delegadoTelefono: '+58 412-3091823',
      delegadoEmail: 'delegado.indios@gmdjl.com',
      pin: '2024',
      entrenador: 'Téc. Nelson Figueroa',
      asistente: 'Prof. Kelvin Requena',
      utilero: 'Samuel Morales'
    },
    // Voleibol Femenino
    { id: 'EQ-VOL-01', nombre: 'Ángeles de Oriente', disciplinaId: 'voleibol-femenino', grupo: 'Grupo A', sedePrincipal: 'Gimnasio Pablo Higuerey', siglas: 'ANG', logoUrl: './assets/logo.png', color: '#38BDF8', delegadoNombre: 'Lic. Mariana Soto', delegadoCedula: '20111222', delegadoTelefono: '+58 414-2223344', delegadoEmail: 'delegado.angeles@gmdjl.com', pin: '2024' },
    { id: 'EQ-VOL-02', nombre: 'Sirenas del Morro', disciplinaId: 'voleibol-femenino', grupo: 'Grupo A', sedePrincipal: 'Gimnasio Pablo Higuerey', siglas: 'SIR', logoUrl: './assets/logo.png', color: '#EC4899', delegadoNombre: 'Prof. Carmen Ruiz', delegadoCedula: '21222333', delegadoTelefono: '+58 424-3334455', delegadoEmail: 'delegado.sirenas@gmdjl.com', pin: '2024' },
    { id: 'EQ-VOL-03', nombre: 'Guerreras JL', disciplinaId: 'voleibol-femenino', grupo: 'Grupo B', sedePrincipal: 'Complejo Deportivo JL', siglas: 'GJL', logoUrl: './assets/logo.png', color: '#800020', delegadoNombre: 'Prof. Ana Silva', delegadoCedula: '22333444', delegadoTelefono: '+58 412-4445566', delegadoEmail: 'delegado.guerreras@gmdjl.com', pin: '2024' },
    { id: 'EQ-VOL-04', nombre: 'Vencedoras VC', disciplinaId: 'voleibol-femenino', grupo: 'Grupo B', sedePrincipal: 'Domo Bolivariano', siglas: 'VVC', logoUrl: './assets/logo.png', color: '#8B5CF6', delegadoNombre: 'Lic. Laura Peña', delegadoCedula: '23444555', delegadoTelefono: '+58 416-5556677', delegadoEmail: 'delegado.vencedoras@gmdjl.com', pin: '2024' },

    // Futbol Sala
    { id: 'EQ-FUT-01', nombre: 'Titanes Futsal', disciplinaId: 'futsal-copa', grupo: 'Grupo A', sedePrincipal: 'Cancha Los Robles', siglas: 'TIT', logoUrl: './assets/logo.png', color: '#10B981', delegadoNombre: 'Prof. Nelson Parra', delegadoCedula: '14555666', delegadoTelefono: '+58 414-1112233', delegadoEmail: 'delegado.titanesfs@gmdjl.com', pin: '2024' },
    { id: 'EQ-FUT-02', nombre: 'Pumas de Puerto', disciplinaId: 'futsal-copa', grupo: 'Grupo A', sedePrincipal: 'Cancha Los Robles', siglas: 'PUM', logoUrl: './assets/logo.png', color: '#F97316', delegadoNombre: 'Sr. Edgar Mendoza', delegadoCedula: '15666777', delegadoTelefono: '+58 424-6667788', delegadoEmail: 'delegado.pumas@gmdjl.com', pin: '2024' },
    { id: 'EQ-FUT-03', nombre: 'Deportivo Higuerey', disciplinaId: 'futsal-copa', grupo: 'Grupo B', sedePrincipal: 'Gimnasio Pablo Higuerey', siglas: 'DHY', logoUrl: './assets/logo.png', color: '#9E1B32', delegadoNombre: 'Prof. Iván Castillo', delegadoCedula: '16777888', delegadoTelefono: '+58 412-7778899', delegadoEmail: 'delegado.deportivoh@gmdjl.com', pin: '2024' },
    { id: 'EQ-FUT-04', nombre: 'Atlético Oriente FS', disciplinaId: 'futsal-copa', grupo: 'Grupo B', sedePrincipal: 'Complejo Deportivo JL', siglas: 'AOF', logoUrl: './assets/logo.png', color: '#2563EB', delegadoNombre: 'Lic. Andrés Bello', delegadoCedula: '17888999', delegadoTelefono: '+58 416-8889900', delegadoEmail: 'delegado.atletico@gmdjl.com', pin: '2024' },

    // Sotfbol
    { id: 'EQ-SOT-01', nombre: 'Cerveceros del Este', disciplinaId: 'softbol-master', grupo: 'Grupo A', sedePrincipal: 'Estadio Manuel Carrasquel', siglas: 'CER', logoUrl: './assets/logo.png', color: '#F59E0B', delegadoNombre: 'Prof. Carlos Urbano', delegadoCedula: '18999000', delegadoTelefono: '+58 414-9990011', delegadoEmail: 'delegado.cerveceros@gmdjl.com', pin: '2024' },
    { id: 'EQ-SOT-02', nombre: 'Guerreros del Diamante', disciplinaId: 'softbol-master', grupo: 'Grupo A', sedePrincipal: 'Estadio Manuel Carrasquel', siglas: 'GDD', logoUrl: './assets/logo.png', color: '#DC2626', delegadoNombre: 'Lic. Pedro Marcano', delegadoCedula: '19000111', delegadoTelefono: '+58 424-1110022', delegadoEmail: 'delegado.diamante@gmdjl.com', pin: '2024' },
    { id: 'EQ-SOT-03', nombre: 'Petroleros JL', disciplinaId: 'softbol-master', grupo: 'Grupo B', sedePrincipal: 'Complejo Deportivo JL', siglas: 'PJL', logoUrl: './assets/logo.png', color: '#800020', delegadoNombre: 'Ing. José Lambert', delegadoCedula: '14621157', delegadoTelefono: '+58 412-2221133', delegadoEmail: 'delegado.petroleros@gmdjl.com', pin: '2024' },
    { id: 'EQ-SOT-04', nombre: 'Cardenales Master', disciplinaId: 'softbol-master', grupo: 'Grupo B', sedePrincipal: 'Estadio José Pérez', siglas: 'CDM', logoUrl: './assets/logo.png', color: '#B91C1C', delegadoNombre: 'Prof. Luis Marval', delegadoCedula: '20123456', delegadoTelefono: '+58 416-3332244', delegadoEmail: 'delegado.cardenales@gmdjl.com', pin: '2024' }
  ],

  atletas: [
    { id: 'ATL-001', disciplinaId: 'baloncesto-master', cedula: 'V-24589123', nombres: 'Carlos Eduardo Mendoza', fechaNacimiento: '1996-05-14', edad: 28, camiseta: '7', posicion: 'Base', equipo: 'Gigantes de Caripito', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-002', disciplinaId: 'baloncesto-master', cedula: 'V-26102948', nombres: 'José Alejandro Salazar', fechaNacimiento: '1998-11-20', edad: 26, camiseta: '11', posicion: 'Escolta', equipo: 'Gigantes de Caripito', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-003', disciplinaId: 'baloncesto-master', cedula: 'V-22441902', nombres: 'Miguel Ángel Rondón', fechaNacimiento: '1994-03-08', edad: 30, camiseta: '15', posicion: 'Alero', equipo: 'Gigantes de Caripito', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-004', disciplinaId: 'baloncesto-master', cedula: 'V-25890124', nombres: 'David Jesús Marcano', fechaNacimiento: '1997-09-12', edad: 27, camiseta: '23', posicion: 'Ala-Pívot', equipo: 'Gigantes de Caripito', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-005', disciplinaId: 'baloncesto-master', cedula: 'V-21394850', nombres: 'Luis Fernando Cedeño', fechaNacimiento: '1993-01-30', edad: 31, camiseta: '33', posicion: 'Pívot', equipo: 'Gigantes de Caripito', rol: 'Atleta', fotoUrl: '' },
    
    { id: 'ATL-006', disciplinaId: 'baloncesto-master', cedula: 'V-23948102', nombres: 'Gabriel Antonio Ramos', fechaNacimiento: '1995-07-22', edad: 29, camiseta: '5', posicion: 'Base', equipo: 'Tigres de la Sabana', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-007', disciplinaId: 'baloncesto-master', cedula: 'V-25019284', nombres: 'Javier Alexander Pinto', fechaNacimiento: '1997-04-18', edad: 27, camiseta: '10', posicion: 'Escolta', equipo: 'Tigres de la Sabana', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-008', disciplinaId: 'baloncesto-master', cedula: 'V-24102948', nombres: 'Andrés Eloy Rivas', fechaNacimiento: '1996-08-05', edad: 28, camiseta: '12', posicion: 'Alero', equipo: 'Tigres de la Sabana', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-009', disciplinaId: 'baloncesto-master', cedula: 'V-22940182', nombres: 'Jesús Manuel Torres', fechaNacimiento: '1994-12-19', edad: 30, camiseta: '21', posicion: 'Ala-Pívot', equipo: 'Tigres de la Sabana', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-010', disciplinaId: 'baloncesto-master', cedula: 'V-20891274', nombres: 'Víctor Alfonso Silva', fechaNacimiento: '1992-06-11', edad: 32, camiseta: '34', posicion: 'Pívot', equipo: 'Tigres de la Sabana', rol: 'Atleta', fotoUrl: '' },

    { id: 'ATL-011', disciplinaId: 'baloncesto-master', cedula: 'V-26891024', nombres: 'Daniel Enrique Guerra', fechaNacimiento: '1999-02-14', edad: 25, camiseta: '3', posicion: 'Base', equipo: 'Monagas BBC', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-012', disciplinaId: 'baloncesto-master', cedula: 'V-24901823', nombres: 'Héctor Luis Carreño', fechaNacimiento: '1996-10-25', edad: 28, camiseta: '8', posicion: 'Alero', equipo: 'Monagas BBC', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-013', disciplinaId: 'baloncesto-master', cedula: 'V-23190284', nombres: 'Ricardo José Barrios', fechaNacimiento: '1995-03-17', edad: 29, camiseta: '14', posicion: 'Pívot', equipo: 'Monagas BBC', rol: 'Atleta', fotoUrl: '' },

    { id: 'ATL-014', disciplinaId: 'baloncesto-master', cedula: 'V-25901824', nombres: 'Samuel David Morales', fechaNacimiento: '1998-09-02', edad: 26, camiseta: '9', posicion: 'Base', equipo: 'Indios de Punceres', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-015', disciplinaId: 'baloncesto-master', cedula: 'V-24810294', nombres: 'Kelvin José Requena', fechaNacimiento: '1996-12-08', edad: 28, camiseta: '24', posicion: 'Alero', equipo: 'Indios de Punceres', rol: 'Capitán', fotoUrl: '' }
  ],

  // Calendario oficial de encuentros de la temporada
  partidos: [
    {
      id: 'PAR-BAL-01',
      disciplinaId: 'baloncesto-master',
      fecha: '2026-10-18',
      hora: '18:00',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Jornada 1 (Fase Regular)',
      grupo: 'Grupo A',
      equipoLocal: 'Gigantes de Caripito',
      q1Loc: 12, q2Loc: 10, q3Loc: 11, q4Loc: 10, otLoc: 0, totalLocal: 43, puntosLocal: 43,
      equipoVisitante: 'Tigres de la Sabana',
      q1Vis: 10, q2Vis: 12, q3Vis: 9, q4Vis: 11, otVis: 0, totalVisitante: 42, puntosVisitante: 42,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      faltasLoc: 2, faltasVis: 3,
      actualizadoEn: '2026-10-18T19:00:00.000Z'
    },
    {
      id: 'PAR-BAL-02',
      disciplinaId: 'baloncesto-master',
      fecha: '2026-10-18',
      hora: '19:45',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Jornada 1 (Fase Regular)',
      grupo: 'Grupo B',
      equipoLocal: 'Monagas BBC',
      q1Loc: 14, q2Loc: 11, q3Loc: 12, q4Loc: 10, otLoc: 0, totalLocal: 47, puntosLocal: 47,
      equipoVisitante: 'Indios de Punceres',
      q1Vis: 11, q2Vis: 13, q3Vis: 10, q4Vis: 11, otVis: 0, totalVisitante: 45, puntosVisitante: 45,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      faltasLoc: 4, faltasVis: 1,
      actualizadoEn: '2026-10-18T20:45:00.000Z'
    },
    {
      id: 'PAR-BAL-03',
      disciplinaId: 'baloncesto-master',
      fecha: '2026-10-19',
      hora: '18:00',
      sede: 'Complejo Deportivo JL',
      fase: 'Jornada 2 (Fase Regular)',
      grupo: 'Grupo A',
      equipoLocal: 'Gigantes de Caripito',
      q1Loc: 8, q2Loc: 10, q3Loc: 6, q4Loc: 0, otLoc: 0, totalLocal: 24, puntosLocal: 24,
      equipoVisitante: 'Monagas BBC',
      q1Vis: 7, q2Vis: 9, q3Vis: 6, q4Vis: 0, otVis: 0, totalVisitante: 22, puntosVisitante: 22,
      estado: 'EN CURSO',
      periodoActual: 'Q3',
      reloj: '06:45',
      faltasLoc: 1, faltasVis: 2,
      actualizadoEn: '2026-10-18T21:00:00.000Z'
    },
    {
      id: 'PAR-BAL-04',
      disciplinaId: 'baloncesto-master',
      fecha: '2026-10-19',
      hora: '19:30',
      sede: 'Cancha Los Robles',
      fase: 'Jornada 2 (Fase Regular)',
      grupo: 'Grupo B',
      equipoLocal: 'Tigres de la Sabana',
      q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, otLoc: 0, totalLocal: 0, puntosLocal: 0,
      equipoVisitante: 'Indios de Punceres',
      q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, otVis: 0, totalVisitante: 0, puntosVisitante: 0,
      estado: 'PROGRAMADO',
      periodoActual: 'Por Iniciar',
      reloj: '10:00',
      faltasLoc: 0, faltasVis: 0,
      actualizadoEn: '2026-10-18T21:00:00.000Z'
    },
    // Voleibol Femenino
    {
      id: 'PAR-VOL-01',
      disciplinaId: 'voleibol-femenino',
      fecha: '2026-10-18',
      hora: '17:00',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Jornada 1',
      grupo: 'Grupo A',
      equipoLocal: 'Ángeles de Oriente',
      q1Loc: 25, q2Loc: 22, q3Loc: 15, q4Loc: 0, otLoc: 0, totalLocal: 2,
      equipoVisitante: 'Sirenas del Morro',
      q1Vis: 21, q2Vis: 25, q3Vis: 12, q4Vis: 0, otVis: 0, totalVisitante: 1,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      actualizadoEn: '2026-10-18T18:30:00.000Z'
    },
    {
      id: 'PAR-VOL-02',
      disciplinaId: 'voleibol-femenino',
      fecha: '2026-10-19',
      hora: '18:30',
      sede: 'Complejo Deportivo JL',
      fase: 'Jornada 2',
      grupo: 'Grupo B',
      equipoLocal: 'Guerreras JL',
      q1Loc: 25, q2Loc: 19, q3Loc: 14, q4Loc: 0, otLoc: 0, totalLocal: 1,
      equipoVisitante: 'Vencedoras VC',
      q1Vis: 20, q2Vis: 25, q3Vis: 12, q4Vis: 0, otVis: 0, totalVisitante: 1,
      estado: 'EN CURSO',
      periodoActual: 'Set 3',
      reloj: '14:20',
      actualizadoEn: '2026-10-18T21:00:00.000Z'
    },
    {
      id: 'PAR-VOL-03',
      disciplinaId: 'voleibol-femenino',
      fecha: '2026-10-20',
      hora: '18:00',
      sede: 'Domo Bolivariano',
      fase: 'Jornada 3',
      grupo: 'Grupo A',
      equipoLocal: 'Ángeles de Oriente',
      q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, otLoc: 0, totalLocal: 0,
      equipoVisitante: 'Guerreras JL',
      q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, otVis: 0, totalVisitante: 0,
      estado: 'PROGRAMADO',
      periodoActual: 'Por Iniciar',
      reloj: '25:00',
      actualizadoEn: '2026-10-18T21:00:00.000Z'
    },
    // Futbol Sala
    {
      id: 'PAR-FUT-01',
      disciplinaId: 'futsal-copa',
      fecha: '2026-10-18',
      hora: '17:30',
      sede: 'Cancha Los Robles',
      fase: 'Jornada 1',
      grupo: 'Grupo A',
      equipoLocal: 'Titanes Futsal',
      q1Loc: 2, q2Loc: 2, q3Loc: 0, q4Loc: 0, otLoc: 0, totalLocal: 4,
      equipoVisitante: 'Pumas de Puerto',
      q1Vis: 1, q2Vis: 2, q3Vis: 0, q4Vis: 0, otVis: 0, totalVisitante: 3,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      actualizadoEn: '2026-10-18T18:45:00.000Z'
    },
    {
      id: 'PAR-FUT-02',
      disciplinaId: 'futsal-copa',
      fecha: '2026-10-19',
      hora: '19:00',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Jornada 2',
      grupo: 'Grupo B',
      equipoLocal: 'Deportivo Higuerey',
      q1Loc: 1, q2Loc: 1, q3Loc: 0, q4Loc: 0, otLoc: 0, totalLocal: 2,
      equipoVisitante: 'Atlético Oriente FS',
      q1Vis: 1, q2Vis: 1, q3Vis: 0, q4Vis: 0, otVis: 0, totalVisitante: 2,
      estado: 'EN CURSO',
      periodoActual: '2do Tiempo',
      reloj: '08:40',
      actualizadoEn: '2026-10-18T21:00:00.000Z'
    },
    {
      id: 'PAR-FUT-03',
      disciplinaId: 'futsal-copa',
      fecha: '2026-10-20',
      hora: '19:30',
      sede: 'Complejo Deportivo JL',
      fase: 'Jornada 3',
      grupo: 'Grupo A',
      equipoLocal: 'Titanes Futsal',
      q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, otLoc: 0, totalLocal: 0,
      equipoVisitante: 'Deportivo Higuerey',
      q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, otVis: 0, totalVisitante: 0,
      estado: 'PROGRAMADO',
      periodoActual: 'Por Iniciar',
      reloj: '20:00',
      actualizadoEn: '2026-10-18T21:00:00.000Z'
    },
    // Sotfbol
    {
      id: 'PAR-SOT-01',
      disciplinaId: 'softbol-master',
      fecha: '2026-10-18',
      hora: '10:00',
      sede: 'Estadio Manuel Carrasquel',
      fase: 'Jornada 1',
      grupo: 'Grupo A',
      equipoLocal: 'Cerveceros del Este',
      q1Loc: 2, q2Loc: 3, q3Loc: 2, q4Loc: 0, otLoc: 0, totalLocal: 7,
      equipoVisitante: 'Guerreros del Diamante',
      q1Vis: 1, q2Vis: 1, q3Vis: 3, q4Vis: 0, otVis: 0, totalVisitante: 5,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      actualizadoEn: '2026-10-18T12:00:00.000Z'
    },
    {
      id: 'PAR-SOT-02',
      disciplinaId: 'softbol-master',
      fecha: '2026-10-19',
      hora: '14:00',
      sede: 'Complejo Deportivo JL',
      fase: 'Jornada 2',
      grupo: 'Grupo B',
      equipoLocal: 'Petroleros JL',
      q1Loc: 2, q2Loc: 1, q3Loc: 1, q4Loc: 0, otLoc: 0, totalLocal: 4,
      equipoVisitante: 'Cardenales Master',
      q1Vis: 0, q2Vis: 2, q3Vis: 1, q4Vis: 0, otVis: 0, totalVisitante: 3,
      estado: 'EN CURSO',
      periodoActual: 'Inning 5',
      reloj: '10:00',
      actualizadoEn: '2026-10-18T21:00:00.000Z'
    },
    {
      id: 'PAR-SOT-03',
      disciplinaId: 'softbol-master',
      fecha: '2026-10-20',
      hora: '15:30',
      sede: 'Estadio José Pérez',
      fase: 'Jornada 3',
      grupo: 'Grupo A',
      equipoLocal: 'Cerveceros del Este',
      q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, otLoc: 0, totalLocal: 0,
      equipoVisitante: 'Petroleros JL',
      q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, otVis: 0, totalVisitante: 0,
      estado: 'PROGRAMADO',
      periodoActual: 'Por Iniciar',
      reloj: '15:00',
      actualizadoEn: '2026-10-18T21:00:00.000Z'
    }
  ],

  // Standings are auto-calculated from matches, with initial values
  posiciones: [],

  config: {
    disciplinaActual: 'baloncesto-master',
    tituloEvento: 'Grupo Multiservicios Deportivo JL',
    temporadaEvento: '2026-2027',
    sloganEvento: 'Sistema Multideportivo Integral',
    logoEvento: './assets/logo.png',
    sonidosActivos: true,
    silbatosActivos: true,
    liveSyncActivo: true,
    notificacionesActivas: true,
    brilloInterfaz: 100,
    temaVisual: 'dark-gold',
    versionApp: 'v2.6.4 (2026-2027 Pro)',
    admins: [
      {
        id: 'ADM-01',
        nombre: 'José Lambert',
        cedula: '14621157',
        clave: 'admin2024',
        disciplinaId: 'todas',
        rol: 'superadmin',
        activo: true,
        creadoEn: '2026-01-01'
      }
    ],
    supabaseUrl: 'https://wznvlhuvpqnnrlgcgqpx.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnZsaHV2cHFubnJsZ2NncXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NDkyNDcsImV4cCI6MjEwODQyNTI0N30.ixhXWj0Jfir852lXJFdZNNfNscnND2u5WPXZ0EBA6lk',
    modoOffline: false,
    rostersCongelados: false, // Superadmin can lock rosters to prevent unregistered additions
    solicitudesBaja: [], // Formal discharge requests from delegates awaiting Superadmin approval
    patrocinadores: [
      { id: 'PAT-1', nombre: 'Multiservicios JL C.A.', logo: './assets/logo.png', web: 'https://grupodeportivosjl.com', banner: './assets/banner_baloncesto.jpg', activo: true },
      { id: 'PAT-2', nombre: 'PowerSport Venezuela', logo: './assets/icon-192.png', web: '#', banner: './assets/banner_voleibol.jpg', activo: true },
      { id: 'PAT-3', nombre: 'Gimnasio Pablo Higuerey', logo: './assets/logo.png', web: '#', banner: './assets/banner_futsal.jpg', activo: true }
    ],
    fasesTorneo: ['Fase de Grupos', 'Cuartos de Final', 'Semifinales', 'Gran Final'],
    sedesTorneo: ['Gimnasio Pablo Higuerey', 'Complejo Deportivo JL', 'Cancha Los Robles', 'Domo Bolivariano', 'Estadio Manuel Carrasquel'],
    usuarioActual: null // { rol: 'publico' | 'delegado' | 'superadmin', equipoId?: '', email?: '', equipoNombre?: '' }
  }
};

// Diccionario de semillas base por deporte oficial
const DEFAULT_DISCIPLINE_SEEDS = {
  'baloncesto-master': {
    equipos: DEFAULT_SEED_DATA.equipos.filter((e) => e.disciplinaId === 'baloncesto-master'),
    partidos: DEFAULT_SEED_DATA.partidos.filter((p) => p.disciplinaId === 'baloncesto-master'),
    atletas: DEFAULT_SEED_DATA.atletas || []
  },
  'voleibol-femenino': {
    equipos: DEFAULT_SEED_DATA.equipos.filter((e) => e.disciplinaId === 'voleibol-femenino'),
    partidos: DEFAULT_SEED_DATA.partidos.filter((p) => p.disciplinaId === 'voleibol-femenino'),
    atletas: []
  },
  'futsal-copa': {
    equipos: DEFAULT_SEED_DATA.equipos.filter((e) => e.disciplinaId === 'futsal-copa'),
    partidos: DEFAULT_SEED_DATA.partidos.filter((p) => p.disciplinaId === 'futsal-copa'),
    atletas: []
  },
  'softbol-master': {
    equipos: DEFAULT_SEED_DATA.equipos.filter((e) => e.disciplinaId === 'softbol-master'),
    partidos: DEFAULT_SEED_DATA.partidos.filter((p) => p.disciplinaId === 'softbol-master'),
    atletas: []
  }
};

function getCleanDisciplineId(disciplinaId) {
  if (!disciplinaId) return '';
  return String(disciplinaId)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

const DISABLE_LOCAL_STORAGE_BACKUP = true;

class TournamentStore {
  constructor() {
    this.DISABLE_LOCAL_STORAGE_BACKUP = DISABLE_LOCAL_STORAGE_BACKUP;
    this.listeners = new Set();
    this.data = this.loadFromStorage();
    this.setupBroadcast();
  }

  loadDisciplinasConfig() {
    return this.data?.disciplinas || [];
  }

  saveDisciplinasConfig(disciplinas) {
    if (!disciplinas) return;
    let arrayDiscs = [];
    if (Array.isArray(disciplinas)) {
      arrayDiscs = disciplinas;
    } else if (disciplinas.disciplinas && Array.isArray(disciplinas.disciplinas)) {
      arrayDiscs = disciplinas.disciplinas;
    } else if (typeof disciplinas === 'object') {
      const pool = disciplinas.porId || disciplinas;
      arrayDiscs = Object.values(pool).filter((x) => x && typeof x === 'object' && (x.id || x.nombre));
    }

    if (this.data) {
      this.data.disciplinas = arrayDiscs;
      if (this.data.config) {
        this.data.config.disciplinas = arrayDiscs;
      }
    }
  }

  loadGlobalConfig() {
    return this.data?.config || null;
  }

  saveGlobalConfig(config) {
    if (!config || typeof config !== 'object') return;
    if (this.data) {
      this.data.config = { ...this.data.config, ...config };
    }
  }

  loadFromStorage() {
    // Retorna estructura en blanco lista para hidratarse directamente desde Supabase Cloud
    return {
      ...DEFAULT_SEED_DATA,
      disciplinas: [],
      equipos: [],
      partidos: [],
      atletas: [],
      config: {
        ...DEFAULT_SEED_DATA.config,
        supabaseUrl: 'https://wznvlhuvpqnnrlgcgqpx.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnZsaHV2cHFubnJsZ2NncXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NDkyNDcsImV4cCI6MjEwODQyNTI0N30.ixhXWj0Jfir852lXJFdZNNfNscnND2u5WPXZ0EBA6lk',
        disciplinaActual: 'baloncesto-master'
      }
    };
  }

  saveToStorage() {
    // Almacenamiento local desactivado permanentemente para garantizar uso exclusivo de Supabase Cloud
  }

  // ==============================================================================
  // GESTIÓN DIRECTA EN MEMORIA (SIN INTERFERENCIA DE LOCALSTORAGE)
  // ==============================================================================

  loadTeams(disciplinaId) {
    const cleanId = getCleanDisciplineId(disciplinaId || this.data?.config?.disciplinaActual || 'baloncesto-master');
    if (!cleanId) return [];
    return (this.data?.equipos || []).filter((t) => getCleanDisciplineId(t.disciplinaId) === cleanId);
  }

  saveTeams(disciplinaId, teams) {
    const cleanId = getCleanDisciplineId(disciplinaId || this.data?.config?.disciplinaActual || 'baloncesto-master');
    if (!cleanId) return;

    const safeTeams = (Array.isArray(teams) ? teams : []).map((t) => ({
      ...t,
      disciplinaId: cleanId
    }));

    if (this.data) {
      this.data.equipos = (this.data.equipos || [])
        .filter((t) => getCleanDisciplineId(t.disciplinaId) !== cleanId)
        .concat(safeTeams);
    }
  }

  loadMatches(disciplinaId) {
    const cleanId = getCleanDisciplineId(disciplinaId || this.data?.config?.disciplinaActual || 'baloncesto-master');
    if (!cleanId) return [];
    return (this.data?.partidos || []).filter((m) => getCleanDisciplineId(m.disciplinaId) === cleanId);
  }

  saveMatches(disciplinaId, matches) {
    const cleanId = getCleanDisciplineId(disciplinaId || this.data?.config?.disciplinaActual || 'baloncesto-master');
    if (!cleanId) return;

    const safeMatches = (Array.isArray(matches) ? matches : []).map((m) => ({
      ...m,
      disciplinaId: cleanId
    }));

    if (this.data) {
      this.data.partidos = (this.data.partidos || [])
        .filter((m) => getCleanDisciplineId(m.disciplinaId) !== cleanId)
        .concat(safeMatches);
    }
  }

  loadAthletes(disciplinaId) {
    const cleanId = getCleanDisciplineId(disciplinaId || this.data?.config?.disciplinaActual || 'baloncesto-master');
    if (!cleanId) return [];
    return (this.data?.atletas || []).filter((a) => getCleanDisciplineId(a.disciplinaId) === cleanId);
  }

  saveAthletes(disciplinaId, athletes) {
    const cleanId = getCleanDisciplineId(disciplinaId || this.data?.config?.disciplinaActual || 'baloncesto-master');
    if (!cleanId) return;

    const safeAthletes = (Array.isArray(athletes) ? athletes : []).map((a) => ({
      ...a,
      disciplinaId: cleanId
    }));

    if (this.data) {
      this.data.atletas = (this.data.atletas || [])
        .filter((a) => getCleanDisciplineId(a.disciplinaId) !== cleanId)
        .concat(safeAthletes);
    }
  }

  syncGlobalDataArrays() {
    // Los arreglos principales (disciplinas, equipos, atletas, partidos) residen canónicamente en this.data
  }

  setupBroadcast() {
    if (broadcast) {
      broadcast.onmessage = (event) => {
        if (event.data && event.data.type === 'STORE_UPDATED') {
          console.log('[Broadcast] Received state update from another tab');
          this.data = this.loadFromStorage();
          this.notify(event.data.payload);
        }
      };
    }
  }

  notify(meta = {}) {
    this.saveToStorage();
    if (broadcast) {
      broadcast.postMessage({ type: 'STORE_UPDATED', payload: meta });
    }
    for (const listener of this.listeners) {
      try {
        listener(this.data, meta);
      } catch (err) {
        console.error('Error in store listener:', err);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Getters
  getDisciplinas() {
    return this.data.disciplinas || [];
  }

  getDisciplinaPorId(id) {
    if (!id) return null;
    const cleanId = getCleanDisciplineId(id);
    return (this.data?.disciplinas || []).find((d) => getCleanDisciplineId(d.id) === cleanId) || null;
  }

  getDisciplinaActual() {
    const id = this.data.config.disciplinaActual;
    return this.data.disciplinas.find((d) => getCleanDisciplineId(d.id) === getCleanDisciplineId(id)) || this.data.disciplinas[0];
  }

  setDisciplinaActual(id) {
    if (!id) return;
    this.data.config.disciplinaActual = id;
    this.saveToStorage();
    this.notify({ action: 'change_discipline', id });
  }

  getEquipos(disciplinaId = null) {
    const target = getCleanDisciplineId(disciplinaId || this.data.config.disciplinaActual);
    if (!target) return [];
    return this.loadTeams(target);
  }

  getEquipoPorNombre(nombre, disciplinaId = null) {
    if (!nombre) return null;
    const str = String(nombre).trim().toLowerCase();
    if (!str) return null;

    const discTarget = getCleanDisciplineId(disciplinaId || this.data?.config?.disciplinaActual);
    const pool = discTarget ? this.loadTeams(discTarget) : (this.data?.equipos || []);

    // 1. Coincidencia exacta por nombre en la disciplina
    const exact = pool.find((eq) => eq.nombre && eq.nombre.trim().toLowerCase() === str);
    if (exact) return exact;

    // 2. Coincidencia por ID o Siglas
    const byIdOrSiglas = pool.find((eq) => 
      (eq.id && eq.id.trim().toLowerCase() === str) || 
      (eq.siglas && eq.siglas.trim().toLowerCase() === str)
    );
    if (byIdOrSiglas) return byIdOrSiglas;

    // 3. Coincidencia normalizada
    const norm = (s) => String(s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
    const normStr = norm(str);
    if (normStr) {
      const byNorm = pool.find((eq) => norm(eq.nombre) === normStr || norm(eq.siglas) === normStr);
      if (byNorm) return byNorm;

      const byContains = pool.find((eq) => {
        const neq = norm(eq.nombre);
        return neq && (neq.includes(normStr) || normStr.includes(neq));
      });
      if (byContains) return byContains;
    }

    // 4. Fallback global solo si no se solicitó una disciplina específica
    if (!disciplinaId && this.data && Array.isArray(this.data.equipos)) {
      const globalMatch = this.data.equipos.find((eq) => eq.nombre && eq.nombre.trim().toLowerCase() === str);
      if (globalMatch) return globalMatch;
    }

    return null;
  }

  getEquipoPorId(id, disciplinaId = null) {
    if (id === undefined || id === null) return null;
    const idStr = String(id).trim().toLowerCase();
    const discTarget = getCleanDisciplineId(disciplinaId);
    if (discTarget) {
      const discTeams = this.loadTeams(discTarget);
      const found = discTeams.find((eq) => eq.id && eq.id.trim().toLowerCase() === idStr);
      if (found) return found;
      return null;
    }
    return (this.data?.equipos || []).find((eq) => eq.id && eq.id.trim().toLowerCase() === idStr) || null;
  }

  getAtletas(equipoNombre = null, disciplinaId = null) {
    const target = getCleanDisciplineId(disciplinaId || this.data.config.disciplinaActual);
    const pool = target ? this.loadAthletes(target) : (this.data?.atletas || []);
    if (!equipoNombre) return pool;
    const norm = String(equipoNombre).trim().toLowerCase();
    return pool.filter((a) => a.equipo && a.equipo.trim().toLowerCase() === norm);
  }

  getPartidos(disciplinaId = null) {
    const target = getCleanDisciplineId(disciplinaId || this.data.config.disciplinaActual);
    if (!target) return [];
    return this.loadMatches(target);
  }

  getPartidoPorId(id, disciplinaId = null) {
    if (id === undefined || id === null) return null;
    const idStr = String(id).trim();
    if (disciplinaId) {
      const matches = this.getPartidos(disciplinaId);
      const foundInDisc = matches.find((p) => p.id === id || String(p.id).trim() === idStr);
      if (foundInDisc) return foundInDisc;
    }
    return (this.data?.partidos || []).find((p) => p.id === id || String(p.id).trim() === idStr) || null;
  }

  getConfig() {
    return this.data.config;
  }

  getUsuarioActual() {
    return this.data.config.usuarioActual;
  }

  // State Modifiers
  setUsuarioActual(usuario) {
    this.data.config.usuarioActual = usuario;
    try {
      if (usuario) {
        safeLocalStorageSetItem('gmd_jl_active_session', JSON.stringify(usuario));
      } else {
        localStorage.removeItem('gmd_jl_active_session');
      }
    } catch (e) {
      console.warn('Error syncing session in localStorage:', e);
    }
    this.notify({ action: 'auth_change', usuario });
  }

  updateConfig(newConfig) {
    this.data.config = { ...this.data.config, ...newConfig };
    if (newConfig && newConfig.disciplinas && Array.isArray(newConfig.disciplinas)) {
      this.data.disciplinas = JSON.parse(JSON.stringify(newConfig.disciplinas));
      this.data.config.disciplinas = JSON.parse(JSON.stringify(newConfig.disciplinas));
      this.saveDisciplinasConfig(this.data.disciplinas);
    } else {
      this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas || []));
    }
    this.saveGlobalConfig(this.data.config);
    this.saveToStorage();
    this.notify({ action: 'config_updated' });
  }

  // Matches & Live Scoreboard
  updatePartido(partidoId, patch, syncCloud = true) {
    if (partidoId === undefined || partidoId === null) return null;
    const idStr = String(partidoId).trim();
    const existingMatch = this.getPartidoPorId(partidoId);
    const discId = getCleanDisciplineId(existingMatch?.disciplinaId || patch?.disciplinaId || this.data.config.disciplinaActual);
    const matches = this.loadMatches(discId);
    const idx = matches.findIndex((p) => p.id === partidoId || String(p.id).trim() === idStr);
    if (idx !== -1) {
      matches[idx] = {
        ...matches[idx],
        ...patch,
        disciplinaId: discId,
        actualizadoEn: new Date().toISOString()
      };
      this.saveMatches(discId, matches);
      this.syncGlobalDataArrays();
      this.notify({ action: 'match_updated', partidoId, patch, disciplinaId: discId });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.updatePartido(partidoId, patch);
      }
      return matches[idx];
    } else if (patch && (patch.equipoLocal || patch.equipoVisitante)) {
      // Upsert: si el partido no existía localmente pero trae datos válidos (ej. sincronización Realtime/Cloud)
      const nuevo = {
        id: partidoId,
        disciplinaId: discId,
        fecha: patch.fecha || new Date().toISOString().split('T')[0],
        hora: patch.hora || '18:00',
        sede: patch.sede || 'Gimnasio Pablo Higuerey',
        fase: patch.fase || 'Fase de Grupos',
        grupo: patch.grupo || 'Grupo A',
        equipoLocal: patch.equipoLocal,
        q1Loc: Number(patch.q1Loc) || 0,
        q2Loc: Number(patch.q2Loc) || 0,
        q3Loc: Number(patch.q3Loc) || 0,
        q4Loc: Number(patch.q4Loc) || 0,
        otLoc: Number(patch.otLoc) || 0,
        totalLocal: Number(patch.totalLocal ?? patch.puntosLocal ?? 0),
        puntosLocal: Number(patch.totalLocal ?? patch.puntosLocal ?? 0),
        equipoVisitante: patch.equipoVisitante,
        q1Vis: Number(patch.q1Vis) || 0,
        q2Vis: Number(patch.q2Vis) || 0,
        q3Vis: Number(patch.q3Vis) || 0,
        q4Vis: Number(patch.q4Vis) || 0,
        otVis: Number(patch.otVis) || 0,
        totalVisitante: Number(patch.totalVisitante ?? patch.puntosVisitante ?? 0),
        puntosVisitante: Number(patch.totalVisitante ?? patch.puntosVisitante ?? 0),
        estado: patch.estado || 'PROGRAMADO',
        periodoActual: patch.periodoActual || 'Por Iniciar',
        reloj: patch.reloj || '10:00',
        faltasLoc: Number(patch.faltasLoc) || 0,
        faltasVis: Number(patch.faltasVis) || 0,
        actualizadoEn: new Date().toISOString()
      };
      matches.push(nuevo);
      this.saveMatches(discId, matches);
      this.syncGlobalDataArrays();
      this.notify({ action: 'match_added', id: partidoId, disciplinaId: discId });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.syncPartido(partidoId, nuevo);
      }
      return nuevo;
    }
    return null;
  }

  addPartido(nuevoPartido, syncCloud = true) {
    const discId = getCleanDisciplineId(nuevoPartido.disciplinaId || this.data.config.disciplinaActual || 'baloncesto-master');
    const matches = this.loadMatches(discId);
    const id = nuevoPartido.id || `PAR-${discId.substring(0, 3).toUpperCase()}-${String(matches.length + 1).padStart(3, '0')}`;
    const totLoc = Number(nuevoPartido.totalLocal ?? nuevoPartido.puntosLocal ?? 0);
    const totVis = Number(nuevoPartido.totalVisitante ?? nuevoPartido.puntosVisitante ?? 0);
    const partido = {
      id,
      disciplinaId: discId,
      fecha: nuevoPartido.fecha || new Date().toISOString().split('T')[0],
      hora: nuevoPartido.hora || '18:00',
      sede: nuevoPartido.sede || 'Gimnasio Pablo Higuerey',
      fase: nuevoPartido.fase || 'Fase de Grupos',
      grupo: nuevoPartido.grupo || 'Grupo A',
      equipoLocal: nuevoPartido.equipoLocal,
      q1Loc: Number(nuevoPartido.q1Loc) || 0,
      q2Loc: Number(nuevoPartido.q2Loc) || 0,
      q3Loc: Number(nuevoPartido.q3Loc) || 0,
      q4Loc: Number(nuevoPartido.q4Loc) || 0,
      otLoc: Number(nuevoPartido.otLoc) || 0,
      totalLocal: totLoc,
      puntosLocal: totLoc,
      equipoVisitante: nuevoPartido.equipoVisitante,
      q1Vis: Number(nuevoPartido.q1Vis) || 0,
      q2Vis: Number(nuevoPartido.q2Vis) || 0,
      q3Vis: Number(nuevoPartido.q3Vis) || 0,
      q4Vis: Number(nuevoPartido.q4Vis) || 0,
      otVis: Number(nuevoPartido.otVis) || 0,
      totalVisitante: totVis,
      puntosVisitante: totVis,
      estado: nuevoPartido.estado || 'PROGRAMADO',
      periodoActual: nuevoPartido.periodoActual || 'Por Iniciar',
      reloj: nuevoPartido.reloj || '10:00',
      faltasLoc: Number(nuevoPartido.faltasLoc) || 0,
      faltasVis: Number(nuevoPartido.faltasVis) || 0,
      actualizadoEn: new Date().toISOString()
    };
    matches.push(partido);
    this.saveMatches(discId, matches);
    this.syncGlobalDataArrays();
    this.notify({ action: 'match_added', id, disciplinaId: discId });

    if (syncCloud && window.supabaseService ) {
      window.supabaseService.syncPartido(id, partido);
    }
    return partido;
  }

  deletePartido(id, syncCloud = true) {
    const match = this.getPartidoPorId(id);
    const discId = getCleanDisciplineId(match?.disciplinaId || this.data.config.disciplinaActual);
    let matches = this.loadMatches(discId);
    matches = matches.filter((p) => p.id !== id);
    this.saveMatches(discId, matches);
    this.syncGlobalDataArrays();
    this.notify({ action: 'match_deleted', id, disciplinaId: discId });

    if (syncCloud && window.supabaseService ) {
      window.supabaseService.deletePartido(id);
    }
  }

  clearPartidos(disciplinaId = null) {
    const target = getCleanDisciplineId(disciplinaId || this.data.config.disciplinaActual);
    this.saveMatches(target, []);
    this.syncGlobalDataArrays();
    this.notify({ action: 'matches_cleared', disciplinaId: target });
    if (window.supabaseService && window.supabaseService.client) {
      window.supabaseService.client.from('partidos').delete().eq('disciplina_id', target).catch((err) => {
        console.warn('[Store] Error al limpiar partidos en Supabase:', err);
      });
    }
    return true;
  }

  generateScheduleForDiscipline(disciplinaId = null, replaceExisting = true) {
    const target = getCleanDisciplineId(disciplinaId || this.data.config.disciplinaActual);
    const disc = this.data.disciplinas?.find((d) => getCleanDisciplineId(d.id) === target) || this.getDisciplinaActual();
    const formato = this.getFormatoCompeticion(target);
    const equipos = this.getEquipos(target);

    if (equipos.length < 2) {
      return {
        success: false,
        message: `Se requieren al menos 2 equipos registrados en "${disc?.nombre || 'la disciplina'}" para generar el calendario.`
      };
    }

    if (replaceExisting) {
      this.clearPartidos(target);
    }

    const sedesConfig = this.data.config.sedesTorneo || [
      'Gimnasio Pablo Higuerey',
      'Complejo Deportivo JL',
      'Cancha Los Robles',
      'Domo Bolivariano'
    ];

    const horarios = ['17:00', '18:30', '20:00'];
    const hoy = new Date();
    let matchIndex = 0;
    const generated = [];

    const formatDate = (d) => d.toISOString().split('T')[0];

    if (formato === 'todos_contra_todos') {
      const n = equipos.length;
      let dayOffset = 0;
      let timeSlot = 0;

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const eqLocal = equipos[i];
          const eqVis = equipos[j];
          const matchDate = new Date(hoy.getTime() + dayOffset * 86400000);
          const time = horarios[timeSlot % horarios.length];
          const venue = eqLocal.sedePrincipal || sedesConfig[matchIndex % sedesConfig.length];
          const jornada = Math.floor(matchIndex / Math.max(1, Math.floor(n / 2))) + 1;

          const nuevo = {
            id: `PAR-${Date.now()}-${matchIndex + 1}`,
            disciplinaId: target,
            fecha: formatDate(matchDate),
            hora: time,
            sede: venue,
            fase: `Jornada ${jornada} (Liga Regular)`,
            grupo: 'Grupo Único',
            equipoLocal: eqLocal.nombre,
            q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, totalLocal: 0,
            equipoVisitante: eqVis.nombre,
            q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, totalVisitante: 0,
            estado: 'PROGRAMADO',
            periodoActual: 'Por Iniciar',
            reloj: '10:00',
            faltasLoc: 0, faltasVis: 0,
            actualizadoEn: new Date().toISOString()
          };

          generated.push(nuevo);
          matchIndex++;
          timeSlot++;
          if (timeSlot % horarios.length === 0) {
            dayOffset++;
          }
        }
      }
    } else if (formato === 'eliminacion_directa') {
      let dayOffset = 1;
      const n = equipos.length;
      const totalPairs = Math.floor(n / 2);

      for (let i = 0; i < totalPairs; i++) {
        const eqLocal = equipos[i * 2];
        const eqVis = equipos[i * 2 + 1];
        const matchDate = new Date(hoy.getTime() + dayOffset * 86400000);
        const time = horarios[i % horarios.length];
        const venue = eqLocal.sedePrincipal || sedesConfig[i % sedesConfig.length];

        let faseName = 'Cuartos de Final';
        if (totalPairs === 1) faseName = 'Gran Final';
        else if (totalPairs === 2) faseName = `Semifinal ${i + 1}`;
        else faseName = `Cuartos de Final - Llave ${i + 1}`;

        const nuevo = {
          id: `PAR-${Date.now()}-${matchIndex + 1}`,
          disciplinaId: target,
          fecha: formatDate(matchDate),
          hora: time,
          sede: venue,
          fase: faseName,
          grupo: 'Playoffs',
          equipoLocal: eqLocal.nombre,
          q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, totalLocal: 0,
          equipoVisitante: eqVis.nombre,
          q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, totalVisitante: 0,
          estado: 'PROGRAMADO',
          periodoActual: 'Por Iniciar',
          reloj: '10:00',
          faltasLoc: 0, faltasVis: 0,
          actualizadoEn: new Date().toISOString()
        };

        generated.push(nuevo);
        matchIndex++;
      }
    } else {
      // por_grupo / combinado_mixto
      const groupsMap = {};
      equipos.forEach((eq) => {
        const grp = eq.grupo || 'Grupo A';
        if (!groupsMap[grp]) groupsMap[grp] = [];
        groupsMap[grp].push(eq);
      });

      let dayOffset = 0;
      let timeSlot = 0;

      Object.keys(groupsMap).forEach((grpName) => {
        const grpTeams = groupsMap[grpName];
        const n = grpTeams.length;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const eqLocal = grpTeams[i];
            const eqVis = grpTeams[j];
            const matchDate = new Date(hoy.getTime() + dayOffset * 86400000);
            const time = horarios[timeSlot % horarios.length];
            const venue = eqLocal.sedePrincipal || sedesConfig[matchIndex % sedesConfig.length];

            const nuevo = {
              id: `PAR-${Date.now()}-${matchIndex + 1}`,
              disciplinaId: target,
              fecha: formatDate(matchDate),
              hora: time,
              sede: venue,
              fase: `Fase de Grupos - ${grpName}`,
              grupo: grpName,
              equipoLocal: eqLocal.nombre,
              q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, totalLocal: 0,
              equipoVisitante: eqVis.nombre,
              q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, totalVisitante: 0,
              estado: 'PROGRAMADO',
              periodoActual: 'Por Iniciar',
              reloj: '10:00',
              faltasLoc: 0, faltasVis: 0,
              actualizadoEn: new Date().toISOString()
            };

            generated.push(nuevo);
            matchIndex++;
            timeSlot++;
            if (timeSlot % horarios.length === 0) {
              dayOffset++;
            }
          }
        }
      });
    }

    const currentMatches = replaceExisting ? [] : this.loadMatches(target);
    const combined = currentMatches.concat(generated);
    this.saveMatches(target, combined);
    this.syncGlobalDataArrays();
    this.notify({ action: 'schedule_generated', disciplinaId: target, count: generated.length });
    return { success: true, count: generated.length, matches: generated };
  }

  // Teams
  addEquipo(equipo, syncCloud = true) {
    const discId = getCleanDisciplineId(equipo.disciplinaId || this.data.config.disciplinaActual || 'baloncesto-master');
    const teams = this.loadTeams(discId);
    const id = equipo.id || `EQ-${discId.substring(0, 3).toUpperCase()}-${String(teams.length + 1).padStart(2, '0')}`;
    const nuevo = {
      id,
      nombre: equipo.nombre,
      disciplinaId: discId,
      grupo: equipo.grupo || 'Grupo A',
      sedePrincipal: equipo.sedePrincipal || 'Gimnasio Pablo Higuerey',
      siglas: equipo.siglas || equipo.nombre.substring(0, 3).toUpperCase(),
      logoUrl: equipo.logoUrl || './assets/logo.png',
      color: equipo.color || '#800020',
      delegadoNombre: equipo.delegadoNombre || '',
      delegadoTelefono: equipo.delegadoTelefono || '',
      delegadoEmail: equipo.delegadoEmail || '',
      delegadoCedula: equipo.delegadoCedula || '',
      pin: equipo.pin || '2024',
      entrenador: equipo.entrenador || '',
      asistente: equipo.asistente || '',
      utilero: equipo.utilero || ''
    };
    teams.push(nuevo);
    this.saveTeams(discId, teams);
    this.syncGlobalDataArrays();
    this.notify({ action: 'team_added', id, disciplinaId: discId });

    if (syncCloud && window.supabaseService ) {
      window.supabaseService.syncEquipo(id, nuevo);
    }
    return nuevo;
  }

  updateEquipo(id, patch, syncCloud = true) {
    const eq = this.getEquipoPorId(id);
    const discId = getCleanDisciplineId(eq?.disciplinaId || patch?.disciplinaId || this.data.config.disciplinaActual);
    const teams = this.loadTeams(discId);
    const idx = teams.findIndex((item) => item.id === id);
    if (idx !== -1) {
      teams[idx] = { ...teams[idx], ...patch, disciplinaId: discId };
      this.saveTeams(discId, teams);
      this.syncGlobalDataArrays();
      this.notify({ action: 'team_updated', id, disciplinaId: discId });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.updateEquipo(id, patch);
      }
      return teams[idx];
    } else if (patch && patch.nombre) {
      // Upsert: si no existía localmente pero trae datos válidos (ej. sincronización Realtime/Cloud)
      const nuevo = {
        id,
        nombre: patch.nombre,
        disciplinaId: discId,
        grupo: patch.grupo || 'Grupo A',
        sedePrincipal: patch.sedePrincipal || 'Gimnasio Pablo Higuerey',
        siglas: patch.siglas || patch.nombre.substring(0, 3).toUpperCase(),
        logoUrl: patch.logoUrl || './assets/logo.png',
        color: patch.color || '#800020',
        delegadoNombre: patch.delegadoNombre || '',
        delegadoTelefono: patch.delegadoTelefono || '',
        delegadoEmail: patch.delegadoEmail || '',
        delegadoCedula: patch.delegadoCedula || '',
        pin: patch.pin || '2024',
        entrenador: patch.entrenador || '',
        asistente: patch.asistente || '',
        utilero: patch.utilero || ''
      };
      teams.push(nuevo);
      this.saveTeams(discId, teams);
      this.syncGlobalDataArrays();
      this.notify({ action: 'team_added', id, disciplinaId: discId });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.syncEquipo(id, nuevo);
      }
      return nuevo;
    }
    return null;
  }

  deleteEquipo(id, userRole = 'superadmin', syncCloud = true) {
    const eq = this.getEquipoPorId(id);
    if (!eq) return false;
    const discId = getCleanDisciplineId(eq.disciplinaId || this.data.config.disciplinaActual);
    let teams = this.loadTeams(discId);
    teams = teams.filter((item) => item.id !== id);
    this.saveTeams(discId, teams);

    // Also remove athletes of this team in this discipline
    let athletes = this.loadAthletes(discId);
    athletes = athletes.filter((a) => a.equipo !== eq.nombre);
    this.saveAthletes(discId, athletes);

    this.syncGlobalDataArrays();
    this.notify({ action: 'team_deleted', id, equipoNombre: eq.nombre, disciplinaId: discId });

    if (syncCloud && window.supabaseService ) {
      window.supabaseService.deleteEquipo(id);
    }
    return true;
  }

  updateEquiposGrupos(assignments) {
    if (!Array.isArray(assignments)) return;
    const touchedDiscs = new Set();
    assignments.forEach(({ id, grupo }) => {
      const eq = this.getEquipoPorId(id);
      if (eq) {
        eq.grupo = grupo;
        const dId = getCleanDisciplineId(eq.disciplinaId || this.data.config.disciplinaActual);
        touchedDiscs.add(dId);
        const teams = this.loadTeams(dId);
        const tIdx = teams.findIndex((item) => item.id === id);
        if (tIdx !== -1) {
          teams[tIdx].grupo = grupo;
          this.saveTeams(dId, teams);
        }
        if (window.supabaseService) {
          window.supabaseService.updateEquipo(id, { grupo }).catch((err) => {
            console.warn('[Store] Error al actualizar grupo en Supabase:', err);
          });
        }
      }
    });
    this.syncGlobalDataArrays();
    this.notify({ action: 'groups_updated' });
  }

  getFormatoCompeticion(disciplinaId = null) {
    const target = getCleanDisciplineId(disciplinaId || this.data.config.disciplinaActual);
    const disc = this.data.disciplinas?.find((d) => getCleanDisciplineId(d.id) === target);
    return disc?.formatoTorneo || this.data.config.formatoCompeticion || 'por_grupo';
  }

  setFormatoCompeticion(formato, disciplinaId = null) {
    const target = getCleanDisciplineId(disciplinaId || this.data.config.disciplinaActual);
    const disc = this.data.disciplinas?.find((d) => getCleanDisciplineId(d.id) === target);
    if (disc) {
      disc.formatoTorneo = formato;
    }
    this.data.config.formatoCompeticion = formato;
    this.saveToStorage();
    this.notify({ action: 'format_updated', formato, disciplinaId: target });
  }

  getReglamentoTorneo() {
    if (Array.isArray(this.data.config.reglamentoTorneo) && this.data.config.reglamentoTorneo.length > 0) {
      return this.data.config.reglamentoTorneo;
    }
    return [
      'Puntuación Oficial: 2 Puntos por victoria, 1 Punto por derrota (empates según disciplina).',
      'Criterio de Desempate: 1) Mayor Diferencia de Puntos (DIF), 2) Mayor Puntos a Favor (PF), 3) Serie Particular.',
      'Inscripción de Nóminas: Cada atleta debe estar formalmente inscrito con cédula y dorsal antes de cada encuentro.',
      'Mesa de Anotación: Los marcadores se transmiten en vivo a la nube mediante Supabase Realtime.'
    ];
  }

  setReglamentoTorneo(reglas) {
    this.data.config.reglamentoTorneo = Array.isArray(reglas) ? reglas : [];
    this.saveToStorage();
    this.notify({ action: 'reglamento_updated' });
  }

  // Athletes
  addAtleta(atleta, syncCloud = true) {
    const discId = getCleanDisciplineId(atleta.disciplinaId || this.data.config.disciplinaActual || 'baloncesto-master');
    const athletes = this.loadAthletes(discId);
    const id = atleta.id || `ATL-${discId.substring(0, 3).toUpperCase()}-${String(athletes.length + 1).padStart(3, '0')}`;
    const nuevo = {
      id,
      disciplinaId: discId,
      cedula: atleta.cedula || '',
      nombres: atleta.nombres || '',
      fechaNacimiento: atleta.fechaNacimiento || '',
      edad: Number(atleta.edad) || 0,
      camiseta: String(atleta.camiseta || '0'),
      posicion: atleta.posicion || 'Alero',
      equipo: atleta.equipo || '',
      rol: atleta.rol || 'Atleta',
      fotoUrl: atleta.fotoUrl || ''
    };
    athletes.push(nuevo);
    this.saveAthletes(discId, athletes);
    this.syncGlobalDataArrays();
    this.notify({ action: 'athlete_added', id, disciplinaId: discId });

    if (syncCloud && window.supabaseService ) {
      window.supabaseService.syncAtleta(id, nuevo);
    }
    return nuevo;
  }

  updateAtleta(id, patch, syncCloud = true) {
    const all = this.data?.atletas || [];
    const a = all.find((item) => item.id === id);
    const discId = getCleanDisciplineId(a?.disciplinaId || patch?.disciplinaId || this.data.config.disciplinaActual);
    const athletes = this.loadAthletes(discId);
    const idx = athletes.findIndex((item) => item.id === id);
    if (idx !== -1) {
      athletes[idx] = { ...athletes[idx], ...patch, disciplinaId: discId };
      this.saveAthletes(discId, athletes);
      this.syncGlobalDataArrays();
      this.notify({ action: 'athlete_updated', id, disciplinaId: discId });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.updateAtleta(id, patch);
      }
      return athletes[idx];
    } else if (patch && (patch.nombres || patch.cedula)) {
      // Upsert: si no existía localmente pero trae datos válidos (ej. sincronización Realtime/Cloud)
      const nuevo = {
        id,
        disciplinaId: discId,
        cedula: patch.cedula || '',
        nombres: patch.nombres || '',
        fechaNacimiento: patch.fechaNacimiento || '',
        edad: Number(patch.edad) || 0,
        camiseta: String(patch.camiseta || '0'),
        posicion: patch.posicion || 'Alero',
        equipo: patch.equipo || '',
        rol: patch.rol || 'Atleta',
        fotoUrl: patch.fotoUrl || ''
      };
      athletes.push(nuevo);
      this.saveAthletes(discId, athletes);
      this.syncGlobalDataArrays();
      this.notify({ action: 'athlete_added', id, disciplinaId: discId });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.syncAtleta(id, nuevo);
      }
      return nuevo;
    }
    return null;
  }

  deleteAtleta(id, userRole = 'superadmin', syncCloud = true) {
    if (userRole !== 'superadmin') {
      console.warn('RESTRICCIÓN DE SEGURIDAD: Los delegados no pueden eliminar atletas directamente. Deben solicitar baja formal.');
      return false;
    }
    const all = this.data?.atletas || [];
    const a = all.find((item) => item.id === id);
    const discId = getCleanDisciplineId(a?.disciplinaId || this.data.config.disciplinaActual);
    let athletes = this.loadAthletes(discId);
    athletes = athletes.filter((item) => item.id !== id);
    this.saveAthletes(discId, athletes);
    this.syncGlobalDataArrays();
    this.notify({ action: 'athlete_deleted', id, disciplinaId: discId });

    if (syncCloud && window.supabaseService ) {
      window.supabaseService.deleteAtleta(id);
    }
    return true;
  }

  // Formal Discharge Request Workflow (Delegado -> SuperAdmin)
  solicitarBajaAtleta({ atletaId, motivo, delegadoNombre, equipoNombre }) {
    if (!this.data.config.solicitudesBaja) this.data.config.solicitudesBaja = [];
    const atleta = this.data.atletas.find((a) => a.id === atletaId);
    const solicitud = {
      id: `SOL-${Date.now()}`,
      atletaId,
      atletaNombres: atleta ? atleta.nombres : 'Desconocido',
      atletaCedula: atleta ? atleta.cedula : '',
      atletaCamiseta: atleta ? atleta.camiseta : '',
      equipoNombre: equipoNombre || (atleta ? atleta.equipo : ''),
      delegadoNombre: delegadoNombre || 'Delegado Oficial',
      motivo: motivo || 'Solicitud de desvinculación formal',
      fecha: new Date().toISOString(),
      estado: 'PENDIENTE' // PENDIENTE | APROBADA | RECHAZADA
    };
    this.data.config.solicitudesBaja.unshift(solicitud);
    this.notify({ action: 'solicitud_baja_created', solicitud });
    return solicitud;
  }

  resolverSolicitudBaja(solicitudId, aprobada = true) {
    if (!this.data.config.solicitudesBaja) return false;
    const sol = this.data.config.solicitudesBaja.find((s) => s.id === solicitudId);
    if (sol) {
      sol.estado = aprobada ? 'APROBADA' : 'RECHAZADA';
      sol.resueltaEn = new Date().toISOString();
      if (aprobada) {
        this.deleteAtleta(sol.atletaId, 'superadmin');
      }
      this.notify({ action: 'solicitud_baja_resolved', solicitudId, aprobada });
      return true;
    }
    return false;
  }

  // Roster Freeze / Lock Workflow (SuperAdmin)
  setRostersCongelados(congelar) {
    this.data.config.rostersCongelados = !!congelar;
    this.notify({ action: 'rosters_freeze_toggled', congelados: this.data.config.rostersCongelados });
  }

  // Delegate Credentials Management (SuperAdmin)
  updateDelegadoCredenciales(equipoId, { pin, delegadoEmail, delegadoNombre, delegadoTelefono }) {
    const eq = this.getEquipoPorId(equipoId);
    if (eq) {
      const patch = {};
      if (typeof pin !== 'undefined') { eq.pin = pin; patch.pin = pin; }
      if (typeof delegadoEmail !== 'undefined') { eq.delegadoEmail = delegadoEmail; patch.delegadoEmail = delegadoEmail; }
      if (typeof delegadoNombre !== 'undefined') { eq.delegadoNombre = delegadoNombre; patch.delegadoNombre = delegadoNombre; }
      if (typeof delegadoTelefono !== 'undefined') { eq.delegadoTelefono = delegadoTelefono; patch.delegadoTelefono = delegadoTelefono; }
      this.notify({ action: 'delegate_credentials_updated', equipoId });
      if (window.supabaseService) {
        window.supabaseService.updateEquipo(equipoId, patch).catch((err) => {
          console.warn('[Store] Error al sincronizar credenciales en Supabase:', err);
        });
      }
      return eq;
    }
    return null;
  }

  // Sponsors & Branding Management (SuperAdmin)
  updatePatrocinadores(patrocinadores) {
    this.data.config.patrocinadores = patrocinadores;
    this.notify({ action: 'patrocinadores_updated' });
  }

  // Tournament Structure (Phases & Venues)
  updateFasesTorneo(fases) {
    this.data.config.fasesTorneo = fases;
    this.notify({ action: 'fases_updated' });
  }

  updateSedesTorneo(sedes) {
    this.data.config.sedesTorneo = sedes;
    this.notify({ action: 'sedes_updated' });
  }

  // Disciplines
  setDisciplinas(disciplinas, syncCloud = true) {
    if (Array.isArray(disciplinas)) {
      this.data.disciplinas = disciplinas;
      this.data.config.disciplinas = JSON.parse(JSON.stringify(disciplinas));
      this.saveDisciplinasConfig(this.data.disciplinas);
      this.saveToStorage();
      this.notify({ action: 'disciplines_updated' });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.syncDisciplinas().catch((err) => {
          console.warn('[Store] Error al sincronizar disciplinas en Supabase:', err);
        });
      }
    }
  }

  addDisciplina(disc, syncCloud = true) {
    const rawId = disc.id || disc.nombre.toLowerCase().replace(/\s+/g, '-');
    const id = getCleanDisciplineId(rawId);
    const logoVal = (disc.avatar || disc.logoUrl || disc.logo || disc.banner || '').trim();
    const nueva = {
      id,
      nombre: disc.nombre,
      categoria: disc.categoria || 'Libre',
      descripcion: disc.descripcion || '',
      icono: disc.icono || '🏆',
      avatar: logoVal,
      logoUrl: logoVal,
      logo: logoVal,
      banner: (disc.banner || logoVal).trim(),
      color: disc.color || '#D4AF37',
      activa: disc.activa !== false,
      grupos: disc.grupos && disc.grupos.length > 0 ? disc.grupos : ['Grupo A', 'Grupo B'],
      formatoTorneo: disc.formatoTorneo || 'por_grupo',
      reglas: {
        periodos: Number(disc.reglas?.periodos) || 4,
        nombrePeriodo: disc.reglas?.nombrePeriodo || 'Cuarto',
        ptsGanador: Number(disc.reglas?.ptsGanador) || 2,
        ptsPerdedor: Number(disc.reglas?.ptsPerdedor) || 1,
        duracionMin: Number(disc.reglas?.duracionMin) || 10
      }
    };

    // Aislamiento Total: Inicializar los datos de esta disciplina COMPLETAMENTE EN BLANCO ([])
    this.saveTeams(id, []);
    this.saveMatches(id, []);
    this.saveAthletes(id, []);

    this.data.disciplinas.push(nueva);
    this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas));
    this.saveDisciplinasConfig(this.data.disciplinas);
    this.saveToStorage();
    this.syncGlobalDataArrays();
    this.notify({ action: 'discipline_added', id });

    if (syncCloud && window.supabaseService ) {
      window.supabaseService.syncDisciplina(id, nueva).catch((err) => {
        console.warn('[Store] Error al guardar disciplina en Supabase:', err);
      });
    }
    return nueva;
  }

  updateDisciplina(id, patch, syncCloud = true) {
    const cleanId = getCleanDisciplineId(id);
    const idx = this.data.disciplinas.findIndex((d) => getCleanDisciplineId(d.id) === cleanId);
    if (idx !== -1) {
      const existing = this.data.disciplinas[idx];
      const logoCandidate = patch.logoUrl !== undefined ? patch.logoUrl :
        (patch.avatar !== undefined ? patch.avatar :
        (patch.logo !== undefined ? patch.logo :
        (patch.banner !== undefined ? patch.banner :
        (existing.logoUrl || existing.avatar || existing.logo || existing.banner || ''))));
      const finalLogo = String(logoCandidate || '').trim();

      this.data.disciplinas[idx] = {
        ...existing,
        ...patch,
        avatar: patch.avatar !== undefined ? patch.avatar : finalLogo,
        logoUrl: patch.logoUrl !== undefined ? patch.logoUrl : finalLogo,
        logo: patch.logo !== undefined ? patch.logo : finalLogo,
        banner: patch.banner !== undefined ? patch.banner : (finalLogo || existing.banner || ''),
        reglas: {
          ...existing.reglas,
          ...(patch.reglas || {})
        }
      };
      this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas));
      this.saveDisciplinasConfig(this.data.disciplinas);
      this.saveToStorage();
      this.notify({ action: 'discipline_updated', id: cleanId });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.syncDisciplina(cleanId, this.data.disciplinas[idx]).catch((err) => {
          console.warn('[Store] Error al actualizar disciplina en Supabase:', err);
        });
      }
      return this.data.disciplinas[idx];
    }
    return null;
  }

  toggleDisciplina(id, syncCloud = true) {
    const cleanId = getCleanDisciplineId(id);
    const disc = this.data.disciplinas.find((d) => getCleanDisciplineId(d.id) === cleanId);
    if (disc) {
      disc.activa = !disc.activa;
      this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas));
      this.saveDisciplinasConfig(this.data.disciplinas);
      this.saveToStorage();
      this.notify({ action: 'discipline_toggled', id: cleanId });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.syncDisciplina(cleanId, disc).catch((err) => {
          console.warn('[Store] Error al cambiar estado de disciplina en Supabase:', err);
        });
      }
    }
  }

  deleteDisciplina(id, syncCloud = true) {
    const cleanId = getCleanDisciplineId(id);
    const idx = this.data.disciplinas.findIndex((d) => getCleanDisciplineId(d.id) === cleanId);
    if (idx !== -1) {
      const removed = this.data.disciplinas.splice(idx, 1)[0];
      this.syncGlobalDataArrays();

      // If current active discipline was deleted, fallback to another active discipline
      if (getCleanDisciplineId(this.data.config.disciplinaActual) === cleanId) {
        this.data.config.disciplinaActual = this.data.disciplinas[0]?.id || 'baloncesto-master';
      }
      this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas));
      this.saveDisciplinasConfig(this.data.disciplinas);
      this.saveToStorage();
      this.notify({ action: 'discipline_deleted', id: cleanId, removed });

      if (syncCloud && window.supabaseService ) {
        window.supabaseService.deleteDisciplina(cleanId).catch((err) => {
          console.warn('[Store] Error al eliminar disciplina en Supabase:', err);
        });
      }
      return true;
    }
    return false;
  }

  // ==============================================================================
  // TOURNAMENT FORMAT & GROUPS MANAGEMENT
  // ==============================================================================
  getDisciplinaFormato(disciplinaId = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas.find((d) => d.id === target) || this.getDisciplinaActual();
    return disc?.formatoTorneo || 'por_grupos';
  }

  getDisciplinaGrupos(disciplinaId = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas.find((d) => d.id === target) || this.getDisciplinaActual();
    if (disc?.grupos && Array.isArray(disc.grupos) && disc.grupos.length > 0) {
      return [...disc.grupos];
    }
    // Extract distinct groups from registered teams in this discipline
    const equipos = this.getEquipos(target);
    const set = new Set();
    equipos.forEach((eq) => {
      if (eq.grupo && eq.grupo.trim()) set.add(eq.grupo.trim());
    });
    if (set.size > 0) {
      disc.grupos = Array.from(set);
      return disc.grupos;
    }
    disc.grupos = ['Grupo A', 'Grupo B'];
    return disc.grupos;
  }

  setDisciplinaFormato(disciplinaId, formato, grupos = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas.find((d) => d.id === target) || this.getDisciplinaActual();
    if (!disc) return null;

    disc.formatoTorneo = formato;
    if (grupos && Array.isArray(grupos) && grupos.length > 0) {
      disc.grupos = grupos;
    } else if (!disc.grupos || disc.grupos.length === 0) {
      disc.grupos = this.getDisciplinaGrupos(target);
    }

    if (formato === 'todos_contra_todos') {
      // Automatically group all registered teams under 'Grupo Único'
      const equipos = this.getEquipos(target);
      equipos.forEach((eq) => {
        eq.grupo = 'Grupo Único';
      });
      disc.grupos = ['Grupo Único'];
    }

    this.saveToStorage();
    this.notify({ action: 'formato_updated', disciplinaId: target, formato });
    return disc;
  }

  addGrupoDisciplina(disciplinaId, groupName) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas.find((d) => d.id === target) || this.getDisciplinaActual();
    if (!disc) return false;

    if (!disc.grupos || !Array.isArray(disc.grupos)) {
      disc.grupos = this.getDisciplinaGrupos(target);
    }

    const clean = groupName.trim();
    if (!clean) return false;

    const exists = disc.grupos.some((g) => g.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      disc.grupos.push(clean);
      this.saveToStorage();
      this.notify({ action: 'grupo_added', disciplinaId: target, grupo: clean });
      return true;
    }
    return false;
  }

  renameGrupoDisciplina(disciplinaId, oldName, newName) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas.find((d) => d.id === target) || this.getDisciplinaActual();
    if (!disc) return false;

    const cleanNew = newName.trim();
    if (!cleanNew) return false;

    if (!disc.grupos || !Array.isArray(disc.grupos)) {
      disc.grupos = this.getDisciplinaGrupos(target);
    }

    const idx = disc.grupos.indexOf(oldName);
    if (idx !== -1) {
      disc.grupos[idx] = cleanNew;
    }

    // Update all teams with oldName
    const equipos = this.getEquipos(target);
    equipos.forEach((eq) => {
      if (eq.grupo === oldName) {
        eq.grupo = cleanNew;
      }
    });

    // Update all matches with oldName
    const partidos = this.getPartidos(target);
    partidos.forEach((p) => {
      if (p.grupo === oldName) {
        p.grupo = cleanNew;
      }
    });

    this.saveToStorage();
    this.notify({ action: 'grupo_renamed', disciplinaId: target, oldName, newName: cleanNew });
    return true;
  }

  deleteGrupoDisciplina(disciplinaId, groupName) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas.find((d) => d.id === target) || this.getDisciplinaActual();
    if (!disc) return false;

    if (!disc.grupos || !Array.isArray(disc.grupos)) {
      disc.grupos = this.getDisciplinaGrupos(target);
    }

    disc.grupos = disc.grupos.filter((g) => g !== groupName);
    const fallbackGroup = disc.grupos[0] || 'Sin Asignar';

    // Reassign teams from deleted group to fallback
    const equipos = this.getEquipos(target);
    equipos.forEach((eq) => {
      if (eq.grupo === groupName) {
        eq.grupo = fallbackGroup;
      }
    });

    // Reassign matches
    const partidos = this.getPartidos(target);
    partidos.forEach((p) => {
      if (p.grupo === groupName) {
        p.grupo = fallbackGroup;
      }
    });

    this.saveToStorage();
    this.notify({ action: 'grupo_deleted', disciplinaId: target, groupName });
    return true;
  }

  reassignEquipoGrupo(equipoId, nuevoGrupo) {
    const eq = this.getEquipoPorId(equipoId);
    if (!eq) return false;

    eq.grupo = nuevoGrupo.trim();
    this.saveToStorage();
    this.notify({ action: 'equipo_reassigned', equipoId, nuevoGrupo: eq.grupo });
    return true;
  }

  // Admins & Roles Management
  getAdmins() {
    if (!this.data.config.admins || !Array.isArray(this.data.config.admins)) {
      this.data.config.admins = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA.config.admins));
    }
    return this.data.config.admins;
  }

  addAdmin(adminData) {
    if (!this.data.config.admins) this.data.config.admins = [];
    const id = 'ADM-' + String(Date.now()).slice(-4);
    const nuevo = {
      id,
      nombre: adminData.nombre?.trim() || 'Nuevo Administrador',
      cedula: adminData.cedula?.trim() || '',
      clave: adminData.clave?.trim() || 'admin2024',
      disciplinaId: adminData.disciplinaId || 'todas',
      rol: adminData.rol || 'admin_disciplina',
      activo: true,
      creadoEn: new Date().toISOString().slice(0, 10)
    };
    this.data.config.admins.push(nuevo);
    this.notify({ action: 'admin_added', id });
    return nuevo;
  }

  updateAdmin(id, patch) {
    if (!this.data.config.admins) return null;
    const idx = this.data.config.admins.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.data.config.admins[idx] = { ...this.data.config.admins[idx], ...patch };
      this.notify({ action: 'admin_updated', id });
      return this.data.config.admins[idx];
    }
    return null;
  }

  deleteAdmin(id) {
    if (!this.data.config.admins) return false;
    const admin = this.data.config.admins.find((a) => a.id === id);
    if (!admin) return false;
    // Protect primary SuperAdmin José Lambert
    if (admin.cedula === '14621157' || (admin.nombre && admin.nombre.toLowerCase().includes('lambert'))) {
      return false;
    }
    this.data.config.admins = this.data.config.admins.filter((a) => a.id !== id);
    this.notify({ action: 'admin_deleted', id });
    return true;
  }

  // Bulk Import Overwrite/Append
  importData({ equipos, atletas, partidos, replace = false }) {
    if (Array.isArray(equipos)) {
      const byDisc = {};
      equipos.forEach((eq) => {
        const dId = getCleanDisciplineId(eq.disciplinaId || this.data.config.disciplinaActual);
        if (!byDisc[dId]) byDisc[dId] = [];
        byDisc[dId].push(eq);
      });
      Object.keys(byDisc).forEach((dId) => {
        const existing = replace ? [] : this.loadTeams(dId);
        byDisc[dId].forEach((newEq) => {
          const idx = existing.findIndex((e) => e.id === newEq.id || e.nombre.toLowerCase() === newEq.nombre.toLowerCase());
          if (idx !== -1) existing[idx] = { ...existing[idx], ...newEq, disciplinaId: dId };
          else existing.push({ ...newEq, disciplinaId: dId });
        });
        this.saveTeams(dId, existing);
      });
    }
    if (Array.isArray(partidos)) {
      const byDisc = {};
      partidos.forEach((p) => {
        const dId = getCleanDisciplineId(p.disciplinaId || this.data.config.disciplinaActual);
        if (!byDisc[dId]) byDisc[dId] = [];
        byDisc[dId].push(p);
      });
      Object.keys(byDisc).forEach((dId) => {
        const existing = replace ? [] : this.loadMatches(dId);
        byDisc[dId].forEach((newP) => {
          const idx = existing.findIndex((m) => m.id === newP.id);
          if (idx !== -1) existing[idx] = { ...existing[idx], ...newP, disciplinaId: dId };
          else existing.push({ ...newP, disciplinaId: dId });
        });
        this.saveMatches(dId, existing);
      });
    }
    if (Array.isArray(atletas)) {
      const byDisc = {};
      atletas.forEach((a) => {
        const dId = getCleanDisciplineId(a.disciplinaId || this.data.config.disciplinaActual);
        if (!byDisc[dId]) byDisc[dId] = [];
        byDisc[dId].push(a);
      });
      Object.keys(byDisc).forEach((dId) => {
        const existing = replace ? [] : this.loadAthletes(dId);
        byDisc[dId].forEach((newA) => {
          const idx = existing.findIndex((atl) => atl.id === newA.id || (atl.cedula && atl.cedula === newA.cedula));
          if (idx !== -1) existing[idx] = { ...existing[idx], ...newA, disciplinaId: dId };
          else existing.push({ ...newA, disciplinaId: dId });
        });
        this.saveAthletes(dId, existing);
      });
    }
    this.syncGlobalDataArrays();
    this.notify({ action: 'bulk_import' });

    if (window.supabaseService ) {
      window.supabaseService.syncAllToSupabase().catch((err) => {
        console.warn('[Store] Error en sincronización masiva a Supabase:', err);
      });
    }
  }

  // Reset to default
  resetToDefaults() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));

    Object.keys(DEFAULT_DISCIPLINE_SEEDS).forEach((dId) => {
      this.saveTeams(dId, DEFAULT_DISCIPLINE_SEEDS[dId].equipos || []);
      this.saveMatches(dId, DEFAULT_DISCIPLINE_SEEDS[dId].partidos || []);
      this.saveAthletes(dId, DEFAULT_DISCIPLINE_SEEDS[dId].atletas || []);
    });
    this.saveToStorage();
    this.syncGlobalDataArrays();
    this.notify({ action: 'reset_defaults' });
  }
}

// Global instance
window.tournamentStore = new TournamentStore();

// Global Helper Functions exposed directly on window as requested
window.loadTeams = (disciplinaId) => window.tournamentStore.loadTeams(disciplinaId);
window.saveTeams = (disciplinaId, teams) => window.tournamentStore.saveTeams(disciplinaId, teams);
window.loadMatches = (disciplinaId) => window.tournamentStore.loadMatches(disciplinaId);
window.saveMatches = (disciplinaId, matches) => window.tournamentStore.saveMatches(disciplinaId, matches);
window.loadAthletes = (disciplinaId) => window.tournamentStore.loadAthletes(disciplinaId);
window.saveAthletes = (disciplinaId, athletes) => window.tournamentStore.saveAthletes(disciplinaId, athletes);
window.loadDisciplinasConfig = () => window.tournamentStore.loadDisciplinasConfig();
window.saveDisciplinasConfig = (disciplinas) => window.tournamentStore.saveDisciplinasConfig(disciplinas);
window.saveDisciplineConfig = (disciplinas) => window.tournamentStore.saveDisciplinasConfig(disciplinas);
window.loadGlobalConfig = () => window.tournamentStore.loadGlobalConfig();
window.saveGlobalConfig = (config) => window.tournamentStore.saveGlobalConfig(config);
