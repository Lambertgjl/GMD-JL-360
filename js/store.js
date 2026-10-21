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
    { id: 'ATL-001', cedula: 'V-24589123', nombres: 'Carlos Eduardo Mendoza', fechaNacimiento: '1996-05-14', edad: 28, camiseta: '7', posicion: 'Base', equipo: 'Gigantes de Caripito', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-002', cedula: 'V-26102948', nombres: 'José Alejandro Salazar', fechaNacimiento: '1998-11-20', edad: 26, camiseta: '11', posicion: 'Escolta', equipo: 'Gigantes de Caripito', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-003', cedula: 'V-22441902', nombres: 'Miguel Ángel Rondón', fechaNacimiento: '1994-03-08', edad: 30, camiseta: '15', posicion: 'Alero', equipo: 'Gigantes de Caripito', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-004', cedula: 'V-25890124', nombres: 'David Jesús Marcano', fechaNacimiento: '1997-09-12', edad: 27, camiseta: '23', posicion: 'Ala-Pívot', equipo: 'Gigantes de Caripito', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-005', cedula: 'V-21394850', nombres: 'Luis Fernando Cedeño', fechaNacimiento: '1993-01-30', edad: 31, camiseta: '33', posicion: 'Pívot', equipo: 'Gigantes de Caripito', rol: 'Atleta', fotoUrl: '' },
    
    { id: 'ATL-006', cedula: 'V-23948102', nombres: 'Gabriel Antonio Ramos', fechaNacimiento: '1995-07-22', edad: 29, camiseta: '5', posicion: 'Base', equipo: 'Tigres de la Sabana', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-007', cedula: 'V-25019284', nombres: 'Javier Alexander Pinto', fechaNacimiento: '1997-04-18', edad: 27, camiseta: '10', posicion: 'Escolta', equipo: 'Tigres de la Sabana', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-008', cedula: 'V-24102948', nombres: 'Andrés Eloy Rivas', fechaNacimiento: '1996-08-05', edad: 28, camiseta: '12', posicion: 'Alero', equipo: 'Tigres de la Sabana', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-009', cedula: 'V-22940182', nombres: 'Jesús Manuel Torres', fechaNacimiento: '1994-12-19', edad: 30, camiseta: '21', posicion: 'Ala-Pívot', equipo: 'Tigres de la Sabana', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-010', cedula: 'V-20891274', nombres: 'Víctor Alfonso Silva', fechaNacimiento: '1992-06-11', edad: 32, camiseta: '34', posicion: 'Pívot', equipo: 'Tigres de la Sabana', rol: 'Atleta', fotoUrl: '' },

    { id: 'ATL-011', cedula: 'V-26891024', nombres: 'Daniel Enrique Guerra', fechaNacimiento: '1999-02-14', edad: 25, camiseta: '3', posicion: 'Base', equipo: 'Monagas BBC', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-012', cedula: 'V-24901823', nombres: 'Héctor Luis Carreño', fechaNacimiento: '1996-10-25', edad: 28, camiseta: '8', posicion: 'Alero', equipo: 'Monagas BBC', rol: 'Capitán', fotoUrl: '' },
    { id: 'ATL-013', cedula: 'V-23190284', nombres: 'Ricardo José Barrios', fechaNacimiento: '1995-03-17', edad: 29, camiseta: '14', posicion: 'Pívot', equipo: 'Monagas BBC', rol: 'Atleta', fotoUrl: '' },

    { id: 'ATL-014', cedula: 'V-25901824', nombres: 'Samuel David Morales', fechaNacimiento: '1998-09-02', edad: 26, camiseta: '9', posicion: 'Base', equipo: 'Indios de Punceres', rol: 'Atleta', fotoUrl: '' },
    { id: 'ATL-015', cedula: 'V-24810294', nombres: 'Kelvin José Requena', fechaNacimiento: '1996-12-08', edad: 28, camiseta: '24', posicion: 'Alero', equipo: 'Indios de Punceres', rol: 'Capitán', fotoUrl: '' }
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
    supabaseUrl: '',
    supabaseAnonKey: '',
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
        
        // Ensure standard disciplines are synced
        let discs = parsed.disciplinas || (parsed.config && parsed.config.disciplinas) || [];
        discs = discs.map(d => {
          if (d.id === 'beisbol-cinco' || d.nombre === 'Béisbol 5') {
            return {
              id: 'softbol-master',
              nombre: 'Sotfbol',
              categoria: 'Torneo Master / Modificado',
              icono: '🥎',
              avatar: d.avatar || './assets/logo.png',
              banner: d.banner || './assets/logo.png',
              color: '#F59E0B',
              activa: true,
              reglas: { periodos: 7, nombrePeriodo: 'Inning', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 15 }
            };
          }
          if (d.id === 'futsal-copa') {
            const futsalAvatar = d.avatar || d.logoUrl || d.logo || d.banner || './assets/banner_futsal.jpg';
            return { ...d, nombre: d.nombre || 'Futbol Sala', avatar: futsalAvatar, banner: d.banner || futsalAvatar };
          }
          if (d.id === 'baloncesto-master') {
            const bballAvatar = d.avatar || d.logoUrl || d.logo || d.banner || './assets/banner_baloncesto.jpg';
            return { ...d, avatar: bballAvatar, banner: d.banner || bballAvatar };
          }
          if (d.id === 'voleibol-femenino') {
            const vballAvatar = d.avatar || d.logoUrl || d.logo || d.banner || './assets/banner_voleibol.jpg';
            return { ...d, avatar: vballAvatar, banner: d.banner || vballAvatar };
          }
          return d;
        });

        DEFAULT_SEED_DATA.disciplinas.forEach(defD => {
          const existing = discs.find(d => d.id === defD.id);
          if (!existing) {
            discs.push(JSON.parse(JSON.stringify(defD)));
          } else {
            if (!existing.avatar) existing.avatar = defD.avatar || defD.banner;
          }
        });
        parsed.disciplinas = discs;

        // Ensure teams exist for all disciplines and have email & cedula
        let teams = parsed.equipos || [];
        const demoTeamNames = [
          'Broncos de Higuerey',
          'Centauros del Este',
          'Guerreros de Guanta',
          'Titanes de Oriente',
          'Halcones de Puerto',
          'Espartanos JL',
          'Navegantes Sport',
          'Vencedores BBC'
        ];

        // If the stored teams in baloncesto are only the old demo teams, migrate to active tournament franchises
        const hasCustomTeamsInBaloncesto = teams.some(
          (e) => e.disciplinaId === 'baloncesto-master' && !demoTeamNames.includes(e.nombre)
        );
        if (!hasCustomTeamsInBaloncesto) {
          teams = teams.filter((e) => e.disciplinaId !== 'baloncesto-master');
          DEFAULT_SEED_DATA.equipos
            .filter((e) => e.disciplinaId === 'baloncesto-master')
            .forEach((defE) => teams.push(JSON.parse(JSON.stringify(defE))));
        }

        DEFAULT_SEED_DATA.equipos.forEach((defE) => {
          const existing = teams.find((e) => e.id === defE.id || e.nombre === defE.nombre);
          if (!existing) {
            teams.push(JSON.parse(JSON.stringify(defE)));
          } else {
            if (!existing.delegadoEmail) existing.delegadoEmail = defE.delegadoEmail;
            if (!existing.delegadoCedula) existing.delegadoCedula = defE.delegadoCedula;
            if (!existing.pin) existing.pin = defE.pin || '2024';
            if (existing.entrenador === undefined) existing.entrenador = defE.entrenador || '';
            if (existing.asistente === undefined) existing.asistente = defE.asistente || '';
            if (existing.utilero === undefined) existing.utilero = defE.utilero || '';
          }
        });
        parsed.equipos = teams;

        // Sync athletes linked to migrated demo teams
        if (parsed.atletas && Array.isArray(parsed.atletas)) {
          parsed.atletas = parsed.atletas.map((a) => {
            if (a.equipo === 'Broncos de Higuerey') a.equipo = 'Gigantes de Caripito';
            else if (a.equipo === 'Centauros del Este') a.equipo = 'Tigres de la Sabana';
            else if (a.equipo === 'Guerreros de Guanta') a.equipo = 'Monagas BBC';
            else if (a.equipo === 'Titanes de Oriente') a.equipo = 'Indios de Punceres';
            return a;
          });
        }

        // Purge old static demo matches previously loaded (PAR-001..PAR-008, Broncos, Centauros, Halcones, etc.)
        const staticDemoMatchIds = ['PAR-001', 'PAR-002', 'PAR-003', 'PAR-004', 'PAR-005', 'PAR-006', 'PAR-007', 'PAR-008'];
        let matches = (parsed.partidos || []).filter((m) => {
          if (staticDemoMatchIds.includes(m.id)) return false;
          if (demoTeamNames.includes(m.equipoLocal) || demoTeamNames.includes(m.equipoVisitante)) return false;
          return true;
        });

        // Asegurar que los encuentros oficiales siempre existan y estén sincronizados
        if (!matches || matches.length === 0) {
          matches = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA.partidos));
        } else {
          DEFAULT_SEED_DATA.partidos.forEach((defP) => {
            const existing = matches.find(
              (m) => m.id === defP.id || (m.equipoLocal === defP.equipoLocal && m.equipoVisitante === defP.equipoVisitante && m.disciplinaId === defP.disciplinaId)
            );
            if (!existing) {
              matches.push(JSON.parse(JSON.stringify(defP)));
            } else {
              // Sincronizar puntos y estado oficiales si el partido en almacenamiento estaba en 0 o desactualizado
              if (defP.id === 'PAR-BAL-01' || defP.id === 'PAR-BAL-02') {
                const exTotalL = Number(existing.totalLocal ?? existing.puntosLocal ?? existing.marcadorLocal ?? 0);
                const exTotalV = Number(existing.totalVisitante ?? existing.puntosVisitante ?? existing.marcadorVisitante ?? 0);
                if (exTotalL === 0 && exTotalV === 0 || existing.estado !== defP.estado || !existing.q1Loc) {
                  existing.totalLocal = defP.totalLocal;
                  existing.totalVisitante = defP.totalVisitante;
                  existing.puntosLocal = defP.puntosLocal ?? defP.totalLocal;
                  existing.puntosVisitante = defP.puntosVisitante ?? defP.totalVisitante;
                  existing.q1Loc = defP.q1Loc;
                  existing.q2Loc = defP.q2Loc;
                  existing.q3Loc = defP.q3Loc;
                  existing.q4Loc = defP.q4Loc;
                  existing.otLoc = defP.otLoc ?? 0;
                  existing.q1Vis = defP.q1Vis;
                  existing.q2Vis = defP.q2Vis;
                  existing.q3Vis = defP.q3Vis;
                  existing.q4Vis = defP.q4Vis;
                  existing.otVis = defP.otVis ?? 0;
                  existing.estado = defP.estado;
                  existing.periodoActual = defP.periodoActual;
                  existing.reloj = defP.reloj;
                }
              } else if (defP.totalLocal > 0 || defP.totalVisitante > 0 || defP.estado === 'FINALIZADO') {
                const exTotalL = Number(existing.totalLocal ?? existing.puntosLocal ?? existing.marcadorLocal ?? 0);
                const exTotalV = Number(existing.totalVisitante ?? existing.puntosVisitante ?? existing.marcadorVisitante ?? 0);
                if (exTotalL === 0 && exTotalV === 0) {
                  existing.totalLocal = defP.totalLocal;
                  existing.totalVisitante = defP.totalVisitante;
                  existing.puntosLocal = defP.puntosLocal ?? defP.totalLocal;
                  existing.puntosVisitante = defP.puntosVisitante ?? defP.totalVisitante;
                  existing.q1Loc = defP.q1Loc;
                  existing.q2Loc = defP.q2Loc;
                  existing.q3Loc = defP.q3Loc;
                  existing.q4Loc = defP.q4Loc;
                  existing.otLoc = defP.otLoc ?? 0;
                  existing.q1Vis = defP.q1Vis;
                  existing.q2Vis = defP.q2Vis;
                  existing.q3Vis = defP.q3Vis;
                  existing.q4Vis = defP.q4Vis;
                  existing.otVis = defP.otVis ?? 0;
                  existing.estado = defP.estado;
                  existing.periodoActual = defP.periodoActual;
                  existing.reloj = defP.reloj;
                }
              }
            }
          });
        }
        parsed.partidos = matches;

        // Asegurar logotipos reales por defecto en franquicias si están vacíos
        teams.forEach((t) => {
          if (!t.logoUrl || t.logoUrl.trim() === '') {
            t.logoUrl = './assets/logo.png';
          }
        });

        const mergedConfig = {
          ...DEFAULT_SEED_DATA.config,
          ...(parsed.config || {})
        };
        if (typeof mergedConfig.rostersCongelados === 'undefined') mergedConfig.rostersCongelados = false;
        if (!mergedConfig.solicitudesBaja) mergedConfig.solicitudesBaja = [];
        if (!mergedConfig.patrocinadores || mergedConfig.patrocinadores.length === 0) mergedConfig.patrocinadores = DEFAULT_SEED_DATA.config.patrocinadores;
        if (!mergedConfig.fasesTorneo) mergedConfig.fasesTorneo = DEFAULT_SEED_DATA.config.fasesTorneo;
        if (!mergedConfig.sedesTorneo) mergedConfig.sedesTorneo = DEFAULT_SEED_DATA.config.sedesTorneo;
        if (!mergedConfig.tituloEvento) mergedConfig.tituloEvento = DEFAULT_SEED_DATA.config.tituloEvento;
        if (!mergedConfig.temporadaEvento) mergedConfig.temporadaEvento = DEFAULT_SEED_DATA.config.temporadaEvento;
        if (!mergedConfig.logoEvento) mergedConfig.logoEvento = DEFAULT_SEED_DATA.config.logoEvento;
        if (typeof mergedConfig.sonidosActivos === 'undefined') mergedConfig.sonidosActivos = true;
        if (typeof mergedConfig.silbatosActivos === 'undefined') mergedConfig.silbatosActivos = true;
        if (typeof mergedConfig.liveSyncActivo === 'undefined') mergedConfig.liveSyncActivo = true;
        if (typeof mergedConfig.notificacionesActivas === 'undefined') mergedConfig.notificacionesActivas = true;
        if (typeof mergedConfig.brilloInterfaz === 'undefined') mergedConfig.brilloInterfaz = 100;
        if (!mergedConfig.versionApp) mergedConfig.versionApp = DEFAULT_SEED_DATA.config.versionApp;
        if (!mergedConfig.admins || mergedConfig.admins.length === 0) mergedConfig.admins = DEFAULT_SEED_DATA.config.admins;

        // Ensure active session persistence
        try {
          const savedSession = localStorage.getItem('gmd_jl_active_session');
          if (savedSession) {
            mergedConfig.usuarioActual = JSON.parse(savedSession);
          }
        } catch (e) {
          console.warn('Error reading session from localStorage:', e);
        }

        mergedConfig.disciplinas = discs;

        return {
          ...DEFAULT_SEED_DATA,
          ...parsed,
          disciplinas: discs,
          config: mergedConfig
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
    if (!nombre) return null;
    const str = String(nombre).trim().toLowerCase();
    if (!str) return null;

    // 1. Coincidencia exacta por nombre
    const exact = (this.data.equipos || []).find((eq) => eq.nombre && eq.nombre.trim().toLowerCase() === str);
    if (exact) return exact;

    // 2. Coincidencia por ID o Siglas
    const byIdOrSiglas = (this.data.equipos || []).find((eq) => 
      (eq.id && eq.id.trim().toLowerCase() === str) || 
      (eq.siglas && eq.siglas.trim().toLowerCase() === str)
    );
    if (byIdOrSiglas) return byIdOrSiglas;

    // 3. Coincidencia normalizada sin acentos ni caracteres especiales
    const norm = (s) => String(s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
    const normStr = norm(str);
    if (normStr) {
      const byNorm = (this.data.equipos || []).find((eq) => norm(eq.nombre) === normStr || norm(eq.siglas) === normStr);
      if (byNorm) return byNorm;

      const byContains = (this.data.equipos || []).find((eq) => {
        const neq = norm(eq.nombre);
        return neq && (neq.includes(normStr) || normStr.includes(neq));
      });
      if (byContains) return byContains;
    }

    return null;
  }

  getEquipoPorId(id) {
    if (id === undefined || id === null) return null;
    const idStr = String(id).trim().toLowerCase();
    return (this.data.equipos || []).find((eq) => eq.id && eq.id.trim().toLowerCase() === idStr) || null;
  }

  getAtletas(equipoNombre = null) {
    if (!equipoNombre) return this.data.atletas || [];
    const target = String(equipoNombre).trim().toLowerCase();
    return (this.data.atletas || []).filter((a) => a.equipo && a.equipo.trim().toLowerCase() === target);
  }

  getPartidos(disciplinaId = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    return (this.data.partidos || []).filter((p) => p.disciplinaId === target || (!p.disciplinaId && target === 'baloncesto-master'));
  }

  getPartidoPorId(id) {
    if (id === undefined || id === null) return null;
    const idStr = String(id).trim();
    return (this.data.partidos || []).find((p) => p.id === id || String(p.id).trim() === idStr) || null;
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
        localStorage.setItem('gmd_jl_active_session', JSON.stringify(usuario));
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
    } else {
      this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas || []));
    }
    this.saveToStorage();
    this.notify({ action: 'config_updated' });
  }

  // Matches & Live Scoreboard
  updatePartido(partidoId, patch) {
    if (partidoId === undefined || partidoId === null) return null;
    const idStr = String(partidoId).trim();
    const idx = (this.data.partidos || []).findIndex((p) => p.id === partidoId || String(p.id).trim() === idStr);
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
    this.saveToStorage();
    this.notify({ action: 'match_deleted', id });
  }

  clearPartidos(disciplinaId = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    this.data.partidos = (this.data.partidos || []).filter((p) => p.disciplinaId && p.disciplinaId !== target);
    this.saveToStorage();
    this.notify({ action: 'matches_cleared', disciplinaId: target });
    return true;
  }

  generateScheduleForDiscipline(disciplinaId = null, replaceExisting = true) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas?.find((d) => d.id === target) || this.getDisciplinaActual();
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

          this.data.partidos.push(nuevo);
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

        this.data.partidos.push(nuevo);
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

            this.data.partidos.push(nuevo);
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

    this.saveToStorage();
    this.notify({ action: 'schedule_generated', disciplinaId: target, count: generated.length });
    return { success: true, count: generated.length, matches: generated };
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
      pin: equipo.pin || '2024',
      entrenador: equipo.entrenador || '',
      asistente: equipo.asistente || '',
      utilero: equipo.utilero || ''
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

  deleteEquipo(id, userRole = 'superadmin') {
    const eq = this.getEquipoPorId(id);
    if (eq) {
      this.data.equipos = this.data.equipos.filter((e) => e.id !== id);
      // also filter and remove athletes associated with this team
      this.data.atletas = (this.data.atletas || []).filter((a) => a.equipo !== eq.nombre);
      this.notify({ action: 'team_deleted', id, equipoNombre: eq.nombre });
      return true;
    }
    return false;
  }

  updateEquiposGrupos(assignments) {
    if (!Array.isArray(assignments)) return;
    assignments.forEach(({ id, grupo }) => {
      const eq = this.data.equipos.find((e) => e.id === id);
      if (eq) {
        eq.grupo = grupo;
      }
    });
    this.notify({ action: 'groups_updated' });
  }

  getFormatoCompeticion(disciplinaId = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas?.find((d) => d.id === target);
    return disc?.formatoTorneo || this.data.config.formatoCompeticion || 'por_grupo';
  }

  setFormatoCompeticion(formato, disciplinaId = null) {
    const target = disciplinaId || this.data.config.disciplinaActual;
    const disc = this.data.disciplinas?.find((d) => d.id === target);
    if (disc) {
      disc.formatoTorneo = formato;
    }
    this.data.config.formatoCompeticion = formato;
    this.notify({ action: 'format_updated', formato });
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
    this.notify({ action: 'reglamento_updated' });
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

  deleteAtleta(id, userRole = 'superadmin') {
    // RESTRICCIÓN DE SEGURIDAD (Protección de Datos):
    // El delegado NO tiene permiso para eliminar atletas ya registrados. Debe solicitar autorización formal.
    if (userRole !== 'superadmin') {
      console.warn('RESTRICCIÓN DE SEGURIDAD: Los delegados no pueden eliminar atletas directamente. Deben solicitar baja formal.');
      return false;
    }
    this.data.atletas = this.data.atletas.filter((a) => a.id !== id);
    this.notify({ action: 'athlete_deleted', id });
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
      if (typeof pin !== 'undefined') eq.pin = pin;
      if (typeof delegadoEmail !== 'undefined') eq.delegadoEmail = delegadoEmail;
      if (typeof delegadoNombre !== 'undefined') eq.delegadoNombre = delegadoNombre;
      if (typeof delegadoTelefono !== 'undefined') eq.delegadoTelefono = delegadoTelefono;
      this.notify({ action: 'delegate_credentials_updated', equipoId });
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
  setDisciplinas(disciplinas) {
    if (Array.isArray(disciplinas)) {
      this.data.disciplinas = disciplinas;
      this.data.config.disciplinas = JSON.parse(JSON.stringify(disciplinas));
      this.saveToStorage();
      this.notify({ action: 'disciplines_updated' });
    }
  }

  addDisciplina(disc) {
    const id = disc.id || disc.nombre.toLowerCase().replace(/\s+/g, '-');
    const avatar = disc.avatar || disc.banner || './assets/logo.png';
    const nueva = {
      id,
      nombre: disc.nombre,
      categoria: disc.categoria || 'Libre',
      descripcion: disc.descripcion || '',
      icono: disc.icono || '🏆',
      avatar: avatar,
      banner: disc.banner || avatar,
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
    this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas));
    this.saveToStorage();
    this.notify({ action: 'discipline_added', id });
    return nueva;
  }

  updateDisciplina(id, patch) {
    const idx = this.data.disciplinas.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.data.disciplinas[idx] = {
        ...this.data.disciplinas[idx],
        ...patch,
        reglas: {
          ...this.data.disciplinas[idx].reglas,
          ...(patch.reglas || {})
        }
      };
      this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas));
      this.saveToStorage();
      this.notify({ action: 'discipline_updated', id });
      return this.data.disciplinas[idx];
    }
    return null;
  }

  toggleDisciplina(id) {
    const disc = this.data.disciplinas.find((d) => d.id === id);
    if (disc) {
      disc.activa = !disc.activa;
      this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas));
      this.saveToStorage();
      this.notify({ action: 'discipline_toggled', id });
    }
  }

  deleteDisciplina(id) {
    const idx = this.data.disciplinas.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const removed = this.data.disciplinas.splice(idx, 1)[0];
      // If current active discipline was deleted, fallback to another active discipline
      if (this.data.config.disciplinaActual === id) {
        this.data.config.disciplinaActual = this.data.disciplinas[0]?.id || '';
      }
      this.data.config.disciplinas = JSON.parse(JSON.stringify(this.data.disciplinas));
      this.saveToStorage();
      this.notify({ action: 'discipline_deleted', id, removed });
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
