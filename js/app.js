// app.js - Orquestador Principal de la PWA Grupo Multiservicios Deportivo JL

let deferredPrompt = null;
let matchTimerInterval = null;
let matchTimerSeconds = 600; // 10:00 default
let isTimerRunning = false;

// ==============================================================================
// TOAST NOTIFICATION SYSTEM
// ==============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==============================================================================
// APPLICATION ROUTER & NAVIGATION
// ==============================================================================
class AppRouter {
  constructor() {
    this.currentView = 'vistaPublica';
    this.initEvents();
  }

  showView(viewId) {
    document.querySelectorAll('.view-panel').forEach((el) => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      this.currentView = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  initEvents() {
    // Brand click returns to public view
    document.getElementById('brandHomeBtn')?.addEventListener('click', () => {
      this.showView('vistaPublica');
    });

    // Delegate view button
    document.getElementById('btnAccesoDelegado')?.addEventListener('click', () => {
      const user = window.tournamentStore.getUsuarioActual();
      if (user && user.rol === 'delegado') {
        this.showView('vistaDelegado');
        renderDelegadoDashboard(user.equipoId);
      } else {
        this.showView('vistaDelegado');
        populateDelegadoTeamSelect();
      }
    });

    // SuperAdmin view button
    document.getElementById('btnConfigurarMaster')?.addEventListener('click', () => {
      const user = window.tournamentStore.getUsuarioActual();
      if (user && user.rol === 'superadmin') {
        this.showView('vistaSuperAdmin');
        renderAdminDashboard();
      } else {
        this.showView('vistaSuperAdmin');
      }
    });

    // Back to public buttons
    document.getElementById('btnVolverPublicaDesdeDel')?.addEventListener('click', () => {
      this.showView('vistaPublica');
    });
    document.getElementById('btnVolverPublicaDesdeAdmin')?.addEventListener('click', () => {
      this.showView('vistaPublica');
    });

    // Public sub-tabs switcher (Calendario, Posiciones, Rosters, Sedes)
    document.querySelectorAll('.tab-btn[data-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn[data-target]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.getAttribute('data-target');
        document.querySelectorAll('.tab-content-panel').forEach((p) => (p.style.display = 'none'));
        const panel = document.getElementById(targetId);
        if (panel) panel.style.display = 'block';

        if (targetId === 'tabPosiciones') renderStandings();
        if (targetId === 'tabRosters') renderTeamsAndRosters();
        if (targetId === 'tabCalendario') renderMatches();
      });
    });

    // SuperAdmin steps switcher (Paso 1, Paso 2, Paso 3, Paso 4)
    document.querySelectorAll('#adminStepsTabs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#adminStepsTabs .tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const step = btn.getAttribute('data-step');
        document.querySelectorAll('.step-panel').forEach((p) => (p.style.display = 'none'));

        if (step === 'paso1') {
          document.getElementById('stepPaso1').style.display = 'block';
          renderAdminDisciplinas();
        } else if (step === 'paso2') {
          document.getElementById('stepPaso2').style.display = 'block';
          populateManualFormSelects();
        } else if (step === 'paso3') {
          document.getElementById('stepPaso3').style.display = 'block';
          initScorerMatchSelector();
        } else if (step === 'paso4') {
          document.getElementById('stepPaso4').style.display = 'block';
          renderAdminStandingsPreview();
        }
      });
    });
  }
}

window.appRouter = new AppRouter();

// ==============================================================================
// SERVICE WORKER & PWA INSTALLATION LOGIC
// ==============================================================================
function initPWA() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => console.log('[PWA] Service Worker registrado con éxito:', reg.scope))
        .catch((err) => console.warn('[PWA] Fallo al registrar Service Worker:', err));
    });
  }

  // 2. Handle beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Evento beforeinstallprompt capturado');

    const headerBtn = document.getElementById('headerInstallBtn');
    if (headerBtn) headerBtn.style.display = 'inline-flex';

    const banner = document.getElementById('pwaFloatingBanner');
    if (banner && !sessionStorage.getItem('pwa_banner_dismissed')) {
      banner.style.display = 'flex';
    }
  });

  // Header install button click
  document.getElementById('headerInstallBtn')?.addEventListener('click', promptInstallPWA);
  document.getElementById('pwaBannerInstallBtn')?.addEventListener('click', promptInstallPWA);

  document.getElementById('pwaBannerCloseBtn')?.addEventListener('click', () => {
    const banner = document.getElementById('pwaFloatingBanner');
    if (banner) banner.style.display = 'none';
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Aplicación instalada exitosamente');
    deferredPrompt = null;
    document.getElementById('headerInstallBtn').style.display = 'none';
    document.getElementById('pwaFloatingBanner').style.display = 'none';
    showToast('¡Grupo Multiservicios Deportivo JL instalada con éxito!', 'success');
  });
}

function promptInstallPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        console.log('[PWA] Usuario aceptó la instalación');
      }
      deferredPrompt = null;
      document.getElementById('pwaFloatingBanner').style.display = 'none';
    });
  } else {
    showToast('Para instalar en iPhone: presione "Compartir" y luego "Agregar a inicio"', 'info');
  }
}

// ==============================================================================
// NETWORK STATUS & REALTIME CONNECTIVITY
// ==============================================================================
function initNetworkListeners() {
  const pill = document.getElementById('realtimeStatusPill');
  const text = document.getElementById('realtimeStatusText');

  function updateStatus(isOnline) {
    if (isOnline) {
      pill?.classList.remove('offline');
      if (text) text.textContent = 'En Línea • Tiempo Real';
    } else {
      pill?.classList.add('offline');
      if (text) text.textContent = 'Modo Offline (Caché local)';
      showToast('Sin conexión a Internet. Visualizando datos guardados en caché.', 'info');
    }
  }

  window.addEventListener('online', () => updateStatus(true));
  window.addEventListener('offline', () => updateStatus(false));

  updateStatus(navigator.onLine);
}

// ==============================================================================
// DISCIPLINES BAR RENDERER
// ==============================================================================
function renderDisciplinesBar() {
  const scroller = document.getElementById('disciplinesScroller');
  if (!scroller) return;

  const disciplinas = window.tournamentStore.getDisciplinas().filter((d) => d.activa);
  const actual = window.tournamentStore.getDisciplinaActual();

  scroller.innerHTML = disciplinas
    .map(
      (d) => `
    <button class="discipline-chip ${d.id === actual.id ? 'active' : ''}" data-id="${d.id}">
      <span class="discipline-chip-icon">${d.icono || '🏆'}</span>
      <span>${d.nombre}</span>
      <span class="badge badge-gold" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">${d.categoria}</span>
    </button>
  `
    )
    .join('');

  scroller.querySelectorAll('.discipline-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const id = chip.getAttribute('data-id');
      window.tournamentStore.setDisciplinaActual(id);
      renderAllViews();
    });
  });
}

// ==============================================================================
// HERO SCOREBOARD RENDERER (LIVE MATCH HERO)
// ==============================================================================
function renderHeroScoreboard() {
  const partidos = window.tournamentStore.getPartidos();
  if (!partidos || partidos.length === 0) return;

  // Prioritize active LIVE match, then most recent, then first
  let liveMatch = partidos.find((p) => p.estado === 'EN CURSO');
  if (!liveMatch) {
    liveMatch = partidos[0];
  }

  const localName = document.getElementById('heroLocalName');
  const visName = document.getElementById('heroVisName');
  const scoreLoc = document.getElementById('heroScoreLoc');
  const scoreVis = document.getElementById('heroScoreVis');
  const venue = document.getElementById('heroVenue');
  const fase = document.getElementById('heroFase');
  const statusBadge = document.getElementById('heroStatusBadge');
  const statusText = document.getElementById('heroStatusText');
  const periodo = document.getElementById('heroPeriodo');
  const reloj = document.getElementById('heroReloj');
  const localBadge = document.getElementById('heroLocalBadge');
  const visBadge = document.getElementById('heroVisBadge');

  if (localName) localName.textContent = liveMatch.equipoLocal;
  if (visName) visName.textContent = liveMatch.equipoVisitante;
  if (scoreLoc) scoreLoc.textContent = liveMatch.totalLocal;
  if (scoreVis) scoreVis.textContent = liveMatch.totalVisitante;
  if (venue) venue.textContent = liveMatch.sede || 'Gimnasio Pablo Higuerey';
  if (fase) fase.textContent = liveMatch.fase || 'Fase de Grupos';
  if (periodo) periodo.textContent = liveMatch.periodoActual || '4TO CUARTO';
  if (reloj) reloj.textContent = liveMatch.reloj || '00:00';

  if (localBadge) localBadge.textContent = liveMatch.equipoLocal.substring(0, 3).toUpperCase();
  if (visBadge) visBadge.textContent = liveMatch.equipoVisitante.substring(0, 3).toUpperCase();

  // Status badge styling
  if (statusBadge && statusText) {
    if (liveMatch.estado === 'EN CURSO') {
      statusBadge.className = 'badge badge-live';
      statusText.textContent = 'EN CURSO (LIVE)';
    } else if (liveMatch.estado === 'FINALIZADO') {
      statusBadge.className = 'badge badge-final';
      statusText.textContent = 'FINALIZADO';
    } else {
      statusBadge.className = 'badge badge-scheduled';
      statusText.textContent = 'PROGRAMADO';
    }
  }

  // Quarters breakdown table
  const rowLocName = document.getElementById('heroRowLocalName');
  const rowVisName = document.getElementById('heroRowVisName');
  if (rowLocName) rowLocName.textContent = liveMatch.equipoLocal;
  if (rowVisName) rowVisName.textContent = liveMatch.equipoVisitante;

  document.getElementById('heroQ1Loc').textContent = liveMatch.q1Loc;
  document.getElementById('heroQ2Loc').textContent = liveMatch.q2Loc;
  document.getElementById('heroQ3Loc').textContent = liveMatch.q3Loc;
  document.getElementById('heroQ4Loc').textContent = liveMatch.q4Loc;
  document.getElementById('heroTotLoc').textContent = liveMatch.totalLocal;

  document.getElementById('heroQ1Vis').textContent = liveMatch.q1Vis;
  document.getElementById('heroQ2Vis').textContent = liveMatch.q2Vis;
  document.getElementById('heroQ3Vis').textContent = liveMatch.q3Vis;
  document.getElementById('heroQ4Vis').textContent = liveMatch.q4Vis;
  document.getElementById('heroTotVis').textContent = liveMatch.totalVisitante;
}

// ==============================================================================
// CALENDAR & MATCHES RENDERER
// ==============================================================================
let currentCalendarFilter = 'todos';

function renderMatches() {
  const container = document.getElementById('matchesGridContainer');
  if (!container) return;

  const partidos = window.tournamentStore.getPartidos();
  const search = (document.getElementById('matchSearchInput')?.value || '').toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  let filtered = partidos.filter((p) => {
    // Search filter
    const matchesSearch =
      p.equipoLocal.toLowerCase().includes(search) ||
      p.equipoVisitante.toLowerCase().includes(search) ||
      p.sede.toLowerCase().includes(search);
    if (!matchesSearch) return false;

    // Status filter
    if (currentCalendarFilter === 'live') return p.estado === 'EN CURSO';
    if (currentCalendarFilter === 'hoy') return p.fecha === todayStr;
    if (currentCalendarFilter === 'programado') return p.estado === 'PROGRAMADO';
    if (currentCalendarFilter === 'finalizado') return p.estado === 'FINALIZADO';
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); color: var(--text-secondary);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No se encontraron partidos con los filtros seleccionados.</p>
        <span style="font-size: 0.85rem;">Pruebe cambiando el filtro de fecha o el término de búsqueda.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((m) => {
      let badgeClass = 'badge-scheduled';
      let badgeText = 'PROGRAMADO';
      if (m.estado === 'EN CURSO') {
        badgeClass = 'badge-live';
        badgeText = '🔴 EN VIVO';
      } else if (m.estado === 'FINALIZADO') {
        badgeClass = 'badge-final';
        badgeText = 'FINALIZADO';
      }

      const isLive = m.estado === 'EN CURSO';

      return `
      <div class="match-card ${isLive ? 'is-live' : ''}">
        <div class="match-card-header">
          <span>📅 ${m.fecha} • ⏰ ${m.hora}</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="match-card-body">
          <div class="match-row-team">
            <div class="match-team-info">
              <div class="team-avatar-mini">${m.equipoLocal.substring(0, 3).toUpperCase()}</div>
              <span>${m.equipoLocal}</span>
            </div>
            <div class="match-team-score" style="${m.estado === 'FINALIZADO' && m.totalLocal > m.totalVisitante ? 'color: var(--brand-gold);' : ''}">
              ${m.estado === 'PROGRAMADO' ? '-' : m.totalLocal}
            </div>
          </div>

          <div class="match-row-team">
            <div class="match-team-info">
              <div class="team-avatar-mini">${m.equipoVisitante.substring(0, 3).toUpperCase()}</div>
              <span>${m.equipoVisitante}</span>
            </div>
            <div class="match-team-score" style="${m.estado === 'FINALIZADO' && m.totalVisitante > m.totalLocal ? 'color: var(--brand-gold);' : ''}">
              ${m.estado === 'PROGRAMADO' ? '-' : m.totalVisitante}
            </div>
          </div>
        </div>

        <div class="match-card-footer">
          <span>📍 ${m.sede}</span>
          <span>${m.fase}</span>
        </div>
      </div>
    `;
    })
    .join('');
}

// Calendar Filter Listeners
document.getElementById('calendarFilterPills')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('filter-pill')) {
    document.querySelectorAll('#calendarFilterPills .filter-pill').forEach((p) => p.classList.remove('active'));
    e.target.classList.add('active');
    currentCalendarFilter = e.target.getAttribute('data-filter');
    renderMatches();
  }
});

document.getElementById('matchSearchInput')?.addEventListener('input', () => {
  renderMatches();
});

// ==============================================================================
// STANDINGS (TABLAS DE POSICIONES) RENDERER
// ==============================================================================
function renderStandings() {
  const container = document.getElementById('standingsContainer');
  if (!container) return;

  const disc = window.tournamentStore.getDisciplinaActual();
  const grouped = window.StandingsEngine.compute(disc.id);

  if (Object.keys(grouped).length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); color: var(--text-secondary);">
        No hay datos de posiciones registrados para esta disciplina.
      </div>
    `;
    return;
  }

  container.innerHTML = Object.keys(grouped)
    .map((grpName) => {
      const rows = grouped[grpName];
      return `
      <div class="standings-card">
        <div class="standings-card-header">
          <div class="standings-card-title">
            <span>🏆 ${grpName}</span>
            <span class="badge badge-gold">${disc.nombre}</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${rows.length} Equipos</span>
        </div>

        <div class="table-responsive">
          <table class="standings-table">
            <thead>
              <tr>
                <th style="width: 40px;">POS</th>
                <th style="text-align: left;">EQUIPO</th>
                <th>JJ</th>
                <th>JG</th>
                <th>JP</th>
                <th>PF</th>
                <th>PC</th>
                <th>DP</th>
                <th style="color: var(--brand-gold);">PTS</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((r) => {
                  let rankClass = 'rank-other';
                  if (r.posicion === 1) rankClass = 'rank-1';
                  else if (r.posicion === 2) rankClass = 'rank-2';

                  return `
                  <tr class="${r.clasificado ? 'playoff-row' : ''}">
                    <td><span class="rank-badge ${rankClass}">${r.posicion}</span></td>
                    <td class="team-cell">
                      <div class="team-avatar-mini">${r.siglas}</div>
                      <div>
                        <div>${r.equipo}</div>
                        ${r.clasificado ? '<span style="font-size: 0.65rem; color: var(--brand-gold-light); font-weight: 700;">★ ZONA PLAYOFF</span>' : ''}
                      </div>
                    </td>
                    <td>${r.jj}</td>
                    <td>${r.jg}</td>
                    <td>${r.jp}</td>
                    <td>${r.pf}</td>
                    <td>${r.pc}</td>
                    <td style="font-weight: 700; ${r.dp > 0 ? 'color: #34d399;' : r.dp < 0 ? 'color: #f87171;' : ''}">
                      ${r.dp > 0 ? '+' + r.dp : r.dp}
                    </td>
                    <td class="pts-cell">${r.pts}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="rules-hint">
          <span>Reglas: Ganado = 2 pts | Perdido = 1 pt</span>
          <span>DP = PF - PC • Reordenamiento automático</span>
        </div>
      </div>
    `;
    })
    .join('');
}

// ==============================================================================
// TEAMS & ROSTERS RENDERER
// ==============================================================================
let currentTeamGroupFilter = 'todos';

function renderTeamsAndRosters() {
  const container = document.getElementById('teamsGridContainer');
  if (!container) return;

  const equipos = window.tournamentStore.getEquipos();
  const search = (document.getElementById('athleteSearchInput')?.value || '').toLowerCase();

  let filtered = equipos.filter((eq) => {
    if (currentTeamGroupFilter !== 'todos' && eq.grupo !== currentTeamGroupFilter) return false;
    if (search && !eq.nombre.toLowerCase().includes(search) && !eq.delegadoNombre?.toLowerCase().includes(search)) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); color: var(--text-secondary);">
        No se encontraron equipos para el filtro seleccionado.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((eq) => {
      const atletas = window.tournamentStore.getAtletas(eq.nombre);
      return `
      <div class="team-profile-card">
        <div class="team-profile-header">
          <div class="team-crest" style="border-color: ${eq.color || 'var(--brand-gold)'};">
            ${eq.siglas || eq.nombre.substring(0, 3).toUpperCase()}
          </div>
          <div class="team-details">
            <h3>${eq.nombre}</h3>
            <span class="badge badge-gold" style="font-size: 0.7rem;">${eq.grupo}</span>
          </div>
        </div>

        <div class="team-delegate-info">
          <div><strong>Sede:</strong> ${eq.sedePrincipal || 'Gimnasio Pablo Higuerey'}</div>
          <div><strong>Delegado:</strong> ${eq.delegadoNombre || 'Por asignar'}</div>
          <div><strong>Contacto:</strong> ${eq.delegadoTelefono || 'No registrado'}</div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto;">
          <span style="font-size: 0.8rem; color: var(--brand-gold-light); font-weight: 700;">
            ${atletas.length} Atletas Inscritos
          </span>
          <button class="btn btn-outline btn-sm btn-ver-roster" data-team="${eq.nombre}">
            Ver Plantilla
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  container.querySelectorAll('.btn-ver-roster').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamName = btn.getAttribute('data-team');
      openTeamRosterModal(teamName);
    });
  });
}

function openTeamRosterModal(teamName) {
  const modal = document.getElementById('modalTeamRoster');
  const title = document.getElementById('modalRosterTeamTitle');
  const meta = document.getElementById('modalRosterMeta');
  const tbody = document.getElementById('modalRosterTableBody');

  const eq = window.tournamentStore.getEquipoPorNombre(teamName);
  const atletas = window.tournamentStore.getAtletas(teamName);

  if (title) title.textContent = `Plantilla: ${teamName}`;
  if (meta) {
    meta.innerHTML = `
      <strong>Grupo:</strong> ${eq?.grupo || 'A'} • 
      <strong>Sede Principal:</strong> ${eq?.sedePrincipal || 'Gimnasio Pablo Higuerey'} • 
      <strong>Delegado:</strong> ${eq?.delegadoNombre || 'N/A'} (${eq?.delegadoTelefono || 'N/A'})
    `;
  }

  if (tbody) {
    if (atletas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; color: var(--text-muted);">No hay atletas registrados en este equipo aún.</td></tr>`;
    } else {
      tbody.innerHTML = atletas
        .map(
          (a) => `
        <tr>
          <td><span class="badge badge-gold">${a.camiseta || '-'}</span></td>
          <td style="text-align: left; font-family: monospace;">${a.cedula}</td>
          <td style="text-align: left; font-weight: 600;">${a.nombres}</td>
          <td>${a.edad} años</td>
          <td>${a.posicion}</td>
          <td><span class="badge ${a.rol === 'Capitán' ? 'badge-burgundy' : 'badge-final'}">${a.rol}</span></td>
        </tr>
      `
        )
        .join('');
    }
  }

  modal?.classList.add('open');
}

// Teams Filter Pills Listener
document.getElementById('teamFilterPills')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('filter-pill')) {
    document.querySelectorAll('#teamFilterPills .filter-pill').forEach((p) => p.classList.remove('active'));
    e.target.classList.add('active');
    currentTeamGroupFilter = e.target.getAttribute('data-group');
    renderTeamsAndRosters();
  }
});

document.getElementById('athleteSearchInput')?.addEventListener('input', () => {
  renderTeamsAndRosters();
});

// ==============================================================================
// DELEGATE VIEW CONTROLLER
// ==============================================================================
function populateDelegadoTeamSelect() {
  const select = document.getElementById('selectDelegadoEquipo');
  if (!select) return;

  const equipos = window.tournamentStore.getEquipos();
  select.innerHTML = equipos.map((eq) => `<option value="${eq.id}">${eq.nombre} (${eq.grupo})</option>`).join('');
}

document.getElementById('formDelegadoLogin')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const equipoId = document.getElementById('selectDelegadoEquipo').value;
  const pin = document.getElementById('inputDelegadoPin').value;

  const eq = window.tournamentStore.getEquipoPorId(equipoId);
  if (eq && (eq.pin === pin || pin === '2024')) {
    window.tournamentStore.setUsuarioActual({
      rol: 'delegado',
      equipoId: eq.id,
      equipoNombre: eq.nombre
    });
    showToast(`Bienvenido Delegado de ${eq.nombre}`, 'success');
    renderDelegadoDashboard(eq.id);
  } else {
    showToast('PIN incorrecto. (PIN Demo: 2024)', 'error');
  }
});

function renderDelegadoDashboard(equipoId) {
  const loginCard = document.getElementById('delegadoLoginCard');
  const dash = document.getElementById('delegadoDashboard');
  if (loginCard) loginCard.style.display = 'none';
  if (dash) dash.style.display = 'block';

  const eq = window.tournamentStore.getEquipoPorId(equipoId);
  if (!eq) return;

  document.getElementById('delDashTeamName').textContent = eq.nombre;
  document.getElementById('delDashDelegateInfo').textContent = `Delegado: ${eq.delegadoNombre || 'No asignado'} • ${eq.grupo} • ${eq.sedePrincipal}`;

  const atletas = window.tournamentStore.getAtletas(eq.nombre);
  document.getElementById('delDashAthleteCount').textContent = `${atletas.length} Atletas`;

  const tbody = document.getElementById('delRosterTableBody');
  if (tbody) {
    if (atletas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 2rem; color: var(--text-muted);">No tiene atletas registrados. Presione "+ Inscribir Nuevo Atleta".</td></tr>`;
    } else {
      tbody.innerHTML = atletas
        .map(
          (a) => `
        <tr>
          <td><span class="badge badge-gold">${a.camiseta}</span></td>
          <td style="text-align: left; font-family: monospace;">${a.cedula}</td>
          <td style="text-align: left; font-weight: 600;">${a.nombres}</td>
          <td>${a.edad}</td>
          <td>${a.posicion}</td>
          <td><span class="badge ${a.rol === 'Capitán' ? 'badge-burgundy' : 'badge-final'}">${a.rol}</span></td>
          <td>
            <div style="display: flex; gap: 0.35rem; justify-content: center;">
              <button class="btn btn-outline btn-sm btn-edit-atleta" data-id="${a.id}">✏️</button>
              <button class="btn btn-outline btn-sm btn-del-atleta" data-id="${a.id}" style="color: #f87171;">🗑️</button>
            </div>
          </td>
        </tr>
      `
        )
        .join('');

      tbody.querySelectorAll('.btn-edit-atleta').forEach((b) => {
        b.addEventListener('click', () => openEditAtletaModal(b.getAttribute('data-id')));
      });

      tbody.querySelectorAll('.btn-del-atleta').forEach((b) => {
        b.addEventListener('click', () => {
          if (confirm('¿Desea dar de baja a este atleta del roster?')) {
            window.tournamentStore.deleteAtleta(b.getAttribute('data-id'));
            renderDelegadoDashboard(equipoId);
            showToast('Atleta eliminado del roster', 'info');
          }
        });
      });
    }
  }

  // Render delegate's team matches
  const matchesContainer = document.getElementById('delMatchesContainer');
  const allMatches = window.tournamentStore.getPartidos();
  const myMatches = allMatches.filter((m) => m.equipoLocal === eq.nombre || m.equipoVisitante === eq.nombre);

  if (matchesContainer) {
    if (myMatches.length === 0) {
      matchesContainer.innerHTML = `<div style="color: var(--text-muted);">No hay partidos programados para este equipo.</div>`;
    } else {
      matchesContainer.innerHTML = myMatches
        .map(
          (m) => `
        <div class="match-card">
          <div class="match-card-header">
            <span>📅 ${m.fecha} • ⏰ ${m.hora}</span>
            <span class="badge ${m.estado === 'FINALIZADO' ? 'badge-final' : m.estado === 'EN CURSO' ? 'badge-live' : 'badge-scheduled'}">${m.estado}</span>
          </div>
          <div class="match-card-body">
            <div class="match-row-team">
              <span>${m.equipoLocal}</span>
              <strong style="font-family: var(--font-score); font-size: 1.2rem;">${m.totalLocal}</strong>
            </div>
            <div class="match-row-team">
              <span>${m.equipoVisitante}</span>
              <strong style="font-family: var(--font-score); font-size: 1.2rem;">${m.totalVisitante}</strong>
            </div>
          </div>
          <div class="match-card-footer">
            <span>📍 ${m.sede}</span>
            <span>${m.fase}</span>
          </div>
        </div>
      `
        )
        .join('');
    }
  }
}

// Inscribir / Editar Atleta Modal
document.getElementById('btnNuevoAtletaModal')?.addEventListener('click', () => {
  openEditAtletaModal(null);
});

function openEditAtletaModal(atletaId = null) {
  const modal = document.getElementById('modalEditAtleta');
  const form = document.getElementById('formAtleta');
  const title = document.getElementById('modalAtletaTitle');
  form.reset();

  if (atletaId) {
    const atleta = window.tournamentStore.data.atletas.find((a) => a.id === atletaId);
    if (atleta) {
      title.textContent = 'Editar Datos del Atleta';
      document.getElementById('atletaId').value = atleta.id;
      document.getElementById('atletaCedula').value = atleta.cedula;
      document.getElementById('atletaNombres').value = atleta.nombres;
      document.getElementById('atletaFechaNac').value = atleta.fechaNacimiento;
      document.getElementById('atletaEdad').value = atleta.edad;
      document.getElementById('atletaCamiseta').value = atleta.camiseta;
      document.getElementById('atletaPosicion').value = atleta.posicion;
      document.getElementById('atletaRol').value = atleta.rol;
    }
  } else {
    title.textContent = 'Inscribir Nuevo Atleta';
    document.getElementById('atletaId').value = '';
  }

  modal?.classList.add('open');
}

// Auto-calculate age from birth date
document.getElementById('atletaFechaNac')?.addEventListener('change', (e) => {
  if (e.target.value) {
    const birth = new Date(e.target.value);
    const diff = Date.now() - birth.getTime();
    const ageDate = new Date(diff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (!isNaN(age) && age > 0) {
      document.getElementById('atletaEdad').value = age;
    }
  }
});

document.getElementById('formAtleta')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('atletaId').value;
  const user = window.tournamentStore.getUsuarioActual();
  const equipoNombre = user?.equipoNombre || document.getElementById('delDashTeamName')?.textContent || 'Broncos de Higuerey';

  const data = {
    cedula: document.getElementById('atletaCedula').value,
    nombres: document.getElementById('atletaNombres').value,
    fechaNacimiento: document.getElementById('atletaFechaNac').value,
    edad: Number(document.getElementById('atletaEdad').value),
    camiseta: document.getElementById('atletaCamiseta').value,
    posicion: document.getElementById('atletaPosicion').value,
    rol: document.getElementById('atletaRol').value,
    equipo: equipoNombre
  };

  if (id) {
    window.tournamentStore.updateAtleta(id, data);
    showToast('Atleta actualizado con éxito', 'success');
  } else {
    window.tournamentStore.addAtleta(data);
    showToast('Atleta inscrito correctamente en la base de datos', 'success');
  }

  document.getElementById('modalEditAtleta').classList.remove('open');
  if (user && user.equipoId) {
    renderDelegadoDashboard(user.equipoId);
  }
  renderTeamsAndRosters();
});

// Export delegate roster to CSV
document.getElementById('btnExportarRosterDel')?.addEventListener('click', () => {
  const user = window.tournamentStore.getUsuarioActual();
  const teamName = user?.equipoNombre || 'Broncos de Higuerey';
  const atletas = window.tournamentStore.getAtletas(teamName);

  let csv = 'Dorsal,Cédula,Nombres y Apellidos,Edad,Posición,Rol,Equipo\n';
  atletas.forEach((a) => {
    csv += `"${a.camiseta}","${a.cedula}","${a.nombres}",${a.edad},"${a.posicion}","${a.rol}","${a.equipo}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ROSTER_${teamName.replace(/\s+/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Roster exportado a CSV', 'success');
});

// ==============================================================================
// SUPERADMIN VIEW (CONTROL MASTER)
// ==============================================================================
document.getElementById('formAdminLogin')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('inputAdminEmail').value;
  const pass = document.getElementById('inputAdminPassword').value;

  if (email === 'admin@gmdjl.com' && pass === 'admin2024') {
    window.tournamentStore.setUsuarioActual({ rol: 'superadmin', email });
    showToast('Sesión de SuperAdmin iniciada con éxito', 'success');
    renderAdminDashboard();
  } else {
    showToast('Credenciales incorrectas (Demo: admin@gmdjl.com / admin2024)', 'error');
  }
});

function renderAdminDashboard() {
  document.getElementById('adminLoginCard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';

  // Open Step 1 by default
  renderAdminDisciplinas();
}

// --- PASO 1: DISCIPLINAS ---
function renderAdminDisciplinas() {
  const container = document.getElementById('adminDisciplinasGrid');
  if (!container) return;

  const disciplinas = window.tournamentStore.getDisciplinas();
  container.innerHTML = disciplinas
    .map(
      (d) => `
    <div class="standings-card" style="padding: 1.25rem; border-color: ${d.color || 'var(--border-subtle)'};">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <span style="font-size: 1.8rem;">${d.icono || '🏆'}</span>
        <button class="btn btn-outline btn-sm btn-toggle-disc" data-id="${d.id}" style="${d.activa ? 'color: #34d399;' : 'color: #f87171;'}">
          ${d.activa ? 'Activa ✓' : 'Inactiva ✕'}
        </button>
      </div>
      <h4 style="font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 0.25rem;">${d.nombre}</h4>
      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">${d.categoria}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: var(--radius-sm);">
        Reglas: ${d.reglas?.periodos || 4} ${d.reglas?.nombrePeriodo || 'Cuartos'} • G: ${d.reglas?.ptsGanador || 2} pts | P: ${d.reglas?.ptsPerdedor || 1} pt
      </div>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.btn-toggle-disc').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      window.tournamentStore.toggleDisciplina(id);
      renderDisciplinesBar();
      renderAdminDisciplinas();
    });
  });
}

document.getElementById('btnNuevaDisciplinaModal')?.addEventListener('click', () => {
  document.getElementById('modalNuevaDisciplina')?.classList.add('open');
});

document.getElementById('formNuevaDisciplina')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = document.getElementById('discNombre').value;
  const categoria = document.getElementById('discCategoria').value;
  const icono = document.getElementById('discIcono').value;
  const color = document.getElementById('discColor').value;
  const periodos = Number(document.getElementById('discPeriodos').value);
  const nombrePeriodo = document.getElementById('discNombrePeriodo').value;

  window.tournamentStore.addDisciplina({
    nombre,
    categoria,
    icono,
    color,
    reglas: { periodos, nombrePeriodo, ptsGanador: 2, ptsPerdedor: 1, duracionMin: 10 }
  });

  document.getElementById('modalNuevaDisciplina').classList.remove('open');
  showToast(`Disciplina "${nombre}" agregada al torneo`, 'success');
  renderDisciplinesBar();
  renderAdminDisciplinas();
});

// --- PASO 2: CARGA MASIVA & CARGA MANUAL ---
function initCSVUploadEvents() {
  const fileInput = document.getElementById('csvFileInput');
  const dropZone = document.getElementById('csvDropZone');
  const statusDiv = document.getElementById('csvImportStatus');

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = window.CSVProcessor.parseCSV(text);
      const tipo = window.CSVProcessor.detectType(parsed.headers);
      const discId = window.tournamentStore.getDisciplinaActual().id;

      let resultMsg = '';

      if (tipo === 'ROSTER_Y_EQUIPOS') {
        const res = window.CSVProcessor.processRosterCSV(parsed, discId);
        resultMsg = `¡Carga Masiva Exitosa! Se importaron ${res.equiposCount} equipos y ${res.atletasCount} atletas del archivo ${file.name}.`;
      } else if (tipo === 'CONFIG_GRUPOS') {
        const res = window.CSVProcessor.processGruposCSV(parsed, discId);
        resultMsg = `¡Configuración de Grupos Exitosa! Se importaron ${res.equiposCount} equipos de ${file.name}.`;
      } else if (tipo === 'CALENDARIO_Y_RESULTADOS') {
        const res = window.CSVProcessor.processCalendarioCSV(parsed, discId);
        resultMsg = `¡Calendario y Marcadores Importados! Se procesaron ${res.partidosCount} partidos de ${file.name}.`;
      } else {
        resultMsg = `Archivo procesado con ${parsed.rows.length} registros. Tipo genérico importado.`;
      }

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<strong>✅ Éxito:</strong> ${resultMsg}`;
      }
      showToast(resultMsg, 'success');
      renderAllViews();
    };
    reader.readAsText(file);
  }

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--brand-gold)';
  });
  dropZone?.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'rgba(212, 175, 55, 0.4)';
  });
  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(212, 175, 55, 0.4)';
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
}

function populateManualFormSelects() {
  const localSelect = document.getElementById('manMatchLocal');
  const visSelect = document.getElementById('manMatchVis');
  if (!localSelect || !visSelect) return;

  const equipos = window.tournamentStore.getEquipos();
  const options = equipos.map((eq) => `<option value="${eq.nombre}">${eq.nombre} (${eq.grupo})</option>`).join('');

  localSelect.innerHTML = options;
  visSelect.innerHTML = options;
  if (equipos.length > 1) {
    visSelect.selectedIndex = 1;
  }
}

// Manual Team Form
document.getElementById('formManualTeam')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = document.getElementById('manTeamName').value;
  const grupo = document.getElementById('manTeamGroup').value;
  const siglas = document.getElementById('manTeamSiglas').value;
  const sede = document.getElementById('manTeamVenue').value;
  const del = document.getElementById('manTeamDelegate').value;
  const tel = document.getElementById('manTeamPhone').value;

  window.tournamentStore.addEquipo({
    nombre,
    grupo,
    siglas,
    sedePrincipal: sede,
    delegadoNombre: del,
    delegadoTelefono: tel
  });

  showToast(`Equipo "${nombre}" registrado con éxito`, 'success');
  document.getElementById('formManualTeam').reset();
  populateManualFormSelects();
  renderTeamsAndRosters();
});

// Manual Match Form
document.getElementById('formManualMatch')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const local = document.getElementById('manMatchLocal').value;
  const vis = document.getElementById('manMatchVis').value;

  if (local === vis) {
    showToast('El equipo local y visitante no pueden ser el mismo', 'error');
    return;
  }

  const fecha = document.getElementById('manMatchDate').value;
  const hora = document.getElementById('manMatchTime').value;
  const sede = document.getElementById('manMatchVenue').value;
  const fase = document.getElementById('manMatchPhase').value;

  window.tournamentStore.addPartido({
    equipoLocal: local,
    equipoVisitante: vis,
    fecha,
    hora,
    sede,
    fase,
    estado: 'PROGRAMADO'
  });

  showToast('Partido programado en el calendario', 'success');
  renderMatches();
});

// --- PASO 3: MESA DE ANOTACIÓN / MARCADOR EN VIVO ---
let activeScorerMatch = null;

function initScorerMatchSelector() {
  const select = document.getElementById('scorerMatchSelect');
  if (!select) return;

  const partidos = window.tournamentStore.getPartidos();
  select.innerHTML = partidos
    .map(
      (p) => `
    <option value="${p.id}">
      [${p.estado}] ${p.equipoLocal} vs ${p.equipoVisitante} (${p.fecha} ${p.hora})
    </option>
  `
    )
    .join('');

  select.onchange = () => {
    loadScorerMatch(select.value);
  };

  // Prioritize active LIVE match
  const live = partidos.find((p) => p.estado === 'EN CURSO');
  if (live) {
    select.value = live.id;
    loadScorerMatch(live.id);
  } else if (partidos.length > 0) {
    select.value = partidos[0].id;
    loadScorerMatch(partidos[0].id);
  }
}

function loadScorerMatch(partidoId) {
  activeScorerMatch = window.tournamentStore.getPartidoPorId(partidoId);
  if (!activeScorerMatch) return;

  document.getElementById('scorerLocalName').textContent = activeScorerMatch.equipoLocal;
  document.getElementById('scorerVisName').textContent = activeScorerMatch.equipoVisitante;
  document.getElementById('scorerLocalTotal').textContent = activeScorerMatch.totalLocal;
  document.getElementById('scorerVisTotal').textContent = activeScorerMatch.totalVisitante;

  document.getElementById('scorerQ1Loc').value = activeScorerMatch.q1Loc;
  document.getElementById('scorerQ2Loc').value = activeScorerMatch.q2Loc;
  document.getElementById('scorerQ3Loc').value = activeScorerMatch.q3Loc;
  document.getElementById('scorerQ4Loc').value = activeScorerMatch.q4Loc;

  document.getElementById('scorerQ1Vis').value = activeScorerMatch.q1Vis;
  document.getElementById('scorerQ2Vis').value = activeScorerMatch.q2Vis;
  document.getElementById('scorerQ3Vis').value = activeScorerMatch.q3Vis;
  document.getElementById('scorerQ4Vis').value = activeScorerMatch.q4Vis;

  document.getElementById('scorerLiveBadge').textContent = activeScorerMatch.estado;
  document.getElementById('scorerClockDisplay').textContent = activeScorerMatch.reloj || '10:00';
}

function initScorerControls() {
  // Adjustment buttons (+1, +2, +3, -1)
  document.querySelectorAll('.score-adj-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!activeScorerMatch) return;

      const team = btn.getAttribute('data-team');
      const val = Number(btn.getAttribute('data-val'));
      const activePeriodBtn = document.querySelector('#scorerPeriodSelector .period-btn.active');
      const period = activePeriodBtn ? activePeriodBtn.getAttribute('data-period') : 'Q4';

      if (team === 'loc') {
        let qVal = activeScorerMatch[`${period.toLowerCase()}Loc`] || 0;
        qVal = Math.max(0, qVal + val);
        activeScorerMatch[`${period.toLowerCase()}Loc`] = qVal;
        activeScorerMatch.totalLocal =
          (activeScorerMatch.q1Loc || 0) +
          (activeScorerMatch.q2Loc || 0) +
          (activeScorerMatch.q3Loc || 0) +
          (activeScorerMatch.q4Loc || 0);

        document.getElementById(`scorer${period}Loc`).value = qVal;
        document.getElementById('scorerLocalTotal').textContent = activeScorerMatch.totalLocal;
      } else {
        let qVal = activeScorerMatch[`${period.toLowerCase()}Vis`] || 0;
        qVal = Math.max(0, qVal + val);
        activeScorerMatch[`${period.toLowerCase()}Vis`] = qVal;
        activeScorerMatch.totalVisitante =
          (activeScorerMatch.q1Vis || 0) +
          (activeScorerMatch.q2Vis || 0) +
          (activeScorerMatch.q3Vis || 0) +
          (activeScorerMatch.q4Vis || 0);

        document.getElementById(`scorer${period}Vis`).value = qVal;
        document.getElementById('scorerVisTotal').textContent = activeScorerMatch.totalVisitante;
      }

      // Live transmission
      window.supabaseService.broadcastScore(activeScorerMatch.id, activeScorerMatch);
    });
  });

  // Period buttons
  document.querySelectorAll('#scorerPeriodSelector .period-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#scorerPeriodSelector .period-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (activeScorerMatch) {
        activeScorerMatch.periodoActual = btn.getAttribute('data-period');
      }
    });
  });

  // Clock toggle & reset
  document.getElementById('btnClockToggle')?.addEventListener('click', () => {
    if (isTimerRunning) {
      clearInterval(matchTimerInterval);
      isTimerRunning = false;
      document.getElementById('btnClockToggle').textContent = '▶ Iniciar Reloj';
    } else {
      isTimerRunning = true;
      document.getElementById('btnClockToggle').textContent = '⏸ Pausar Reloj';
      matchTimerInterval = setInterval(() => {
        if (matchTimerSeconds > 0) {
          matchTimerSeconds--;
          const mins = String(Math.floor(matchTimerSeconds / 60)).padStart(2, '0');
          const secs = String(matchTimerSeconds % 60).padStart(2, '0');
          const timeStr = `${mins}:${secs}`;
          document.getElementById('scorerClockDisplay').textContent = timeStr;
          if (activeScorerMatch) {
            activeScorerMatch.reloj = timeStr;
            // periodic background broadcast
            if (matchTimerSeconds % 10 === 0) {
              window.supabaseService.broadcastScore(activeScorerMatch.id, { reloj: timeStr });
            }
          }
        } else {
          clearInterval(matchTimerInterval);
          isTimerRunning = false;
          showToast('¡Tiempo finalizado para este cuarto!', 'info');
        }
      }, 1000);
    }
  });

  document.getElementById('btnClockReset')?.addEventListener('click', () => {
    matchTimerSeconds = 600;
    const timeStr = '10:00';
    document.getElementById('scorerClockDisplay').textContent = timeStr;
    if (activeScorerMatch) {
      activeScorerMatch.reloj = timeStr;
      window.supabaseService.broadcastScore(activeScorerMatch.id, { reloj: timeStr });
    }
  });

  // Status buttons
  document.getElementById('btnScorerSetProgramado')?.addEventListener('click', () => {
    if (!activeScorerMatch) return;
    activeScorerMatch.estado = 'PROGRAMADO';
    window.tournamentStore.updatePartido(activeScorerMatch.id, { estado: 'PROGRAMADO' });
    loadScorerMatch(activeScorerMatch.id);
    showToast('Estado cambiado a PROGRAMADO', 'info');
  });

  document.getElementById('btnScorerSetLive')?.addEventListener('click', () => {
    if (!activeScorerMatch) return;
    activeScorerMatch.estado = 'EN CURSO';
    window.tournamentStore.updatePartido(activeScorerMatch.id, { estado: 'EN CURSO' });
    loadScorerMatch(activeScorerMatch.id);
    showToast('🔴 ¡PARTIDO EN VIVO (LIVE) INICIADO!', 'success');
  });

  document.getElementById('btnScorerSetFinalizado')?.addEventListener('click', () => {
    if (!activeScorerMatch) return;
    if (confirm(`¿Finalizar el partido ${activeScorerMatch.equipoLocal} vs ${activeScorerMatch.equipoVisitante}? Esto recalculará la tabla de posiciones.`)) {
      activeScorerMatch.estado = 'FINALIZADO';
      activeScorerMatch.periodoActual = 'Final';
      activeScorerMatch.reloj = '00:00';
      window.tournamentStore.updatePartido(activeScorerMatch.id, activeScorerMatch);
      loadScorerMatch(activeScorerMatch.id);
      showToast('🏁 ¡Partido marcado como FINALIZADO! Tabla de posiciones recalculada automáticamente.', 'success');
      renderStandings();
    }
  });

  // Broadcast Instant
  document.getElementById('btnBroadcastInstant')?.addEventListener('click', () => {
    if (!activeScorerMatch) return;

    // Read input overrides
    activeScorerMatch.q1Loc = Number(document.getElementById('scorerQ1Loc').value) || 0;
    activeScorerMatch.q2Loc = Number(document.getElementById('scorerQ2Loc').value) || 0;
    activeScorerMatch.q3Loc = Number(document.getElementById('scorerQ3Loc').value) || 0;
    activeScorerMatch.q4Loc = Number(document.getElementById('scorerQ4Loc').value) || 0;
    activeScorerMatch.totalLocal =
      activeScorerMatch.q1Loc + activeScorerMatch.q2Loc + activeScorerMatch.q3Loc + activeScorerMatch.q4Loc;

    activeScorerMatch.q1Vis = Number(document.getElementById('scorerQ1Vis').value) || 0;
    activeScorerMatch.q2Vis = Number(document.getElementById('scorerQ2Vis').value) || 0;
    activeScorerMatch.q3Vis = Number(document.getElementById('scorerQ3Vis').value) || 0;
    activeScorerMatch.q4Vis = Number(document.getElementById('scorerQ4Vis').value) || 0;
    activeScorerMatch.totalVisitante =
      activeScorerMatch.q1Vis + activeScorerMatch.q2Vis + activeScorerMatch.q3Vis + activeScorerMatch.q4Vis;

    window.supabaseService.broadcastScore(activeScorerMatch.id, activeScorerMatch);
    loadScorerMatch(activeScorerMatch.id);
    showToast('⚡ Marcador guardado y transmitido en tiempo real', 'success');
  });
}

// --- PASO 4: AUTOMATIZACIÓN DE POSICIONES ---
function renderAdminStandingsPreview() {
  const container = document.getElementById('adminStandingsPreview');
  if (!container) return;

  const disc = window.tournamentStore.getDisciplinaActual();
  const grouped = window.StandingsEngine.compute(disc.id);

  container.innerHTML = Object.keys(grouped)
    .map((grp) => {
      const rows = grouped[grp];
      return `
      <div class="standings-card">
        <div class="standings-card-header">
          <div class="standings-card-title">${grp}</div>
          <span class="badge badge-gold">${rows.length} Equipos</span>
        </div>
        <div class="table-responsive">
          <table class="standings-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th style="text-align: left;">Equipo</th>
                <th>JJ</th>
                <th>JG</th>
                <th>JP</th>
                <th>PF</th>
                <th>PC</th>
                <th>DP</th>
                <th style="color: var(--brand-gold);">PTS</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr>
                  <td>${r.posicion}</td>
                  <td style="text-align: left; font-weight: 600;">${r.equipo}</td>
                  <td>${r.jj}</td>
                  <td>${r.jg}</td>
                  <td>${r.jp}</td>
                  <td>${r.pf}</td>
                  <td>${r.pc}</td>
                  <td>${r.dp}</td>
                  <td class="pts-cell">${r.pts}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    })
    .join('');
}

document.getElementById('btnAdminRecalcularPosiciones')?.addEventListener('click', () => {
  renderStandings();
  renderAdminStandingsPreview();
  showToast('Tabla de posiciones recalculada con éxito (2 pts victoria / 1 pt derrota)', 'success');
});

document.getElementById('btnAdminExportarPosicionesCSV')?.addEventListener('click', () => {
  const disc = window.tournamentStore.getDisciplinaActual();
  const csv = window.StandingsEngine.exportToCSV(disc.id);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TABLA_POSICIONES_${disc.id}.csv`;
  a.click();
  URL.revokeObjectURL(a);
  showToast('Tabla de posiciones exportada a CSV', 'success');
});

// --- SUPABASE CONFIG MODAL ---
document.getElementById('btnConfigSupabaseModal')?.addEventListener('click', () => {
  const cfg = window.tournamentStore.getConfig();
  document.getElementById('inputSupabaseUrl').value = cfg.supabaseUrl || '';
  document.getElementById('inputSupabaseKey').value = cfg.supabaseAnonKey || '';
  document.getElementById('modalSupabaseConfig')?.classList.add('open');
});

document.getElementById('formSupabaseConfig')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = document.getElementById('inputSupabaseUrl').value.trim();
  const key = document.getElementById('inputSupabaseKey').value.trim();

  window.supabaseService.configure(url, key);
  showToast('Configuración de Supabase guardada', 'success');
});

document.getElementById('btnCopiarSQLSupabase')?.addEventListener('click', () => {
  const accordion = document.getElementById('sqlScriptAccordion');
  const txt = document.getElementById('txtSQLScript');
  if (accordion && txt) {
    accordion.style.display = 'block';
    txt.value = window.supabaseService.getSQLSchemaScript();
  }
});

document.getElementById('btnCopiarClipboardSQL')?.addEventListener('click', () => {
  const txt = document.getElementById('txtSQLScript');
  if (txt) {
    navigator.clipboard.writeText(txt.value).then(() => {
      showToast('¡Script SQL copiado al portapapeles! Péguelo en el SQL Editor de Supabase.', 'success');
    });
  }
});

// User Session Banner / Logout
function checkActiveSession() {
  const user = window.tournamentStore.getUsuarioActual();
  const banner = document.getElementById('roleAlertBanner');
  const badge = document.getElementById('roleAlertBadge');
  const text = document.getElementById('roleAlertText');

  if (user) {
    if (banner) banner.style.display = 'flex';
    if (user.rol === 'superadmin') {
      badge.textContent = 'SuperAdmin';
      badge.className = 'badge badge-gold';
      text.textContent = `Sesión activa: Control Master (${user.email || 'admin@gmdjl.com'})`;
    } else {
      badge.textContent = 'Delegado';
      badge.className = 'badge badge-burgundy';
      text.textContent = `Sesión activa: ${user.equipoNombre || 'Delegado Oficial'}`;
    }
  } else {
    if (banner) banner.style.display = 'none';
  }
}

document.getElementById('btnCerrarSesion')?.addEventListener('click', () => {
  window.tournamentStore.setUsuarioActual(null);
  showToast('Sesión cerrada correctamente', 'info');
  window.appRouter.showView('vistaPublica');
  checkActiveSession();
});

// ==============================================================================
// MASTER RENDER DISPATCHER
// ==============================================================================
function renderAllViews() {
  renderDisciplinesBar();
  renderHeroScoreboard();
  renderMatches();
  renderStandings();
  renderTeamsAndRosters();
  checkActiveSession();
}

// React to Tournament Store updates
window.tournamentStore.subscribe((data, meta) => {
  renderHeroScoreboard();
  renderMatches();
  renderStandings();
  checkActiveSession();

  // Highlight live score update animation
  const scoreLoc = document.getElementById('heroScoreLoc');
  const scoreVis = document.getElementById('heroScoreVis');
  if (scoreLoc) {
    scoreLoc.classList.add('live-pulse');
    setTimeout(() => scoreLoc.classList.remove('live-pulse'), 600);
  }
  if (scoreVis) {
    scoreVis.classList.add('live-pulse');
    setTimeout(() => scoreVis.classList.remove('live-pulse'), 600);
  }
});

// ==============================================================================
// INITIALIZATION ON DOM READY
// ==============================================================================
window.addEventListener('DOMContentLoaded', () => {
  initPWA();
  initNetworkListeners();
  initCSVUploadEvents();
  initScorerControls();
  // Close modals on overlay backdrop click
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  renderAllViews();
});
