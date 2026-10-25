-- ==============================================================================
-- GRUPO MULTISERVICIOS DEPORTIVOS JL
-- SCRIPT DE INICIALIZACIÓN COMPLETA PARA SUPABASE (BASE DE DATOS Y REALTIME)
-- ==============================================================================
-- Proyecto: wznvlhuvpqnnrlgcgqpx (https://wznvlhuvpqnnrlgcgqpx.supabase.co)
-- Instrucciones:
-- 1. Inicia sesión en Supabase y entra a tu proyecto "wznvlhuvpqnnrlgcgqpx".
-- 2. Ve a la pestaña "SQL Editor" en el menú izquierdo (o abre: https://supabase.com/dashboard/project/wznvlhuvpqnnrlgcgqpx/sql/new).
-- 3. Pega todo este código SQL y haz clic en "RUN".
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA DISCIPLINAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disciplinas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT,
    icono TEXT,
    avatar TEXT,
    banner TEXT,
    color TEXT,
    activa BOOLEAN DEFAULT true,
    reglas JSONB DEFAULT '{"periodos": 4, "nombrePeriodo": "Cuarto", "ptsGanador": 2, "ptsPerdedor": 1, "duracionMin": 10}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TABLA EQUIPOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    disciplina_id TEXT REFERENCES public.disciplinas(id) ON DELETE SET NULL,
    grupo TEXT DEFAULT 'Grupo A',
    sede_principal TEXT DEFAULT 'Gimnasio Pablo Higuerey',
    siglas TEXT,
    logo_url TEXT,
    color TEXT DEFAULT '#800020',
    delegado_nombre TEXT,
    delegado_cedula TEXT,
    delegado_telefono TEXT,
    delegado_email TEXT,
    pin TEXT DEFAULT '2024',
    entrenador TEXT,
    asistente TEXT,
    utilero TEXT,
    creado_en TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. TABLA ATLETAS (ROSTERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atletas (
    id TEXT PRIMARY KEY,
    disciplina_id TEXT REFERENCES public.disciplinas(id) ON DELETE SET NULL,
    cedula TEXT NOT NULL,
    nombres TEXT NOT NULL,
    fecha_nacimiento DATE,
    edad INTEGER,
    camiseta TEXT,
    posicion TEXT,
    equipo TEXT NOT NULL,
    rol TEXT DEFAULT 'Atleta',
    foto_url TEXT,
    creado_en TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. TABLA PARTIDOS Y RESULTADOS (MESA DE ANOTACIÓN / CALENDARIO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partidos (
    id TEXT PRIMARY KEY,
    disciplina_id TEXT REFERENCES public.disciplinas(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    sede TEXT DEFAULT 'Gimnasio Pablo Higuerey',
    fase TEXT DEFAULT 'Fase de Grupos',
    grupo TEXT DEFAULT 'Grupo A',
    equipo_local TEXT NOT NULL,
    q1_loc INTEGER DEFAULT 0,
    q2_loc INTEGER DEFAULT 0,
    q3_loc INTEGER DEFAULT 0,
    q4_loc INTEGER DEFAULT 0,
    ot_loc INTEGER DEFAULT 0,
    total_local INTEGER DEFAULT 0,
    puntos_local INTEGER DEFAULT 0,
    equipo_visitante TEXT NOT NULL,
    q1_vis INTEGER DEFAULT 0,
    q2_vis INTEGER DEFAULT 0,
    q3_vis INTEGER DEFAULT 0,
    q4_vis INTEGER DEFAULT 0,
    ot_vis INTEGER DEFAULT 0,
    total_visitante INTEGER DEFAULT 0,
    puntos_visitante INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'PROGRAMADO', -- PROGRAMADO | EN CURSO | FINALIZADO
    periodo_actual TEXT DEFAULT 'Por Iniciar',
    reloj TEXT DEFAULT '10:00',
    faltas_loc INTEGER DEFAULT 0,
    faltas_vis INTEGER DEFAULT 0,
    actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. TABLA POSICIONES (TABLA GENERAL / CLASIFICACIÓN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posiciones (
    id SERIAL PRIMARY KEY,
    disciplina_id TEXT REFERENCES public.disciplinas(id) ON DELETE CASCADE,
    grupo TEXT NOT NULL,
    posicion INTEGER,
    equipo TEXT NOT NULL,
    siglas TEXT,
    jj INTEGER DEFAULT 0,
    jg INTEGER DEFAULT 0,
    jp INTEGER DEFAULT 0,
    pf INTEGER DEFAULT 0,
    pc INTEGER DEFAULT 0,
    dp INTEGER DEFAULT 0,
    pts INTEGER DEFAULT 0,
    actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. SEGURIDAD Y POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posiciones ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas si ya existían para evitar duplicados
DROP POLICY IF EXISTS "Lectura pública disciplinas" ON public.disciplinas;
DROP POLICY IF EXISTS "Acceso total disciplinas" ON public.disciplinas;
DROP POLICY IF EXISTS "Lectura pública equipos" ON public.equipos;
DROP POLICY IF EXISTS "Acceso total equipos" ON public.equipos;
DROP POLICY IF EXISTS "Lectura pública atletas" ON public.atletas;
DROP POLICY IF EXISTS "Acceso total atletas" ON public.atletas;
DROP POLICY IF EXISTS "Lectura pública partidos" ON public.partidos;
DROP POLICY IF EXISTS "Acceso total partidos" ON public.partidos;
DROP POLICY IF EXISTS "Lectura pública posiciones" ON public.posiciones;
DROP POLICY IF EXISTS "Acceso total posiciones" ON public.posiciones;

-- Políticas de lectura pública abierta
CREATE POLICY "Lectura pública disciplinas" ON public.disciplinas FOR SELECT USING (true);
CREATE POLICY "Lectura pública equipos" ON public.equipos FOR SELECT USING (true);
CREATE POLICY "Lectura pública atletas" ON public.atletas FOR SELECT USING (true);
CREATE POLICY "Lectura pública partidos" ON public.partidos FOR SELECT USING (true);
CREATE POLICY "Lectura pública posiciones" ON public.posiciones FOR SELECT USING (true);

-- Políticas de escritura (INSERT, UPDATE, DELETE) para sincronización web
CREATE POLICY "Acceso total disciplinas" ON public.disciplinas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total equipos" ON public.equipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total atletas" ON public.atletas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total partidos" ON public.partidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total posiciones" ON public.posiciones FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. ACTIVAR SUPABASE REALTIME (PUBLICACIÓN POSTGRES)
-- ------------------------------------------------------------------------------
-- Agrega las tablas a la publicación supabase_realtime para transmisión instantánea
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'partidos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.partidos;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'equipos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.equipos;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'atletas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.atletas;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'disciplinas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.disciplinas;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'posiciones'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.posiciones;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. CARGA INICIAL DE DATOS OFICIALES (SEMILLAS DEL TORNEO)
-- ------------------------------------------------------------------------------

-- DISCIPLINAS
INSERT INTO public.disciplinas (id, nombre, categoria, icono, avatar, banner, color, activa, reglas)
VALUES
('baloncesto-master', 'Baloncesto', 'Torneo Master / Libre', '🏀', './assets/banner_baloncesto.jpg', './assets/banner_baloncesto.jpg', '#D4AF37', true, '{"periodos": 4, "nombrePeriodo": "Cuarto", "ptsGanador": 2, "ptsPerdedor": 1, "duracionMin": 10}'::jsonb),
('voleibol-femenino', 'Voleibol', 'Femenino Libre', '🏐', './assets/banner_voleibol.jpg', './assets/banner_voleibol.jpg', '#38BDF8', true, '{"periodos": 3, "nombrePeriodo": "Set", "ptsGanador": 2, "ptsPerdedor": 1, "duracionMin": 25}'::jsonb),
('futsal-copa', 'Futbol Sala', 'Copa JL Multiservicios', '⚽', './assets/banner_futsal.jpg', './assets/banner_futsal.jpg', '#10B981', true, '{"periodos": 2, "nombrePeriodo": "Tiempo", "ptsGanador": 3, "ptsPerdedor": 0, "ptsEmpate": 1, "duracionMin": 20}'::jsonb),
('softbol-master', 'Sotfbol', 'Torneo Master / Modificado', '🥎', './assets/logo.png', './assets/logo.png', '#F59E0B', true, '{"periodos": 7, "nombrePeriodo": "Inning", "ptsGanador": 2, "ptsPerdedor": 1, "duracionMin": 15}'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    categoria = EXCLUDED.categoria,
    icono = EXCLUDED.icono,
    color = EXCLUDED.color,
    reglas = EXCLUDED.reglas;

-- EQUIPOS (BALONCESTO, VOLEIBOL, FUTSAL, SOFTBOL)
INSERT INTO public.equipos (id, nombre, disciplina_id, grupo, sede_principal, siglas, logo_url, color, delegado_nombre, delegado_cedula, delegado_telefono, delegado_email, pin, entrenador, asistente, utilero)
VALUES
('EQ-01', 'Gigantes de Caripito', 'baloncesto-master', 'Grupo A', 'Domo Bolivariano', 'GDC', './assets/logo.png', '#D97706', 'Prof. Carlos Mendoza', '14589123', '+58 414-8765432', 'delegado.gigantes@gmdjl.com', '2024', 'Prof. Carlos Mendoza', 'Lic. Andrés Silva', 'Carlos Ramos'),
('EQ-02', 'Tigres de la Sabana', 'baloncesto-master', 'Grupo A', 'Gimnasio Pablo Higuerey', 'TDS', './assets/logo.png', '#EA580C', 'Lic. Manuel Velásquez', '15987654', '+58 424-8123456', 'delegado.tigres@gmdjl.com', '2024', 'Lic. Manuel Velásquez', 'Prof. Javier Pinto', 'Ramón Díaz'),
('EQ-03', 'Monagas BBC', 'baloncesto-master', 'Grupo B', 'Complejo Deportivo JL', 'MON', './assets/logo.png', '#1E3A8A', 'Ing. Pedro Castillo', '13456789', '+58 416-9281726', 'delegado.monagas@gmdjl.com', '2024', 'Ing. Pedro Castillo', 'Lic. Héctor Carreño', 'José Barrios'),
('EQ-04', 'Indios de Punceres', 'baloncesto-master', 'Grupo B', 'Cancha Los Robles', 'IDP', './assets/logo.png', '#9E1B32', 'Téc. Nelson Figueroa', '17890123', '+58 412-3091823', 'delegado.indios@gmdjl.com', '2024', 'Téc. Nelson Figueroa', 'Prof. Kelvin Requena', 'Samuel Morales'),
('EQ-VOL-01', 'Ángeles de Oriente', 'voleibol-femenino', 'Grupo A', 'Gimnasio Pablo Higuerey', 'ANG', './assets/logo.png', '#38BDF8', 'Lic. Mariana Soto', '20111222', '+58 414-2223344', 'delegado.angeles@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-VOL-02', 'Sirenas del Morro', 'voleibol-femenino', 'Grupo A', 'Gimnasio Pablo Higuerey', 'SIR', './assets/logo.png', '#EC4899', 'Prof. Carmen Ruiz', '21222333', '+58 424-3334455', 'delegado.sirenas@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-VOL-03', 'Guerreras JL', 'voleibol-femenino', 'Grupo B', 'Complejo Deportivo JL', 'GJL', './assets/logo.png', '#800020', 'Prof. Ana Silva', '22333444', '+58 412-4445566', 'delegado.guerreras@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-VOL-04', 'Vencedoras VC', 'voleibol-femenino', 'Grupo B', 'Domo Bolivariano', 'VVC', './assets/logo.png', '#8B5CF6', 'Lic. Laura Peña', '23444555', '+58 416-5556677', 'delegado.vencedoras@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-FUT-01', 'Titanes Futsal', 'futsal-copa', 'Grupo A', 'Cancha Los Robles', 'TIT', './assets/logo.png', '#10B981', 'Prof. Nelson Parra', '14555666', '+58 414-1112233', 'delegado.titanesfs@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-FUT-02', 'Pumas de Puerto', 'futsal-copa', 'Grupo A', 'Cancha Los Robles', 'PUM', './assets/logo.png', '#F97316', 'Sr. Edgar Mendoza', '15666777', '+58 424-6667788', 'delegado.pumas@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-FUT-03', 'Deportivo Higuerey', 'futsal-copa', 'Grupo B', 'Gimnasio Pablo Higuerey', 'DHY', './assets/logo.png', '#9E1B32', 'Prof. Iván Castillo', '16777888', '+58 412-7778899', 'delegado.deportivoh@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-FUT-04', 'Atlético Oriente FS', 'futsal-copa', 'Grupo B', 'Complejo Deportivo JL', 'AOF', './assets/logo.png', '#2563EB', 'Lic. Andrés Bello', '17888999', '+58 416-8889900', 'delegado.atletico@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-SOT-01', 'Cerveceros del Este', 'softbol-master', 'Grupo A', 'Estadio Manuel Carrasquel', 'CER', './assets/logo.png', '#F59E0B', 'Prof. Carlos Urbano', '18999000', '+58 414-9990011', 'delegado.cerveceros@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-SOT-02', 'Guerreros del Diamante', 'softbol-master', 'Grupo A', 'Estadio Manuel Carrasquel', 'GDD', './assets/logo.png', '#DC2626', 'Lic. Pedro Marcano', '19000111', '+58 424-1110022', 'delegado.diamante@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-SOT-03', 'Petroleros JL', 'softbol-master', 'Grupo B', 'Complejo Deportivo JL', 'PJL', './assets/logo.png', '#800020', 'Ing. José Lambert', '14621157', '+58 412-2221133', 'delegado.petroleros@gmdjl.com', '2024', NULL, NULL, NULL),
('EQ-SOT-04', 'Cardenales Master', 'softbol-master', 'Grupo B', 'Estadio José Pérez', 'CDM', './assets/logo.png', '#B91C1C', 'Prof. Luis Marval', '20123456', '+58 416-3332244', 'delegado.cardenales@gmdjl.com', '2024', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    disciplina_id = EXCLUDED.disciplina_id,
    grupo = EXCLUDED.grupo,
    sede_principal = EXCLUDED.sede_principal,
    siglas = EXCLUDED.siglas,
    color = EXCLUDED.color,
    delegado_nombre = EXCLUDED.delegado_nombre;

-- ATLETAS
INSERT INTO public.atletas (id, disciplina_id, cedula, nombres, fecha_nacimiento, edad, camiseta, posicion, equipo, rol, foto_url)
VALUES
('ATL-001', 'baloncesto-master', 'V-24589123', 'Carlos Eduardo Mendoza', '1996-05-14', 28, '7', 'Base', 'Gigantes de Caripito', 'Atleta', ''),
('ATL-002', 'baloncesto-master', 'V-26102948', 'José Alejandro Salazar', '1998-11-20', 26, '11', 'Escolta', 'Gigantes de Caripito', 'Atleta', ''),
('ATL-003', 'baloncesto-master', 'V-22441902', 'Miguel Ángel Rondón', '1994-03-08', 30, '15', 'Alero', 'Gigantes de Caripito', 'Capitán', ''),
('ATL-004', 'baloncesto-master', 'V-25890124', 'David Jesús Marcano', '1997-09-12', 27, '23', 'Ala-Pívot', 'Gigantes de Caripito', 'Atleta', ''),
('ATL-005', 'baloncesto-master', 'V-21394850', 'Luis Fernando Cedeño', '1993-01-30', 31, '33', 'Pívot', 'Gigantes de Caripito', 'Atleta', ''),
('ATL-006', 'baloncesto-master', 'V-23948102', 'Gabriel Antonio Ramos', '1995-07-22', 29, '5', 'Base', 'Tigres de la Sabana', 'Atleta', ''),
('ATL-007', 'baloncesto-master', 'V-25019284', 'Javier Alexander Pinto', '1997-04-18', 27, '10', 'Escolta', 'Tigres de la Sabana', 'Capitán', ''),
('ATL-008', 'baloncesto-master', 'V-24102948', 'Andrés Eloy Rivas', '1996-08-05', 28, '12', 'Alero', 'Tigres de la Sabana', 'Atleta', ''),
('ATL-009', 'baloncesto-master', 'V-22940182', 'Jesús Manuel Torres', '1994-12-19', 30, '21', 'Ala-Pívot', 'Tigres de la Sabana', 'Atleta', ''),
('ATL-010', 'baloncesto-master', 'V-20891274', 'Víctor Alfonso Silva', '1992-06-11', 32, '34', 'Pívot', 'Tigres de la Sabana', 'Atleta', ''),
('ATL-011', 'baloncesto-master', 'V-26891024', 'Daniel Enrique Guerra', '1999-02-14', 25, '3', 'Base', 'Monagas BBC', 'Atleta', ''),
('ATL-012', 'baloncesto-master', 'V-24901823', 'Héctor Luis Carreño', '1996-10-25', 28, '8', 'Alero', 'Monagas BBC', 'Capitán', ''),
('ATL-013', 'baloncesto-master', 'V-23190284', 'Ricardo José Barrios', '1995-03-17', 29, '14', 'Pívot', 'Monagas BBC', 'Atleta', ''),
('ATL-014', 'baloncesto-master', 'V-25901824', 'Samuel David Morales', '1998-09-02', 26, '9', 'Base', 'Indios de Punceres', 'Atleta', ''),
('ATL-015', 'baloncesto-master', 'V-24810294', 'Kelvin José Requena', '1996-12-08', 28, '24', 'Alero', 'Indios de Punceres', 'Capitán', '')
ON CONFLICT (id) DO UPDATE SET
    disciplina_id = EXCLUDED.disciplina_id,
    cedula = EXCLUDED.cedula,
    nombres = EXCLUDED.nombres,
    camiseta = EXCLUDED.camiseta,
    posicion = EXCLUDED.posicion,
    equipo = EXCLUDED.equipo,
    rol = EXCLUDED.rol;

-- PARTIDOS (CALENDARIO DE LAS 4 DISCIPLINAS)
INSERT INTO public.partidos (id, disciplina_id, fecha, hora, sede, fase, grupo, equipo_local, q1_loc, q2_loc, q3_loc, q4_loc, ot_loc, total_local, puntos_local, equipo_visitante, q1_vis, q2_vis, q3_vis, q4_vis, ot_vis, total_visitante, puntos_visitante, estado, periodo_actual, reloj, faltas_loc, faltas_vis)
VALUES
('PAR-BAL-01', 'baloncesto-master', '2026-10-18', '18:00', 'Gimnasio Pablo Higuerey', 'Jornada 1 (Fase Regular)', 'Grupo A', 'Gigantes de Caripito', 12, 10, 11, 10, 0, 43, 43, 'Tigres de la Sabana', 10, 12, 9, 11, 0, 42, 42, 'FINALIZADO', 'Final', '00:00', 2, 3),
('PAR-BAL-02', 'baloncesto-master', '2026-10-18', '19:45', 'Gimnasio Pablo Higuerey', 'Jornada 1 (Fase Regular)', 'Grupo B', 'Monagas BBC', 14, 11, 12, 10, 0, 47, 47, 'Indios de Punceres', 11, 13, 10, 11, 0, 45, 45, 'FINALIZADO', 'Final', '00:00', 4, 1),
('PAR-BAL-03', 'baloncesto-master', '2026-10-19', '18:00', 'Complejo Deportivo JL', 'Jornada 2 (Fase Regular)', 'Grupo A', 'Gigantes de Caripito', 8, 10, 6, 0, 0, 24, 24, 'Monagas BBC', 7, 9, 6, 0, 0, 22, 22, 'EN CURSO', 'Q3', '06:45', 1, 2),
('PAR-BAL-04', 'baloncesto-master', '2026-10-19', '19:30', 'Cancha Los Robles', 'Jornada 2 (Fase Regular)', 'Grupo B', 'Tigres de la Sabana', 0, 0, 0, 0, 0, 0, 0, 'Indios de Punceres', 0, 0, 0, 0, 0, 0, 0, 'PROGRAMADO', 'Por Iniciar', '10:00', 0, 0),
('PAR-VOL-01', 'voleibol-femenino', '2026-10-18', '17:00', 'Gimnasio Pablo Higuerey', 'Jornada 1', 'Grupo A', 'Ángeles de Oriente', 25, 22, 15, 0, 0, 2, 2, 'Sirenas del Morro', 21, 25, 12, 0, 0, 1, 1, 'FINALIZADO', 'Final', '00:00', 0, 0),
('PAR-VOL-02', 'voleibol-femenino', '2026-10-19', '18:30', 'Complejo Deportivo JL', 'Jornada 2', 'Grupo B', 'Guerreras JL', 25, 19, 14, 0, 0, 1, 1, 'Vencedoras VC', 20, 25, 12, 0, 0, 1, 1, 'EN CURSO', 'Set 3', '14:20', 0, 0),
('PAR-VOL-03', 'voleibol-femenino', '2026-10-20', '18:00', 'Domo Bolivariano', 'Jornada 3', 'Grupo A', 'Ángeles de Oriente', 0, 0, 0, 0, 0, 0, 0, 'Guerreras JL', 0, 0, 0, 0, 0, 0, 0, 'PROGRAMADO', 'Por Iniciar', '25:00', 0, 0),
('PAR-FUT-01', 'futsal-copa', '2026-10-18', '17:30', 'Cancha Los Robles', 'Jornada 1', 'Grupo A', 'Titanes Futsal', 2, 2, 0, 0, 0, 4, 4, 'Pumas de Puerto', 1, 2, 0, 0, 0, 3, 3, 'FINALIZADO', 'Final', '00:00', 0, 0),
('PAR-FUT-02', 'futsal-copa', '2026-10-19', '19:00', 'Gimnasio Pablo Higuerey', 'Jornada 2', 'Grupo B', 'Deportivo Higuerey', 1, 1, 0, 0, 0, 2, 2, 'Atlético Oriente FS', 1, 1, 0, 0, 0, 2, 2, 'EN CURSO', '2do Tiempo', '08:40', 0, 0),
('PAR-FUT-03', 'futsal-copa', '2026-10-20', '19:30', 'Complejo Deportivo JL', 'Jornada 3', 'Grupo A', 'Titanes Futsal', 0, 0, 0, 0, 0, 0, 0, 'Deportivo Higuerey', 0, 0, 0, 0, 0, 0, 0, 'PROGRAMADO', 'Por Iniciar', '20:00', 0, 0),
('PAR-SOT-01', 'softbol-master', '2026-10-18', '10:00', 'Estadio Manuel Carrasquel', 'Jornada 1', 'Grupo A', 'Cerveceros del Este', 2, 3, 2, 0, 0, 7, 7, 'Guerreros del Diamante', 1, 1, 3, 0, 0, 5, 5, 'FINALIZADO', 'Final', '00:00', 0, 0),
('PAR-SOT-02', 'softbol-master', '2026-10-19', '14:00', 'Complejo Deportivo JL', 'Jornada 2', 'Grupo B', 'Petroleros JL', 2, 1, 1, 0, 0, 4, 4, 'Cardenales Master', 0, 2, 1, 0, 0, 3, 3, 'EN CURSO', 'Inning 5', '10:00', 0, 0),
('PAR-SOT-03', 'softbol-master', '2026-10-20', '15:30', 'Estadio José Pérez', 'Jornada 3', 'Grupo A', 'Cerveceros del Este', 0, 0, 0, 0, 0, 0, 0, 'Petroleros JL', 0, 0, 0, 0, 0, 0, 0, 'PROGRAMADO', 'Por Iniciar', '15:00', 0, 0)
ON CONFLICT (id) DO UPDATE SET
    total_local = EXCLUDED.total_local,
    total_visitante = EXCLUDED.total_visitante,
    estado = EXCLUDED.estado,
    periodo_actual = EXCLUDED.periodo_actual,
    reloj = EXCLUDED.reloj,
    q1_loc = EXCLUDED.q1_loc,
    q2_loc = EXCLUDED.q2_loc,
    q3_loc = EXCLUDED.q3_loc,
    q4_loc = EXCLUDED.q4_loc,
    q1_vis = EXCLUDED.q1_vis,
    q2_vis = EXCLUDED.q2_vis,
    q3_vis = EXCLUDED.q3_vis,
    q4_vis = EXCLUDED.q4_vis,
    faltas_loc = EXCLUDED.faltas_loc,
    faltas_vis = EXCLUDED.faltas_vis;

-- ==============================================================================
-- ¡LISTO! Tablas creadas, RLS configurado, Realtime activo y datos inicializados.
-- ==============================================================================
