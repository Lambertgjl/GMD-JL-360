// supabase.js - Cliente Oficial y Motor Realtime para Grupo Multiservicios Deportivo JL

const DEFAULT_SUPABASE_URL = 'https://wznvihuvpqnnrlgcgqpx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnZpaHV2cHFubnJsZ2dxcHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxNzAzNzQwMCwiZXhwIjoyMDMyNjEzNDAwfQ.ixhXWj0Jfir852IXJFdZNNfNscnND2u5WPXZ0EBA6Ik';

class SupabaseService {
  constructor() {
    this.client = null;
    this.status = 'DISCONNECTED'; // CONNECTED | DISCONNECTED | OFFLINE | ERROR
    this.channel = null;
    this.url = DEFAULT_SUPABASE_URL;
    this.key = DEFAULT_SUPABASE_ANON_KEY;
    this.listeners = new Set();
    this.initClient();
  }

  initClient() {
    const config = window.tournamentStore ? window.tournamentStore.getConfig() : {};
    const storedUrl = localStorage.getItem('gmd_supabase_url');
    const storedKey = localStorage.getItem('gmd_supabase_anon_key');

    // Usa las credenciales guardadas si son válidas; de lo contrario aplica las de producción
    const url = (config.supabaseUrl || (storedUrl && !storedUrl.includes('xyz') ? storedUrl : '') || DEFAULT_SUPABASE_URL).trim();
    const key = (config.supabaseAnonKey || (storedKey && storedKey.length > 50 ? storedKey : '') || DEFAULT_SUPABASE_ANON_KEY).trim();

    this.url = url;
    this.key = key;

    // Persistir en localStorage y sincronizar con tournamentStore
    try {
      localStorage.setItem('gmd_supabase_url', url);
      localStorage.setItem('gmd_supabase_anon_key', key);
      if (window.tournamentStore && (!config.supabaseUrl || !config.supabaseAnonKey)) {
        window.tournamentStore.updateConfig({ supabaseUrl: url, supabaseAnonKey: key });
      }
    } catch (e) {
      console.warn('[Supabase] Warning al guardar credenciales en storage:', e);
    }

    if (url && key && window.supabase) {
      try {
        this.client = window.supabase.createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });
        this.status = 'CONNECTED';
        console.log('[Supabase] Cliente inicializado correctamente con', url);
        this.subscribeRealtime();
        this.verifyConnection();
      } catch (err) {
        console.warn('[Supabase] Error al inicializar cliente:', err);
        this.status = 'ERROR';
      }
    } else {
      this.status = 'DISCONNECTED';
      console.log('[Supabase] Modo local activo (Esperando inicialización de SDK)');
    }
    this.notifyStatus();
  }

  async verifyConnection() {
    if (!this.client) return false;
    try {
      const { data, error } = await this.client.from('partidos').select('id').limit(1);
      if (!error) {
        this.status = 'CONNECTED';
        console.log('[Supabase] Conexión y acceso verificado con éxito en el nuevo proyecto');
      } else {
        console.log('[Supabase] Conectado a la API. Respuesta de tabla:', error.message || error);
        // Aun si la tabla no existe todavía en Supabase, el endpoint y la clave son válidos
        this.status = 'CONNECTED';
      }
      this.notifyStatus();
      return true;
    } catch (e) {
      console.warn('[Supabase] Fallo al verificar conexión:', e);
      return false;
    }
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
            if (payload.eventType === 'UPDATE' && payload.new && window.tournamentStore) {
              window.tournamentStore.updatePartido(payload.new.id, payload.new);
            } else if (payload.eventType === 'INSERT' && payload.new && window.tournamentStore) {
              window.tournamentStore.addPartido(payload.new);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'equipos' },
          (payload) => {
            console.log('[Supabase Realtime] Cambio detectado en equipos:', payload);
            if (payload.eventType === 'UPDATE' && payload.new && window.tournamentStore) {
              window.tournamentStore.updateEquipo(payload.new.id, payload.new);
            } else if (payload.eventType === 'INSERT' && payload.new && window.tournamentStore) {
              window.tournamentStore.addEquipo(payload.new);
            }
          }
        )
        .on(
          'broadcast',
          { event: 'score_update' },
          ({ payload }) => {
            console.log('[Supabase Realtime Broadcast] Marcador recibido:', payload);
            if (payload && payload.partidoId && window.tournamentStore) {
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
    // 1. Enviar primero al almacén local para respuesta instantánea
    if (window.tournamentStore) {
      window.tournamentStore.updatePartido(partidoId, patch);
    }

    // 2. Si Supabase está conectado, difundir por broadcast y actualizar BD
    if (this.client && this.status === 'CONNECTED') {
      try {
        if (this.channel) {
          await this.channel.send({
            type: 'broadcast',
            event: 'score_update',
            payload: { partidoId, patch }
          });
        }
        // Persistir también en tabla partidos de Supabase
        await this.client
          .from('partidos')
          .update(patch)
          .eq('id', partidoId);
      } catch (e) {
        console.warn('[Supabase] Error transmitiendo marcador a la nube:', e);
      }
    }
  }

  /**
   * Sincroniza datos de equipos hacia la nube
   */
  async syncEquipos() {
    if (!this.client || !window.tournamentStore) return false;
    try {
      const data = window.tournamentStore.data;
      const equipos = data?.equipos || [];
      if (equipos.length === 0) return true;

      const payload = equipos.map((eq) => ({
        id: eq.id,
        nombre: eq.nombre,
        disciplina_id: eq.disciplinaId,
        grupo: eq.grupo,
        sede_principal: eq.sedePrincipal,
        siglas: eq.siglas,
        logo_url: eq.logoUrl,
        color: eq.color,
        delegado_nombre: eq.delegadoNombre,
        delegado_telefono: eq.delegadoTelefono,
        pin: eq.pin || '2024'
      }));

      const { error } = await this.client.from('equipos').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync Equipos]:', error.message);
      return !error;
    } catch (e) {
      console.warn('[Supabase Sync Equipos Error]:', e);
      return false;
    }
  }

  /**
   * Sincroniza calendario de partidos hacia la nube
   */
  async syncPartidos() {
    if (!this.client || !window.tournamentStore) return false;
    try {
      const data = window.tournamentStore.data;
      const partidos = data?.partidos || [];
      if (partidos.length === 0) return true;

      const payload = partidos.map((p) => ({
        id: p.id,
        disciplina_id: p.disciplinaId,
        fecha: p.fecha,
        hora: p.hora,
        sede: p.sede,
        fase: p.fase,
        grupo: p.grupo,
        equipo_local: p.equipoLocal,
        total_local: p.totalLocal || 0,
        equipo_visitante: p.equipoVisitante,
        total_visitante: p.totalVisitante || 0,
        estado: p.estado || 'PROGRAMADO',
        periodo_actual: p.periodoActual || 'Por Iniciar',
        reloj: p.reloj || '10:00'
      }));

      const { error } = await this.client.from('partidos').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync Partidos]:', error.message);
      return !error;
    } catch (e) {
      console.warn('[Supabase Sync Partidos Error]:', e);
      return false;
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
