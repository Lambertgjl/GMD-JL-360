// supabase.js - Cliente Oficial y Motor Realtime para Grupo Multiservicios Deportivo JL

class SupabaseService {
  constructor() {
    this.client = null;
    this.status = 'DISCONNECTED'; // CONNECTED | DISCONNECTED | OFFLINE | ERROR
    this.channel = null;
    this.listeners = new Set();
    this.initClient();
  }

  initClient() {
    const config = window.tournamentStore ? window.tournamentStore.getConfig() : {};
    const url = config.supabaseUrl || localStorage.getItem('gmd_supabase_url') || '';
    const key = config.supabaseAnonKey || localStorage.getItem('gmd_supabase_anon_key') || '';

    if (url && key && window.supabase) {
      try {
        this.client = window.supabase.createClient(url, key);
        this.status = 'CONNECTED';
        console.log('[Supabase] Cliente inicializado correctamente con', url);
        this.subscribeRealtime();
      } catch (err) {
        console.warn('[Supabase] Error al inicializar cliente:', err);
        this.status = 'ERROR';
      }
    } else {
      this.status = 'DISCONNECTED';
      console.log('[Supabase] Modo local activo (Sin credenciales configuradas)');
    }
    this.notifyStatus();
  }

  subscribeRealtime() {
    if (!this.client) return;

    try {
      if (this.channel) {
        this.client.removeChannel(this.channel);
      }

      this.channel = this.client
        .channel('gmd-jl-tournament-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'partidos' },
          (payload) => {
            console.log('[Supabase Realtime] Cambio detectado en partidos:', payload);
            if (payload.eventType === 'UPDATE' && payload.new) {
              window.tournamentStore.updatePartido(payload.new.id, payload.new);
            } else if (payload.eventType === 'INSERT' && payload.new) {
              window.tournamentStore.addPartido(payload.new);
            }
          }
        )
        .on(
          'broadcast',
          { event: 'score_update' },
          ({ payload }) => {
            console.log('[Supabase Realtime Broadcast] Marcador recibido:', payload);
            if (payload && payload.partidoId) {
              window.tournamentStore.updatePartido(payload.partidoId, payload.patch);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Supabase Realtime] Estatus del canal:', status);
          if (status === 'SUBSCRIBED') {
            this.status = 'CONNECTED';
          }
          this.notifyStatus();
        });
    } catch (e) {
      console.warn('[Supabase] Error configurando suscripción Realtime:', e);
    }
  }

  async broadcastScore(partidoId, patch) {
    // 1. Send via local store first (instant)
    window.tournamentStore.updatePartido(partidoId, patch);

    // 2. If Supabase is connected, broadcast and update DB
    if (this.client && this.status === 'CONNECTED') {
      try {
        if (this.channel) {
          await this.channel.send({
            type: 'broadcast',
            event: 'score_update',
            payload: { partidoId, patch }
          });
        }
        // Also persist to Supabase DB
        await this.client
          .from('partidos')
          .update(patch)
          .eq('id', partidoId);
      } catch (e) {
        console.warn('[Supabase] Error transmitiendo marcador a la nube:', e);
      }
    }
  }

  configure(url, key) {
    if (window.tournamentStore) {
      window.tournamentStore.updateConfig({ supabaseUrl: url, supabaseAnonKey: key });
    }
    localStorage.setItem('gmd_supabase_url', url);
    localStorage.setItem('gmd_supabase_anon_key', key);
    this.initClient();
  }

  onStatusChange(cb) {
    this.listeners.add(cb);
    cb(this.status);
    return () => this.listeners.delete(cb);
  }

  notifyStatus() {
    this.listeners.forEach((cb) => cb(this.status));
  }

  /**
   * Generador del Script SQL completo y verificado para la consola de Supabase
   */
  getSQLSchemaScript() {
    return `-- ==============================================================================
-- SCRIPT DE BASE DE DATOS Y REALTIME SUPABASE PARA:
-- "GRUPO MULTISERVICIOS DEPORTIVOS JL"
-- Copie y pegue este script completo en el SQL Editor de Supabase y presione RUN.
-- ==============================================================================

-- 1. TABLA DISCIPLINAS
CREATE TABLE IF NOT EXISTS public.disciplinas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT,
    icono TEXT,
    banner TEXT,
    color TEXT,
    activa BOOLEAN DEFAULT true,
    reglas JSONB DEFAULT '{"periodos": 4, "nombrePeriodo": "Cuarto", "ptsGanador": 2, "ptsPerdedor": 1, "duracionMin": 10}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA EQUIPOS (CONFIG_GRUPOS)
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
    delegado_telefono TEXT,
    pin TEXT DEFAULT '2024',
    creado_en TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA ATLETAS (ROSTER)
CREATE TABLE IF NOT EXISTS public.atletas (
    id TEXT PRIMARY KEY,
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

-- 4. TABLA PARTIDOS Y RESULTADOS (MESA DE ANOTACIÓN / CALENDARIO)
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
    total_local INTEGER DEFAULT 0,
    equipo_visitante TEXT NOT NULL,
    q1_vis INTEGER DEFAULT 0,
    q2_vis INTEGER DEFAULT 0,
    q3_vis INTEGER DEFAULT 0,
    q4_vis INTEGER DEFAULT 0,
    total_visitante INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'PROGRAMADO', -- PROGRAMADO | EN CURSO | FINALIZADO
    periodo_actual TEXT DEFAULT 'Por Iniciar',
    reloj TEXT DEFAULT '10:00',
    faltas_loc INTEGER DEFAULT 0,
    faltas_vis INTEGER DEFAULT 0,
    actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA POSICIONES (TABLA_POSICIONES)
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

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posiciones ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para aficionados
CREATE POLICY "Lectura pública para disciplinas" ON public.disciplinas FOR SELECT USING (true);
CREATE POLICY "Lectura pública para equipos" ON public.equipos FOR SELECT USING (true);
CREATE POLICY "Lectura pública para atletas" ON public.atletas FOR SELECT USING (true);
CREATE POLICY "Lectura pública para partidos" ON public.partidos FOR SELECT USING (true);
CREATE POLICY "Lectura pública para posiciones" ON public.posiciones FOR SELECT USING (true);

-- Políticas de inserción y modificación total para la app
CREATE POLICY "Acceso total para disciplinas" ON public.disciplinas FOR ALL USING (true);
CREATE POLICY "Acceso total para equipos" ON public.equipos FOR ALL USING (true);
CREATE POLICY "Acceso total para atletas" ON public.atletas FOR ALL USING (true);
CREATE POLICY "Acceso total para partidos" ON public.partidos FOR ALL USING (true);
CREATE POLICY "Acceso total para posiciones" ON public.posiciones FOR ALL USING (true);

-- 7. ACTIVAR SUPABASE REALTIME PARA TRANSMISIÓN INSTANTÁNEA
-- Esto permite que cualquier cambio en la mesa técnica se transmita sin recargar la página
ALTER PUBLICATION supabase_realtime ADD TABLE public.partidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posiciones;

-- ==============================================================================
-- ¡LISTO! La base de datos de Grupo Multiservicios Deportivo JL está configurada.
-- ==============================================================================`;
  }
}

window.supabaseService = new SupabaseService();
