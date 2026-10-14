// store.js - Gestor de Estado Local y Sincronización para Grupo Multiservicios Deportivo JL

const STORAGE_KEY = 'gmd_jl_tournament_data_v1';
const CHANNEL_NAME = 'gmd_jl_broadcast_bus';

// BroadcastChannel for instant inter-tab/inter-window realtime synchronization
const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

// Initial Seed Data matching the user's Excel specifications
const DEFAULT_SEED_DATA = {
  disciplinas: [
    {
      id: 'baloncesto-master',
      nombre: 'Baloncesto',
      categoria: 'Torneo Master / Libre',
      icono: '🏀',
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
      banner: './assets/banner_voleibol.jpg',
      color: '#38BDF8',
      activa: true,
      reglas: { periodos: 3, nombrePeriodo: 'Set', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 25 }
    },
    {
      id: 'futsal-copa',
      nombre: 'Fútbol Sala',
      categoria: 'Copa JL Multiservicios',
      icono: '⚽',
      banner: './assets/banner_futsal.jpg',
      color: '#10B981',
      activa: true,
      reglas: { periodos: 2, nombrePeriodo: 'Tiempo', ptsGanador: 3, ptsPerdedor: 0, ptsEmpate: 1, duracionMin: 20 }
    },
    {
      id: 'beisbol-cinco',
      nombre: 'Béisbol 5',
      categoria: 'Juvenil / Libre',
      icono: '⚾',
      banner: './assets/logo.png',
      color: '#F59E0B',
      activa: true,
      reglas: { periodos: 5, nombrePeriodo: 'Inning', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 15 }
    }
  ],

  equipos: [
    {
      id: 'EQ-01',
      nombre: 'Broncos de Higuerey',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo A',
      sedePrincipal: 'Gimnasio Pablo Higuerey',
      siglas: 'BHY',
      logoUrl: '',
      color: '#9E1B32',
      delegadoNombre: 'Prof. Roberto Gómez',
      delegadoTelefono: '+58 414-8765432',
      pin: '2024'
    },
    {
      id: 'EQ-02',
      nombre: 'Centauros del Este',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo A',
      sedePrincipal: 'Gimnasio Pablo Higuerey',
      siglas: 'CDE',
      logoUrl: '',
      color: '#1E3A8A',
      delegadoNombre: 'Lic. Manuel Velásquez',
      delegadoTelefono: '+58 424-8123456',
      pin: '2024'
    },
    {
      id: 'EQ-03',
      nombre: 'Guerreros de Guanta',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo A',
      sedePrincipal: 'Cancha Los Robles',
      siglas: 'GDG',
      logoUrl: '',
      color: '#047857',
      delegadoNombre: 'Ing. Pedro Castillo',
      delegadoTelefono: '+58 416-9281726',
      pin: '2024'
    },
    {
      id: 'EQ-04',
      nombre: 'Titanes de Oriente',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo A',
      sedePrincipal: 'Domo Bolivariano',
      siglas: 'TDO',
      logoUrl: '',
      color: '#B45309',
      delegadoNombre: 'Téc. Nelson Figueroa',
      delegadoTelefono: '+58 412-3091823',
      pin: '2024'
    },
    {
      id: 'EQ-05',
      nombre: 'Halcones de Puerto',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo B',
      sedePrincipal: 'Gimnasio Pablo Higuerey',
      siglas: 'HDP',
      logoUrl: '',
      color: '#4338CA',
      delegadoNombre: 'Prof. Darwin Lugo',
      delegadoTelefono: '+58 414-9928172',
      pin: '2024'
    },
    {
      id: 'EQ-06',
      nombre: 'Espartanos JL',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo B',
      sedePrincipal: 'Complejo Deportivo JL',
      siglas: 'EJL',
      logoUrl: '',
      color: '#800020',
      delegadoNombre: 'Entr. José Lambert',
      delegadoTelefono: '+58 424-9018273',
      pin: '2024'
    },
    {
      id: 'EQ-07',
      nombre: 'Navegantes Sport',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo B',
      sedePrincipal: 'Cancha Los Robles',
      siglas: 'NAV',
      logoUrl: '',
      color: '#0891B2',
      delegadoNombre: 'Lic. Carlos Rojas',
      delegadoTelefono: '+58 414-1827364',
      pin: '2024'
    },
    {
      id: 'EQ-08',
      nombre: 'Vencedores BBC',
      disciplinaId: 'baloncesto-master',
      grupo: 'Grupo B',
      sedePrincipal: 'Domo Bolivariano',
      siglas: 'VBC',
      logoUrl: '',
      color: '#6D28D9',
      delegadoNombre: 'Prof. Marcos Gil',
      delegadoTelefono: '+58 416-8827162',
      pin: '2024'
    }
  ],

  atletas: [
    { id: 'ATL-001', cedula: 'V-24589123', nombres: 'Carlos Eduardo Mendoza', fechaNacimiento: '1996-05-14', edad: 28, camiseta: '7', posicion: 'Base', equipo: 'Broncos de Higuerey', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-002', cedula: 'V-26102948', nombres: 'José Alejandro Salazar', fechaNacimiento: '1998-11-20', edad: 26, camiseta: '11', posicion: 'Escolta', equipo: 'Broncos de Higuerey', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-003', cedula: 'V-22441902', nombres: 'Miguel Ángel Rondón', fechaNacimiento: '1994-03-08', edad: 30, camiseta: '15', posicion: 'Alero', equipo: 'Broncos de Higuerey', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-004', cedula: 'V-25890124', nombres: 'David Jesús Marcano', fechaNacimiento: '1997-09-12', edad: 27, camiseta: '23', posicion: 'Ala-Pívot', equipo: 'Broncos de Higuerey', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-005', cedula: 'V-21394850', nombres: 'Luis Fernando Cedeño', fechaNacimiento: '1993-01-30', edad: 31, camiseta: '33', posicion: 'Pívot', equipo: 'Broncos de Higuerey', rol: 'Atleta', fotoUrl: '' },
    
    { id: 'ATL-006', cedula: 'V-23948102', nombres: 'Gabriel Antonio Ramos', fechaNacimiento: '1995-07-22', edad: 29, camiseta: '5', posicion: 'Base', equipo: 'Centauros del Este', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-007', cedula: 'V-25019284', nombres: 'Javier Alexander Pinto', fechaNacimiento: '1997-04-18', edad: 27, camiseta: '10', posicion: 'Escolta', equipo: 'Centauros del Este', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-008', cedula: 'V-24102948', nombres: 'Andrés Eloy Rivas', fechaNacimiento: '1996-08-05', edad: 28, camiseta: '12', posicion: 'Alero', equipo: 'Centauros del Este', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-009', cedula: 'V-22940182', nombres: 'Jesús Manuel Torres', fechaNacimiento: '1994-12-19', edad: 30, camiseta: '21', posicion: 'Ala-Pívot', equipo: 'Centauros del Este', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-010', cedula: 'V-20891274', nombres: 'Víctor Alfonso Silva', fechaNacimiento: '1992-06-11', edad: 32, camiseta: '34', posicion: 'Pívot', equipo: 'Centauros del Este', rol: 'Atleta', fotoUrl: '' },

    { id: 'ATL-011', cedula: 'V-26891024', nombres: 'Daniel Enrique Guerra', fechaNacimiento: '1999-02-14', edad: 25, camiseta: '3', posicion: 'Base', equipo: 'Guerreros de Guanta', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-012', cedula: 'V-24901823', nombres: 'Héctor Luis Carreño', fechaNacimiento: '1996-10-25', edad: 28, camiseta: '8', posicion: 'Alero', equipo: 'Guerreros de Guanta', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-013', cedula: 'V-23190284', nombres: 'Ricardo José Barrios', fechaNacimiento: '1995-03-17', edad: 29, camiseta: '14', posicion: 'Pívot', equipo: 'Guerreros de Guanta', rol: 'Atleta', fotoUrl: '' },

    { id: 'ATL-014', cedula: 'V-25901824', nombres: 'Samuel David Morales', fechaNacimiento: '1998-09-02', edad: 26, camiseta: '9', posicion: 'Base', equipo: 'Titanes de Oriente', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-015', cedula: 'V-24810294', nombres: 'Kelvin José Requena', fechaNacimiento: '1996-12-08', edad: 28, camiseta: '24', posicion: 'Alero', equipo: 'Titanes de Oriente', rol: 'Capitán', fotoUrl: '' },

    { id: 'ATL-016', cedula: 'V-23910283', nombres: 'Ángel Gabriel Fuentes', fechaNacimiento: '1995-04-03', edad: 29, camiseta: '0', posicion: 'Base', equipo: 'Halcones de Puerto', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-017', cedula: 'V-25810294', nombres: 'Oswaldo José Brito', fechaNacimiento: '1997-08-21', edad: 27, camiseta: '13', posicion: 'Alero', equipo: 'Halcones de Puerto', rol: 'Capitán', fotoUrl: '' },

    { id: 'ATL-018', cedula: 'V-26901823', nombres: 'Franklin José Marval', fechaNacimiento: '1999-01-15', edad: 25, camiseta: '6', posicion: 'Base', equipo: 'Espartanos JL', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-019', cedula: 'V-24910284', nombres: 'Ronald David Guilarte', fechaNacimiento: '1996-07-29', edad: 28, camiseta: '22', posicion: 'Ala-Pívot', equipo: 'Espartanos JL', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-020', cedula: 'V-22819203', nombres: 'César Augusto Monasterio', fechaNacimiento: '1994-11-09', edad: 30, camiseta: '30', posicion: 'Pívot', equipo: 'Espartanos JL', rol: 'Atleta', fotoUrl: '' },

    { id: 'ATL-021', cedula: 'V-25102938', nombres: 'Julio César Parra', fechaNacimiento: '1997-03-31', edad: 27, camiseta: '4', posicion: 'Base', equipo: 'Navegantes Sport', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-022', cedula: 'V-23891028', nombres: 'Yorman David Medina', fechaNacimiento: '1995-10-14', edad: 29, camiseta: '18', posicion: 'Alero', equipo: 'Navegantes Sport', rol: 'Capitán', fotoUrl: '' },

    { id: 'ATL-023', cedula: 'V-26190284', nombres: 'Jean Carlos Valdivieso', fechaNacimiento: '1998-06-25', edad: 26, camiseta: '1', posicion: 'Base', equipo: 'Vencedores BBC', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-024', cedula: 'V-24019283', nombres: 'Erick Leonardo Marcano', fechaNacimiento: '1996-02-18', edad: 28, camiseta: '32', posicion: 'Pívot', equipo: 'Vencedores BBC', rol: 'Capitán', fotoUrl: '' }
  ],

  partidos: [
    {
      id: 'PAR-001',
      disciplinaId: 'baloncesto-master',
      fecha: '2026-10-12',
      hora: '18:00',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Fase de Grupos - Grupo A',
      grupo: 'Grupo A',
      equipoLocal: 'Broncos de Higuerey',
      q1Loc: 22, q2Loc: 19, q3Loc: 25, q4Loc: 20, totalLocal: 86,
      equipoVisitante: 'Titanes de Oriente',
      q1Vis: 18, q2Vis: 20, q3Vis: 17, q4Vis: 21, totalVisitante: 76,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      faltasLoc: 4,
      faltasVis: 5,
      actualizadoEn: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'PAR-002',
      disciplinaId: 'baloncesto-master',
      fecha: '2026-10-12',
      hora: '19:45',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Fase de Grupos - Grupo A',
      grupo: 'Grupo A',
      equipoLocal: 'Centauros del Este',
      q1Loc: 24, q2Loc: 18, q3Loc: 21, q4Loc: 26, totalLocal: 89,
      equipoVisitante: 'Guerreros de Guanta',
      q1Vis: 20, q2Vis: 22, q3Vis: 19, q4Vis: 21, totalVisitante: 82,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      faltasLoc: 3,
      faltasVis: 4,
      actualizadoEn: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'PAR-003',
      disciplinaId: 'baloncesto-master',
      fecha: '2026-10-13',
      hora: '17:30',
      sede: 'Complejo Deportivo JL',
      fase: 'Fase de Grupos - Grupo B',
      grupo: 'Grupo B',
      equipoLocal: 'Halcones de Puerto',
      q1Loc: 19, q2Loc: 23, q3Loc: 18, q4Loc: 22, totalLocal: 82,
      equipoVisitante: 'Vencedores BBC',
      q1Vis: 16, q2Vis: 18, q3Vis: 20, q4Vis: 19, totalVisitante: 73,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      faltasLoc: 2,
      faltasVis: 4,
      actualizadoEn: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'PAR-004',
      disciplinaId: 'baloncesto-master',
      fecha: '2026-10-13',
      hora: '19:15',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Fase de Grupos - Grupo B',
      grupo: 'Grupo B',
      equipoLocal: 'Espartanos JL',
      q1Loc: 20, q2Loc: 24, q3Loc: 19, q4Loc: 16, totalLocal: 79,
      equipoVisitante: 'Navegantes Sport',
      q1Vis: 18, q2Vis: 21, q3Vis: 20, q4Vis: 18, totalVisitante: 77,
      estado: 'FINALIZADO',
      periodoActual: 'Final',
      reloj: '00:00',
      faltasLoc: 5,
      faltasVis: 3,
      actualizadoEn: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'PAR-005',
      disciplinaId: 'baloncesto-master',
      fecha: new Date().toISOString().split('T')[0],
      hora: '18:30',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Fase de Grupos - Grupo A',
      grupo: 'Grupo A',
      equipoLocal: 'Broncos de Higuerey',
      q1Loc: 21, q2Loc: 18, q3Loc: 17, q4Loc: 18, totalLocal: 74,
      equipoVisitante: 'Centauros del Este',
      q1Vis: 19, q2Vis: 22, q3Vis: 15, q4Vis: 16, totalVisitante: 72,
      estado: 'EN CURSO',
      periodoActual: 'Q4',
      reloj: '03:45',
      faltasLoc: 4,
      faltasVis: 3,
      actualizadoEn: new Date().toISOString()
    },
    {
      id: 'PAR-006',
      disciplinaId: 'baloncesto-master',
      fecha: new Date().toISOString().split('T')[0],
      hora: '20:15',
      sede: 'Gimnasio Pablo Higuerey',
      fase: 'Fase de Grupos - Grupo A',
      grupo: 'Grupo A',
      equipoLocal: 'Guerreros de Guanta',
      q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, totalLocal: 0,
      equipoVisitante: 'Titanes de Oriente',
      q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, totalVisitante: 0,
      estado: 'PROGRAMADO',
      periodoActual: 'Por Iniciar',
      reloj: '10:00',
      faltasLoc: 0,
      faltasVis: 0,
      actualizadoEn: new Date().toISOString()
    },
    {
      id: 'PAR-007',
      disciplinaId: 'baloncesto-master',
      fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      hora: '18:00',
      sede: 'Complejo Deportivo JL',
      fase: 'Fase de Grupos - Grupo B',
      grupo: 'Grupo B',
      equipoLocal: 'Espartanos JL',
      q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, totalLocal: 0,
      equipoVisitante: 'Halcones de Puerto',
      q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, totalVisitante: 0,
      estado: 'PROGRAMADO',
      periodoActual: 'Por Iniciar',
      reloj: '10:00',
      faltasLoc: 0,
      faltasVis: 0,
      actualizadoEn: new Date().toISOString()
    },
    {
      id: 'PAR-008',
      disciplinaId: 'baloncesto-master',
      fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      hora: '19:45',
      sede: 'Cancha Los Robles',
      fase: 'Fase de Grupos - Grupo B',
      grupo: 'Grupo B',
      equipoLocal: 'Navegantes Sport',
      q1Loc: 0, q2Loc: 0, q3Loc: 0, q4Loc: 0, totalLocal: 0,
      equipoVisitante: 'Vencedores BBC',
      q1Vis: 0, q2Vis: 0, q3Vis: 0, q4Vis: 0, totalVisitante: 0,
      estado: 'PROGRAMADO',
      periodoActual: 'Por Iniciar',
      reloj: '10:00',
      faltasLoc: 0,
      faltasVis: 0,
      actualizadoEn: new Date().toISOString()
    }
  ],

  // Standings are auto-calculated from matches, with initial values
  posiciones: [],

  config: {
    disciplinaActual: 'baloncesto-master',
    supabaseUrl: '',
    supabaseAnonKey: '',
    modoOffline: false,
    usuarioActual: null // { rol: 'publico' | 'delegado' | 'superadmin', equipoId?: '', email?: '' }
  }
};

class TournamentStore {
  constructor() {
    this.listeners = new Set();
    this.data = this.loadFromStorage();
    this.setupBroadcast();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist
        return {
          ...DEFAULT_SEED_DATA,
          ...parsed,
          config: { ...DEFAULT_SEED_DATA.config, ...(parsed.config || {}) }
        };
      }
    } catch (e) {
      console.warn('Error reading from localStorage, using seed data:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
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

  getDisciplinaActual() {
    const id = this.data.config.disciplinaActual;
    return this.data.disciplinas.find((d) => d.id === id) || this.data.disciplinas[0];
  }

  setDisciplinaActual(id) {
    this.data.config.disciplinaActual = id;
    this.notify({ action: 'change_discipline', id });
  }

  getEquipos(disciplinaId = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    return this.data.equipos.filter((eq) => !eq.disciplinaId || eq.disciplinaId === target);
  }

  getEquipoPorNombre(nombre) {
    return this.data.equipos.find((eq) => eq.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
  }

  getEquipoPorId(id) {
    return this.data.equipos.find((eq) => eq.id === id);
  }

  getAtletas(equipoNombre = null) {
    if (!equipoNombre) return this.data.atletas || [];
    return this.data.atletas.filter((a) => a.equipo.trim().toLowerCase() === equipoNombre.trim().toLowerCase());
  }

  getPartidos(disciplinaId = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    return (this.data.partidos || []).filter((p) => !p.disciplinaId || p.disciplinaId === target);
  }

  getPartidoPorId(id) {
    return this.data.partidos.find((p) => p.id === id);
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
    this.notify({ action: 'auth_change', usuario });
  }

  updateConfig(newConfig) {
    this.data.config = { ...this.data.config, ...newConfig };
    this.notify({ action: 'config_updated' });
  }

  // Matches & Live Scoreboard
  updatePartido(partidoId, patch) {
    const idx = this.data.partidos.findIndex((p) => p.id === partidoId);
    if (idx !== -1) {
      this.data.partidos[idx] = {
        ...this.data.partidos[idx],
        ...patch,
        actualizadoEn: new Date().toISOString()
      };
      this.notify({ action: 'match_updated', partidoId, patch });
      return this.data.partidos[idx];
    }
    return null;
  }

  addPartido(nuevoPartido) {
    const id = nuevoPartido.id || `PAR-${String(this.data.partidos.length + 1).padStart(3, '0')}`;
    const partido = {
      id,
      disciplinaId: nuevoPartido.disciplinaId || this.data.config.disciplinaActual,
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
      totalLocal: Number(nuevoPartido.totalLocal) || 0,
      equipoVisitante: nuevoPartido.equipoVisitante,
      q1Vis: Number(nuevoPartido.q1Vis) || 0,
      q2Vis: Number(nuevoPartido.q2Vis) || 0,
      q3Vis: Number(nuevoPartido.q3Vis) || 0,
      q4Vis: Number(nuevoPartido.q4Vis) || 0,
      totalVisitante: Number(nuevoPartido.totalVisitante) || 0,
      estado: nuevoPartido.estado || 'PROGRAMADO',
      periodoActual: nuevoPartido.periodoActual || 'Por Iniciar',
      reloj: nuevoPartido.reloj || '10:00',
      faltasLoc: Number(nuevoPartido.faltasLoc) || 0,
      faltasVis: Number(nuevoPartido.faltasVis) || 0,
      actualizadoEn: new Date().toISOString()
    };
    this.data.partidos.push(partido);
    this.notify({ action: 'match_added', id });
    return partido;
  }

  deletePartido(id) {
    this.data.partidos = this.data.partidos.filter((p) => p.id !== id);
    this.notify({ action: 'match_deleted', id });
  }

  // Teams
  addEquipo(equipo) {
    const id = equipo.id || `EQ-${String(this.data.equipos.length + 1).padStart(2, '0')}`;
    const nuevo = {
      id,
      nombre: equipo.nombre,
      disciplinaId: equipo.disciplinaId || this.data.config.disciplinaActual,
      grupo: equipo.grupo || 'Grupo A',
      sedePrincipal: equipo.sedePrincipal || 'Gimnasio Pablo Higuerey',
      siglas: equipo.siglas || equipo.nombre.substring(0, 3).toUpperCase(),
      logoUrl: equipo.logoUrl || '',
      color: equipo.color || '#800020',
      delegadoNombre: equipo.delegadoNombre || '',
      delegadoTelefono: equipo.delegadoTelefono || '',
      pin: equipo.pin || '2024'
    };
    this.data.equipos.push(nuevo);
    this.notify({ action: 'team_added', id });
    return nuevo;
  }

  updateEquipo(id, patch) {
    const idx = this.data.equipos.findIndex((eq) => eq.id === id);
    if (idx !== -1) {
      this.data.equipos[idx] = { ...this.data.equipos[idx], ...patch };
      this.notify({ action: 'team_updated', id });
      return this.data.equipos[idx];
    }
    return null;
  }

  deleteEquipo(id) {
    const eq = this.getEquipoPorId(id);
    if (eq) {
      this.data.equipos = this.data.equipos.filter((e) => e.id !== id);
      // also filter athletes from that team
      this.data.atletas = this.data.atletas.filter((a) => a.equipo !== eq.nombre);
      this.notify({ action: 'team_deleted', id });
    }
  }

  // Athletes
  addAtleta(atleta) {
    const id = atleta.id || `ATL-${String(this.data.atletas.length + 1).padStart(3, '0')}`;
    const nuevo = {
      id,
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
    this.data.atletas.push(nuevo);
    this.notify({ action: 'athlete_added', id });
    return nuevo;
  }

  updateAtleta(id, patch) {
    const idx = this.data.atletas.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.data.atletas[idx] = { ...this.data.atletas[idx], ...patch };
      this.notify({ action: 'athlete_updated', id });
      return this.data.atletas[idx];
    }
    return null;
  }

  deleteAtleta(id) {
    this.data.atletas = this.data.atletas.filter((a) => a.id !== id);
    this.notify({ action: 'athlete_deleted', id });
  }

  // Disciplines
  addDisciplina(disc) {
    const id = disc.id || disc.nombre.toLowerCase().replace(/\s+/g, '-');
    const nueva = {
      id,
      nombre: disc.nombre,
      categoria: disc.categoria || 'Libre',
      icono: disc.icono || '🏆',
      banner: disc.banner || './assets/logo.png',
      color: disc.color || '#D4AF37',
      activa: disc.activa !== false,
      reglas: {
        periodos: Number(disc.reglas?.periodos) || 4,
        nombrePeriodo: disc.reglas?.nombrePeriodo || 'Cuarto',
        ptsGanador: Number(disc.reglas?.ptsGanador) || 2,
        ptsPerdedor: Number(disc.reglas?.ptsPerdedor) || 1,
        duracionMin: Number(disc.reglas?.duracionMin) || 10
      }
    };
    this.data.disciplinas.push(nueva);
    this.notify({ action: 'discipline_added', id });
    return nueva;
  }

  toggleDisciplina(id) {
    const disc = this.data.disciplinas.find((d) => d.id === id);
    if (disc) {
      disc.activa = !disc.activa;
      this.notify({ action: 'discipline_toggled', id });
    }
  }

  // Bulk Import Overwrite/Append
  importData({ equipos, atletas, partidos, replace = false }) {
    if (replace) {
      if (equipos) this.data.equipos = equipos;
      if (atletas) this.data.atletas = atletas;
      if (partidos) this.data.partidos = partidos;
    } else {
      if (equipos) {
        equipos.forEach((eq) => {
          const idx = this.data.equipos.findIndex((e) => e.nombre.toLowerCase() === eq.nombre.toLowerCase());
          if (idx !== -1) this.data.equipos[idx] = { ...this.data.equipos[idx], ...eq };
          else this.data.equipos.push(eq);
        });
      }
      if (atletas) {
        atletas.forEach((atl) => {
          const idx = this.data.atletas.findIndex((a) => a.cedula && a.cedula === atl.cedula);
          if (idx !== -1) this.data.atletas[idx] = { ...this.data.atletas[idx], ...atl };
          else this.data.atletas.push(atl);
        });
      }
      if (partidos) {
        partidos.forEach((par) => {
          const idx = this.data.partidos.findIndex((p) => p.id === par.id);
          if (idx !== -1) this.data.partidos[idx] = { ...this.data.partidos[idx], ...par };
          else this.data.partidos.push(par);
        });
      }
    }
    this.notify({ action: 'bulk_import' });
  }

  // Reset to default
  resetToDefaults() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
    this.notify({ action: 'reset_defaults' });
  }
}

// Global instance
window.tournamentStore = new TournamentStore();
