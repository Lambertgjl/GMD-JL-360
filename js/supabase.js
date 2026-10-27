// supabase.js - Cliente Oficial, Motor Realtime y Sincronización Cloud para Grupo Multiservicios Deportivo JL

const DEFAULT_SUPABASE_URL = 'https://wznvlhuvpqnnrlgcgqpx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnZsaHV2cHFubnJsZ2NncXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NDkyNDcsImV4cCI6MjEwODQyNTI0N30.ixhXWj0Jfir852lXJFdZNNfNscnND2u5WPXZ0EBA6lk';

class SupabaseService {
  constructor() {
    this.client = null;
    this.status = 'DISCONNECTED'; // CONNECTED | TABLES_MISSING | DISCONNECTED | OFFLINE | ERROR
    this.channel = null;
    this.url = DEFAULT_SUPABASE_URL;
    this.key = DEFAULT_SUPABASE_ANON_KEY;
    this.listeners = new Set();
    this.isHydrating = false;
    this.setupLifecycleListeners();
    this.initClient();
  }

  setupLifecycleListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let reactivationTimer = null;
    const handleReactivation = () => {
      clearTimeout(reactivationTimer);
      reactivationTimer = setTimeout(() => {
        console.log('[Supabase Lifecycle] Ventana activa / reconexión detectada. Verificando estado y sincronizando datos...');
        if (!this.client) {
          this.initClient();
        } else {
          this.verifyConnection().then((connected) => {
            if (connected) {
              this.hydrateFromSupabase();
            }
          }).catch(() => {});
        }
      }, 300);
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleReactivation();
      }
    });

    window.addEventListener('online', handleReactivation);
    window.addEventListener('focus', handleReactivation);
  }

  initClient() {
    this.url = DEFAULT_SUPABASE_URL;
    this.key = DEFAULT_SUPABASE_ANON_KEY;

    try {
      if (window.tournamentStore) {
        window.tournamentStore.updateConfig({ supabaseUrl: this.url, supabaseAnonKey: this.key });
      }
    } catch (e) {
      console.warn('[Supabase] Warning al registrar credenciales:', e);
    }

    if (this.url && this.key && window.supabase) {
      try {
        this.client = window.supabase.createClient(this.url, this.key, {
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
        console.log('[Supabase] Cliente inicializado correctamente con', this.url);
        this.subscribeRealtime();
        this.verifyConnection();
      } catch (err) {
        console.warn('[Supabase] Error al inicializar cliente:', err);
        this.status = 'ERROR';
        this.notifyStatus();
      }
    } else {
      this.status = 'DISCONNECTED';
      console.log('[Supabase] Modo local activo (Esperando SDK)');
      this.notifyStatus();
    }
  }

  async verifyConnection() {
    if (!this.client) {
      this.status = 'DISCONNECTED';
      this.notifyStatus();
      return false;
    }

    try {
      const { data, error } = await this.client.from('partidos').select('id').limit(1);

      if (!error) {
        this.status = 'CONNECTED';
        console.log('[Supabase] Conexión y tablas verificadas con éxito en el proyecto');
        this.notifyStatus();
        // Sincronizar datos de la nube automáticamente
        this.hydrateFromSupabase();
        return true;
      }

      // Código PGRST205 indica que la tabla no existe en el schema cache de Supabase
      if (error.code === 'PGRST205' || (error.message && error.message.includes('schema cache'))) {
        this.status = 'TABLES_MISSING';
        console.warn('[Supabase] Conectado a Supabase pero FALTAN LAS TABLAS. Ejecute el script SQL.');
        this.notifyStatus();
        return false;
      }

      console.warn('[Supabase] Error de respuesta de tabla:', error.message || error);
      this.status = 'ERROR';
      this.notifyStatus();
      return false;
    } catch (e) {
      console.warn('[Supabase] Fallo al verificar conexión:', e);
      this.status = 'ERROR';
      this.notifyStatus();
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
            if (payload.new && window.tournamentStore) {
              const match = this.mapSupabasePartidoToLocal(payload.new);
              window.tournamentStore.updatePartido(match.id, match, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            } else if (payload.eventType === 'DELETE' && payload.old && window.tournamentStore) {
              window.tournamentStore.deletePartido(payload.old.id, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'equipos' },
          (payload) => {
            console.log('[Supabase Realtime] Cambio detectado en equipos:', payload);
            if (payload.new && window.tournamentStore) {
              const eq = this.mapSupabaseEquipoToLocal(payload.new);
              window.tournamentStore.updateEquipo(eq.id, eq, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            } else if (payload.eventType === 'DELETE' && payload.old && window.tournamentStore) {
              window.tournamentStore.deleteEquipo(payload.old.id, 'superadmin', false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'atletas' },
          (payload) => {
            console.log('[Supabase Realtime] Cambio detectado en atletas:', payload);
            if (payload.new && window.tournamentStore) {
              const a = this.mapSupabaseAtletaToLocal(payload.new);
              window.tournamentStore.updateAtleta(a.id, a, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            } else if (payload.eventType === 'DELETE' && payload.old && window.tournamentStore) {
              window.tournamentStore.deleteAtleta(payload.old.id, 'superadmin', false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'disciplinas' },
          (payload) => {
            console.log('[Supabase Realtime] Cambio detectado en disciplinas:', payload);
            if (payload.new && window.tournamentStore) {
              const rd = payload.new;
              const cleanRdId = (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(rd.id) : rd.id;
              const discs = window.tournamentStore.getDisciplinas();
              const existing = discs.find((d) => {
                const cleanDId = (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(d.id) : d.id;
                return cleanDId === cleanRdId;
              });
              if (existing) {
                existing.nombre = rd.nombre || existing.nombre;
                existing.categoria = rd.categoria || existing.categoria;
                existing.icono = rd.icono || existing.icono;
                existing.color = rd.color || existing.color;
                if (rd.avatar) existing.avatar = rd.avatar;
                if (rd.banner) existing.banner = rd.banner;
                if (rd.reglas) existing.reglas = rd.reglas;
                existing.activa = rd.activa !== false;
                window.tournamentStore.saveDisciplinasConfig(discs);
                window.tournamentStore.saveToStorage();
              } else {
                window.tournamentStore.addDisciplina({
                  id: cleanRdId,
                  nombre: rd.nombre,
                  categoria: rd.categoria,
                  icono: rd.icono,
                  avatar: rd.avatar,
                  banner: rd.banner,
                  color: rd.color,
                  activa: rd.activa !== false,
                  reglas: rd.reglas
                }, false);
              }
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            } else if (payload.eventType === 'DELETE' && payload.old && window.tournamentStore) {
              const cleanOldId = (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(payload.old.id) : payload.old.id;
              window.tournamentStore.deleteDisciplina(cleanOldId, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'discipline_synced' },
          ({ payload }) => {
            if (payload && payload.disciplina && window.tournamentStore) {
              const d = payload.disciplina;
              const cleanDId = (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(d.id) : d.id;
              const discs = window.tournamentStore.getDisciplinas();
              const existing = discs.find((x) => ((typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(x.id) : x.id) === cleanDId);
              if (existing) {
                existing.nombre = d.nombre || existing.nombre;
                existing.categoria = d.categoria || existing.categoria;
                existing.icono = d.icono || existing.icono;
                existing.color = d.color || existing.color;
                if (d.avatar) existing.avatar = d.avatar;
                if (d.banner) existing.banner = d.banner;
                if (d.reglas) existing.reglas = d.reglas;
                existing.activa = d.activa !== false;
                window.tournamentStore.saveDisciplinasConfig(discs);
                window.tournamentStore.saveToStorage();
              } else {
                window.tournamentStore.addDisciplina(d, false);
              }
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'discipline_deleted' },
          ({ payload }) => {
            if (payload && payload.id && window.tournamentStore) {
              const cleanDelId = (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(payload.id) : payload.id;
              window.tournamentStore.deleteDisciplina(cleanDelId, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'score_update' },
          ({ payload }) => {
            console.log('[Supabase Realtime Broadcast] Marcador recibido:', payload);
            if (payload && payload.partidoId && window.tournamentStore) {
              window.tournamentStore.updatePartido(payload.partidoId, payload.patch, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'match_synced' },
          ({ payload }) => {
            if (payload && payload.partido && window.tournamentStore) {
              window.tournamentStore.updatePartido(payload.id, payload.partido, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'match_deleted' },
          ({ payload }) => {
            if (payload && payload.id && window.tournamentStore) {
              window.tournamentStore.deletePartido(payload.id, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'team_synced' },
          ({ payload }) => {
            if (payload && payload.equipo && window.tournamentStore) {
              window.tournamentStore.updateEquipo(payload.id, payload.equipo, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'team_deleted' },
          ({ payload }) => {
            if (payload && payload.id && window.tournamentStore) {
              window.tournamentStore.deleteEquipo(payload.id, 'superadmin', false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'athlete_synced' },
          ({ payload }) => {
            if (payload && payload.atleta && window.tournamentStore) {
              window.tournamentStore.updateAtleta(payload.id, payload.atleta, false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'athlete_deleted' },
          ({ payload }) => {
            if (payload && payload.id && window.tournamentStore) {
              window.tournamentStore.deleteAtleta(payload.id, 'superadmin', false);
              if (typeof window.renderAllViews === 'function') {
                window.renderAllViews();
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('[Supabase Realtime] Estatus del canal:', status);
        });
    } catch (e) {
      console.warn('[Supabase] Error configurando suscripción Realtime:', e);
    }
  }

  // --- MAPEOS DE DATOS (snake_case <-> camelCase) ---

  mapSupabasePartidoToLocal(p) {
    if (!p) return null;
    const totLoc = Number(p.total_local ?? p.puntos_local ?? 0);
    const totVis = Number(p.total_visitante ?? p.puntos_visitante ?? 0);
    return {
      id: p.id,
      disciplinaId: p.disciplina_id || 'baloncesto-master',
      fecha: p.fecha,
      hora: p.hora,
      sede: p.sede || 'Gimnasio Pablo Higuerey',
      fase: p.fase || 'Fase de Grupos',
      grupo: p.grupo || 'Grupo A',
      equipoLocal: p.equipo_local,
      q1Loc: Number(p.q1_loc ?? 0),
      q2Loc: Number(p.q2_loc ?? 0),
      q3Loc: Number(p.q3_loc ?? 0),
      q4Loc: Number(p.q4_loc ?? 0),
      otLoc: Number(p.ot_loc ?? 0),
      totalLocal: totLoc,
      puntosLocal: totLoc,
      equipoVisitante: p.equipo_visitante,
      q1Vis: Number(p.q1_vis ?? 0),
      q2Vis: Number(p.q2_vis ?? 0),
      q3Vis: Number(p.q3_vis ?? 0),
      q4Vis: Number(p.q4_vis ?? 0),
      otVis: Number(p.ot_vis ?? 0),
      totalVisitante: totVis,
      puntosVisitante: totVis,
      estado: p.estado || 'PROGRAMADO',
      periodoActual: p.periodo_actual || 'Por Iniciar',
      reloj: p.reloj || '10:00',
      faltasLoc: Number(p.faltas_loc ?? 0),
      faltasVis: Number(p.faltas_vis ?? 0),
      actualizadoEn: p.actualizado_en || new Date().toISOString()
    };
  }

  mapLocalPartidoToSupabase(p) {
    if (!p) return null;
    const totLoc = Number(p.totalLocal ?? p.puntosLocal ?? 0);
    const totVis = Number(p.totalVisitante ?? p.puntosVisitante ?? 0);
    return {
      id: p.id,
      disciplina_id: p.disciplinaId || 'baloncesto-master',
      fecha: p.fecha || new Date().toISOString().split('T')[0],
      hora: p.hora || '18:00',
      sede: p.sede || 'Gimnasio Pablo Higuerey',
      fase: p.fase || 'Fase de Grupos',
      grupo: p.grupo || 'Grupo A',
      equipo_local: p.equipoLocal,
      q1_loc: Number(p.q1Loc) || 0,
      q2_loc: Number(p.q2Loc) || 0,
      q3_loc: Number(p.q3Loc) || 0,
      q4_loc: Number(p.q4Loc) || 0,
      ot_loc: Number(p.otLoc) || 0,
      total_local: totLoc,
      puntos_local: totLoc,
      equipo_visitante: p.equipoVisitante,
      q1_vis: Number(p.q1Vis) || 0,
      q2_vis: Number(p.q2Vis) || 0,
      q3_vis: Number(p.q3Vis) || 0,
      q4_vis: Number(p.q4Vis) || 0,
      ot_vis: Number(p.otVis) || 0,
      total_visitante: totVis,
      puntos_visitante: totVis,
      estado: p.estado || 'PROGRAMADO',
      periodo_actual: p.periodoActual || 'Por Iniciar',
      reloj: p.reloj || '10:00',
      faltas_loc: Number(p.faltasLoc) || 0,
      faltas_vis: Number(p.faltasVis) || 0,
      actualizado_en: p.actualizadoEn || new Date().toISOString()
    };
  }

  mapSupabaseEquipoToLocal(eq) {
    if (!eq) return null;
    return {
      id: eq.id,
      nombre: eq.nombre,
      disciplinaId: eq.disciplina_id || 'baloncesto-master',
      grupo: eq.grupo || 'Grupo A',
      sedePrincipal: eq.sede_principal || 'Gimnasio Pablo Higuerey',
      siglas: eq.siglas || '',
      logoUrl: eq.logo_url || './assets/logo.png',
      color: eq.color || '#800020',
      delegadoNombre: eq.delegado_nombre || '',
      delegadoCedula: eq.delegado_cedula || '',
      delegadoTelefono: eq.delegado_telefono || '',
      delegadoEmail: eq.delegado_email || '',
      pin: eq.pin || '2024',
      entrenador: eq.entrenador || '',
      asistente: eq.asistente || '',
      utilero: eq.utilero || ''
    };
  }

  mapLocalEquipoToSupabase(eq) {
    if (!eq) return null;
    return {
      id: eq.id,
      nombre: eq.nombre,
      disciplina_id: eq.disciplinaId || 'baloncesto-master',
      grupo: eq.grupo || 'Grupo A',
      sede_principal: eq.sedePrincipal || 'Gimnasio Pablo Higuerey',
      siglas: eq.siglas || '',
      logo_url: eq.logoUrl || './assets/logo.png',
      color: eq.color || '#800020',
      delegado_nombre: eq.delegadoNombre || '',
      delegado_cedula: eq.delegadoCedula || '',
      delegado_telefono: eq.delegadoTelefono || '',
      delegado_email: eq.delegadoEmail || '',
      pin: eq.pin || '2024',
      entrenador: eq.entrenador || null,
      asistente: eq.asistente || null,
      utilero: eq.utilero || null
    };
  }

  mapSupabaseAtletaToLocal(atl) {
    if (!atl) return null;
    return {
      id: atl.id,
      disciplinaId: atl.disciplina_id || 'baloncesto-master',
      cedula: atl.cedula,
      nombres: atl.nombres,
      fechaNacimiento: atl.fecha_nacimiento,
      edad: atl.edad ? Number(atl.edad) : 0,
      camiseta: atl.camiseta || '',
      posicion: atl.posicion || '',
      equipo: atl.equipo,
      rol: atl.rol || 'Atleta',
      fotoUrl: atl.foto_url || ''
    };
  }

  mapLocalAtletaToSupabase(atl) {
    if (!atl) return null;
    return {
      id: atl.id,
      disciplina_id: atl.disciplinaId || 'baloncesto-master',
      cedula: atl.cedula,
      nombres: atl.nombres,
      fecha_nacimiento: atl.fechaNacimiento || null,
      edad: atl.edad ? Number(atl.edad) : null,
      camiseta: atl.camiseta || '',
      posicion: atl.posicion || '',
      equipo: atl.equipo,
      rol: atl.rol || 'Atleta',
      foto_url: atl.fotoUrl || null
    };
  }

  // --- SINCRONIZACIÓN ATÓMICA DE MUTACIONES DESDE EL STORE ---

  async syncPartido(id, p) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      if (p.disciplinaId && window.tournamentStore) {
        const disc = window.tournamentStore.getDisciplinaPorId(p.disciplinaId);
        if (disc) {
          await this.syncDisciplina(disc.id, disc);
        }
      }
      const payload = this.mapLocalPartidoToSupabase(p);
      if (!payload) return false;
      const { error } = await this.client.from('partidos').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync Partido Error]:', error.message);
        return false;
      }
      if (this.status !== 'CONNECTED') {
        this.status = 'CONNECTED';
        this.notifyStatus();
      }
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'match_synced',
          payload: { id, partido: p }
        });
      }
      return true;
    } catch (e) {
      console.warn('[Supabase Sync Partido Exception]:', e);
      return false;
    }
  }

  async updatePartido(id, patch) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      const dbPatch = {};
      if (patch.totalLocal !== undefined) {
        dbPatch.total_local = Number(patch.totalLocal);
        dbPatch.puntos_local = Number(patch.totalLocal);
      }
      if (patch.puntosLocal !== undefined) {
        dbPatch.total_local = Number(patch.puntosLocal);
        dbPatch.puntos_local = Number(patch.puntosLocal);
      }
      if (patch.totalVisitante !== undefined) {
        dbPatch.total_visitante = Number(patch.totalVisitante);
        dbPatch.puntos_visitante = Number(patch.totalVisitante);
      }
      if (patch.puntosVisitante !== undefined) {
        dbPatch.total_visitante = Number(patch.puntosVisitante);
        dbPatch.puntos_visitante = Number(patch.puntosVisitante);
      }
      if (patch.q1Loc !== undefined) dbPatch.q1_loc = Number(patch.q1Loc);
      if (patch.q2Loc !== undefined) dbPatch.q2_loc = Number(patch.q2Loc);
      if (patch.q3Loc !== undefined) dbPatch.q3_loc = Number(patch.q3Loc);
      if (patch.q4Loc !== undefined) dbPatch.q4_loc = Number(patch.q4Loc);
      if (patch.otLoc !== undefined) dbPatch.ot_loc = Number(patch.otLoc);
      if (patch.q1Vis !== undefined) dbPatch.q1_vis = Number(patch.q1Vis);
      if (patch.q2Vis !== undefined) dbPatch.q2_vis = Number(patch.q2Vis);
      if (patch.q3Vis !== undefined) dbPatch.q3_vis = Number(patch.q3Vis);
      if (patch.q4Vis !== undefined) dbPatch.q4_vis = Number(patch.q4Vis);
      if (patch.otVis !== undefined) dbPatch.ot_vis = Number(patch.otVis);
      if (patch.estado !== undefined) dbPatch.estado = patch.estado;
      if (patch.periodoActual !== undefined) dbPatch.periodo_actual = patch.periodoActual;
      if (patch.reloj !== undefined) dbPatch.reloj = patch.reloj;
      if (patch.faltasLoc !== undefined) dbPatch.faltas_loc = Number(patch.faltasLoc);
      if (patch.faltasVis !== undefined) dbPatch.faltas_vis = Number(patch.faltasVis);
      if (patch.equipoLocal !== undefined) dbPatch.equipo_local = patch.equipoLocal;
      if (patch.equipoVisitante !== undefined) dbPatch.equipo_visitante = patch.equipoVisitante;
      if (patch.fecha !== undefined) dbPatch.fecha = patch.fecha;
      if (patch.hora !== undefined) dbPatch.hora = patch.hora;
      if (patch.sede !== undefined) dbPatch.sede = patch.sede;
      if (patch.fase !== undefined) dbPatch.fase = patch.fase;
      if (patch.grupo !== undefined) dbPatch.grupo = patch.grupo;
      dbPatch.actualizado_en = new Date().toISOString();

      if (Object.keys(dbPatch).length > 1) {
        const { error } = await this.client.from('partidos').update(dbPatch).eq('id', id);
        if (error) console.warn('[Supabase Update Partido Error]:', error.message);
      }

      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'score_update',
          payload: { partidoId: id, patch }
        });
      }
      return true;
    } catch (e) {
      console.warn('[Supabase Update Partido Exception]:', e);
      return false;
    }
  }

  async deletePartido(id) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('partidos').delete().eq('id', id);
      if (error) console.warn('[Supabase Delete Partido Error]:', error.message);
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'match_deleted',
          payload: { id }
        });
      }
      return !error;
    } catch (e) {
      console.warn('[Supabase Delete Partido Exception]:', e);
      return false;
    }
  }

  async syncEquipo(id, eq) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      if (eq.disciplinaId && window.tournamentStore) {
        const disc = window.tournamentStore.getDisciplinaPorId(eq.disciplinaId);
        if (disc) {
          await this.syncDisciplina(disc.id, disc);
        }
      }
      const payload = this.mapLocalEquipoToSupabase(eq);
      if (!payload) return false;
      const { error } = await this.client.from('equipos').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync Equipo Error]:', error.message);
      if (this.status !== 'CONNECTED') {
        this.status = 'CONNECTED';
        this.notifyStatus();
      }
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'team_synced',
          payload: { id, equipo: eq }
        });
      }
      return !error;
    } catch (e) {
      console.warn('[Supabase Sync Equipo Exception]:', e);
      return false;
    }
  }

  async updateEquipo(id, patch) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      const dbPatch = {};
      if (patch.nombre !== undefined) dbPatch.nombre = patch.nombre;
      if (patch.grupo !== undefined) dbPatch.grupo = patch.grupo;
      if (patch.sedePrincipal !== undefined) dbPatch.sede_principal = patch.sedePrincipal;
      if (patch.siglas !== undefined) dbPatch.siglas = patch.siglas;
      if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl;
      if (patch.color !== undefined) dbPatch.color = patch.color;
      if (patch.delegadoNombre !== undefined) dbPatch.delegado_nombre = patch.delegadoNombre;
      if (patch.delegadoTelefono !== undefined) dbPatch.delegado_telefono = patch.delegadoTelefono;
      if (patch.delegadoEmail !== undefined) dbPatch.delegado_email = patch.delegadoEmail;
      if (patch.delegadoCedula !== undefined) dbPatch.delegado_cedula = patch.delegadoCedula;
      if (patch.pin !== undefined) dbPatch.pin = patch.pin;
      if (patch.entrenador !== undefined) dbPatch.entrenador = patch.entrenador;
      if (patch.asistente !== undefined) dbPatch.asistente = patch.asistente;
      if (patch.utilero !== undefined) dbPatch.utilero = patch.utilero;

      if (Object.keys(dbPatch).length > 0) {
        const { error } = await this.client.from('equipos').update(dbPatch).eq('id', id);
        if (error) console.warn('[Supabase Update Equipo Error]:', error.message);
      }

      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'team_synced',
          payload: { id, equipo: patch }
        });
      }
      return true;
    } catch (e) {
      console.warn('[Supabase Update Equipo Exception]:', e);
      return false;
    }
  }

  async deleteEquipo(id) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      const eq = window.tournamentStore ? window.tournamentStore.getEquipoPorId(id) : null;
      const teamName = eq ? eq.nombre : null;
      if (teamName) {
        await this.client.from('atletas').delete().eq('equipo', teamName);
      }
      const { error } = await this.client.from('equipos').delete().eq('id', id);
      if (error) console.warn('[Supabase Delete Equipo Error]:', error.message);
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'team_deleted',
          payload: { id, equipoNombre: teamName }
        });
      }
      return !error;
    } catch (e) {
      console.warn('[Supabase Delete Equipo Exception]:', e);
      return false;
    }
  }

  async syncAtleta(id, a) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      if (a.disciplinaId && window.tournamentStore) {
        const disc = window.tournamentStore.getDisciplinaPorId(a.disciplinaId);
        if (disc) {
          await this.syncDisciplina(disc.id, disc);
        }
      }
      const payload = this.mapLocalAtletaToSupabase(a);
      if (!payload) return false;
      const { error } = await this.client.from('atletas').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync Atleta Error]:', error.message);
      if (this.status !== 'CONNECTED') {
        this.status = 'CONNECTED';
        this.notifyStatus();
      }
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'athlete_synced',
          payload: { id, atleta: a }
        });
      }
      return !error;
    } catch (e) {
      console.warn('[Supabase Sync Atleta Exception]:', e);
      return false;
    }
  }

  async updateAtleta(id, patch) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      const dbPatch = {};
      if (patch.cedula !== undefined) dbPatch.cedula = patch.cedula;
      if (patch.nombres !== undefined) dbPatch.nombres = patch.nombres;
      if (patch.fechaNacimiento !== undefined) dbPatch.fecha_nacimiento = patch.fechaNacimiento;
      if (patch.edad !== undefined) dbPatch.edad = Number(patch.edad);
      if (patch.camiseta !== undefined) dbPatch.camiseta = patch.camiseta;
      if (patch.posicion !== undefined) dbPatch.posicion = patch.posicion;
      if (patch.equipo !== undefined) dbPatch.equipo = patch.equipo;
      if (patch.rol !== undefined) dbPatch.rol = patch.rol;
      if (patch.fotoUrl !== undefined) dbPatch.foto_url = patch.fotoUrl;

      if (Object.keys(dbPatch).length > 0) {
        const { error } = await this.client.from('atletas').update(dbPatch).eq('id', id);
        if (error) console.warn('[Supabase Update Atleta Error]:', error.message);
      }

      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'athlete_synced',
          payload: { id, atleta: patch }
        });
      }
      return true;
    } catch (e) {
      console.warn('[Supabase Update Atleta Exception]:', e);
      return false;
    }
  }

  async deleteAtleta(id) {
    if (!this.client) this.initClient();
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('atletas').delete().eq('id', id);
      if (error) console.warn('[Supabase Delete Atleta Error]:', error.message);
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'athlete_deleted',
          payload: { id }
        });
      }
      return !error;
    } catch (e) {
      console.warn('[Supabase Delete Atleta Exception]:', e);
      return false;
    }
  }

  async syncDisciplina(id, d) {
    if (!this.client) {
      this.initClient();
    }
    if (!this.client) {
      console.warn('[Supabase Sync Disciplina] Cliente no disponible para sincronizar');
      return false;
    }
    try {
      const cleanId = (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(id || d.id) : (id || d.id);
      const logoCandidate = (d.avatar || d.logoUrl || d.logo || d.banner || '').trim();
      const payload = {
        id: cleanId,
        nombre: d.nombre,
        categoria: d.categoria || 'Libre',
        icono: d.icono || '🏆',
        avatar: (d.avatar || logoCandidate || './assets/logo.png').trim(),
        banner: (d.banner || logoCandidate || './assets/logo.png').trim(),
        color: d.color || '#D4AF37',
        activa: d.activa !== false,
        reglas: d.reglas || { periodos: 4, nombrePeriodo: 'Cuarto', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 10 }
      };

      const { data, error } = await this.client.from('disciplinas').upsert(payload, { onConflict: 'id' }).select();
      if (error) {
        console.warn('[Supabase Sync Disciplina Error]:', error.message || error);
        return false;
      }

      console.log(`[Supabase Sync] Disciplina "${payload.nombre}" (${cleanId}) guardada con éxito en Supabase:`, data);
      if (this.status !== 'CONNECTED') {
        this.status = 'CONNECTED';
        this.notifyStatus();
      }

      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'discipline_synced',
          payload: { id: cleanId, disciplina: payload }
        });
      }
      return true;
    } catch (e) {
      console.warn('[Supabase Sync Disciplina Exception]:', e);
      return false;
    }
  }

  async deleteDisciplina(id) {
    if (!this.client) {
      this.initClient();
    }
    if (!this.client) return false;
    try {
      const cleanId = (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(id) : id;
      await this.client.from('partidos').delete().eq('disciplina_id', cleanId);
      await this.client.from('atletas').delete().eq('disciplina_id', cleanId);
      await this.client.from('equipos').delete().eq('disciplina_id', cleanId);
      const { error } = await this.client.from('disciplinas').delete().eq('id', cleanId);
      if (error) {
        console.warn('[Supabase Delete Disciplina Error]:', error.message || error);
        return false;
      }
      console.log(`[Supabase Sync] Disciplina (${cleanId}) y registros asociados eliminados con éxito en Supabase.`);
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event: 'discipline_deleted',
          payload: { id: cleanId }
        });
      }
      return true;
    } catch (e) {
      console.warn('[Supabase Delete Disciplina Exception]:', e);
      return false;
    }
  }

  async broadcastScore(partidoId, patch) {
    // 1. Guardar primero en el store local para respuesta instantánea
    if (window.tournamentStore) {
      window.tournamentStore.updatePartido(partidoId, patch, false);
    }

    // 2. Transmitir por canal Realtime Broadcast y actualizar en Supabase
    await this.updatePartido(partidoId, patch);
  }

  /**
   * Descarga todos los datos de Supabase e hidrata el tournamentStore local
   */
  async hydrateFromSupabase() {
    if (!this.client) {
      this.initClient();
    }
    if (!this.client) return false;
    if (this.hydrationPromise) {
      return this.hydrationPromise;
    }
    this.isHydrating = true;

    this.hydrationPromise = (async () => {
      try {
        console.log('[Supabase Cloud] Descargando y sincronizando datos directamente desde la base de datos...');

        // 1. Disciplinas
        const { data: remoteDisciplinas, error: errDisc } = await this.client
          .from('disciplinas')
          .select('*')
          .order('creado_en', { ascending: true });

        if (!errDisc && Array.isArray(remoteDisciplinas) && window.tournamentStore) {
          const discs = remoteDisciplinas.map((rd) => {
            const cleanId = (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(rd.id) : rd.id;
            return {
              id: cleanId,
              nombre: rd.nombre,
              categoria: rd.categoria || 'Torneo Master / Libre',
              icono: rd.icono || '🏆',
              avatar: rd.avatar || './assets/logo.png',
              banner: rd.banner || './assets/logo.png',
              color: rd.color || '#D4AF37',
              activa: rd.activa !== false,
              reglas: rd.reglas || { periodos: 4, nombrePeriodo: 'Cuarto', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 10 }
            };
          });
          window.tournamentStore.data.disciplinas = discs;
          if (window.tournamentStore.data.config) {
            window.tournamentStore.data.config.disciplinas = discs;
            const currentDisc = window.tournamentStore.data.config.disciplinaActual;
            if (!discs.some((d) => d.id === currentDisc) && discs.length > 0) {
              window.tournamentStore.data.config.disciplinaActual = discs[0].id;
            }
          }
        }

        // 2. Equipos
        const { data: remoteEquipos, error: errEq } = await this.client
          .from('equipos')
          .select('*')
          .order('id', { ascending: true });

        if (!errEq && Array.isArray(remoteEquipos) && window.tournamentStore) {
          const mappedEquipos = remoteEquipos.map((eq) => this.mapSupabaseEquipoToLocal(eq)).filter(Boolean);
          window.tournamentStore.data.equipos = mappedEquipos;
        }

        // 3. Atletas
        const { data: remoteAtletas, error: errAtl } = await this.client
          .from('atletas')
          .select('*')
          .order('id', { ascending: true });

        if (!errAtl && Array.isArray(remoteAtletas) && window.tournamentStore) {
          const mappedAtletas = remoteAtletas.map((a) => this.mapSupabaseAtletaToLocal(a)).filter(Boolean);
          window.tournamentStore.data.atletas = mappedAtletas;
        }

        // 4. Partidos
        const { data: remotePartidos, error: errPar } = await this.client
          .from('partidos')
          .select('*')
          .order('fecha', { ascending: true });

        if (!errPar && Array.isArray(remotePartidos) && window.tournamentStore) {
          const mappedPartidos = remotePartidos.map((p) => this.mapSupabasePartidoToLocal(p)).filter(Boolean);
          window.tournamentStore.data.partidos = mappedPartidos;
        }

        this.status = 'CONNECTED';
        this.notifyStatus();

        if (window.tournamentStore) {
          window.tournamentStore.notify({ action: 'cloud_hydrated' });
        }

        if (typeof window.renderAllViews === 'function') {
          window.renderAllViews();
        }

        console.log(`[Supabase Cloud] Sincronización exitosa: ${window.tournamentStore.data.disciplinas.length} disciplinas, ${window.tournamentStore.data.equipos.length} equipos, ${window.tournamentStore.data.atletas.length} atletas, ${window.tournamentStore.data.partidos.length} partidos.`);
        return true;
      } catch (e) {
        console.warn('[Supabase Cloud Hydrate Error]:', e);
        return false;
      } finally {
        this.isHydrating = false;
        this.hydrationPromise = null;
      }
    })();

    return this.hydrationPromise;
  }

  /**
   * Sincroniza todos los datos locales hacia la base de datos de Supabase
   */
  async syncAllToSupabase() {
    if (!this.client) return false;
    console.log('[Supabase] Subiendo todos los datos locales a Supabase...');
    const dOk = await this.syncDisciplinas();
    const eOk = await this.syncEquipos();
    const aOk = await this.syncAtletas();
    const pOk = await this.syncPartidos();
    return dOk && eOk && aOk && pOk;
  }

  async syncDisciplinas() {
    if (!this.client || !window.tournamentStore) return false;
    try {
      const disciplinas = window.tournamentStore.getDisciplinas() || [];
      if (disciplinas.length === 0) return true;
      const payload = disciplinas.map((d) => ({
        id: (typeof getCleanDisciplineId === 'function') ? getCleanDisciplineId(d.id) : d.id,
        nombre: d.nombre,
        categoria: d.categoria,
        icono: d.icono,
        avatar: d.avatar || d.logoUrl || './assets/logo.png',
        banner: d.banner || './assets/logo.png',
        color: d.color,
        activa: d.activa !== false,
        reglas: d.reglas || {}
      }));
      const { error } = await this.client.from('disciplinas').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync Disciplinas]:', error.message);
      return !error;
    } catch (e) {
      console.warn('[Supabase Sync Disciplinas Error]:', e);
      return false;
    }
  }

  async syncEquipos() {
    if (!this.client || !window.tournamentStore) return false;
    try {
      if (typeof window.tournamentStore.syncGlobalDataArrays === 'function') {
        window.tournamentStore.syncGlobalDataArrays();
      }
      let equipos = window.tournamentStore.data?.equipos || [];
      const discs = window.tournamentStore.getDisciplinas ? window.tournamentStore.getDisciplinas() : [];
      let aggregated = [];
      discs.forEach((d) => {
        if (typeof window.tournamentStore.loadTeams === 'function') {
          aggregated = aggregated.concat(window.tournamentStore.loadTeams(d.id));
        }
      });
      if (aggregated.length > 0) {
        const map = new Map();
        equipos.concat(aggregated).forEach((eq) => { if (eq && eq.id) map.set(eq.id, eq); });
        equipos = Array.from(map.values());
      }
      if (equipos.length === 0) return true;
      const payload = equipos.map((eq) => this.mapLocalEquipoToSupabase(eq)).filter(Boolean);
      const { error } = await this.client.from('equipos').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync Equipos]:', error.message);
      return !error;
    } catch (e) {
      console.warn('[Supabase Sync Equipos Error]:', e);
      return false;
    }
  }

  async syncAtletas() {
    if (!this.client || !window.tournamentStore) return false;
    try {
      if (typeof window.tournamentStore.syncGlobalDataArrays === 'function') {
        window.tournamentStore.syncGlobalDataArrays();
      }
      let atletas = window.tournamentStore.data?.atletas || [];
      const discs = window.tournamentStore.getDisciplinas ? window.tournamentStore.getDisciplinas() : [];
      let aggregated = [];
      discs.forEach((d) => {
        if (typeof window.tournamentStore.loadAthletes === 'function') {
          aggregated = aggregated.concat(window.tournamentStore.loadAthletes(d.id));
        }
      });
      if (aggregated.length > 0) {
        const map = new Map();
        atletas.concat(aggregated).forEach((a) => { if (a && a.id) map.set(a.id, a); });
        atletas = Array.from(map.values());
      }
      if (atletas.length === 0) return true;
      const payload = atletas.map((a) => this.mapLocalAtletaToSupabase(a)).filter(Boolean);
      const { error } = await this.client.from('atletas').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync Atletas]:', error.message);
      return !error;
    } catch (e) {
      console.warn('[Supabase Sync Atletas Error]:', e);
      return false;
    }
  }

  async syncPartidos() {
    if (!this.client || !window.tournamentStore) return false;
    try {
      if (typeof window.tournamentStore.syncGlobalDataArrays === 'function') {
        window.tournamentStore.syncGlobalDataArrays();
      }
      let partidos = window.tournamentStore.data?.partidos || [];
      const discs = window.tournamentStore.getDisciplinas ? window.tournamentStore.getDisciplinas() : [];
      let aggregated = [];
      discs.forEach((d) => {
        if (typeof window.tournamentStore.loadMatches === 'function') {
          aggregated = aggregated.concat(window.tournamentStore.loadMatches(d.id));
        }
      });
      if (aggregated.length > 0) {
        const map = new Map();
        partidos.concat(aggregated).forEach((p) => { if (p && p.id) map.set(p.id, p); });
        partidos = Array.from(map.values());
      }
      if (partidos.length === 0) return true;
      const payload = partidos.map((p) => this.mapLocalPartidoToSupabase(p)).filter(Boolean);
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
-- GRUPO MULTISERVICIOS DEPORTIVOS JL
-- SCRIPT DE INICIALIZACIÓN COMPLETA PARA SUPABASE (BASE DE DATOS Y REALTIME)
-- ==============================================================================
-- Proyecto: wznvlhuvpqnnrlgcgqpx (https://wznvlhuvpqnnrlgcgqpx.supabase.co)
-- Enlace directo al editor: https://supabase.com/dashboard/project/wznvlhuvpqnnrlgcgqpx/sql/new
-- ==============================================================================

-- 1. TABLA DISCIPLINAS
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

-- 2. TABLA EQUIPOS
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

-- 3. TABLA ATLETAS (ROSTERS)
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

-- 5. TABLA POSICIONES (TABLA GENERAL / CLASIFICACIÓN)
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

-- 6. SEGURIDAD Y POLÍTICAS ROW LEVEL SECURITY (RLS)
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posiciones ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Lectura pública disciplinas" ON public.disciplinas FOR SELECT USING (true);
CREATE POLICY "Lectura pública equipos" ON public.equipos FOR SELECT USING (true);
CREATE POLICY "Lectura pública atletas" ON public.atletas FOR SELECT USING (true);
CREATE POLICY "Lectura pública partidos" ON public.partidos FOR SELECT USING (true);
CREATE POLICY "Lectura pública posiciones" ON public.posiciones FOR SELECT USING (true);

CREATE POLICY "Acceso total disciplinas" ON public.disciplinas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total equipos" ON public.equipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total atletas" ON public.atletas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total partidos" ON public.partidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total posiciones" ON public.posiciones FOR ALL USING (true) WITH CHECK (true);

-- 7. ACTIVAR SUPABASE REALTIME (PUBLICACIÓN POSTGRES)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'partidos') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.partidos;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'equipos') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.equipos;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'atletas') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.atletas;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'disciplinas') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.disciplinas;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posiciones') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.posiciones;
    END IF;
END $$;
`;
  }
}

window.supabaseService = new SupabaseService();
window.forceCloudSync = async () => {
  if (window.supabaseService) {
    const ok = await window.supabaseService.hydrateFromSupabase();
    if (typeof window.renderAllViews === 'function') {
      window.renderAllViews();
    }
    return ok;
  }
  return false;
};
