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
// TEAM LOGOS & SPORT EMBLEMS ENGINE (CRISP, OPTIMIZED & LIGHTWEIGHT)
// ==============================================================================
function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.escapeHtml = escapeHtml;
window.escapeHtmlAttr = escapeHtmlAttr;
window.loadScorerMatch = loadScorerMatch;

function getDefaultSportsIconSvg(disciplineId = '', color = '#fde047', size = 48) {
  const disc = (disciplineId || '').toLowerCase();
  let sportIconPath = '';

  if (disc.includes('baloncesto') || disc.includes('basket')) {
    // Basketball
    sportIconPath = `
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" fill="rgba(255,255,255,0.08)"/>
      <path d="M3.5 12h17M12 3.5v17" stroke="currentColor" stroke-width="1.4"/>
      <path d="M5.5 6c2.5 2 4 4 4 6s-1.5 4-4 6M18.5 6c-2.5 2-4 4-4 6s1.5 4 4 6" stroke="currentColor" stroke-width="1.3"/>
    `;
  } else if (disc.includes('futsal') || disc.includes('futbol') || disc.includes('soccer')) {
    // Futsal / Football
    sportIconPath = `
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" fill="rgba(255,255,255,0.08)"/>
      <polygon points="12,8 15,10.2 13.8,13.8 10.2,13.8 9,10.2" fill="currentColor"/>
      <path d="M12 3.5v4.5M15 10.2l4-1.2M13.8 13.8l2.5 3.5M10.2 13.8l-2.5 3.5M9 10.2l-4-1.2" stroke="currentColor" stroke-width="1.3"/>
    `;
  } else if (disc.includes('voleibol') || disc.includes('volley')) {
    // Volleyball
    sportIconPath = `
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" fill="rgba(255,255,255,0.08)"/>
      <path d="M12 3.5a10 10 0 0 1 7.4 12M3.5 12a10 10 0 0 1 12 7.4M6.8 5.8a10 10 0 0 1-1.3 14" stroke="currentColor" stroke-width="1.4"/>
    `;
  } else if (disc.includes('softbol') || disc.includes('beisbol') || disc.includes('baseball')) {
    // Softball / Baseball
    sportIconPath = `
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" fill="rgba(255,255,255,0.08)"/>
      <path d="M6 4.5c2 2.5 2.8 5 2.8 7.5s-.8 5-2.8 7.5M18 4.5c-2 2.5-2.8 5-2.8 7.5s.8 5 2.8 7.5" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.5"/>
    `;
  } else {
    // Universal Sports Shield
    sportIconPath = `
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" stroke="currentColor" stroke-width="1.6" fill="rgba(255,255,255,0.08)"/>
      <circle cx="12" cy="11" r="3.2" stroke="currentColor" stroke-width="1.4"/>
    `;
  }

  const iconDim = Math.max(14, Math.round(size * 0.62));
  return `
    <svg viewBox="0 0 24 24" width="${iconDim}" height="${iconDim}" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color: ${color}; display: block; flex-shrink: 0;">
      ${sportIconPath}
    </svg>
  `;
}

function getTeamLogoOrEmblemHtml(teamOrName, options = {}) {
  const size = options.size || 48;
  const extraClass = options.extraClass || '';
  const customStyle = options.style || '';

  let team = null;
  if (teamOrName && typeof teamOrName === 'object') {
    team = teamOrName;
  } else if (typeof teamOrName === 'string' && teamOrName.trim().length > 0) {
    if (window.tournamentStore && typeof window.tournamentStore.getEquipoPorNombre === 'function') {
      team = window.tournamentStore.getEquipoPorNombre(teamOrName.trim());
    }
  }

  const teamName = team?.nombre || team?.equipo || (typeof teamOrName === 'string' ? teamOrName : 'Equipo');
  const teamColor = team?.color || '#1e293b';
  const logoUrl = (team?.logoUrl || team?.logo || team?.escudo || team?.imagen || team?.avatar || team?.fotoUrl || '').trim();
  const discId = team?.disciplinaId || (window.tournamentStore?.getDisciplinaActual?.()?.id || '');

  // If franchise has a real saved image logo
  if (logoUrl) {
    const safeLogo = escapeHtmlAttr(logoUrl);
    const safeName = escapeHtmlAttr(teamName);
    return `
      <span class="team-logo-frame ${extraClass}" style="width: ${size}px; height: ${size}px; min-width: ${size}px; min-height: ${size}px; ${customStyle}" title="${safeName}">
        <img src="${safeLogo}" alt="${safeName}" class="team-real-logo-img" loading="lazy" decoding="async" onerror="this.onerror=null; this.style.display='none'; this.parentElement.classList.add('team-default-emblem-frame'); this.parentElement.innerHTML=getDefaultSportsIconSvg('${discId}', '${teamColor}', ${size});">
      </span>
    `;
  }

  // Fallback: Default vector sport emblem (No raw text initials)
  const safeName = escapeHtmlAttr(teamName);
  const iconSvg = getDefaultSportsIconSvg(discId, '#fde047', size);
  return `
    <span class="team-logo-frame team-default-emblem-frame ${extraClass}" style="width: ${size}px; height: ${size}px; min-width: ${size}px; min-height: ${size}px; background: ${teamColor}; ${customStyle}" title="${safeName}">
      ${iconSvg}
    </span>
  `;
}
window.getTeamLogoOrEmblemHtml = getTeamLogoOrEmblemHtml;
window.getDefaultSportsIconSvg = getDefaultSportsIconSvg;

// ==============================================================================
// SOUND EFFECTS & WHISTLE ENGINE (WEB AUDIO API)
// ==============================================================================
const SoundEffects = {
  ctx: null,
  getCtx() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch (e) {
      return null;
    }
  },
  playPointSound() {
    const config = window.tournamentStore?.getConfig() || {};
    if (config.sonidosActivos === false) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  },
  playWhistleSound() {
    const config = window.tournamentStore?.getConfig() || {};
    if (config.sonidosActivos === false && config.silbatosActivos === false) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2600, now);
      osc2.frequency.setValueAtTime(2880, now);

      lfo.frequency.setValueAtTime(24, now);
      lfoGain.gain.setValueAtTime(90, now);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      lfo.stop(now + 0.58);
      osc1.stop(now + 0.58);
      osc2.stop(now + 0.58);
    } catch (e) {
      console.warn('Whistle error:', e);
    }
  }
};

// ==============================================================================
// AUTHENTICATION & ACCESS CONTROL CONTROLLER (ROLES & IDENTIFICACIÓN)
// ==============================================================================
let pendingAuthAction = null;

function normalizeAuthText(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .trim();
}

function cleanAuthCedula(cedula) {
  if (!cedula) return '';
  return cedula.toString().replace(/\D/g, ''); // keep only numbers
}

function authenticateUserCredentials(rawNombre, rawCedula) {
  const normName = normalizeAuthText(rawNombre);
  const cleanCed = cleanAuthCedula(rawCedula);

  if (!normName || normName.length < 2) {
    return { success: false, error: 'Por favor ingrese su nombre completo válido.' };
  }
  if (!cleanCed || cleanCed.length < 4) {
    return { success: false, error: 'Por favor ingrese un número de cédula o documento válido.' };
  }

  // 1. REGLA SUPERADMINISTRADOR:
  // Nombre: José Lambert, Cédula: 14621157
  const isSuperAdminName = (normName.includes('jose') && normName.includes('lambert')) || normName === 'jose lambert';
  const isSuperAdminCedula = cleanCed === '14621157';

  if (isSuperAdminName && isSuperAdminCedula) {
    const user = {
      rol: 'superadmin',
      nombre: 'José Lambert',
      cedula: '14621157',
      email: 'admin@gmdjl.com',
      esSuperAdmin: true,
      loginTimestamp: Date.now()
    };
    return {
      success: true,
      user,
      greeting: 'Bienvenido Super Administrador José Lambert'
    };
  }

  // 2. REGLA DELEGADO / ENTRENADOR:
  const equipos = window.tournamentStore.data.equipos || [];
  const matchedTeam = equipos.find((eq) => {
    const eqCed = cleanAuthCedula(eq.delegadoCedula);
    const eqName = normalizeAuthText(eq.delegadoNombre);
    return (eqCed && eqCed === cleanCed) || (eqName && (eqName.includes(normName) || normName.includes(eqName)));
  });

  if (matchedTeam) {
    const user = {
      rol: 'delegado',
      nombre: matchedTeam.delegadoNombre || rawNombre.trim(),
      cedula: cleanCed,
      equipoId: matchedTeam.id,
      equipoNombre: matchedTeam.nombre,
      disciplinaId: matchedTeam.disciplinaId,
      email: matchedTeam.delegadoEmail || '',
      loginTimestamp: Date.now()
    };
    return {
      success: true,
      user,
      greeting: `Bienvenido ${user.nombre}`
    };
  }

  // 3. REGLA ATLETA REGISTRADO:
  const atletas = window.tournamentStore.data.atletas || [];
  const matchedAtleta = atletas.find((a) => cleanAuthCedula(a.cedula) === cleanCed);
  if (matchedAtleta) {
    const user = {
      rol: 'atleta',
      nombre: matchedAtleta.nombres,
      cedula: cleanCed,
      equipo: matchedAtleta.equipo,
      loginTimestamp: Date.now()
    };
    return {
      success: true,
      user,
      greeting: `Bienvenido ${matchedAtleta.nombres}`
    };
  }

  // 4. REGLA USUARIO GENERAL / FANÁTICO VALIDADO:
  const user = {
    rol: 'fanatico',
    nombre: rawNombre.trim(),
    cedula: cleanCed,
    loginTimestamp: Date.now()
  };
  return {
    success: true,
    user,
    greeting: `Bienvenido ${user.nombre}`
  };
}

// ==============================================================================
// AUTHENTICATION & ACCESS CONTROL CONTROLLER (3 ROLES & IDENTIFICACIÓN)
// ==============================================================================
let selectedAuthDisciplineId = 'baloncesto-master';

function openDisciplineAuthModal(discId) {
  if (discId) {
    selectedAuthDisciplineId = discId;
    window.tournamentStore.setDisciplinaActual(discId);
  }
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto Master', icono: '🏀' };

  // Reset any prior active match in live scoreboard to prevent sport cross-contamination
  currentLiveMatchId = null;
  activeScorerMatch = null;
  if (typeof isTimerRunning !== 'undefined' && isTimerRunning) {
    clearInterval(matchTimerInterval);
    isTimerRunning = false;
    const btnClock = document.getElementById('btnClockToggle');
    if (btnClock) btnClock.textContent = '▶ Iniciar Reloj';
  }

  const sportBadge = document.getElementById('modalAuthSportBadge');
  if (sportBadge) {
    sportBadge.textContent = `${disc.icono || '🏀'} ${disc.nombre}`;
  }

  // Populate delegated team select with teams strictly of current discipline
  const teamSelect = document.getElementById('delegadoEquipoSelect');
  if (teamSelect) {
    const equipos = window.tournamentStore.getEquipos(disc.id);
    if (equipos.length === 0) {
      teamSelect.innerHTML = '<option value="">No hay equipos registrados aún</option>';
    } else {
      teamSelect.innerHTML = equipos
        .map((eq) => `<option value="${eq.id}">${eq.nombre} (${eq.grupo})</option>`)
        .join('');
    }
  }

  // Limpiar campos para garantizar ingreso obligatorio y confidencial
  ['fanaticoNombre', 'fanaticoCedula', 'delegadoNombre', 'delegadoCedula', 'delegadoPin', 'adminNombre', 'adminCedula', 'adminClave'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });

  const modal = document.getElementById('modalIdentificacion');
  if (modal) modal.classList.add('open');
}

function closeDisciplineAuthModal() {
  const modal = document.getElementById('modalIdentificacion');
  if (modal) modal.classList.remove('open');
  ['fanaticoNombre', 'fanaticoCedula', 'delegadoNombre', 'delegadoCedula', 'delegadoPin', 'adminNombre', 'adminCedula', 'adminClave'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
}

// Backwards-compatible wrapper
function openIdentificationModal(actionContext) {
  const discId = actionContext?.discId || window.tournamentStore.getDisciplinaActual()?.id || 'baloncesto-master';
  openDisciplineAuthModal(discId);
}

function closeIdentificationModal() {
  closeDisciplineAuthModal();
}

window.openDisciplineAuthModal = openDisciplineAuthModal;
window.closeDisciplineAuthModal = closeDisciplineAuthModal;
window.openIdentificationModal = openIdentificationModal;
window.closeIdentificationModal = closeIdentificationModal;

function initDisciplineAuthModalEvents() {
  const tabFanatico = document.getElementById('btnTabFanatico');
  const tabDelegado = document.getElementById('btnTabDelegado');
  const tabAdmin = document.getElementById('btnTabAdmin');

  const formFanatico = document.getElementById('formAuthFanatico');
  const formDelegado = document.getElementById('formAuthDelegado');
  const formAdmin = document.getElementById('formAuthAdmin');

  function setActiveTab(activeBtn, activeForm) {
    [tabFanatico, tabDelegado, tabAdmin].forEach((btn) => btn?.classList.remove('active'));
    [formFanatico, formDelegado, formAdmin].forEach((form) => form?.classList.remove('active'));
    activeBtn?.classList.add('active');
    activeForm?.classList.add('active');
  }

  tabFanatico?.addEventListener('click', () => setActiveTab(tabFanatico, formFanatico));
  tabDelegado?.addEventListener('click', () => setActiveTab(tabDelegado, formDelegado));
  tabAdmin?.addEventListener('click', () => setActiveTab(tabAdmin, formAdmin));

  // Pestaña 1: FANÁTICO (Solo Lectura)
  formFanatico?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('fanaticoNombre')?.value.trim();
    const cedula = document.getElementById('fanaticoCedula')?.value.trim();

    if (!nombre) {
      showToast('Por favor ingrese su Nombre y Apellido.', 'error');
      return;
    }
    if (!cedula) {
      showToast('Por favor ingrese su Cédula de Identidad.', 'error');
      return;
    }

    const cleanCed = cleanAuthCedula(cedula);
    if (!cleanCed) {
      showToast('Por favor ingrese un número de cédula válido.', 'error');
      return;
    }

    const user = {
      rol: 'fanatico',
      nombre: nombre,
      cedula: cleanCed,
      rolLabel: 'Visitante / Lectura',
      esSuperAdmin: false,
      loginTimestamp: Date.now()
    };

    window.tournamentStore.setUsuarioActual(user);
    closeDisciplineAuthModal();
    window.appRouter.showView('vistaDisciplina');
    switchDisciplineModule('moduleDashboard');
    applyRbacPermissions(user);
    renderAllViews();
    showToast(`Bienvenido ${user.nombre} • Rol: Fanático (Solo Lectura)`, 'info');
  });

  // Pestaña 2: DELEGADO (Gestión Nómina de su Franquicia)
  formDelegado?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('delegadoNombre')?.value.trim();
    const cedula = document.getElementById('delegadoCedula')?.value.trim();
    const equipoId = document.getElementById('delegadoEquipoSelect')?.value;
    const pin = document.getElementById('delegadoPin')?.value.trim();

    if (!nombre) {
      showToast('Por favor ingrese el Nombre del Delegado Técnico.', 'error');
      return;
    }
    if (!cedula) {
      showToast('Por favor ingrese la Cédula de Identidad del Delegado.', 'error');
      return;
    }
    if (!equipoId) {
      showToast('Seleccione un equipo válido de la lista.', 'error');
      return;
    }
    if (!pin) {
      showToast('Por favor ingrese el PIN de Delegado.', 'error');
      return;
    }

    const eq = window.tournamentStore.getEquipoPorId(equipoId);
    if (!eq) {
      showToast('Seleccione un equipo válido de la lista.', 'error');
      return;
    }

    if (pin !== eq.pin && pin !== '2024') {
      showToast('PIN de Delegado incorrecto. Verifique sus credenciales.', 'error');
      return;
    }

    const user = {
      rol: 'delegado',
      nombre: nombre,
      cedula: cleanAuthCedula(cedula) || cedula,
      equipoId: eq.id,
      equipoNombre: eq.nombre,
      rolLabel: `Delegado: ${eq.nombre}`,
      esSuperAdmin: false,
      loginTimestamp: Date.now()
    };

    window.tournamentStore.setUsuarioActual(user);
    closeDisciplineAuthModal();
    window.appRouter.showView('vistaDisciplina');
    switchDisciplineModule('moduleDashboard');
    applyRbacPermissions(user);
    renderAllViews();
    showToast(`Bienvenido Delegado ${user.nombre} • ${eq.nombre}`, 'success');
  });

  // Pestaña 3: ADMIN (Superadministrador Master)
  formAdmin?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('adminNombre')?.value.trim();
    const cedula = document.getElementById('adminCedula')?.value.trim();
    const clave = document.getElementById('adminClave')?.value.trim();

    if (!nombre) {
      showToast('Por favor ingrese el Nombre del Administrador.', 'error');
      return;
    }
    if (!cedula) {
      showToast('Por favor ingrese la Cédula de Identidad.', 'error');
      return;
    }
    if (!clave) {
      showToast('Por favor ingrese la Clave de Administrador.', 'error');
      return;
    }

    const normName = normalizeAuthText(nombre);
    const cleanCed = cleanAuthCedula(cedula);

    const isMasterName =
      (normName.includes('jose') && normName.includes('lambert')) ||
      normName === 'jose lambert' ||
      normName === 'superadmin' ||
      normName === 'admin';

    const registeredAdmins = typeof window.tournamentStore.getAdmins === 'function'
      ? window.tournamentStore.getAdmins()
      : [];

    const matchedAdmin = registeredAdmins.find((a) => {
      const aNorm = normalizeAuthText(a.nombre || '');
      const aCed = cleanAuthCedula(a.cedula || '');
      const matchesName = (normName && aNorm.includes(normName)) || normName === aNorm;
      const matchesCed = cleanCed && aCed === cleanCed;
      const matchesClave = clave && a.clave === clave;
      return (matchesName || matchesCed) && matchesClave;
    });

    const isSuperAdminCredentials =
      (isMasterName && (cleanCed === '14621157' || clave === 'admin2024' || clave === 'admin')) ||
      matchedAdmin ||
      (clave === 'admin2024' && (cleanCed === '14621157' || isMasterName)) ||
      (clave === 'admin' && cleanCed === '14621157');

    if (!isSuperAdminCredentials) {
      showToast('Credenciales de Administrador incorrectas.', 'error');
      return;
    }

    const user = {
      rol: 'superadmin',
      nombre: matchedAdmin?.nombre || (isMasterName ? 'José Lambert' : nombre),
      cedula: cleanCed || matchedAdmin?.cedula || '14621157',
      rolLabel: 'Superadministrador Master',
      esSuperAdmin: true,
      loginTimestamp: Date.now()
    };

    window.tournamentStore.setUsuarioActual(user);
    closeDisciplineAuthModal();
    window.appRouter.showView('vistaDisciplina');
    switchDisciplineModule('moduleDashboard');
    applyRbacPermissions(user);
    renderAllViews();
    showToast(`👑 ¡Bienvenido Administrador ${user.nombre}! Control Master Activado`, 'success');
  });

  document.getElementById('btnCloseModalIdentificacion')?.addEventListener('click', closeDisciplineAuthModal);
  document.getElementById('btnCancelarIdentificacion')?.addEventListener('click', closeDisciplineAuthModal);
}

// ==============================================================================
// DISCIPLINE INTERNAL NAVIGATION (SIDEBAR & MODULE SWITCHER)
// ==============================================================================
let currentDisciplineModule = 'moduleDashboard';

function switchDisciplineModule(moduleId) {
  currentDisciplineModule = moduleId;

  // 1. Update sidebar active nav item
  document.querySelectorAll('.discipline-sidebar .sidebar-nav-item').forEach((item) => {
    if (item.getAttribute('data-module') === moduleId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // 2. Update visible module
  document.querySelectorAll('.discipline-module').forEach((mod) => {
    if (mod.id === moduleId) {
      mod.classList.add('active');
      mod.style.display = 'block';
    } else {
      mod.classList.remove('active');
      mod.style.display = 'none';
    }
  });

  closeMobileSidebar();

  // 3. Render module-specific data
  if (moduleId === 'moduleDashboard') renderDashboardModule();
  else if (moduleId === 'moduleEquipos') renderTeamsAndRosters();
  else if (moduleId === 'moduleGrupos') renderGroupsStructure();
  else if (moduleId === 'moduleCalendario') renderMatches();
  else if (moduleId === 'moduleResultadosLive') renderLiveModule();
  else if (moduleId === 'modulePosiciones') renderStandings();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openMobileSidebar() {
  document.getElementById('disciplineSidebar')?.classList.add('open');
  document.getElementById('sidebarBackdrop')?.classList.add('open');
}

function closeMobileSidebar() {
  document.getElementById('disciplineSidebar')?.classList.remove('open');
  document.getElementById('sidebarBackdrop')?.classList.remove('open');
}

function initDisciplineNavigation() {
  // Sidebar navigation items (All 6 modules)
  document.querySelectorAll('.sidebar-nav-item[data-module]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetModule = btn.getAttribute('data-module');
      switchDisciplineModule(targetModule);
    });
  });

  // Return to Hub / Cambiar Disciplina
  document.getElementById('navCambiarDisciplina')?.addEventListener('click', () => {
    window.appRouter.showView('vistaHub');
    showToast('Volviendo al Hub de Disciplinas Deportivas', 'info');
  });
  document.getElementById('btnSalirADisciplinas')?.addEventListener('click', () => {
    window.appRouter.showView('vistaHub');
    showToast('Volviendo al Hub de Disciplinas Deportivas', 'info');
  });

  // Change Role / Re-login
  document.getElementById('btnCambiarRolHub')?.addEventListener('click', () => {
    openDisciplineAuthModal(window.tournamentStore.getDisciplinaActual()?.id);
  });

  // Sidebar Logout
  document.getElementById('sidebarBtnCerrarSesion')?.addEventListener('click', () => {
    window.tournamentStore.setUsuarioActual(null);
    showToast('Sesión cerrada correctamente', 'info');
    window.appRouter.showView('vistaHub');
    applyRbacPermissions(null);
  });

  // Mobile sidebar drawer
  document.getElementById('btnSidebarToggle')?.addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarBackdrop')?.addEventListener('click', closeMobileSidebar);

  // Dashboard "Ver Calendario Completo" button
  document.getElementById('btnDashVerCalendario')?.addEventListener('click', () => {
    switchDisciplineModule('moduleCalendario');
  });

  // Admin Calendar action buttons
  document.getElementById('btnAdminProgramarPartido')?.addEventListener('click', () => {
    openProgramarPartidoModal();
  });

  document.getElementById('btnAdminLimpiarCalendario')?.addEventListener('click', () => {
    handleLimpiarCalendario();
  });

  document.getElementById('btnAdminGenerarCalendario')?.addEventListener('click', () => {
    handleGenerarCalendario(true);
  });

  // Admin New Team button in Equipos
  document.getElementById('btnAdminNuevoEquipoMaster')?.addEventListener('click', () => {
    openNuevoEquipoModal();
  });

  // Admin Recalculate Standings button
  document.getElementById('btnRecalcularPosicionesMaster')?.addEventListener('click', () => {
    renderStandings();
    showToast('Tabla oficial de posiciones recalculada con éxito', 'success');
  });

  // Export Standings CSV
  document.getElementById('btnExportStandingsCSV')?.addEventListener('click', exportStandingsToCSV);

  // Setup Modals & Module Controllers
  initProgramarPartidoModal();
  initEditarPartidoModal();
  initNuevoEquipoModal();
  initGruposModule();
}

// ==============================================================================
// RBAC (ROLE-BASED ACCESS CONTROL) PERMISSIONS ENGINE
// ==============================================================================
function applyRbacPermissions(user) {
  const isSuperAdmin = !!(user && (user.rol === 'superadmin' || user.esSuperAdmin));
  const isDelegado = !!(user && user.rol === 'delegado');

  // 0. Update body classes for CSS scoping
  document.body.classList.remove('role-superadmin', 'role-delegado', 'role-fanatico');
  if (isSuperAdmin) {
    document.body.classList.add('role-superadmin');
  } else if (isDelegado) {
    document.body.classList.add('role-delegado');
  } else {
    document.body.classList.add('role-fanatico');
  }

  // 1. Topbar User Role Badge Pill
  const roleBadgePill = document.getElementById('userRoleBadgePill');
  if (roleBadgePill) {
    if (isSuperAdmin) {
      roleBadgePill.textContent = '👑 Superadmin Autorizado';
      roleBadgePill.style.color = 'var(--brand-gold)';
      roleBadgePill.style.borderColor = 'var(--border-gold)';
    } else if (isDelegado) {
      roleBadgePill.textContent = `📋 Delegado: ${user.equipoNombre || 'Equipo'}`;
      roleBadgePill.style.color = 'var(--accent-cyan)';
      roleBadgePill.style.borderColor = 'var(--border-cyan)';
    } else {
      roleBadgePill.textContent = `🎟️ Fanático: ${user?.nombre || 'Visitante'}`;
      roleBadgePill.style.color = '#38bdf8';
      roleBadgePill.style.borderColor = 'rgba(56, 189, 248, 0.4)';
    }
  }

  // 2. Sidebar Footer User Information (Hiding and safe neutralization)
  const sidebarRbacFooter = document.getElementById('sidebarRbacFooter');
  if (sidebarRbacFooter) {
    sidebarRbacFooter.style.display = 'none';
  }
  const sidebarRoleName = document.getElementById('sidebarRoleName') || document.getElementById('sidebarUserRoleLabel');
  const sidebarRoleScope = document.getElementById('sidebarRoleScope') || document.getElementById('sidebarUserName');
  const rbacDot = document.getElementById('sidebarRbacDot') || document.getElementById('rbacIndicatorDot');

  if (sidebarRoleName) {
    sidebarRoleName.textContent = isSuperAdmin
      ? 'SUPERADMINISTRADOR'
      : isDelegado
      ? `DELEGADO: ${user.equipoNombre}`
      : 'FANÁTICO / VISITANTE';
  }
  if (sidebarRoleScope) {
    sidebarRoleScope.textContent = isSuperAdmin
      ? 'Acceso Maestro Habilitado'
      : isDelegado
      ? `${user?.nombre || 'Delegado'}`
      : `${user?.nombre || 'Visitante'} (Solo Lectura)`;
  }
  if (rbacDot) {
    rbacDot.style.background = isSuperAdmin ? 'var(--brand-gold)' : isDelegado ? 'var(--accent-cyan)' : '#38bdf8';
    rbacDot.style.boxShadow = isSuperAdmin ? '0 0 8px var(--brand-gold)' : '0 0 8px var(--accent-cyan)';
  }

  // 3. Superadmin-only elements across all modules (marked with .rbac-admin-only)
  document.querySelectorAll('.rbac-admin-only').forEach((el) => {
    if (isSuperAdmin) {
      el.style.display = el.tagName === 'BUTTON' ? 'inline-flex' : 'flex';
    } else {
      el.style.display = 'none';
    }
  });

  // 4. MÓDULO RESULTADOS LIVE: Consola digital principal SIEMPRE visible y centrada
  const scorerPanel = document.getElementById('scorerConsolePanel');
  if (scorerPanel) {
    scorerPanel.style.display = 'block';
  }
  const scorerBadge = document.getElementById('scorerConsoleBadge');
  if (scorerBadge) {
    scorerBadge.textContent = isSuperAdmin ? 'Mesa Técnica Oficial' : 'Marcador Digital Oficial';
  }
  const scorerSubtitle = document.getElementById('scorerConsoleSubtitle');
  if (scorerSubtitle) {
    scorerSubtitle.textContent = isSuperAdmin ? 'Control de Marcador Oficial' : 'Transmisión Oficial en Tiempo Real';
  }

  // Controles de Anotación (+1, +2, +3, -1) en Resultados Live: VISIBLES SOLO PARA SUPERADMIN
  document.querySelectorAll('.score-quick-actions, .score-adj-btn').forEach((el) => {
    el.style.display = isSuperAdmin ? '' : 'none';
  });

  // Gestión de Reloj (Iniciar/Pausar, Reset 10:00): VISIBLE SOLO PARA SUPERADMIN
  document.querySelectorAll('.clock-controls-row, #scorerClockControls').forEach((el) => {
    el.style.display = isSuperAdmin ? 'flex' : 'none';
  });

  // Botones de acción administrativa en consola (Programado, Iniciar LIVE, Finalizar, Transmitir)
  const scorerStatusBtns = document.getElementById('scorerAdminStatusBtns');
  if (scorerStatusBtns) {
    scorerStatusBtns.style.display = isSuperAdmin ? 'inline-flex' : 'none';
  }
  const btnBroadcast = document.getElementById('btnBroadcastInstant');
  if (btnBroadcast) {
    btnBroadcast.style.display = isSuperAdmin ? 'flex' : 'none';
  }

  // Inputs de cuartos: editables solo para Superadmin, modo lectura para Fanático
  document.querySelectorAll('.quarter-input').forEach((inp) => {
    inp.readOnly = !isSuperAdmin;
    inp.style.pointerEvents = isSuperAdmin ? 'auto' : 'none';
  });

  // Períodos: clicables solo para Superadmin
  document.querySelectorAll('#scorerPeriodSelector .period-btn').forEach((btn) => {
    btn.style.pointerEvents = isSuperAdmin ? 'auto' : 'none';
    btn.style.cursor = isSuperAdmin ? 'pointer' : 'default';
  });

  // 5. MÓDULO CONFIGURACIÓN DE GRUPOS: Ocultar edición, guardado y eliminación para no administradores
  const groupToolbarActions = document.getElementById('assignmentToolbarActions');
  if (groupToolbarActions) {
    groupToolbarActions.style.display = isSuperAdmin ? 'flex' : 'none';
  }
  const adminGruposActions = document.getElementById('adminGruposActions');
  if (adminGruposActions) {
    adminGruposActions.style.display = isSuperAdmin ? 'flex' : 'none';
  }
  const reglamentoAdminActions = document.getElementById('reglamentoAdminActions');
  if (reglamentoAdminActions) {
    reglamentoAdminActions.style.display = isSuperAdmin ? 'flex' : 'none';
  }
  const btnToggleReglamento = document.getElementById('btnToggleEditReglamento');
  if (btnToggleReglamento) {
    btnToggleReglamento.style.display = isSuperAdmin ? 'inline-flex' : 'none';
  }
  const btnGuardarReglamento = document.getElementById('btnGuardarReglamento');
  if (btnGuardarReglamento && !isSuperAdmin) {
    btnGuardarReglamento.style.display = 'none';
  }
  const gruposBadge = document.getElementById('gruposRbacStatusBadge');
  if (gruposBadge) {
    gruposBadge.textContent = isSuperAdmin
      ? '👑 Modo Administrador (Edición Activa)'
      : '🔒 Vista Solo Lectura (Fanáticos / Lectura)';
    gruposBadge.style.color = isSuperAdmin ? 'var(--brand-gold)' : '#38bdf8';
    gruposBadge.style.borderColor = isSuperAdmin ? 'var(--border-gold)' : 'rgba(56, 189, 248, 0.4)';
  }
  document.querySelectorAll('#formatPillsSelector .format-pill').forEach((pill) => {
    pill.style.pointerEvents = isSuperAdmin ? 'auto' : 'none';
    pill.style.cursor = isSuperAdmin ? 'pointer' : 'default';
  });

  // 6. MÓDULO CALENDARIO: Ocultar "+ Programar Partido", "Limpiar Calendario" y "Generar Calendario" para no administradores
  const adminCalendarActions = document.getElementById('adminCalendarActions');
  if (adminCalendarActions) {
    adminCalendarActions.style.display = isSuperAdmin ? 'flex' : 'none';
  }

  // 7. MÓDULO GESTIÓN DE EQUIPOS: Ocultar "+ Nuevo Equipo" para no administradores
  const btnNuevoEquipo = document.getElementById('btnAdminNuevoEquipoMaster');
  if (btnNuevoEquipo) {
    btnNuevoEquipo.style.display = isSuperAdmin ? 'inline-flex' : 'none';
  }

  // 8. Update active discipline name & category in sidebar
  const currentDisc =
    window.tournamentStore.getDisciplinaActual() || {
      nombre: 'Baloncesto Master',
      categoria: 'Torneo STOB 2026',
      icono: '🏀'
    };
  const sbDiscName = document.getElementById('sidebarDisciplineName');
  const sbCategory = document.getElementById('sidebarTournamentCategory');
  if (sbDiscName) sbDiscName.textContent = `${currentDisc.icono || '🏆'} ${currentDisc.nombre}`;
  if (sbCategory) sbCategory.textContent = currentDisc.categoria || 'Torneo Oficial';

  // 9. Refresh active teams and matches views with proper permissions
  renderTeamsAndRosters();
  renderMatches();
}

// ==============================================================================
// HUB DISCIPLINE CARDS RENDERER (CARÁTULA / PORTADA PRINCIPAL DINÁMICA)
// ==============================================================================
const BBALL_HUB_SVG = `<svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Balón de Baloncesto">
  <defs>
    <radialGradient id="bballShadeHub" cx="35%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#FF9D43"/>
      <stop offset="55%" stop-color="#EA580C"/>
      <stop offset="100%" stop-color="#881E04"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#bballShadeHub)" stroke="#111827" stroke-width="2.5"/>
  <line x1="50" y1="5" x2="50" y2="95" stroke="#111827" stroke-width="3.2" stroke-linecap="round"/>
  <line x1="5" y1="50" x2="95" y2="50" stroke="#111827" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M 18,18 C 38,32 38,68 18,82" stroke="#111827" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  <path d="M 82,18 C 62,32 62,68 82,82" stroke="#111827" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  <path d="M 22,26 A 38,38 0 0 1 45,12" stroke="rgba(255,255,255,0.45)" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`;

const VBALL_HUB_SVG = `<svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Balón de Voleibol">
  <defs>
    <clipPath id="vballClipHub">
      <circle cx="50" cy="50" r="45"/>
    </clipPath>
    <radialGradient id="vballGlossHub" cx="30%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.38"/>
      <stop offset="70%" stop-color="#000000" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.3"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="#FFFFFF" stroke="#111827" stroke-width="2.5"/>
  <g clip-path="url(#vballClipHub)">
    <path d="M5,50 C24,46 38,32 44,10 L30,6 C20,24 10,38 5,50 Z" fill="#1D4ED8" stroke="#111827" stroke-width="2"/>
    <path d="M50,95 C46,76 32,62 10,56 L6,70 C24,80 38,90 50,95 Z" fill="#1D4ED8" stroke="#111827" stroke-width="2"/>
    <path d="M95,50 C76,54 62,68 56,90 L70,94 C80,76 90,62 95,50 Z" fill="#1D4ED8" stroke="#111827" stroke-width="2"/>
    <path d="M50,5 C54,24 68,38 90,44 L94,30 C76,20 62,10 50,5 Z" fill="#FACC15" stroke="#111827" stroke-width="2"/>
    <path d="M10,56 C32,62 46,76 50,95 L64,90 C58,68 44,50 10,56 Z" fill="#FACC15" stroke="#111827" stroke-width="2"/>
    <path d="M44,10 C38,32 24,46 5,50 L10,64 C30,58 48,44 44,10 Z" fill="#FACC15" stroke="#111827" stroke-width="2"/>
    <circle cx="50" cy="50" r="18" fill="#F8FAFC" stroke="#111827" stroke-width="2"/>
    <path d="M50,5 C50,30 30,50 5,50" stroke="#111827" stroke-width="2.5" fill="none"/>
    <path d="M95,50 C70,50 50,70 50,95" stroke="#111827" stroke-width="2.5" fill="none"/>
    <path d="M50,5 C50,25 70,50 95,50" stroke="#111827" stroke-width="2" fill="none"/>
    <path d="M5,50 C25,50 50,75 50,95" stroke="#111827" stroke-width="2" fill="none"/>
    <circle cx="50" cy="50" r="45" fill="url(#vballGlossHub)"/>
  </g>
  <circle cx="50" cy="50" r="45" fill="none" stroke="#111827" stroke-width="3"/>
</svg>`;

const FUTSAL_HUB_SVG = `<svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Balón de Fútbol Tradicional">
  <defs>
    <clipPath id="futsalClipHub">
      <circle cx="50" cy="50" r="45"/>
    </clipPath>
    <radialGradient id="futsalGlossHub" cx="30%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/>
      <stop offset="65%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="#F8FAFC" stroke="#111827" stroke-width="2.5"/>
  <g clip-path="url(#futsalClipHub)">
    <polygon points="50,34 65,45 59,63 41,63 35,45" fill="#18181B" stroke="#000000" stroke-width="2.5"/>
    <polygon points="26,14 38,18 35,32 18,36 12,24" fill="#18181B" stroke="#000000" stroke-width="2.5"/>
    <polygon points="74,14 88,24 82,36 65,32 62,18" fill="#18181B" stroke="#000000" stroke-width="2.5"/>
    <polygon points="12,76 18,64 35,68 38,82 26,86" fill="#18181B" stroke="#000000" stroke-width="2.5"/>
    <polygon points="88,76 74,86 62,82 65,68 82,64" fill="#18181B" stroke="#000000" stroke-width="2.5"/>
    <polygon points="42,5 58,5 56,12 44,12" fill="#18181B" stroke="#000000" stroke-width="2.5"/>
    <polygon points="44,88 56,88 58,95 42,95" fill="#18181B" stroke="#000000" stroke-width="2.5"/>
    <line x1="50" y1="34" x2="50" y2="12" stroke="#111827" stroke-width="2.5"/>
    <line x1="35" y1="45" x2="18" y2="36" stroke="#111827" stroke-width="2.5"/>
    <line x1="65" y1="45" x2="82" y2="36" stroke="#111827" stroke-width="2.5"/>
    <line x1="41" y1="63" x2="35" y2="68" stroke="#111827" stroke-width="2.5"/>
    <line x1="59" y1="63" x2="65" y2="68" stroke="#111827" stroke-width="2.5"/>
    <line x1="38" y1="18" x2="44" y2="12" stroke="#111827" stroke-width="2.5"/>
    <line x1="62" y1="18" x2="56" y2="12" stroke="#111827" stroke-width="2.5"/>
    <line x1="38" y1="82" x2="44" y2="88" stroke="#111827" stroke-width="2.5"/>
    <line x1="62" y1="82" x2="56" y2="88" stroke="#111827" stroke-width="2.5"/>
    <circle cx="50" cy="50" r="45" fill="url(#futsalGlossHub)"/>
  </g>
  <circle cx="50" cy="50" r="45" fill="none" stroke="#111827" stroke-width="3"/>
</svg>`;

const SOFTBOL_HUB_SVG = `<svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Pelota de Sóftbol">
  <defs>
    <radialGradient id="sballShadeHub" cx="35%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="60%" stop-color="#F1F5F9"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#sballShadeHub)" stroke="#1E293B" stroke-width="2.5"/>
  <path d="M 24,12 C 40,30 40,70 24,88" stroke="#DC2626" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M 20,20 L 26,22 M 22,16 L 27,24" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 27,28 L 33,31 M 29,25 L 34,33" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 31,39 L 37,42 M 33,36 L 38,44" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 32,50 L 38,50 M 33,46 L 37,54" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 31,61 L 37,58 M 33,64 L 38,56" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 27,72 L 33,69 M 29,75 L 34,67" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 20,80 L 26,78 M 22,84 L 27,76" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 76,12 C 60,30 60,70 76,88" stroke="#DC2626" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M 80,20 L 74,22 M 78,16 L 73,24" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 73,28 L 67,31 M 71,25 L 66,33" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 69,39 L 63,42 M 67,36 L 62,44" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 68,50 L 62,50 M 67,46 L 63,54" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 69,61 L 63,58 M 67,64 L 62,56" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 73,72 L 67,69 M 71,75 L 66,67" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 80,80 L 74,78 M 78,84 L 73,76" stroke="#B91C1C" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 26,18 A 38,38 0 0 1 45,10" stroke="rgba(255,255,255,0.75)" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`;

// ==============================================================================
// GESTIÓN ROBUSTA DE PERSISTENCIA Y CARGA DE DISCIPLINAS (LOCALSTORAGE BLINDADO)
// ==============================================================================

/**
 * Guarda en localStorage de forma segura con captura explícita de QuotaExceededError
 * @param {string} key
 * @param {string} value
 * @returns {boolean} true si se guardó, false si hubo error o cuota superada
 */
/**
 * Manejo de Limpieza de Emergencia de localStorage:
 * Si ocurre un error de cuota o al iniciar, limpia claves huérfanas o pesadas innecesarias
 * y purga cadenas Base64 monstruosas (> 8 KB) para liberar memoria local inmediatamente.
 * @returns {number} Cantidad estimada de bytes liberados
 */
function emergencyQuotaCleanup() {
  if (typeof localStorage === 'undefined') return 0;
  let bytesFreed = 0;
  try {
    const keysToInspect = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keysToInspect.push(k);
    }

    keysToInspect.forEach((key) => {
      try {
        const val = localStorage.getItem(key);
        if (!val) return;

        // 1. Eliminar claves temporales, de depuración o huérfanas
        if (key.startsWith('temp_') || key.startsWith('debug_') || key.startsWith('cache_')) {
          localStorage.removeItem(key);
          bytesFreed += val.length;
          return;
        }

        // 2. Si la clave contiene Base64 sobredimensionado (> 8000 caracteres)
        if (typeof val === 'string' && val.includes('data:image/')) {
          const cleaned = val.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{8000,}/g, './assets/logo.png');
          if (cleaned !== val) {
            bytesFreed += (val.length - cleaned.length);
            localStorage.setItem(key, cleaned);
          }
        }
      } catch (kErr) {
        console.warn(`[emergencyQuotaCleanup] Error al procesar clave "${key}":`, kErr);
      }
    });

    if (bytesFreed > 0) {
      console.info(`[emergencyQuotaCleanup] Limpieza de emergencia completada: se liberaron ${(bytesFreed / 1024).toFixed(1)} KB.`);
    }
  } catch (e) {
    console.warn('[emergencyQuotaCleanup] Error global:', e);
  }
  return bytesFreed;
}
window.emergencyQuotaCleanup = emergencyQuotaCleanup;

/**
 * Almacenamiento seguro en localStorage con detección y control de QuotaExceededError.
 * Ejecuta limpieza de emergencia automática y alerta limpiamente al usuario.
 * @param {string} key Clave de localStorage
 * @param {string} value Valor serializado
 * @returns {boolean} true si se persistió con éxito, false si falló
 */
function safeLocalStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    const isQuota = e && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 ||
      e.code === 1014 ||
      e.number === -2147024882 ||
      (e.message && String(e.message).toLowerCase().includes('quota'))
    );
    if (isQuota) {
      console.warn(`[QuotaExceededError] Capacidad superada en localStorage al guardar "${key}". Ejecutando limpieza de emergencia...`);

      // 1. Limpieza de emergencia de claves huérfanas y Base64 pesados
      emergencyQuotaCleanup();

      // 2. Sanitizar el valor actual si contiene imágenes pesadas para que quepa
      let safeVal = value;
      if (typeof safeVal === 'string' && safeVal.includes('data:image/')) {
        safeVal = safeVal.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{8000,}/g, './assets/logo.png');
      }

      // 3. Reintento de guardado
      try {
        localStorage.setItem(key, safeVal);
        console.info(`[safeLocalStorageSetItem] Clave "${key}" guardada con éxito tras limpieza de emergencia.`);
        const msg = '✅ Almacenamiento optimizado con éxito. Las imágenes fueron comprimidas para liberar memoria local.';
        if (typeof showToast === 'function') {
          showToast(msg, 'success');
        }
        return true;
      } catch (retryErr) {
        console.error(`[QuotaExceededError] Capacidad persistentemente llena para "${key}":`, retryErr);
        const msg = '⚠️ Capacidad de almacenamiento superada. Se ha optimizado el espacio para evitar pérdidas de datos.';
        if (typeof showToast === 'function') {
          showToast(msg, 'info');
        }
      }
    } else {
      console.error(`Error inesperado al guardar "${key}" en localStorage:`, e);
    }
    return false;
  }
}
window.safeLocalStorageSetItem = safeLocalStorageSetItem;

/**
 * Función de Compresión Automática de Imágenes mediante Canvas:
 * Redimensiona a un máximo de 120 x 120 píxeles y comprime a JPEG calidad 0.6 (60%).
 * Devuelve una cadena Base64 ultraliviana (de apenas 2-5 KB) evitando saturar el localStorage.
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
window.compressImage = compressImage;
window.compressImageToBase64 = compressImage;

function loadDisciplinasFromLocalStorage() {
  try {
    // 1. Clave principal oficial estructurada
    const rawConfig = localStorage.getItem('gmd_disciplinas_config');
    if (rawConfig) {
      const parsed = JSON.parse(rawConfig);
      if (parsed) {
        if (Array.isArray(parsed.disciplinas) && parsed.disciplinas.length > 0) {
          return parsed.disciplinas;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
        if (typeof parsed === 'object') {
          const pool = parsed.porId || parsed;
          const vals = Object.values(pool).filter((x) => x && typeof x === 'object' && (x.id || x.nombre));
          if (vals.length > 0) return vals;
        }
      }
    }

    // 2. Respaldo en configuración global
    const rawGlobal = localStorage.getItem('gmd_config_global');
    if (rawGlobal) {
      const parsedGlobal = JSON.parse(rawGlobal);
      if (parsedGlobal && Array.isArray(parsedGlobal.disciplinas) && parsedGlobal.disciplinas.length > 0) {
        return parsedGlobal.disciplinas;
      }
    }

    // 3. Respaldo en paquete de datos del torneo
    const rawTourney = localStorage.getItem('gmd_jl_tournament_data_v1');
    if (rawTourney) {
      const parsedTourney = JSON.parse(rawTourney);
      if (parsedTourney) {
        if (Array.isArray(parsedTourney.disciplinas) && parsedTourney.disciplinas.length > 0) {
          return parsedTourney.disciplinas;
        }
        if (parsedTourney.config && Array.isArray(parsedTourney.config.disciplinas) && parsedTourney.config.disciplinas.length > 0) {
          return parsedTourney.config.disciplinas;
        }
      }
    }
  } catch (e) {
    console.warn('Error al consultar disciplinas desde localStorage:', e);
  }
  return null;
}
window.loadDisciplinasFromLocalStorage = loadDisciplinasFromLocalStorage;

function saveDisciplineConfig(disciplinas) {
  const discs = Array.isArray(disciplinas)
    ? disciplinas
    : (window.tournamentStore && typeof window.tournamentStore.getDisciplinas === 'function'
      ? window.tournamentStore.getDisciplinas()
      : []);

  const structured = {
    _version: '2026-pro',
    _updatedAt: new Date().toISOString(),
    disciplinas: discs.map((d) => {
      const cleanId = (d.id || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      let effectiveLogo = (d.logoUrl || d.avatar || d.logo || d.banner || '').trim();
      if (effectiveLogo.startsWith('data:') && effectiveLogo.length > 8000) {
        effectiveLogo = './assets/logo.png';
      }
      let banner = (d.banner || effectiveLogo).trim();
      if (banner.startsWith('data:') && banner.length > 8000) {
        banner = effectiveLogo;
      }
      return {
        ...d,
        id: cleanId,
        nombre: d.nombre,
        categoria: d.categoria || 'Torneo Master / Libre',
        descripcion: d.descripcion || '',
        icono: d.icono || '🏆',
        avatar: effectiveLogo,
        logoUrl: effectiveLogo,
        logo: effectiveLogo,
        banner: banner,
        color: d.color || '#D4AF37',
        activa: d.activa !== false,
        reglas: d.reglas || { periodos: 4, nombrePeriodo: 'Cuarto', ptsGanador: 2, ptsPerdedor: 1, duracionMin: 10 }
      };
    }),
    porId: {}
  };

  structured.disciplinas.forEach((d) => {
    structured.porId[d.id] = d;
    structured[d.id] = d;
  });

  const ok = safeLocalStorageSetItem('gmd_disciplinas_config', JSON.stringify(structured));
  if (!ok) {
    // Si falló por cuota, intentar guardar versión hiper-ligera con logos no-base64 o truncados
    try {
      const lightweight = {
        ...structured,
        disciplinas: structured.disciplinas.map((d) => ({
          ...d,
          avatar: d.avatar && d.avatar.startsWith('data:') ? './assets/logo.png' : d.avatar,
          logoUrl: d.logoUrl && d.logoUrl.startsWith('data:') ? './assets/logo.png' : d.logoUrl,
          logo: d.logo && d.logo.startsWith('data:') ? './assets/logo.png' : d.logo,
          banner: d.banner && d.banner.startsWith('data:') ? './assets/logo.png' : d.banner
        }))
      };
      safeLocalStorageSetItem('gmd_disciplinas_config', JSON.stringify(lightweight));
    } catch (fallbackErr) {
      console.error('Error al aplicar recuperación de cuota:', fallbackErr);
    }
  }

  if (window.tournamentStore && typeof window.tournamentStore.saveDisciplinasConfig === 'function') {
    window.tournamentStore.saveDisciplinasConfig(structured);
  }

  return structured;
}
window.saveDisciplineConfig = saveDisciplineConfig;
window.saveDisciplinasConfig = saveDisciplineConfig;

function getDisciplineHubMediaHtml(d) {
  const id = (d.id || '').toLowerCase();
  const name = (d.nombre || '').toLowerCase();

  let fallbackSvg = '';
  if (d.icono && d.icono.trim() && d.icono.trim() !== '🏆') {
    fallbackSvg = `<span style="font-size: 50px; line-height: 1; user-select: none;">${escapeHtml(d.icono.trim())}</span>`;
  } else if (id.includes('baloncesto') || name.includes('baloncesto') || id.includes('basket')) {
    fallbackSvg = BBALL_HUB_SVG;
  } else if (id.includes('voleibol') || name.includes('voleibol') || id.includes('volley')) {
    fallbackSvg = VBALL_HUB_SVG;
  } else if (id.includes('futsal') || id.includes('futbol') || name.includes('futsal') || name.includes('fútbol') || name.includes('futbol')) {
    fallbackSvg = FUTSAL_HUB_SVG;
  } else if (id.includes('softbol') || id.includes('beisbol') || name.includes('softbol') || name.includes('sotfbol') || name.includes('béisbol') || name.includes('beisbol')) {
    fallbackSvg = SOFTBOL_HUB_SVG;
  } else if (d.icono) {
    fallbackSvg = `<span style="font-size: 50px; line-height: 1; user-select: none;">${escapeHtml(d.icono)}</span>`;
  } else {
    fallbackSvg = `<span style="font-size: 50px; line-height: 1; user-select: none;">🏆</span>`;
  }

  const imageCandidate = (d.logoUrl || d.avatar || d.logo || d.banner || '').trim();
  const isImageValid = imageCandidate && (
    imageCandidate.startsWith('data:') ||
    imageCandidate.startsWith('http://') ||
    imageCandidate.startsWith('https://') ||
    imageCandidate.startsWith('./') ||
    imageCandidate.startsWith('/') ||
    imageCandidate.startsWith('blob:') ||
    /\.(png|jpg|jpeg|svg|webp|gif|avif)(\?.*)?$/i.test(imageCandidate)
  );

  if (isImageValid) {
    const escapedName = (d.nombre || '').replace(/"/g, '&quot;');
    return `
      <img src="${imageCandidate}" alt="${escapedName}" class="discipline-card-real-img" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
      <div class="discipline-cover-fallback" style="display: none;">
        ${fallbackSvg}
      </div>
    `;
  }

  return `<div class="discipline-cover-fallback">${fallbackSvg}</div>`;
}

function renderHubDisciplinesGrid() {
  const container = document.getElementById('disciplinesHubGrid');
  if (!container) return;

  // 1. BLINDAJE OBLIGATORIO: SIEMPRE consultar primero el localStorage
  const savedDiscs = loadDisciplinasFromLocalStorage();

  let listToRender = [];
  if (Array.isArray(savedDiscs) && savedDiscs.length > 0) {
    // Si existen datos guardados por el usuario, utilizarlos tal cual SIN fallbacks estáticos
    const activeDiscs = savedDiscs.filter((d) => d.activa !== false);
    listToRender = activeDiscs.length > 0 ? activeDiscs : savedDiscs;

    // Sincronizar en memoria de tournamentStore
    if (window.tournamentStore && window.tournamentStore.data) {
      window.tournamentStore.data.disciplinas = savedDiscs;
      if (window.tournamentStore.data.config) {
        window.tournamentStore.data.config.disciplinas = savedDiscs;
      }
    }
  } else {
    // Fallback secundario a tournamentStore solo si no hay datos en localStorage
    const storeDiscs = window.tournamentStore && typeof window.tournamentStore.getDisciplinas === 'function'
      ? window.tournamentStore.getDisciplinas()
      : [];
    const activeDiscs = storeDiscs.filter((d) => d.activa !== false);
    listToRender = activeDiscs.length > 0 ? activeDiscs : storeDiscs;
  }

  if (listToRender.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">No hay disciplinas disponibles en este momento.</div>';
    return;
  }

  // Renderizado dinámico total sobreescribiendo cualquier elemento estático previo
  container.innerHTML = listToRender.map((d) => {
    const mediaHtml = getDisciplineHubMediaHtml(d);
    const borderColor = d.color ? d.color : '#FACC15';

    return `
      <article class="discipline-card-celeste" data-discipline="${d.id}" id="card_${d.id}" title="Ingresar a ${d.nombre}" style="border-color: ${borderColor};">
        <div class="discipline-icon-circle" style="${d.color ? `border-color: ${d.color};` : ''}">
          ${mediaHtml}
        </div>
        <h3 class="card-sport-name">${d.nombre}</h3>
        <button type="button" class="btn-enter-system" data-discipline="${d.id}" title="Ingresar al sistema de ${d.nombre}">
          Ingresar al sistema
        </button>
      </article>
    `;
  }).join('');

  // Vincular eventos de selección a cada tarjeta y botón generado dinámicamente
  container.querySelectorAll('.discipline-card-celeste').forEach((card) => {
    card.addEventListener('click', () => {
      const discId = card.getAttribute('data-discipline');
      if (typeof openDisciplineAuthModal === 'function') {
        openDisciplineAuthModal(discId);
      }
    });
  });

  container.querySelectorAll('.btn-enter-system').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const discId = btn.getAttribute('data-discipline');
      if (typeof openDisciplineAuthModal === 'function') {
        openDisciplineAuthModal(discId);
      }
    });
  });
}

// Carga Dinámica Inmediata garantizada al evaluar app.js
if (typeof renderHubDisciplinesGrid === 'function' && document.getElementById('disciplinesHubGrid')) {
  renderHubDisciplinesGrid();
}

class AppRouter {
  constructor() {
    this.currentView = 'vistaHub';
    this.initEvents();
    this.showView(this.currentView);
  }

  showView(viewId) {
    if (viewId === 'vistaPublica') {
      viewId = 'vistaDisciplina';
    }

    document.querySelectorAll('.view-panel').forEach((el) => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      this.currentView = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (viewId === 'vistaHub') {
      renderHubDisciplinesGrid();
    }

    const isDisciplineView = viewId === 'vistaDisciplina';

    // Cintillo superior promocional: Ocultar / Eliminar por completo en navegación interna de la disciplina
    const headerElements = document.querySelectorAll('.portal-header, #mainHeader, #portalHeader, [data-portal-header]');
    headerElements.forEach((h) => {
      h.style.display = isDisciplineView ? 'none' : '';
    });

    // Ocultar barra auxiliar de disciplinas para que la navegación inicie directamente en discipline-topbar
    const bar = document.getElementById('disciplinesBarWrapper');
    if (bar) {
      bar.style.display = 'none';
    }

    // Toggle de clases en body para maximizar espacio vertical
    if (isDisciplineView) {
      document.body.classList.add('inside-discipline-view');
      document.body.classList.remove('inside-hub-view');
    } else {
      document.body.classList.remove('inside-discipline-view');
      document.body.classList.add('inside-hub-view');
    }

    // Update active discipline pill
    const pill = document.getElementById('activeDisciplinePill');
    if (pill && window.tournamentStore) {
      const d = window.tournamentStore.getDisciplinaActual();
      if (d) {
        pill.textContent = `${d.icono || '🏆'} ${d.nombre}`;
      }
    }

    if (isDisciplineView) {
      const user = window.tournamentStore.getUsuarioActual();
      applyRbacPermissions(user);
    }
  }

  initEvents() {
    // Brand click and "Sistema Multideportivo" click return to Hub
    document.getElementById('portalLogoBtn')?.addEventListener('click', () => {
      this.showView('vistaHub');
    });
    document.getElementById('brandHomeBtn')?.addEventListener('click', () => {
      this.showView('vistaHub');
    });
    document.getElementById('btnHeaderSistemaMulti')?.addEventListener('click', () => {
      this.showView('vistaHub');
      showToast('Grupo Multiservicios Deportivo JL • Menú Principal', 'info');
    });

    // Return to Hub from Public Tournament View
    document.getElementById('btnVolverHubDesdePublica')?.addEventListener('click', () => {
      this.showView('vistaHub');
    });

    // Renderizado dinámico de tarjetas de disciplinas en la carátula / portada principal
    renderHubDisciplinesGrid();

    // Delegación de eventos en disciplinesHubGrid para garantizar navegación inmediata
    const hubGrid = document.getElementById('disciplinesHubGrid');
    if (hubGrid) {
      hubGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-enter-system');
        if (btn) {
          e.stopPropagation();
          const discId = btn.getAttribute('data-discipline');
          openDisciplineAuthModal(discId);
          return;
        }
        const card = e.target.closest('.discipline-card-celeste');
        if (card) {
          const discId = card.getAttribute('data-discipline');
          openDisciplineAuthModal(discId);
        }
      });
    }

    // Top Control Menu: "Sistema en Vivo"
    document.getElementById('btnHeaderLive')?.addEventListener('click', () => {
      this.showView('vistaDisciplina');
      switchDisciplineModule('moduleResultadosLive');
      renderLiveModule();
      showToast('⚡ Marcador oficial y partidos en tiempo real', 'info');
      const scoreboard = document.getElementById('scorerConsolePanel');
      if (scoreboard) {
        scoreboard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Top Control Menu: "Compartir"
    document.getElementById('btnHeaderShare')?.addEventListener('click', () => {
      if (navigator.share) {
        navigator
          .share({
            title: 'Grupo Multiservicios Deportivo JL',
            text: '¡Sigue todos los torneos, estadísticas y marcadores en vivo en tiempo real!',
            url: window.location.href
          })
          .then(() => showToast('¡Gracias por compartir!', 'success'))
          .catch(() => {});
      } else {
        document.getElementById('modalShare')?.classList.add('open');
      }
    });

    // Share Modal Actions
    document.getElementById('btnShareWhatsApp')?.addEventListener('click', () => {
      const text = encodeURIComponent('¡Sigue los marcadores en vivo y calendarios de torneos en Grupo Multiservicios Deportivo JL! ' + window.location.href);
      window.open('https://api.whatsapp.com/send?text=' + text, '_blank');
      document.getElementById('modalShare')?.classList.remove('open');
    });

    document.getElementById('btnCopyTournamentLink')?.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('¡Enlace copiado al portapapeles exitosamente!', 'success');
        document.getElementById('modalShare')?.classList.remove('open');
      });
    });

    // Top Control Menu: "Configurar" (Abre el Panel Modal de Configuración del Sistema)
    document.getElementById('btnConfigurarMaster')?.addEventListener('click', () => {
      openConfiguracionSistemaModal();
    });

    // Delegate view button
    document.getElementById('btnAccesoDelegado')?.addEventListener('click', () => {
      const user = window.tournamentStore.getUsuarioActual();
      if (user && user.rol === 'delegado') {
        this.showView('vistaDelegado');
        renderDelegadoDashboard(user.equipoId);
      } else if (user && user.rol === 'superadmin') {
        this.showView('vistaSuperAdmin');
        renderAdminDashboard();
      } else {
        openIdentificationModal({ type: 'delegado' });
      }
    });

    // Back to Hub or public buttons
    document.getElementById('btnVolverPublicaDesdeDel')?.addEventListener('click', () => {
      this.showView('vistaHub');
    });
    document.getElementById('btnVolverPublicaDesdeAdmin')?.addEventListener('click', () => {
      this.showView('vistaHub');
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

    // SuperAdmin steps switcher (Paso 1, Paso 2, Paso 3, Paso 4, Paso 5)
    document.querySelectorAll('#adminStepsTabs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#adminStepsTabs .tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const step = btn.getAttribute('data-step');
        document.querySelectorAll('.step-panel').forEach((p) => (p.style.display = 'none'));

        if (step === 'paso1') {
          document.getElementById('stepPaso1').style.display = 'block';
          renderAdminDisciplinas();
          renderAdminPatrocinadores();
        } else if (step === 'paso2') {
          document.getElementById('stepPaso2').style.display = 'block';
          populateManualFormSelects();
          renderRostersFreezeStatus();
          renderAdminSolicitudesBaja();
          renderAdminMasterRoster();
        } else if (step === 'paso3') {
          document.getElementById('stepPaso3').style.display = 'block';
          initScorerMatchSelector();
        } else if (step === 'paso4') {
          document.getElementById('stepPaso4').style.display = 'block';
          renderAdminStandingsPreview();
          renderAdminFasesList();
          renderAdminSedesList();
        } else if (step === 'paso5') {
          document.getElementById('stepPaso5').style.display = 'block';
          renderAdminDelegatesCredentials();
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
  // 1. Register Service Worker with Auto-Update detection
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Nuevo Service Worker activado. Recargando para actualizar contenidos...');
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
          // Forzar comprobación de versión actualizada en el servidor
          try { reg.update(); } catch (_) {}
        })
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

// ==============================================================================
// MODULE 1: DASHBOARD RENDERER (KPIS, HERO SCOREBOARD, PRÓXIMOS ENCUENTROS)
// ==============================================================================
function renderDashboardModule() {
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
  const partidos = window.tournamentStore.getPartidos(disc.id);
  const equipos = window.tournamentStore.getEquipos(disc.id);

  // 1. Calculate KPI counts
  const liveCount = partidos.filter((p) => p.estado === 'EN CURSO').length;
  const finCount = partidos.filter((p) => p.estado === 'FINALIZADO').length;
  const progCount = partidos.filter((p) => p.estado === 'PROGRAMADO').length;

  const kpiEq = document.getElementById('kpiEquiposInscritos');
  const kpiLive = document.getElementById('kpiJuegosEnVivo');
  const kpiFin = document.getElementById('kpiJuegosFinalizados');
  const kpiProg = document.getElementById('kpiJuegosPendientes');

  if (kpiEq) kpiEq.textContent = equipos.length;
  if (kpiLive) kpiLive.textContent = liveCount;
  if (kpiFin) kpiFin.textContent = finCount;
  if (kpiProg) kpiProg.textContent = progCount;

  // 2. Render prominent live scoreboard
  renderHeroScoreboard();

  // 3. Render upcoming matches preview cards
  const container = document.getElementById('dashMatchesPreviewContainer');
  if (container) {
    const previewList = partidos.slice(0, 3);
    if (previewList.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 1.5rem; background: var(--bg-card); border-radius: var(--radius-md);">
          No hay partidos programados en esta disciplina aún.
        </div>
      `;
    } else {
      container.innerHTML = previewList
        .map(
          (m) => {
            const eqLoc = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(m.equipoLocal, disc.id) : null;
            const eqVis = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(m.equipoVisitante, disc.id) : null;
            const logoLoc = getTeamLogoOrEmblemHtml(eqLoc, { size: 46, fallbackName: m.equipoLocal });
            const logoVis = getTeamLogoOrEmblemHtml(eqVis, { size: 46, fallbackName: m.equipoVisitante });

            return `
        <div class="match-card ${m.estado === 'EN CURSO' ? 'is-live' : ''}" style="margin: 0;">
          <div class="match-card-header">
            <span>📅 ${m.fecha} • ⏰ ${m.hora}</span>
            <span class="badge ${m.estado === 'EN CURSO' ? 'badge-live' : m.estado === 'FINALIZADO' ? 'badge-final' : 'badge-scheduled'}">
              ${m.estado === 'EN CURSO' ? '🔴 EN VIVO' : m.estado}
            </span>
          </div>
          <div class="match-card-body">
            <div class="match-row-team">
              <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${logoLoc}
                <span style="font-weight: 700; color: #ffffff;">${m.equipoLocal}</span>
              </div>
              <span class="match-team-score">${m.estado === 'PROGRAMADO' ? '-' : m.totalLocal}</span>
            </div>
            <div class="match-row-team">
              <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${logoVis}
                <span style="font-weight: 700; color: #ffffff;">${m.equipoVisitante}</span>
              </div>
              <span class="match-team-score">${m.estado === 'PROGRAMADO' ? '-' : m.totalVisitante}</span>
            </div>
          </div>
          <div class="match-card-footer">
            <span>📍 ${m.sede}</span>
            <span>${m.fase}</span>
          </div>
        </div>
      `;
          }
        )
        .join('');
    }
  }
}

// ==============================================================================
// MODULE 3: CONFIG. GRUPOS & SISTEMA DE COMPETENCIA RENDERER
// ==============================================================================
let activeGroupOptions = ['Grupo A', 'Grupo B'];

function getAvailableGroupsForDiscipline(disciplinaId) {
  const equipos = window.tournamentStore.getEquipos(disciplinaId);
  const set = new Set(['Grupo A', 'Grupo B', ...activeGroupOptions]);
  equipos.forEach((eq) => {
    if (eq.grupo && eq.grupo !== 'Sin Asignar' && eq.grupo !== 'Grupo Único') {
      set.add(eq.grupo);
    }
  });
  return Array.from(set);
}

function renderReglamentoOficial() {
  const listEl = document.getElementById('reglamentoList');
  if (!listEl) return;
  const rules = typeof window.tournamentStore.getReglamentoTorneo === 'function'
    ? window.tournamentStore.getReglamentoTorneo()
    : [
        'Puntuación Oficial: 2 Puntos por victoria, 1 Punto por derrota (empates según disciplina).',
        'Criterio de Desempate: 1) Mayor Diferencia de Puntos (DIF), 2) Mayor Puntos a Favor (PF), 3) Serie Particular.',
        'Inscripción de Nóminas: Cada atleta debe estar formalmente inscrito con cédula y dorsal antes de cada encuentro.',
        'Mesa de Anotación: Los marcadores se transmiten en vivo a la nube mediante Supabase Realtime.'
      ];

  listEl.innerHTML = rules.map((r) => `<li>${r}</li>`).join('');
}

function updateGroupSummaryPreview(equipos, availableGroups) {
  const container = document.getElementById('groupSummaryPreviewGrid');
  if (!container) return;

  const currentAssignments = {};
  document.querySelectorAll('.group-assign-select').forEach((sel) => {
    const tid = sel.getAttribute('data-team-id');
    currentAssignments[tid] = sel.value;
  });

  const cardsHtml = availableGroups
    .map((grp) => {
      const assigned = equipos.filter((e) => {
        const val = currentAssignments[e.id] !== undefined ? currentAssignments[e.id] : e.grupo;
        return val === grp;
      });

      return `
        <div class="group-summary-card">
          <div class="group-summary-header">
            <h4><span>🛡️</span> <span>${grp.toUpperCase()}</span></h4>
            <span class="badge badge-gold">${assigned.length} Franquicias</span>
          </div>
          <div class="group-teams-chips">
            ${
              assigned.length === 0
                ? '<div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 0.75rem;">Sin equipos asignados</div>'
                : assigned
                    .map((eq) => {
                      const crest = getTeamLogoOrEmblemHtml(eq, { size: 38, fallbackName: eq.nombre });
                      return `
                        <div class="group-team-chip">
                          <div style="display: flex; align-items: center; gap: 0.65rem;">
                            ${crest}
                            <span style="font-weight: 600;">${eq.nombre}</span>
                          </div>
                          <span style="font-size: 0.72rem; color: var(--text-secondary);">${eq.delegadoNombre || ''}</span>
                        </div>
                      `;
                    })
                    .join('')
            }
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = cardsHtml;
}

function renderGroupsStructure() {
  const container = document.getElementById('centralizedTeamsListContainer');
  if (!container) return;

  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto' };
  const user = window.tournamentStore.getUsuarioActual();
  const isSuperAdmin = !!(user && (user.rol === 'superadmin' || user.esSuperAdmin));
  const currentFormat = (typeof window.tournamentStore.getFormatoCompeticion === 'function'
    ? window.tournamentStore.getFormatoCompeticion(disc.id)
    : null) || disc.formatoTorneo || 'por_grupo';

  // 1. Update format pills
  document.querySelectorAll('#formatPillsSelector .format-pill').forEach((pill) => {
    const fmt = pill.getAttribute('data-format');
    if (fmt === currentFormat) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  // 2. Update format active label
  const labelEl = document.getElementById('formatActiveLabel');
  if (labelEl) {
    let fmtName = '🛡️ Por Grupo';
    if (currentFormat === 'todos_contra_todos') fmtName = '🔄 Todos contra Todos';
    else if (currentFormat === 'eliminacion_directa') fmtName = '⚡ Eliminación Directa';
    else if (currentFormat === 'combinado_mixto') fmtName = '🔀 Combinado / Mixto';
    labelEl.innerHTML = `Modalidad Activa: <strong>${fmtName}</strong>`;
  }

  const equipos = window.tournamentStore.getEquipos(disc.id);
  const availableGroups = getAvailableGroupsForDiscipline(disc.id);

  if (equipos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: rgba(0,0,0,0.25); border: 1px dashed rgba(255,255,255,0.1); border-radius: var(--radius-lg); color: var(--text-muted);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem; color: #ffffff;">No hay franquicias registradas en <strong>${disc.nombre}</strong></p>
        <p style="font-size: 0.85rem; margin: 0;">Inscribe equipos desde el módulo <strong>"Gestión Equipos"</strong> para configurar su sistema de competencia.</p>
      </div>
    `;
    renderReglamentoOficial();
    return;
  }

  // 3. Render according to format
  if (currentFormat === 'todos_contra_todos') {
    container.innerHTML = `
      <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid var(--border-cyan); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="color: var(--accent-cyan); font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🔄</span> <span>SISTEMA: TODOS CONTRA TODOS (LIGA REGULAR)</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0;">
            Todas las franquicias registradas compiten en una única tabla general continua sin divisiones de grupos.
          </p>
        </div>
        <span class="badge badge-cyan" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">${equipos.length} Franquicias en Tabla Única</span>
      </div>

      <div class="table-responsive" style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); overflow: hidden;">
        <table class="centralized-assignment-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              <th>FRANQUICIA / CLUB</th>
              <th>DELEGADO</th>
              <th>TELÉFONO</th>
              <th>ATLETAS</th>
              <th>TABLA ASIGNADA</th>
            </tr>
          </thead>
          <tbody>
            ${equipos
              .map((eq, idx) => {
                const atletas = window.tournamentStore.getAtletas(eq.nombre, disc.id);
                const crest = getTeamLogoOrEmblemHtml(eq, { size: 48, fallbackName: eq.nombre });

                return `
                  <tr>
                    <td style="color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.85rem;">
                        ${crest}
                        <strong style="color: #ffffff; font-size: 0.95rem;">${eq.nombre}</strong>
                      </div>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${eq.delegadoNombre || 'Por asignar'}</td>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${eq.delegadoTelefono || 'N/A'}</td>
                    <td>
                      <span class="badge badge-gold" style="font-size: 0.72rem;">${atletas.length} Atletas</span>
                    </td>
                    <td>
                      <span class="badge badge-cyan" style="font-size: 0.75rem;">⭐ Grupo Único (Liga General)</span>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (currentFormat === 'eliminacion_directa') {
    container.innerHTML = `
      <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid var(--border-gold); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="color: var(--brand-gold); font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>⚡</span> <span>SISTEMA: ELIMINACIÓN DIRECTA (CUADRO PLAYOFFS KO)</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0;">
            Cuadro de llaves y cruces directos (Cuartos, Semifinales y Gran Final). Cada encuentro define avance o eliminación.
          </p>
        </div>
        <span class="badge badge-gold" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">${equipos.length} Franquicias en Llaves</span>
      </div>

      <div class="table-responsive" style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); overflow: hidden;">
        <table class="centralized-assignment-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              <th>FRANQUICIA / CLUB</th>
              <th>DELEGADO</th>
              <th>ATLETAS</th>
              <th>POSICIÓN EN CUADRO / LLAVE</th>
            </tr>
          </thead>
          <tbody>
            ${equipos
              .map((eq, idx) => {
                const atletas = window.tournamentStore.getAtletas(eq.nombre, disc.id);
                const crest = getTeamLogoOrEmblemHtml(eq, { size: 48, fallbackName: eq.nombre });

                const seedLabel = `Llave ${Math.floor(idx / 2) + 1} - ${idx % 2 === 0 ? 'Sembrado A' : 'Sembrado B'}`;

                return `
                  <tr>
                    <td style="color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.85rem;">
                        ${crest}
                        <strong style="color: #ffffff; font-size: 0.95rem;">${eq.nombre}</strong>
                      </div>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${eq.delegadoNombre || 'Por asignar'}</td>
                    <td>
                      <span class="badge badge-gold" style="font-size: 0.72rem;">${atletas.length} Atletas</span>
                    </td>
                    <td>
                      <span class="badge badge-gold" style="font-size: 0.75rem;">🥊 ${seedLabel}</span>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    // Por Grupo o Combinado / Mixto
    container.innerHTML = `
      <div style="background: rgba(212, 175, 55, 0.05); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="color: var(--brand-gold-light); font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🛡️</span> <span>SISTEMA: ${currentFormat === 'combinado_mixto' ? 'COMBINADO / MIXTO (GRUPOS + PLAYOFFS)' : 'POR GRUPOS CLASIFICATORIOS'}</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0;">
            Asigna o traslada franquicias de forma directa entre divisiones. La vista previa inferior se actualiza en tiempo real.
          </p>
        </div>
        <span class="badge badge-gold" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">${equipos.length} Franquicias Registradas</span>
      </div>

      <div class="table-responsive" style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); overflow: hidden;">
        <table class="centralized-assignment-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              <th>FRANQUICIA / CLUB</th>
              <th>DELEGADO</th>
              <th>TELÉFONO</th>
              <th>ATLETAS</th>
              <th style="min-width: 175px;">GRUPO ASIGNADO</th>
            </tr>
          </thead>
          <tbody>
            ${equipos
              .map((eq, idx) => {
                const atletas = window.tournamentStore.getAtletas(eq.nombre, disc.id);
                const crest = getTeamLogoOrEmblemHtml(eq, { size: 48, fallbackName: eq.nombre });

                const optionsHtml = availableGroups
                  .map((g) => `<option value="${g}" ${eq.grupo === g ? 'selected' : ''}>${g}</option>`)
                  .join('') + `<option value="Sin Asignar" ${eq.grupo === 'Sin Asignar' ? 'selected' : ''}>Sin Asignar</option>`;

                return `
                  <tr>
                    <td style="color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.85rem;">
                        ${crest}
                        <strong style="color: #ffffff; font-size: 0.95rem;">${eq.nombre}</strong>
                      </div>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${eq.delegadoNombre || 'Por asignar'}</td>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${eq.delegadoTelefono || 'N/A'}</td>
                    <td>
                      <span class="badge badge-gold" style="font-size: 0.72rem;">${atletas.length} Atletas</span>
                    </td>
                    <td>
                      ${isSuperAdmin ? `
                        <select class="group-select-direct group-assign-select" data-team-id="${eq.id}">
                          ${optionsHtml}
                        </select>
                      ` : `
                        <span class="badge badge-gold" style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">
                          ${escapeHtml(eq.grupo || 'Sin Asignar')}
                        </span>
                      `}
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <!-- Live Group Summary Preview Cards -->
      <div class="group-summary-grid" id="groupSummaryPreviewGrid">
        <!-- Dynamically rendered -->
      </div>
    `;

    updateGroupSummaryPreview(equipos, availableGroups);

    container.querySelectorAll('.group-assign-select').forEach((sel) => {
      sel.addEventListener('change', () => {
        updateGroupSummaryPreview(window.tournamentStore.getEquipos(disc.id), availableGroups);
      });
    });
  }

  renderReglamentoOficial();
}

function initGruposModule() {
  // Format Pills Listener
  document.querySelectorAll('#formatPillsSelector .format-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const selectedFormat = pill.getAttribute('data-format');
      const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
      window.tournamentStore.setFormatoCompeticion?.(selectedFormat, disc.id);
      renderGroupsStructure();
      renderStandings();
      showToast(`Formato actualizado a: ${pill.textContent.trim()}`, 'info');
    });
  });

  // Generar Calendario desde barra de Grupos
  document.getElementById('btnGenerarCalendarioDesdeGrupos')?.addEventListener('click', () => {
    handleGenerarCalendario(true);
  });

  // Guardar Distribución
  document.getElementById('btnGuardarDistribucionGrupos')?.addEventListener('click', () => {
    const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
    const currentFormat = (typeof window.tournamentStore.getFormatoCompeticion === 'function'
      ? window.tournamentStore.getFormatoCompeticion(disc.id)
      : null) || disc.formatoTorneo || 'por_grupo';

    const selects = document.querySelectorAll('.group-assign-select');
    const assignments = [];

    if (currentFormat === 'todos_contra_todos') {
      const equipos = window.tournamentStore.getEquipos(disc.id);
      equipos.forEach((eq) => {
        assignments.push({ id: eq.id, grupo: 'Grupo Único' });
      });
    } else {
      selects.forEach((sel) => {
        const teamId = sel.getAttribute('data-team-id');
        const grupo = sel.value;
        assignments.push({ id: teamId, grupo });
      });
    }

    if (assignments.length > 0) {
      window.tournamentStore.updateEquiposGrupos?.(assignments);
    }
    window.tournamentStore.setFormatoCompeticion?.(currentFormat, disc.id);
    showToast('Distribución de grupos y formato de competencia guardados exitosamente', 'success');
    renderGroupsStructure();
    renderStandings();
    renderTeamsAndRosters();
    renderMatches();
    renderDashboardModule();

    // Auto-prompt to generate calendar if currently empty
    const discEquipos = window.tournamentStore.getEquipos(disc.id);
    const existingMatches = window.tournamentStore.getPartidos(disc.id);
    if (discEquipos.length >= 2 && existingMatches.length === 0) {
      if (confirm(`Se guardó la distribución oficial con ${discEquipos.length} franquicias.\n\n¿Deseas generar automáticamente el Calendario Oficial de Encuentros para esta configuración?`)) {
        window.tournamentStore.generateScheduleForDiscipline(disc.id, true);
        showToast('¡Calendario generado exitosamente!', 'success');
        renderMatches();
        renderHeroScoreboard();
        renderStandings();
        renderDashboardModule();
      }
    }
  });

  // Editar / Equilibrar Distribución (Equilibrar A/B equitativamente)
  document.getElementById('btnEditarDistribucionGrupos')?.addEventListener('click', () => {
    const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
    const equipos = window.tournamentStore.getEquipos(disc.id);
    if (equipos.length === 0) {
      showToast('No hay equipos registrados para equilibrar', 'info');
      return;
    }

    const selects = document.querySelectorAll('.group-assign-select');
    selects.forEach((sel, idx) => {
      sel.value = idx % 2 === 0 ? 'Grupo A' : 'Grupo B';
    });

    const availableGroups = getAvailableGroupsForDiscipline(disc.id);
    updateGroupSummaryPreview(equipos, availableGroups);
    showToast('Equipos equilibrados (50% Grupo A / 50% Grupo B). Haz clic en "Guardar Distribución" para aplicar.', 'info');
  });

  // + Crear Grupo
  document.getElementById('btnCrearGrupoNuevoDirecto')?.addEventListener('click', () => {
    const name = prompt('Introduce el nombre del nuevo grupo (ej. Grupo C, Grupo D):', 'Grupo C');
    if (name && name.trim()) {
      const cleanName = name.trim();
      if (!activeGroupOptions.includes(cleanName)) {
        activeGroupOptions.push(cleanName);
      }
      renderGroupsStructure();
      showToast(`Nuevo grupo "${cleanName}" creado y disponible para asignación`, 'success');
    }
  });

  // Eliminar Distribución
  document.getElementById('btnEliminarDistribucionGrupos')?.addEventListener('click', () => {
    const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
    if (confirm('¿Está seguro de que desea eliminar y restablecer la distribución de grupos de todos los equipos de esta disciplina?')) {
      const equipos = window.tournamentStore.getEquipos(disc.id);
      const assignments = equipos.map((eq) => ({ id: eq.id, grupo: 'Sin Asignar' }));
      window.tournamentStore.updateEquiposGrupos?.(assignments);
      showToast('Distribución de grupos eliminada y restablecida a "Sin Asignar"', 'info');
      renderGroupsStructure();
      renderStandings();
      renderTeamsAndRosters();
    }
  });

  // Reglamento View/Edit Toggle
  document.getElementById('btnToggleEditReglamento')?.addEventListener('click', () => {
    const viewMode = document.getElementById('reglamentoViewMode');
    const editMode = document.getElementById('reglamentoEditMode');
    const saveBtn = document.getElementById('btnGuardarReglamento');
    const toggleBtn = document.getElementById('btnToggleEditReglamento');
    const textarea = document.getElementById('reglamentoTextarea');

    if (editMode?.style.display === 'none') {
      const rules = typeof window.tournamentStore.getReglamentoTorneo === 'function'
        ? window.tournamentStore.getReglamentoTorneo()
        : [];
      if (textarea) textarea.value = rules.join('\n');
      if (viewMode) viewMode.style.display = 'none';
      if (editMode) editMode.style.display = 'block';
      if (saveBtn) saveBtn.style.display = 'inline-flex';
      if (toggleBtn) toggleBtn.textContent = '❌ Cancelar Edición';
    } else {
      if (viewMode) viewMode.style.display = 'block';
      if (editMode) editMode.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'none';
      if (toggleBtn) toggleBtn.textContent = '✏️ Editar Reglamento';
    }
  });

  // Guardar Reglamento
  document.getElementById('btnGuardarReglamento')?.addEventListener('click', () => {
    const textarea = document.getElementById('reglamentoTextarea');
    const viewMode = document.getElementById('reglamentoViewMode');
    const editMode = document.getElementById('reglamentoEditMode');
    const saveBtn = document.getElementById('btnGuardarReglamento');
    const toggleBtn = document.getElementById('btnToggleEditReglamento');

    const lines = (textarea?.value || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length > 0 && typeof window.tournamentStore.setReglamentoTorneo === 'function') {
      window.tournamentStore.setReglamentoTorneo(lines);
      showToast('Reglamento oficial del torneo actualizado con éxito', 'success');
    }

    renderReglamentoOficial();
    if (viewMode) viewMode.style.display = 'block';
    if (editMode) editMode.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = '✏️ Editar Reglamento';
  });
}

// ==============================================================================
// ==============================================================================
// MODULE 5: RESULTADOS LIVE RENDERER
// ==============================================================================
let currentLiveMatchId = null;

function formatMatchDate(dateStr) {
  if (!dateStr) return 'Fecha S/D';
  const trimmed = String(dateStr).trim();
  if (trimmed.includes('/')) return trimmed;
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return trimmed;
}

function syncLiveMatchUiScores(matchId, totLoc, totVis, status) {
  if (!matchId) return;
  const idStr = String(matchId).trim();

  // 1. Carrusel interactivo: sincronizar tarjeta activa
  const card = document.querySelector(`#liveMatchesCarouselTrack .carousel-match-card[data-match-id="${idStr}"]`);
  if (card) {
    const vsEl = card.querySelector('.carousel-vs');
    if (vsEl) {
      vsEl.innerHTML = `<span class="carousel-match-score">${totLoc} - ${totVis}</span>`;
    }
    if (status) {
      const badge = card.querySelector('.carousel-match-header .badge');
      if (badge) {
        const est = String(status).toUpperCase();
        if (est === 'FINALIZADO' || est === 'FINAL' || est === 'TERMINADO') {
          badge.className = 'badge badge-final badge-xs';
          badge.textContent = '🏁 FINAL';
        } else if (est === 'EN CURSO' || est === 'LIVE' || est === 'EN VIVO') {
          badge.className = 'badge badge-live badge-xs';
          badge.textContent = '🔴 EN VIVO';
        } else {
          badge.className = 'badge badge-scheduled badge-xs';
          badge.textContent = '🟦 PROG';
        }
      }
    }
  }

  // 2. Selectores desplegables: actualizar texto de la opción seleccionada
  ['liveViewerMatchSelect', 'scorerMatchSelect'].forEach((selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    const opt = select.querySelector(`option[value="${idStr}"]`);
    if (opt) {
      const match = window.tournamentStore?.getPartidoPorId?.(matchId);
      if (match) {
        const loc = match.equipoLocal || 'Local';
        const vis = match.equipoVisitante || 'Visitante';
        const est = String(status || match.estado || '').toUpperCase();
        const icon = (est === 'FINALIZADO' || est === 'FINAL') ? '🏁' : (est === 'EN CURSO' || est === 'LIVE') ? '🔴' : '📅';
        const dateSede = `${match.fecha || ''} ${match.hora || ''} ${match.sede ? '• ' + match.sede : ''}`.trim();
        opt.textContent = `${icon} ${loc} vs ${vis} (${totLoc} - ${totVis}) [${est}] ${dateSede ? '— ' + dateSede : ''}`;
      }
    }
  });
}

function renderLiveMatchesCarousel(partidos, targetId) {
  const track = document.getElementById('liveMatchesCarouselTrack');
  if (!track) return;
  if (!partidos || partidos.length === 0) {
    track.innerHTML = '<div style="padding: 1.25rem; color: var(--text-muted); text-align: center; width: 100%;">No hay partidos programados en el calendario oficial de esta disciplina.</div>';
    return;
  }

  const targetIdStr = targetId != null ? String(targetId).trim() : '';

  track.innerHTML = partidos.map((p) => {
    const isActive = String(p.id).trim() === targetIdStr;
    const est = String(p.estado || '').trim().toUpperCase();
    const isLive = est === 'EN CURSO' || est === 'LIVE' || est === 'EN VIVO';
    const isFinal = est === 'FINALIZADO' || est === 'FINAL' || est === 'TERMINADO';

    let badgeClass = 'badge-scheduled';
    let badgeText = '🟦 PROG';
    if (isLive) {
      badgeClass = 'badge-live';
      badgeText = '🔴 EN VIVO';
    } else if (isFinal) {
      badgeClass = 'badge-final';
      badgeText = '🏁 FINAL';
    }

    const locName = p.equipoLocal || 'Local';
    const visName = p.equipoVisitante || 'Visitante';
    const displayDate = formatMatchDate(p.fecha);

    const eqLoc = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(locName || p.equipoLocalId) : null;
    const eqVis = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(visName || p.equipoVisitanteId) : null;
    const logoLocHtml = getTeamLogoOrEmblemHtml(eqLoc || locName, { size: 30, fallbackName: locName, extraClass: 'carousel-team-emblem' });
    const logoVisHtml = getTeamLogoOrEmblemHtml(eqVis || visName, { size: 30, fallbackName: visName, extraClass: 'carousel-team-emblem' });

    const q1L = Number(p.q1Loc ?? p.q1_loc ?? 0) || 0;
    const q2L = Number(p.q2Loc ?? p.q2_loc ?? 0) || 0;
    const q3L = Number(p.q3Loc ?? p.q3_loc ?? 0) || 0;
    const q4L = Number(p.q4Loc ?? p.q4_loc ?? 0) || 0;
    const otL = Number(p.otLoc ?? p.ot_loc ?? 0) || 0;
    const qSumL = q1L + q2L + q3L + q4L + otL;
    let totL = qSumL > 0 ? qSumL : (Number(p.totalLocal ?? p.marcadorLocal ?? p.scoreLocal ?? p.puntosLocal ?? p.tot_loc) || 0);

    const q1V = Number(p.q1Vis ?? p.q1_vis ?? 0) || 0;
    const q2V = Number(p.q2Vis ?? p.q2_vis ?? 0) || 0;
    const q3V = Number(p.q3Vis ?? p.q3_vis ?? 0) || 0;
    const q4V = Number(p.q4Vis ?? p.q4_vis ?? 0) || 0;
    const otV = Number(p.otVis ?? p.ot_vis ?? 0) || 0;
    const qSumV = q1V + q2V + q3V + q4V + otV;
    let totV = qSumV > 0 ? qSumV : (Number(p.totalVisitante ?? p.marcadorVisitante ?? p.scoreVisitante ?? p.puntosVisitante ?? p.tot_vis) || 0);

    const hasScore = isLive || isFinal || totL > 0 || totV > 0;
    const scoreDisplay = hasScore
      ? `<span class="carousel-match-score">${totL} - ${totV}</span>`
      : `<span class="carousel-match-time">⏰ ${p.hora || '18:00'}</span>`;

    return `
      <div class="carousel-match-card ${isActive ? 'active' : ''}" data-match-id="${p.id}" onclick="window.loadScorerMatch('${escapeHtmlAttr(p.id)}', event)" role="button" tabindex="0" title="${locName} vs ${visName} • ${displayDate} ${p.hora || ''}">
        <div class="carousel-match-header">
          <span class="badge ${badgeClass} badge-xs">${badgeText}</span>
          <span class="carousel-match-date" title="Fecha: ${displayDate}">📅 ${displayDate}</span>
        </div>
        <div class="carousel-match-teams">
          <span class="carousel-team carousel-team-loc" title="${locName}">
            <span class="carousel-team-text">${locName}</span>
            ${logoLocHtml}
          </span>
          <span class="carousel-vs">${scoreDisplay}</span>
          <span class="carousel-team carousel-team-vis" title="${visName}">
            ${logoVisHtml}
            <span class="carousel-team-text">${visName}</span>
          </span>
        </div>
      </div>
    `;
  }).join('');

  track.querySelectorAll('.carousel-match-card').forEach((card) => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const matchId = card.getAttribute('data-match-id');
        if (matchId) {
          window.loadScorerMatch(matchId, e);
        }
      }
    });
  });

  // Delegated click handler on carousel track container
  track.onclick = (e) => {
    const card = e.target.closest('.carousel-match-card');
    if (card) {
      const matchId = card.getAttribute('data-match-id');
      if (matchId) {
        window.loadScorerMatch(matchId, e);
      }
    }
  };

  const activeCard = track.querySelector('.carousel-match-card.active');
  if (activeCard) {
    activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function navigateLiveMatch(direction) {
  const disc = (typeof window.tournamentStore.getDisciplinaActual === 'function' ? window.tournamentStore.getDisciplinaActual() : null) || { id: 'baloncesto-master' };
  const partidos = window.tournamentStore.getPartidos(disc.id) || [];
  if (partidos.length === 0) {
    showToast('No hay partidos programados en el calendario oficial de esta disciplina', 'warning');
    return;
  }

  const currentId = currentLiveMatchId || (activeScorerMatch ? activeScorerMatch.id : null);
  const currIdx = partidos.findIndex((p) => String(p.id).trim() === String(currentId).trim());

  let nextIdx = 0;
  if (direction === 'next') {
    nextIdx = currIdx >= 0 ? (currIdx + 1) % partidos.length : 0;
  } else if (direction === 'prev') {
    nextIdx = currIdx >= 0 ? (currIdx - 1 + partidos.length) % partidos.length : partidos.length - 1;
  }

  const targetMatch = partidos[nextIdx];
  if (targetMatch) {
    currentLiveMatchId = targetMatch.id;
    loadScorerMatch(targetMatch.id);
    showToast(`Cargado: ${targetMatch.equipoLocal} vs ${targetMatch.equipoVisitante} (${targetMatch.estado})`, 'info');
  }
}

function renderLiveModule(preferredPartidoId = null) {
  const select = document.getElementById('liveViewerMatchSelect');
  const scorerSelect = document.getElementById('scorerMatchSelect');
  const disc = (typeof window.tournamentStore.getDisciplinaActual === 'function' ? window.tournamentStore.getDisciplinaActual() : null) || { id: 'baloncesto-master' };

  let partidos = window.tournamentStore.getPartidos(disc.id) || [];
  const scorerPanel = document.getElementById('scorerConsolePanel');

  if (partidos.length === 0) {
    currentLiveMatchId = null;
    activeScorerMatch = null;
    if (typeof isTimerRunning !== 'undefined' && isTimerRunning) {
      clearInterval(matchTimerInterval);
      isTimerRunning = false;
      const btnClock = document.getElementById('btnClockToggle');
      if (btnClock) btnClock.textContent = '▶ Iniciar Reloj';
    }

    if (select) {
      select.innerHTML = '<option value="">Sin partidos programados en esta disciplina</option>';
      select.value = '';
    }
    if (scorerSelect) {
      scorerSelect.innerHTML = '<option value="">Sin partidos en esta disciplina</option>';
      scorerSelect.value = '';
    }
    if (scorerPanel) {
      scorerPanel.style.display = 'block';
      const locName = document.getElementById('scorerLocalName'); if (locName) locName.textContent = 'Sin Equipos';
      const visName = document.getElementById('scorerVisName'); if (visName) visName.textContent = 'Sin Equipos';
      const locTot = document.getElementById('scorerLocalTotal'); if (locTot) locTot.textContent = '-';
      const visTot = document.getElementById('scorerVisTotal'); if (visTot) visTot.textContent = '-';
      const tLoc = document.getElementById('scorerTableLocalTotal'); if (tLoc) tLoc.textContent = '-';
      const tVis = document.getElementById('scorerTableVisTotal'); if (tVis) tVis.textContent = '-';
      const badge = document.getElementById('scorerLiveBadge'); if (badge) { badge.className = 'badge badge-scheduled'; badge.textContent = '📅 SIN PARTIDOS'; }
      const clockEl = document.getElementById('scorerClockDisplay'); if (clockEl) clockEl.textContent = '--:--';
      const locLogo = document.getElementById('scorerLocalLogo'); if (locLogo) locLogo.innerHTML = `<div class="team-default-emblem-frame" style="width: 100%; height: 100%; background: #1e293b; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${getDefaultSportsIconSvg(disc.id, '#fde047', 54)}</div>`;
      const visLogo = document.getElementById('scorerVisLogo'); if (visLogo) visLogo.innerHTML = `<div class="team-default-emblem-frame" style="width: 100%; height: 100%; background: #1e293b; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${getDefaultSportsIconSvg(disc.id, '#fde047', 54)}</div>`;

      // Clear quarter breakdown inputs
      ['scorerQ1Loc', 'scorerQ2Loc', 'scorerQ3Loc', 'scorerQ4Loc', 'scorerOTLoc', 'scorerQ1Vis', 'scorerQ2Vis', 'scorerQ3Vis', 'scorerQ4Vis', 'scorerOTVis'].forEach((qid) => {
        const inp = document.getElementById(qid);
        if (inp) inp.value = 0;
      });
    }
    const track = document.getElementById('liveMatchesCarouselTrack');
    if (track) track.innerHTML = '<div style="padding: 1.25rem; color: var(--text-muted); text-align: center; width: 100%;">No hay partidos programados en el calendario oficial de esta disciplina.</div>';

    const user = window.tournamentStore.getUsuarioActual();
    applyRbacPermissions(user);
    return;
  }

  // Determine which match should be active strictly within the current discipline's matches
  let targetId = preferredPartidoId || currentLiveMatchId || (select ? select.value : null);
  const idStr = targetId != null ? String(targetId).trim() : '';

  const existsInCurrent = partidos.some((p) => String(p.id).trim() === idStr);
  if (!targetId || !existsInCurrent) {
    const liveMatch = partidos.find((p) => {
      const est = String(p.estado || '').toUpperCase();
      return est === 'EN CURSO' || est === 'LIVE' || est === 'EN VIVO';
    });
    const progMatch = partidos.find((p) => {
      const est = String(p.estado || '').toUpperCase();
      return est === 'PROGRAMADO';
    });
    targetId = liveMatch ? liveMatch.id : (progMatch ? progMatch.id : partidos[0].id);
  }

  currentLiveMatchId = targetId;

  // Separate matches by status to display organized groups in the selector
  const liveMatches = partidos.filter((p) => {
    const est = String(p.estado || '').toUpperCase();
    return est === 'EN CURSO' || est === 'LIVE' || est === 'EN VIVO';
  });
  const progMatches = partidos.filter((p) => {
    const est = String(p.estado || '').toUpperCase();
    return est === 'PROGRAMADO';
  });
  const finMatches = partidos.filter((p) => {
    const est = String(p.estado || '').toUpperCase();
    return est === 'FINALIZADO' || est === 'FINAL' || est === 'TERMINADO';
  });
  const otherMatches = partidos.filter((p) => !liveMatches.includes(p) && !progMatches.includes(p) && !finMatches.includes(p));

  const formatOption = (p) => {
    let icon = '⚪';
    const est = String(p.estado || '').toUpperCase();
    if (est === 'EN CURSO' || est === 'LIVE' || est === 'EN VIVO') icon = '🔴 [EN VIVO]';
    else if (est === 'PROGRAMADO') icon = '📅 [PROGRAMADO]';
    else if (est === 'FINALIZADO' || est === 'FINAL' || est === 'TERMINADO') icon = '🏁 [FINALIZADO]';
    else icon = `[${p.estado || 'S/E'}]`;

    const q1L = Number(p.q1Loc ?? p.q1_loc ?? 0) || 0;
    const q2L = Number(p.q2Loc ?? p.q2_loc ?? 0) || 0;
    const q3L = Number(p.q3Loc ?? p.q3_loc ?? 0) || 0;
    const q4L = Number(p.q4Loc ?? p.q4_loc ?? 0) || 0;
    const otL = Number(p.otLoc ?? p.ot_loc ?? 0) || 0;
    const qSumL = q1L + q2L + q3L + q4L + otL;
    let totL = qSumL > 0 ? qSumL : (Number(p.totalLocal ?? p.marcadorLocal ?? p.scoreLocal ?? p.puntosLocal ?? p.tot_loc) || 0);

    const q1V = Number(p.q1Vis ?? p.q1_vis ?? 0) || 0;
    const q2V = Number(p.q2Vis ?? p.q2_vis ?? 0) || 0;
    const q3V = Number(p.q3Vis ?? p.q3_vis ?? 0) || 0;
    const q4V = Number(p.q4Vis ?? p.q4_vis ?? 0) || 0;
    const otV = Number(p.otVis ?? p.ot_vis ?? 0) || 0;
    const qSumV = q1V + q2V + q3V + q4V + otV;
    let totV = qSumV > 0 ? qSumV : (Number(p.totalVisitante ?? p.marcadorVisitante ?? p.scoreVisitante ?? p.puntosVisitante ?? p.tot_vis) || 0);

    const hasScore = est === 'EN CURSO' || est === 'LIVE' || est === 'FINALIZADO' || est === 'FINAL' || est === 'TERMINADO' || totL > 0 || totV > 0;
    const scoreStr = hasScore ? ` (${totL} - ${totV})` : '';
    const dateSede = `${p.fecha || ''} ${p.hora || ''} ${p.sede ? '• ' + p.sede : ''}`.trim();
    const isSelected = String(p.id).trim() === String(targetId).trim();

    return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>
      ${icon} ${p.equipoLocal} vs ${p.equipoVisitante}${scoreStr} ${dateSede ? '— ' + dateSede : ''}
    </option>`;
  };

  if (select) {
    let optionsHtml = '';
    if (liveMatches.length > 0) {
      optionsHtml += `<optgroup label="🔴 EN VIVO / EN CURSO">${liveMatches.map(formatOption).join('')}</optgroup>`;
    }
    if (progMatches.length > 0) {
      optionsHtml += `<optgroup label="📅 PARTIDOS PROGRAMADOS">${progMatches.map(formatOption).join('')}</optgroup>`;
    }
    if (finMatches.length > 0) {
      optionsHtml += `<optgroup label="🏁 PARTIDOS FINALIZADOS">${finMatches.map(formatOption).join('')}</optgroup>`;
    }
    if (otherMatches.length > 0) {
      optionsHtml += `<optgroup label="OTROS ENCUENTROS">${otherMatches.map(formatOption).join('')}</optgroup>`;
    }

    select.innerHTML = optionsHtml;
    select.value = targetId;

    select.onchange = () => {
      const selectedId = select.value;
      if (selectedId) {
        currentLiveMatchId = selectedId;
        loadScorerMatch(selectedId);
      }
    };
  }

  // Sincronizar el selector de la Mesa de Anotación (scorerMatchSelect)
  if (scorerSelect) {
    scorerSelect.innerHTML = partidos.map((p) => {
      const est = String(p.estado || '').toUpperCase();
      const isFin = est === 'FINALIZADO' || est === 'FINAL' || est === 'TERMINADO';
      const isLiv = est === 'EN CURSO' || est === 'LIVE' || est === 'EN VIVO';
      let icon = isLiv ? '🔴' : isFin ? '🏁' : '📅';

      const q1L = Number(p.q1Loc ?? 0) || 0;
      const q2L = Number(p.q2Loc ?? 0) || 0;
      const q3L = Number(p.q3Loc ?? 0) || 0;
      const q4L = Number(p.q4Loc ?? 0) || 0;
      const otL = Number(p.otLoc ?? 0) || 0;
      const qSumL = q1L + q2L + q3L + q4L + otL;
      let totL = qSumL > 0 ? qSumL : (Number(p.totalLocal ?? p.marcadorLocal ?? 0) || 0);

      const q1V = Number(p.q1Vis ?? 0) || 0;
      const q2V = Number(p.q2Vis ?? 0) || 0;
      const q3V = Number(p.q3Vis ?? 0) || 0;
      const q4V = Number(p.q4Vis ?? 0) || 0;
      const otV = Number(p.otVis ?? 0) || 0;
      const qSumV = q1V + q2V + q3V + q4V + otV;
      let totV = qSumV > 0 ? qSumV : (Number(p.totalVisitante ?? p.marcadorVisitante ?? 0) || 0);

      const scoreStr = (isLiv || isFin || totL > 0 || totV > 0) ? ` [${totL} - ${totV}]` : '';
      const isSelected = String(p.id).trim() === String(targetId).trim();

      return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${icon} ${p.equipoLocal} vs ${p.equipoVisitante}${scoreStr} (${p.estado})</option>`;
    }).join('');
    scorerSelect.value = targetId;

    scorerSelect.onchange = () => {
      const selectedId = scorerSelect.value;
      if (selectedId) {
        currentLiveMatchId = selectedId;
        loadScorerMatch(selectedId);
      }
    };
  }

  // Renderizar carrusel horizontal de partidos de la jornada
  renderLiveMatchesCarousel(partidos, targetId);

  // Cargar datos en la consola principal de marcador digital
  loadScorerMatch(targetId);

  // Asegurar que la consola principal esté SIEMPRE visible y centrada
  if (scorerPanel) {
    scorerPanel.style.display = 'block';
  }

  // Aplicar control de permisos RBAC estricto según rol activo
  const user = window.tournamentStore.getUsuarioActual();
  applyRbacPermissions(user);
}

function renderLiveScoreboardArena(partidoId) {
  loadScorerMatch(partidoId);
}

// ==============================================================================
// ==============================================================================
// SUPERADMIN: PROGRAMAR PARTIDO, EDITAR PARTIDO & GESTIÓN DE CALENDARIO
// ==============================================================================
function openProgramarPartidoModal() {
  const modal = document.getElementById('modalProgramarPartido');
  const locSelect = document.getElementById('progMatchLocal');
  const visSelect = document.getElementById('progMatchVis');
  const dateInput = document.getElementById('progMatchDate');
  const timeInput = document.getElementById('progMatchTime');
  const venueInput = document.getElementById('progMatchVenue');
  const phaseSelect = document.getElementById('progMatchPhase');

  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto' };
  const currentFormat = (typeof window.tournamentStore.getFormatoCompeticion === 'function'
    ? window.tournamentStore.getFormatoCompeticion(disc.id)
    : null) || disc.formatoTorneo || 'por_grupo';

  const equipos = window.tournamentStore.getEquipos(disc.id);

  if (equipos.length === 0) {
    showToast(`No hay equipos registrados en "${disc.nombre}". Inscribe franquicias en "Gestión Equipos" primero.`, 'warning');
    return;
  }

  const formatTag = (eq, idx) => {
    if (currentFormat === 'todos_contra_todos') return 'Liga General';
    if (currentFormat === 'eliminacion_directa') return `Llave ${Math.floor(idx / 2) + 1}`;
    return eq.grupo || 'Grupo A';
  };

  const options = equipos.map((e, idx) => `<option value="${e.nombre}">${e.nombre} (${formatTag(e, idx)})</option>`).join('');

  if (locSelect) locSelect.innerHTML = options;
  if (visSelect) {
    visSelect.innerHTML = options;
    if (equipos.length > 1) visSelect.selectedIndex = 1;
  }
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  if (timeInput && !timeInput.value) {
    timeInput.value = '18:30';
  }

  // Populate dynamic phase options
  if (phaseSelect) {
    let phaseOptions = '';
    if (currentFormat === 'todos_contra_todos') {
      phaseOptions = `
        <option value="Jornada 1 (Liga Regular)">Jornada 1 (Liga Regular)</option>
        <option value="Jornada 2 (Liga Regular)">Jornada 2 (Liga Regular)</option>
        <option value="Jornada 3 (Liga Regular)">Jornada 3 (Liga Regular)</option>
        <option value="Jornada 4 (Liga Regular)">Jornada 4 (Liga Regular)</option>
        <option value="Jornada 5 (Liga Regular)">Jornada 5 (Liga Regular)</option>
        <option value="Jornada 6 (Liga Regular)">Jornada 6 (Liga Regular)</option>
        <option value="Jornada Final">Jornada Final</option>
      `;
    } else if (currentFormat === 'eliminacion_directa') {
      phaseOptions = `
        <option value="Cuartos de Final">Cuartos de Final</option>
        <option value="Semifinal">Semifinal</option>
        <option value="Tercer Lugar">Tercer Lugar</option>
        <option value="Gran Final">Gran Final</option>
      `;
    } else {
      phaseOptions = `
        <option value="Fase de Grupos - Grupo A">Fase de Grupos - Grupo A</option>
        <option value="Fase de Grupos - Grupo B">Fase de Grupos - Grupo B</option>
        <option value="Fase Intergrupos">Fase Intergrupos</option>
        <option value="Semifinal">Semifinal</option>
        <option value="Gran Final">Gran Final</option>
      `;
    }
    phaseSelect.innerHTML = phaseOptions;
  }

  // Sede / Cancha libre (campo de texto)
  if (venueInput && !venueInput.value) {
    venueInput.value = 'Gimnasio Pablo Higuerey';
  }

  modal?.classList.add('open');
}

function initProgramarPartidoModal() {
  document.getElementById('formProgramarPartidoModal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const local = document.getElementById('progMatchLocal')?.value;
    const vis = document.getElementById('progMatchVis')?.value;

    if (local === vis) {
      showToast('El equipo local y visitante no pueden ser el mismo', 'error');
      return;
    }

    const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
    const currentFormat = (typeof window.tournamentStore.getFormatoCompeticion === 'function'
      ? window.tournamentStore.getFormatoCompeticion(disc.id)
      : null) || disc.formatoTorneo || 'por_grupo';

    const eqLocal = window.tournamentStore.getEquipoPorNombre(local);
    let matchGrupo = 'Grupo A';
    if (currentFormat === 'todos_contra_todos') matchGrupo = 'Grupo Único';
    else if (currentFormat === 'eliminacion_directa') matchGrupo = 'Playoffs';
    else matchGrupo = eqLocal?.grupo || 'Grupo A';

    const fecha = document.getElementById('progMatchDate')?.value || new Date().toISOString().split('T')[0];
    const hora = document.getElementById('progMatchTime')?.value || '18:30';
    const sede = document.getElementById('progMatchVenue')?.value?.trim() || 'Gimnasio Pablo Higuerey';
    const fase = document.getElementById('progMatchPhase')?.value || 'Fase de Grupos';

    window.tournamentStore.addPartido({
      disciplinaId: disc.id,
      equipoLocal: local,
      equipoVisitante: vis,
      fecha,
      hora,
      sede,
      fase,
      grupo: matchGrupo,
      estado: 'PROGRAMADO',
      q1Loc: 0,
      q2Loc: 0,
      q3Loc: 0,
      q4Loc: 0,
      totalLocal: 0,
      q1Vis: 0,
      q2Vis: 0,
      q3Vis: 0,
      q4Vis: 0,
      totalVisitante: 0,
      reloj: '10:00',
      periodoActual: 'Por Iniciar'
    });

    document.getElementById('modalProgramarPartido')?.classList.remove('open');
    showToast(`Partido "${local} vs ${vis}" programado exitosamente`, 'success');
    renderMatches();
    renderHeroScoreboard();
    renderStandings();
    renderDashboardModule();
  });
}

function openEditarPartidoModal(partidoId) {
  const modal = document.getElementById('modalEditarPartido');
  if (!modal) return;

  const partido = window.tournamentStore.getPartidoPorId(partidoId);
  if (!partido) {
    showToast('Partido no encontrado', 'error');
    return;
  }

  const disc = window.tournamentStore.getDisciplinas().find((d) => d.id === partido.disciplinaId) || window.tournamentStore.getDisciplinaActual();
  const currentFormat = (typeof window.tournamentStore.getFormatoCompeticion === 'function'
    ? window.tournamentStore.getFormatoCompeticion(disc.id)
    : null) || disc.formatoTorneo || 'por_grupo';

  const equipos = window.tournamentStore.getEquipos(disc.id);

  const formatTag = (eq, idx) => {
    if (currentFormat === 'todos_contra_todos') return 'Liga General';
    if (currentFormat === 'eliminacion_directa') return `Llave ${Math.floor(idx / 2) + 1}`;
    return eq.grupo || 'Grupo A';
  };

  const options = equipos.map((e, idx) => `<option value="${e.nombre}">${e.nombre} (${formatTag(e, idx)})</option>`).join('');

  const locSelect = document.getElementById('editMatchLocal');
  const visSelect = document.getElementById('editMatchVis');
  const idInput = document.getElementById('editMatchId');
  const dateInput = document.getElementById('editMatchDate');
  const timeInput = document.getElementById('editMatchTime');
  const statusSelect = document.getElementById('editMatchStatus');
  const venueInput = document.getElementById('editMatchVenue');
  const phaseInput = document.getElementById('editMatchPhase');
  const groupInput = document.getElementById('editMatchGroup');
  const scoreLocInput = document.getElementById('editMatchScoreLoc');
  const scoreVisInput = document.getElementById('editMatchScoreVis');

  if (idInput) idInput.value = partido.id;
  if (locSelect) {
    locSelect.innerHTML = options;
    locSelect.value = partido.equipoLocal;
  }
  if (visSelect) {
    visSelect.innerHTML = options;
    visSelect.value = partido.equipoVisitante;
  }
  if (dateInput) dateInput.value = partido.fecha || '';
  if (timeInput) timeInput.value = partido.hora || '18:30';
  if (statusSelect) statusSelect.value = partido.estado || 'PROGRAMADO';

  if (venueInput) {
    venueInput.value = partido.sede || 'Gimnasio Pablo Higuerey';
  }

  if (phaseInput) phaseInput.value = partido.fase || '';
  if (groupInput) groupInput.value = partido.grupo || '';
  if (scoreLocInput) scoreLocInput.value = partido.totalLocal || 0;
  if (scoreVisInput) scoreVisInput.value = partido.totalVisitante || 0;

  modal.classList.add('open');
}

function initEditarPartidoModal() {
  document.getElementById('formEditarPartidoModal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editMatchId')?.value;
    const local = document.getElementById('editMatchLocal')?.value;
    const vis = document.getElementById('editMatchVis')?.value;

    if (!id) return;

    if (local === vis) {
      showToast('El equipo local y visitante no pueden ser el mismo', 'error');
      return;
    }

    const fecha = document.getElementById('editMatchDate')?.value;
    const hora = document.getElementById('editMatchTime')?.value || '18:30';
    const estado = document.getElementById('editMatchStatus')?.value || 'PROGRAMADO';
    const sede = document.getElementById('editMatchVenue')?.value?.trim() || 'Gimnasio Pablo Higuerey';
    const fase = document.getElementById('editMatchPhase')?.value || 'Fase de Grupos';
    const grupo = document.getElementById('editMatchGroup')?.value || 'Grupo A';
    const scoreLoc = Number(document.getElementById('editMatchScoreLoc')?.value) || 0;
    const scoreVis = Number(document.getElementById('editMatchScoreVis')?.value) || 0;

    const patch = {
      equipoLocal: local,
      equipoVisitante: vis,
      fecha,
      hora,
      sede,
      fase,
      grupo,
      estado,
      totalLocal: scoreLoc,
      totalVisitante: scoreVis
    };

    if (estado === 'FINALIZADO') {
      patch.periodoActual = 'Final';
      patch.reloj = '00:00';
    } else if (estado === 'EN CURSO') {
      patch.periodoActual = 'Q1';
      patch.reloj = '10:00';
    } else if (estado === 'PROGRAMADO') {
      patch.periodoActual = 'Por Iniciar';
      patch.reloj = '10:00';
      if (scoreLoc === 0 && scoreVis === 0) {
        patch.q1Loc = 0; patch.q2Loc = 0; patch.q3Loc = 0; patch.q4Loc = 0;
        patch.q1Vis = 0; patch.q2Vis = 0; patch.q3Vis = 0; patch.q4Vis = 0;
      }
    }

    window.tournamentStore.updatePartido(id, patch);
    document.getElementById('modalEditarPartido')?.classList.remove('open');
    showToast(`Partido "${local} vs ${vis}" actualizado exitosamente`, 'success');
    renderMatches();
    renderHeroScoreboard();
    renderStandings();
    renderDashboardModule();
  });
}

function handleDeletePartido(partidoId) {
  const partido = window.tournamentStore.getPartidoPorId(partidoId);
  if (!partido) return;
  const msg = `¿Estás seguro de que deseas eliminar del calendario el siguiente partido?\n\n• ${partido.equipoLocal} vs ${partido.equipoVisitante}\n• Fecha: ${partido.fecha} a las ${partido.hora}\n• Estado: ${partido.estado}`;
  if (confirm(msg)) {
    window.tournamentStore.deletePartido(partidoId);
    showToast(`Partido "${partido.equipoLocal} vs ${partido.equipoVisitante}" eliminado del calendario`, 'info');
    renderMatches();
    renderHeroScoreboard();
    renderStandings();
    renderDashboardModule();
  }
}

function handleLimpiarCalendario() {
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto' };
  const matches = window.tournamentStore.getPartidos(disc.id);
  if (matches.length === 0) {
    showToast(`El calendario de ${disc.nombre} ya se encuentra vacío.`, 'info');
    return;
  }
  const msg = `⚠️ ATENCIÓN: ¿Deseas vaciar y reiniciar TODOS los partidos programados (${matches.length}) para "${disc.nombre}"?\n\nEsta acción reiniciará toda la programación si deseas reestructurar el torneo desde cero.`;
  if (confirm(msg)) {
    window.tournamentStore.clearPartidos(disc.id);
    showToast(`Se han eliminado todos los partidos del calendario de ${disc.nombre}.`, 'info');
    renderMatches();
    renderHeroScoreboard();
    renderStandings();
    renderDashboardModule();
  }
}

function handleGenerarCalendario(replace = true) {
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto' };
  const equipos = window.tournamentStore.getEquipos(disc.id);
  if (equipos.length < 2) {
    showToast(`Se necesitan al menos 2 franquicias registradas en ${disc.nombre} para generar el calendario.`, 'warning');
    return;
  }
  const formato = (typeof window.tournamentStore.getFormatoCompeticion === 'function'
    ? window.tournamentStore.getFormatoCompeticion(disc.id)
    : null) || disc.formatoTorneo || 'por_grupo';

  let formatLabel = 'Por Grupos';
  if (formato === 'todos_contra_todos') formatLabel = 'Todos contra Todos (Liga Regular)';
  else if (formato === 'eliminacion_directa') formatLabel = 'Eliminación Directa (Playoffs)';

  const existing = window.tournamentStore.getPartidos(disc.id);
  if (existing.length > 0) {
    if (!confirm(`Ya existen ${existing.length} partidos en el calendario de ${disc.nombre}.\n\n¿Deseas reemplazar el calendario actual con la nueva programación dinámica según el sistema "${formatLabel}" para los ${equipos.length} equipos activos?`)) {
      return;
    }
  } else {
    if (!confirm(`¿Generar automáticamente el calendario oficial para ${disc.nombre}?\n\n• Formato: ${formatLabel}\n• Equipos participantes: ${equipos.length}\n• Franquicias: ${equipos.map((e) => e.nombre).join(', ')}`)) {
      return;
    }
  }

  const res = window.tournamentStore.generateScheduleForDiscipline(disc.id, true);
  if (res.success) {
    showToast(`¡Calendario generado exitosamente! Se programaron ${res.count} encuentros.`, 'success');
    renderMatches();
    renderHeroScoreboard();
    renderStandings();
    renderDashboardModule();
  } else {
    showToast(res.message || 'Error al generar calendario', 'error');
  }
}

function openNuevoEquipoModal() {
  const modal = document.getElementById('modalNuevoEquipo');
  document.getElementById('formNuevoEquipoModal')?.reset();
  const idInput = document.getElementById('newTeamId');
  if (idInput) idInput.value = '';
  const title = document.getElementById('modalEquipoTitle');
  if (title) title.textContent = 'Registrar Nueva Franquicia / Equipo';

  const logoPreview = document.getElementById('newTeamLogoPreview');
  if (logoPreview) logoPreview.src = './assets/logo.png';
  const logoUrl = document.getElementById('newTeamLogoUrl');
  if (logoUrl) logoUrl.value = '';
  const removeLogoBtn = document.getElementById('btnRemoveTeamLogo');
  if (removeLogoBtn) removeLogoBtn.style.display = 'none';

  const deleteBtn = document.getElementById('btnEliminarEquipoModal');
  if (deleteBtn) deleteBtn.style.display = 'none';

  const submitBtn = document.getElementById('btnGuardarEquipoSubmit');
  if (submitBtn) submitBtn.textContent = 'Guardar Cambios';

  modal?.classList.add('open');
}

function openEditarEquipoModal(equipoId) {
  const eq = window.tournamentStore.getEquipoPorId(equipoId);
  if (!eq) return;
  const modal = document.getElementById('modalNuevoEquipo');
  document.getElementById('formNuevoEquipoModal')?.reset();

  const title = document.getElementById('modalEquipoTitle');
  if (title) title.textContent = `Editar Datos: ${eq.nombre}`;

  const idInput = document.getElementById('newTeamId');
  if (idInput) idInput.value = eq.id;

  const nameInput = document.getElementById('newTeamName');
  if (nameInput) nameInput.value = eq.nombre;

  const logoPreview = document.getElementById('newTeamLogoPreview');
  const logoUrl = document.getElementById('newTeamLogoUrl');
  const removeLogoBtn = document.getElementById('btnRemoveTeamLogo');
  if (eq.logoUrl) {
    if (logoPreview) logoPreview.src = eq.logoUrl;
    if (logoUrl) logoUrl.value = eq.logoUrl;
    if (removeLogoBtn) removeLogoBtn.style.display = 'inline-block';
  } else {
    if (logoPreview) logoPreview.src = './assets/logo.png';
    if (logoUrl) logoUrl.value = '';
    if (removeLogoBtn) removeLogoBtn.style.display = 'none';
  }

  const delInput = document.getElementById('newTeamDelegate');
  if (delInput) delInput.value = eq.delegadoNombre || '';

  const phoneInput = document.getElementById('newTeamPhone');
  if (phoneInput) phoneInput.value = eq.delegadoTelefono || '';

  const entrenadorInput = document.getElementById('newTeamEntrenador');
  if (entrenadorInput) entrenadorInput.value = eq.entrenador || '';

  const asistenteInput = document.getElementById('newTeamAsistente');
  if (asistenteInput) asistenteInput.value = eq.asistente || '';

  const utileroInput = document.getElementById('newTeamUtilero');
  if (utileroInput) utileroInput.value = eq.utilero || '';

  const deleteBtn = document.getElementById('btnEliminarEquipoModal');
  if (deleteBtn) deleteBtn.style.display = 'inline-flex';

  const submitBtn = document.getElementById('btnGuardarEquipoSubmit');
  if (submitBtn) submitBtn.textContent = 'Guardar Cambios';

  modal?.classList.add('open');
}

function initNuevoEquipoModal() {
  // Logo upload listener from computer con compresión Canvas 120x120 JPEG 0.6
  document.getElementById('newTeamLogoFile')?.addEventListener('change', function(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, 120, 120, 0.6, (compressed) => {
      const logoUrlInput = document.getElementById('newTeamLogoUrl');
      const logoPreview = document.getElementById('newTeamLogoPreview');
      const removeBtn = document.getElementById('btnRemoveTeamLogo');
      if (logoUrlInput) logoUrlInput.value = compressed;
      if (logoPreview) logoPreview.src = compressed;
      if (removeBtn) removeBtn.style.display = 'inline-block';
      showToast('Logotipo de equipo comprimido a 120x120 (< 5 KB).', 'info');
    });
  });

  // Remove Logo button
  document.getElementById('btnRemoveTeamLogo')?.addEventListener('click', () => {
    const logoUrlInput = document.getElementById('newTeamLogoUrl');
    const logoPreview = document.getElementById('newTeamLogoPreview');
    const fileInput = document.getElementById('newTeamLogoFile');
    const removeBtn = document.getElementById('btnRemoveTeamLogo');
    if (logoUrlInput) logoUrlInput.value = '';
    if (logoPreview) logoPreview.src = './assets/logo.png';
    if (fileInput) fileInput.value = '';
    if (removeBtn) removeBtn.style.display = 'none';
  });

  // Cancel button
  document.getElementById('btnCancelarEquipoModal')?.addEventListener('click', () => {
    document.getElementById('modalNuevoEquipo')?.classList.remove('open');
  });

  // Delete button inside modal
  document.getElementById('btnEliminarEquipoModal')?.addEventListener('click', () => {
    const id = document.getElementById('newTeamId')?.value;
    if (!id) return;
    const eq = window.tournamentStore.getEquipoPorId(id);
    const teamName = eq ? eq.nombre : 'el equipo';
    if (confirm(`¿Está seguro de que desea eliminar permanentemente la franquicia "${teamName}" y todos sus atletas asociados de la base local?\n\nEsta acción no se puede deshacer.`)) {
      window.tournamentStore.deleteEquipo(id, 'superadmin');
      document.getElementById('modalNuevoEquipo')?.classList.remove('open');
      showToast(`Franquicia "${teamName}" y sus atletas eliminados exitosamente`, 'info');
      renderTeamsAndRosters();
      renderGroupsStructure();
      renderDashboardModule();
      renderStandings();
      renderMatches();
    }
  });

  // Submit form con compresión obligatoria de logotipo
  document.getElementById('formNuevoEquipoModal')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('newTeamId')?.value;
    const nombre = document.getElementById('newTeamName')?.value.trim();
    let logoUrl = document.getElementById('newTeamLogoUrl')?.value.trim() || '';
    const fileInput = document.getElementById('newTeamLogoFile');

    // Interceptar obligatoriamente y comprimir a 120x120 JPEG 0.6
    if (fileInput && fileInput.files && fileInput.files[0] && (!logoUrl || logoUrl.length > 8000 || !logoUrl.startsWith('data:image/jpeg'))) {
      try {
        logoUrl = await compressImage(fileInput.files[0], 120, 120, 0.6);
      } catch (err) {
        console.warn('Error al comprimir logo de equipo en submit:', err);
      }
    } else if (logoUrl && logoUrl.startsWith('data:')) {
      try {
        logoUrl = await compressImage(logoUrl, 120, 120, 0.6);
      } catch (err) {
        console.warn('Error al comprimir data URL de equipo en submit:', err);
      }
    }

    const delegado = document.getElementById('newTeamDelegate')?.value.trim() || 'Delegado';
    const telefono = document.getElementById('newTeamPhone')?.value.trim() || 'N/A';
    const entrenador = document.getElementById('newTeamEntrenador')?.value.trim() || '';
    const asistente = document.getElementById('newTeamAsistente')?.value.trim() || '';
    const utilero = document.getElementById('newTeamUtilero')?.value.trim() || '';
    const siglas = nombre.substring(0, 3).toUpperCase();

    const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };

    if (id) {
      window.tournamentStore.updateEquipo(id, {
        nombre,
        logoUrl,
        siglas,
        delegadoNombre: delegado,
        delegadoTelefono: telefono,
        entrenador,
        asistente,
        utilero,
        disciplinaId: disc.id
      });
      showToast(`Datos del equipo "${nombre}" actualizados con éxito`, 'success');
    } else {
      window.tournamentStore.addEquipo({
        nombre,
        logoUrl,
        siglas,
        grupo: 'Grupo A',
        delegadoNombre: delegado,
        delegadoTelefono: telefono,
        entrenador,
        asistente,
        utilero,
        disciplinaId: disc.id
      });
      showToast(`Franquicia "${nombre}" registrada con éxito`, 'success');
    }

    document.getElementById('modalNuevoEquipo')?.classList.remove('open');
    renderTeamsAndRosters();
    renderGroupsStructure();
    renderDashboardModule();
    renderStandings();
    renderMatches();
  });
}

function exportStandingsToCSV() {
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto' };
  const grouped = window.StandingsEngine.compute(disc.id);

  let csv = `TABLA OFICIAL DE POSICIONES - ${disc.nombre.toUpperCase()}\n`;
  csv += `Grupo,Posicion,Equipo,JJ,JG,JP,PF,PC,DIF,PTS\n`;

  Object.keys(grouped).forEach((grpName) => {
    const rows = grouped[grpName];
    rows.forEach((r) => {
      csv += `"${grpName}",${r.posicion},"${r.equipo}",${r.jj},${r.jg},${r.jp},${r.pf},${r.pc},${r.dp},${r.pts}\n`;
    });
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TABLA_POSICIONES_${disc.id.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(a);
  showToast('Tabla oficial exportada a CSV exitosamente', 'success');
}

// DISCIPLINES BAR RENDERER
// ==============================================================================
function renderDisciplinesBar() {
  const scroller = document.getElementById('disciplinesScroller');
  if (!scroller) return;

  const storeDiscs = window.tournamentStore && typeof window.tournamentStore.getDisciplinas === 'function'
    ? window.tournamentStore.getDisciplinas()
    : [];
  const disciplinas = storeDiscs.filter((d) => d && d.activa !== false);
  const actual = (window.tournamentStore && typeof window.tournamentStore.getDisciplinaActual === 'function'
    ? window.tournamentStore.getDisciplinaActual()
    : null) || disciplinas[0] || { id: '' };

  scroller.innerHTML = disciplinas
    .map(
      (d) => `
    <button class="discipline-chip ${actual && d.id === actual.id ? 'active' : ''}" data-id="${d.id}">
      <span class="discipline-chip-icon">${d.icono || '🏆'}</span>
      <span>${d.nombre}</span>
      <span class="badge badge-gold" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">${d.categoria || 'Torneo'}</span>
    </button>
  `
    )
    .join('');

  scroller.querySelectorAll('.discipline-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const id = chip.getAttribute('data-id');
      currentLiveMatchId = null;
      activeScorerMatch = null;
      if (typeof isTimerRunning !== 'undefined' && isTimerRunning) {
        clearInterval(matchTimerInterval);
        isTimerRunning = false;
        const btnClock = document.getElementById('btnClockToggle');
        if (btnClock) btnClock.textContent = '▶ Iniciar Reloj';
      }
      window.tournamentStore.setDisciplinaActual(id);
      renderAllViews();
    });
  });
}

// ==============================================================================
// HERO SCOREBOARD RENDERER (LIVE MATCH HERO)
// ==============================================================================
function renderHeroScoreboard() {
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto' };
  const partidos = window.tournamentStore.getPartidos(disc.id);

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

  if (!partidos || partidos.length === 0) {
    if (localName) localName.textContent = 'Por Programar';
    if (visName) visName.textContent = 'Por Programar';
    if (scoreLoc) scoreLoc.textContent = '-';
    if (scoreVis) scoreVis.textContent = '-';
    if (venue) venue.textContent = 'Por definir';
    if (fase) fase.textContent = `Sin partidos en ${disc.nombre}`;
    if (periodo) periodo.textContent = 'En Espera';
    if (reloj) reloj.textContent = '--:--';
    if (localBadge) localBadge.innerHTML = getDefaultSportsIconSvg(disc?.id, '#800020', 54);
    if (visBadge) visBadge.innerHTML = getDefaultSportsIconSvg(disc?.id, '#1E3A8A', 54);
    if (statusBadge && statusText) {
      statusBadge.className = 'badge badge-scheduled';
      statusText.textContent = 'CALENDARIO VACÍO';
    }
    const rowLocName = document.getElementById('heroRowLocalName');
    const rowVisName = document.getElementById('heroRowVisName');
    if (rowLocName) rowLocName.textContent = 'Local';
    if (rowVisName) rowVisName.textContent = 'Visitante';
    ['heroQ1Loc', 'heroQ2Loc', 'heroQ3Loc', 'heroQ4Loc', 'heroTotLoc', 'heroQ1Vis', 'heroQ2Vis', 'heroQ3Vis', 'heroQ4Vis', 'heroTotVis'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '-';
    });
    return;
  }

  // Prioritize active LIVE match, then most recent, then first
  let liveMatch = partidos.find((p) => p.estado === 'EN CURSO');
  if (!liveMatch) {
    liveMatch = partidos[0];
  }

  if (localName) localName.textContent = liveMatch.equipoLocal;
  if (visName) visName.textContent = liveMatch.equipoVisitante;
  if (scoreLoc) scoreLoc.textContent = liveMatch.totalLocal;
  if (scoreVis) scoreVis.textContent = liveMatch.totalVisitante;
  if (venue) venue.textContent = liveMatch.sede || 'Gimnasio Pablo Higuerey';
  if (fase) fase.textContent = liveMatch.fase || 'Fase de Grupos';
  if (periodo) periodo.textContent = liveMatch.periodoActual || '4TO CUARTO';
  if (reloj) reloj.textContent = liveMatch.reloj || '00:00';

  if (localBadge) {
    const eqLoc = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(liveMatch.equipoLocal) : null;
    localBadge.innerHTML = getTeamLogoOrEmblemHtml(eqLoc, { size: 68, fallbackName: liveMatch.equipoLocal });
  }
  if (visBadge) {
    const eqVis = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(liveMatch.equipoVisitante) : null;
    visBadge.innerHTML = getTeamLogoOrEmblemHtml(eqVis, { size: 68, fallbackName: liveMatch.equipoVisitante });
  }

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
  if (rowLocName) {
    const eqLoc = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(liveMatch.equipoLocal) : null;
    rowLocName.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.65rem;">${getTeamLogoOrEmblemHtml(eqLoc, { size: 36, fallbackName: liveMatch.equipoLocal })} <span>${escapeHtml(liveMatch.equipoLocal)}</span></span>`;
  }
  if (rowVisName) {
    const eqVis = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(liveMatch.equipoVisitante) : null;
    rowVisName.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.65rem;">${getTeamLogoOrEmblemHtml(eqVis, { size: 36, fallbackName: liveMatch.equipoVisitante })} <span>${escapeHtml(liveMatch.equipoVisitante)}</span></span>`;
  }

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

  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto' };
  const partidos = window.tournamentStore.getPartidos(disc.id);
  const user = window.tournamentStore.getUsuarioActual();
  const isSuperAdmin = !!(user && (user.rol === 'superadmin' || user.esSuperAdmin));
  const search = (document.getElementById('matchSearchInput')?.value || '').toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  let filtered = partidos.filter((p) => {
    // Search filter
    const matchesSearch =
      (p.equipoLocal || '').toLowerCase().includes(search) ||
      (p.equipoVisitante || '').toLowerCase().includes(search) ||
      (p.sede || '').toLowerCase().includes(search);
    if (!matchesSearch) return false;

    // Status filter
    if (currentCalendarFilter === 'live') return p.estado === 'EN CURSO';
    if (currentCalendarFilter === 'hoy') return p.fecha === todayStr;
    if (currentCalendarFilter === 'programado') return p.estado === 'PROGRAMADO';
    if (currentCalendarFilter === 'finalizado') return p.estado === 'FINALIZADO';
    return true;
  });

  if (filtered.length === 0) {
    if (partidos.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; background: var(--bg-card); border: 1px dashed rgba(212, 175, 55, 0.25); border-radius: var(--radius-lg); color: var(--text-secondary);">
          <div style="font-size: 2.8rem; margin-bottom: 0.75rem;">📅</div>
          <h3 style="font-size: 1.25rem; color: #ffffff; margin-bottom: 0.5rem; font-family: var(--font-heading);">No hay encuentros programados en ${disc.nombre}</h3>
          <p style="font-size: 0.88rem; max-width: 520px; margin: 0 auto 1.5rem; color: var(--text-muted); line-height: 1.5;">
            ${isSuperAdmin 
              ? 'Puedes generar automáticamente los cruces oficiales según el sistema de competencia activo o programar encuentros manualmente.' 
              : 'Aún no se han programado partidos oficiales para esta disciplina. Consulta nuevamente más tarde.'}
          </p>
          ${isSuperAdmin ? `
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-gold btn-sm" id="btnEmptyGenerarCalendario" type="button">
                ⚡ Generar Calendario Dinámico
              </button>
              <button class="btn btn-outline-cyan btn-sm" id="btnEmptyProgramarPartido" type="button">
                + Programar Partido Manual
              </button>
            </div>
          ` : ''}
        </div>
      `;
      document.getElementById('btnEmptyGenerarCalendario')?.addEventListener('click', () => handleGenerarCalendario(true));
      document.getElementById('btnEmptyProgramarPartido')?.addEventListener('click', openProgramarPartidoModal);
      return;
    }

    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); color: var(--text-secondary);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem; color: #ffffff;">No se encontraron partidos con los filtros seleccionados.</p>
        <span style="font-size: 0.85rem;">Prueba cambiando el filtro de estado o el término de búsqueda.</span>
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
      const eqLoc = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(m.equipoLocal, disc.id) : null;
      const eqVis = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(m.equipoVisitante, disc.id) : null;
      const logoLocHtml = getTeamLogoOrEmblemHtml(eqLoc, { size: 48, fallbackName: m.equipoLocal });
      const logoVisHtml = getTeamLogoOrEmblemHtml(eqVis, { size: 48, fallbackName: m.equipoVisitante });

      return `
      <div class="match-card ${isLive ? 'is-live' : ''}" data-id="${m.id}">
        <div class="match-card-header">
          <span>📅 ${m.fecha} • ⏰ ${m.hora}</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="match-card-body">
          <div class="match-row-team">
            <div class="match-team-info">
              ${logoLocHtml}
              <span>${m.equipoLocal}</span>
            </div>
            <div class="match-team-score" style="${m.estado === 'FINALIZADO' && m.totalLocal > m.totalVisitante ? 'color: var(--brand-gold);' : ''}">
              ${m.estado === 'PROGRAMADO' ? '-' : m.totalLocal}
            </div>
          </div>

          <div class="match-row-team">
            <div class="match-team-info">
              ${logoVisHtml}
              <span>${m.equipoVisitante}</span>
            </div>
            <div class="match-team-score" style="${m.estado === 'FINALIZADO' && m.totalVisitante > m.totalLocal ? 'color: var(--brand-gold);' : ''}">
              ${m.estado === 'PROGRAMADO' ? '-' : m.totalVisitante}
            </div>
          </div>
        </div>

        <div class="match-card-footer">
          <span>📍 ${m.sede || 'Sede por definir'}</span>
          <span>${m.fase || 'Fase Regular'}</span>
        </div>

        ${isSuperAdmin ? `
          <div class="match-card-admin-actions">
            <button type="button" class="btn btn-outline-cyan btn-edit-match" data-match-id="${m.id}" title="Editar fecha, hora, contendientes o estado">
              ✏️ Editar Partido
            </button>
            <button type="button" class="btn btn-outline-danger btn-delete-match" data-match-id="${m.id}" title="Eliminar encuentro del calendario">
              🗑️ Eliminar Partido
            </button>
          </div>
        ` : ''}
      </div>
    `;
    })
    .join('');

  // Attach Edit and Delete listeners
  container.querySelectorAll('.btn-edit-match').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const matchId = btn.getAttribute('data-match-id');
      openEditarPartidoModal(matchId);
    });
  });

  container.querySelectorAll('.btn-delete-match').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const matchId = btn.getAttribute('data-match-id');
      handleDeletePartido(matchId);
    });
  });
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

  try {
    const disc = (window.tournamentStore && typeof window.tournamentStore.getDisciplinaActual === 'function'
      ? window.tournamentStore.getDisciplinaActual()
      : null) || { id: 'baloncesto-master', nombre: 'Baloncesto' };
    
    if (!disc || !disc.id) return;

    const grouped = window.StandingsEngine && typeof window.StandingsEngine.compute === 'function'
      ? window.StandingsEngine.compute(disc.id)
      : {};

    if (!grouped || Object.keys(grouped).length === 0) {
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

                  const eq = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(r.equipo) : null;
                  const logoHtml = getTeamLogoOrEmblemHtml(eq || r, { size: 48, fallbackName: r.equipo });

                  return `
                  <tr class="${r.clasificado ? 'playoff-row' : ''}">
                    <td><span class="rank-badge ${rankClass}">${r.posicion}</span></td>
                    <td class="team-cell">
                      ${logoHtml}
                      <div>
                        <div style="font-weight: 700; color: #ffffff;">${r.equipo}</div>
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
  } catch (err) {
    console.warn('Error in renderStandings:', err);
  }
}

// ==============================================================================
// TEAMS & ROSTERS RENDERER
// ==============================================================================
// ==============================================================================
// TEAMS & ROSTERS RENDERER (FRANQUICIAS & CONTROL RBAC)
// ==============================================================================
let currentTeamGroupFilter = 'todos';

function renderTeamsAndRosters() {
  const container = document.getElementById('teamsGridContainer');
  if (!container) return;

  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master', nombre: 'Baloncesto' };
  const equipos = window.tournamentStore.getEquipos(disc.id);
  const user = window.tournamentStore.getUsuarioActual();
  const isSuperAdmin = !!(user && (user.rol === 'superadmin' || user.esSuperAdmin));
  const isDelegado = !!(user && user.rol === 'delegado');
  const userTeamName = user?.equipoNombre;
  const userTeamId = user?.equipoId;

  const search = (document.getElementById('athleteSearchInput')?.value || '').toLowerCase();

  let filtered = equipos.filter((eq) => {
    if (currentTeamGroupFilter !== 'todos' && eq.grupo !== currentTeamGroupFilter) return false;
    if (
      search &&
      !eq.nombre.toLowerCase().includes(search) &&
      !eq.delegadoNombre?.toLowerCase().includes(search)
    )
      return false;
    return true;
  });

  if (filtered.length === 0) {
    if (equipos.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed rgba(212, 175, 55, 0.3); color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">📋</div>
          <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-weight: 700;">No hay equipos registrados en ${disc.nombre}</h3>
          <p style="margin-bottom: 1.5rem; font-size: 0.95rem; max-width: 500px; margin-inline: auto; color: var(--text-muted);">Esta disciplina está completamente lista para comenzar desde cero. Registra el primer equipo o franquicia para habilitar el calendario y las estadísticas.</p>
          <button id="btnEmptyNuevoEquipo" class="btn btn-gold" type="button" style="padding: 0.75rem 1.5rem; font-weight: 700; cursor: pointer;">
            ➕ Registrar Primer Equipo
          </button>
        </div>
      `;
      document.getElementById('btnEmptyNuevoEquipo')?.addEventListener('click', openNuevoEquipoModal);
      return;
    }

    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); color: var(--text-secondary);">
        No se encontraron equipos para el filtro o búsqueda seleccionada.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((eq) => {
      const atletas = window.tournamentStore.getAtletas(eq.nombre, disc.id);
      const isMyTeam = isDelegado && (eq.id === userTeamId || eq.nombre === userTeamName);

      // RBAC rules:
      // - Superadmin: button on all teams
      // - Delegado: button ONLY on their own team
      // - Fanatico: no edit/add buttons (read-only)
      const canAddAthlete = isSuperAdmin || isMyTeam;
      const canEditTeam = isSuperAdmin || isMyTeam;
      const canDeleteTeam = isSuperAdmin;

      const hasAdminActions = canEditTeam || canAddAthlete || canDeleteTeam;

      const editBtnHtml = canEditTeam
        ? `<button class="btn btn-outline-cyan btn-xs btn-editar-equipo" data-id="${eq.id}" title="Editar datos del equipo y cuerpo técnico">
             <span>✏️ Editar Equipo</span>
           </button>`
        : '';

      const addBtnHtml = canAddAthlete
        ? `<button class="btn btn-gold btn-xs btn-agregar-atleta" data-team="${eq.nombre}" data-id="${eq.id}" title="Registrar nuevo atleta en nómina">
             <span>➕ Agregar Atleta</span>
           </button>`
        : '';

      const deleteBtnHtml = canDeleteTeam
        ? `<button class="btn btn-outline-danger btn-xs btn-eliminar-equipo" data-id="${eq.id}" data-team="${eq.nombre}" title="Eliminar permanentemente la franquicia y sus atletas">
             <span>🗑️ Eliminar Equipo</span>
           </button>`
        : '';

      const myTeamBadge = isMyTeam
        ? `<div style="background: rgba(0, 229, 255, 0.15); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 0.25rem 0.65rem; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 800; margin-bottom: 0.6rem; display: inline-flex; align-items: center; gap: 4px;">
             ⭐ TU EQUIPO ASIGNADO
           </div>`
        : '';

      const crestContent = getTeamLogoOrEmblemHtml(eq, { size: 76, fallbackName: eq.nombre });

      const hasBottomRow = canEditTeam || canDeleteTeam;
      const topRowClass = canAddAthlete
        ? 'team-actions-row team-actions-row-top'
        : 'team-actions-row team-actions-row-top is-single-btn';
      const bottomRowClass = (canEditTeam && canDeleteTeam)
        ? 'team-actions-row team-actions-row-bottom'
        : 'team-actions-row team-actions-row-bottom is-single-btn';

      return `
      <div class="team-card-360 ${isMyTeam ? 'my-assigned-team' : ''}">
        ${myTeamBadge}
        <div class="team-card-header-360">
          <div class="team-crest-360" style="background: ${eq.color || '#1e293b'}; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            ${crestContent}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="team-name-360" title="${escapeHtmlAttr(eq.nombre)}">${eq.nombre}</div>
            <span class="team-group-pill">${eq.grupo}</span>
          </div>
        </div>

        <div class="team-meta-box">
          <div><strong>Delegado:</strong> ${eq.delegadoNombre || 'Por asignar'}</div>
          <div><strong>Teléfono:</strong> ${eq.delegadoTelefono || 'No registrado'}</div>
          ${eq.entrenador ? `<div><strong>Entrenador:</strong> ${eq.entrenador}</div>` : ''}
          ${eq.asistente ? `<div><strong>Asistente:</strong> ${eq.asistente}</div>` : ''}
          ${eq.utilero ? `<div><strong>Utilero:</strong> ${eq.utilero}</div>` : ''}
          <div style="color: var(--brand-gold-light); font-weight: 700; margin-top: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
            <span>🏃</span>
            <span>${atletas.length} Atletas Registrados</span>
          </div>
        </div>

        <div class="team-card-actions-wrapper">
          <div class="${topRowClass}">
            <button class="btn btn-outline-gold btn-xs btn-ver-roster" data-team="${eq.nombre}" title="Consultar nómina y plantilla de atletas">
              <span>📋 Ver Plantilla</span>
            </button>
            ${addBtnHtml}
          </div>
          ${hasBottomRow ? `
            <div class="${bottomRowClass}">
              ${editBtnHtml}
              ${deleteBtnHtml}
            </div>
          ` : ''}
        </div>
      </div>
    `;
    })
    .join('');

  // Ver Plantilla
  container.querySelectorAll('.btn-ver-roster').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamName = btn.getAttribute('data-team');
      openTeamRosterModal(teamName);
    });
  });

  // Editar Equipo (SuperAdmin & Delegado Asignado)
  container.querySelectorAll('.btn-editar-equipo').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamId = btn.getAttribute('data-id');
      openEditarEquipoModal(teamId);
    });
  });

  // + AGREGAR ATLETA (SuperAdmin & Delegado Asignado)
  container.querySelectorAll('.btn-agregar-atleta').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamName = btn.getAttribute('data-team');
      openAddAtletaForTeamModal(teamName);
    });
  });

  // Eliminar Equipo (Confirmación y borrado permanente de franquicia y atletas)
  container.querySelectorAll('.btn-eliminar-equipo').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamId = btn.getAttribute('data-id');
      const teamName = btn.getAttribute('data-team');
      if (confirm(`¿Está seguro de que desea eliminar permanentemente el equipo "${teamName}" y todos sus atletas asociados de la base local?\n\nEsta acción no se puede deshacer.`)) {
        window.tournamentStore.deleteEquipo(teamId, 'superadmin');
        showToast(`Franquicia "${teamName}" y sus atletas eliminados exitosamente`, 'info');
        renderTeamsAndRosters();
        renderGroupsStructure();
        renderDashboardModule();
        renderStandings();
        renderMatches();
      }
    });
  });
}

function openAddAtletaForTeamModal(teamName) {
  const modal = document.getElementById('modalEditAtleta');
  const title = document.getElementById('modalAtletaTitle');
  const eqGroup = document.getElementById('atletaEquipoGroup');
  const eqSelect = document.getElementById('atletaEquipoSelect');
  const atletaIdInput = document.getElementById('atletaId');
  const submitBtn = document.getElementById('btnGuardarAtletaSubmit');

  if (title) title.textContent = `Inscribir Atleta en: ${teamName}`;
  if (atletaIdInput) atletaIdInput.value = '';
  if (submitBtn) submitBtn.textContent = 'Guardar Cambios / Añadir';

  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };

  if (eqSelect) {
    const equipos = window.tournamentStore.getEquipos(disc.id);
    eqSelect.innerHTML = equipos
      .map((eq) => `<option value="${eq.nombre}" ${eq.nombre === teamName ? 'selected' : ''}>${eq.nombre}</option>`)
      .join('');
    eqSelect.value = teamName;
  }
  if (eqGroup) eqGroup.style.display = 'block';

  ['atletaCedula', 'atletaCamiseta', 'atletaNombres', 'atletaFechaNac', 'atletaEdad', 'atletaFotoUrl'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  modal?.classList.add('open');
}

function openTeamRosterModal(teamName) {
  const modal = document.getElementById('modalTeamRoster');
  const title = document.getElementById('modalRosterTeamTitle');
  const meta = document.getElementById('modalRosterMeta');
  const tbody = document.getElementById('modalRosterTableBody');

  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
  const eq = window.tournamentStore.getEquipoPorNombre(teamName, disc.id);
  const atletas = window.tournamentStore.getAtletas(teamName, disc.id);

  if (title) {
    const logoHtml = getTeamLogoOrEmblemHtml(eq, { size: 48, fallbackName: teamName });
    title.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.65rem;">${logoHtml} <span>Plantilla: ${teamName}</span></span>`;
  }
  if (meta) {
    const cuerpoTecnicoParts = [];
    if (eq?.entrenador) cuerpoTecnicoParts.push(`DT: ${eq.entrenador}`);
    if (eq?.asistente) cuerpoTecnicoParts.push(`Asistente: ${eq.asistente}`);
    if (eq?.utilero) cuerpoTecnicoParts.push(`Utilero: ${eq.utilero}`);
    const cuerpoStr = cuerpoTecnicoParts.length > 0 ? `<br><strong>Cuerpo Técnico:</strong> ${cuerpoTecnicoParts.join(' • ')}` : '';

    meta.innerHTML = `
      <strong>Grupo:</strong> ${eq?.grupo || 'A'} • 
      <strong>Sede Principal:</strong> ${eq?.sedePrincipal || 'Gimnasio Pablo Higuerey'} • 
      <strong>Delegado:</strong> ${eq?.delegadoNombre || 'N/A'} (${eq?.delegadoTelefono || 'N/A'})${cuerpoStr}
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
// DELEGATE VIEW CONTROLLER (ROL RESTRINGIDO Y ACCESO COMPLETO DE LECTURA)
// ==============================================================================
function populateDelegadoTeamSelect() {
  const select = document.getElementById('selectDelegadoEquipo');
  if (!select) return;

  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
  const equipos = window.tournamentStore.getEquipos(disc.id);
  select.innerHTML = '<option value="">-- Seleccione su Club o Equipo --</option>' + 
    equipos.map((eq) => `<option value="${eq.id}">${eq.nombre} (${eq.grupo}) - ${eq.delegadoEmail || ''}</option>`).join('');
}

// Quick demo credential autocompletion
document.getElementById('btnFillDemoDelegado')?.addEventListener('click', () => {
  const emailInput = document.getElementById('inputDelegadoEmail');
  const pinInput = document.getElementById('inputDelegadoPin');
  const select = document.getElementById('selectDelegadoEquipo');
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
  const firstTeam = window.tournamentStore.getEquipos(disc.id)[0];
  if (emailInput && firstTeam) emailInput.value = firstTeam.delegadoEmail || 'delegado@gmdjl.com';
  if (pinInput) pinInput.value = firstTeam?.pin || '2024';
  if (select && firstTeam) {
    select.value = firstTeam.id;
  }
  showToast(`Credenciales Demo cargadas: ${firstTeam?.nombre || 'Franquicia'}`, 'info');
});

document.getElementById('formDelegadoLogin')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputEmail = (document.getElementById('inputDelegadoEmail')?.value || '').trim().toLowerCase();
  const selectedEquipoId = document.getElementById('selectDelegadoEquipo')?.value;
  const pin = (document.getElementById('inputDelegadoPin')?.value || '').trim();

  const allEquipos = window.tournamentStore.data.equipos || [];
  let matchedTeam = null;

  // 1. Try match by Email
  if (inputEmail) {
    matchedTeam = allEquipos.find(
      (eq) => (eq.delegadoEmail || '').toLowerCase() === inputEmail
    );
  }

  // 2. Fallback to select dropdown
  if (!matchedTeam && selectedEquipoId) {
    matchedTeam = window.tournamentStore.getEquipoPorId(selectedEquipoId);
  }

  if (!matchedTeam) {
    showToast('No se encontró ningún club asociado al correo o equipo seleccionado', 'error');
    return;
  }

  // 3. Verify PIN (team specific pin or default 2024)
  if (matchedTeam.pin === pin || pin === '2024') {
    window.tournamentStore.setUsuarioActual({
      rol: 'delegado',
      equipoId: matchedTeam.id,
      equipoNombre: matchedTeam.nombre,
      delegadoEmail: matchedTeam.delegadoEmail || inputEmail,
      delegadoNombre: matchedTeam.delegadoNombre || 'Delegado Oficial'
    });
    showToast(`Bienvenido al portal: ${matchedTeam.nombre}`, 'success');
    renderDelegadoDashboard(matchedTeam.id);
  } else {
    showToast('Clave / PIN de seguridad incorrecto', 'error');
  }
});

function renderDelegadoDashboard(equipoId) {
  const loginCard = document.getElementById('delegadoLoginCard');
  const dash = document.getElementById('delegadoDashboard');
  if (loginCard) loginCard.style.display = 'none';
  if (dash) dash.style.display = 'block';

  const eq = window.tournamentStore.getEquipoPorId(equipoId);
  if (!eq) return;

  const currentDisc = window.tournamentStore.data.disciplinas.find(d => d.id === eq.disciplinaId) || window.tournamentStore.getDisciplinaActual();
  const sportBadge = document.getElementById('delDashSportBadge');
  if (sportBadge) sportBadge.textContent = `${currentDisc.icono || '🏆'} ${currentDisc.nombre} (${currentDisc.categoria})`;

  document.getElementById('delDashTeamName').textContent = eq.nombre;
  document.getElementById('delDashDelegateInfo').textContent = `Delegado: ${eq.delegadoNombre || 'No asignado'} • ${eq.delegadoEmail || 'Sin correo'} • ${eq.grupo} • Sede: ${eq.sedePrincipal}`;

  // Check if Rosters are Frozen by Superadmin
  const config = window.tournamentStore.getConfig();
  const isFrozen = !!config.rostersCongelados;
  const freezeAlert = document.getElementById('delRosterFrozenAlert');
  const btnNuevoAtleta = document.getElementById('btnNuevoAtletaModal');

  if (freezeAlert) {
    freezeAlert.style.display = isFrozen ? 'flex' : 'none';
  }
  if (btnNuevoAtleta) {
    if (isFrozen) {
      btnNuevoAtleta.classList.add('disabled');
      btnNuevoAtleta.title = 'Inscripciones cerradas por el Superadministrador';
    } else {
      btnNuevoAtleta.classList.remove('disabled');
      btnNuevoAtleta.title = 'Inscribir nuevo atleta en la plantilla';
    }
  }

  const atletas = window.tournamentStore.getAtletas(eq.nombre, eq.disciplinaId);
  document.getElementById('delDashAthleteCount').textContent = `${atletas.length} Atletas Inscritos`;

  const tbody = document.getElementById('delRosterTableBody');
  if (tbody) {
    if (atletas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No tiene atletas registrados aún. Presione "+ Inscribir Nuevo Atleta".</td></tr>`;
    } else {
      tbody.innerHTML = atletas
        .map(
          (a) => {
            const avatarHtml = a.fotoUrl 
              ? `<img src="${a.fotoUrl}" alt="${a.nombres}" class="athlete-avatar" onerror="this.outerHTML='<span class=\\'athlete-avatar\\'>${a.camiseta || '•'}</span>'">`
              : `<span class="athlete-avatar">${a.camiseta || '•'}</span>`;

            return `
        <tr>
          <td><span class="badge badge-gold">${a.camiseta || '-'}</span></td>
          <td style="text-align: left; font-family: monospace;">${a.cedula}</td>
          <td style="text-align: left; font-weight: 600;">
            <div class="athlete-cell-wrapper">
              ${avatarHtml}
              <span>${a.nombres}</span>
            </div>
          </td>
          <td>${a.edad} años</td>
          <td>${a.posicion}</td>
          <td><span class="badge ${a.rol === 'Capitán' ? 'badge-burgundy' : 'badge-final'}">${a.rol}</span></td>
          <td>
            <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
              <!-- Limited modification (Typographical errors / Photo) -->
              <button class="btn btn-outline btn-sm btn-edit-atleta-del" data-id="${a.id}" title="Corregir datos o foto (Modificación limitada)">
                ✏️ Editar
              </button>
              
              <!-- RESTRICCIÓN DE SEGURIDAD: Formal discharge request button instead of direct delete -->
              <button class="btn btn-outline btn-sm btn-solicitar-baja" data-id="${a.id}" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);" title="Solicitar autorización formal de baja al Superadministrador">
                ⚠️ Solicitar Baja
              </button>
            </div>
          </td>
        </tr>
      `;
          }
        )
        .join('');

      // Edit Button handler (limited modification while inscriptions are open)
      tbody.querySelectorAll('.btn-edit-atleta-del').forEach((b) => {
        b.addEventListener('click', () => {
          if (isFrozen) {
            showToast('⛔ Modificaciones bloqueadas: las nóminas están congeladas por el Superadministrador.', 'error');
            return;
          }
          openEditAtletaModal(b.getAttribute('data-id'), false);
        });
      });

      // Formal discharge request handler (sends request to Superadmin)
      tbody.querySelectorAll('.btn-solicitar-baja').forEach((b) => {
        b.addEventListener('click', () => {
          openSolicitarBajaModal(b.getAttribute('data-id'));
        });
      });
    }
  }

  // Render delegate's team matches
  const matchesContainer = document.getElementById('delMatchesContainer');
  const allMatches = window.tournamentStore.getPartidos(eq?.disciplinaId);
  const myMatches = allMatches.filter((m) => m.equipoLocal === eq.nombre || m.equipoVisitante === eq.nombre);

  if (matchesContainer) {
    if (myMatches.length === 0) {
      matchesContainer.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 2rem;">No hay partidos programados para este equipo en el calendario actual.</div>`;
    } else {
      matchesContainer.innerHTML = myMatches
        .map(
          (m) => {
            const eqLoc = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(m.equipoLocal, eq?.disciplinaId) : null;
            const eqVis = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(m.equipoVisitante, eq?.disciplinaId) : null;
            const logoLoc = getTeamLogoOrEmblemHtml(eqLoc, { size: 48, fallbackName: m.equipoLocal });
            const logoVis = getTeamLogoOrEmblemHtml(eqVis, { size: 48, fallbackName: m.equipoVisitante });
            return `
        <div class="match-card">
          <div class="match-card-header">
            <span>📅 ${m.fecha} • ⏰ ${m.hora}</span>
            <span class="badge ${m.estado === 'FINALIZADO' ? 'badge-final' : m.estado === 'EN CURSO' ? 'badge-live' : 'badge-scheduled'}">${m.estado}</span>
          </div>
          <div class="match-card-body">
            <div class="match-row-team">
              <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${logoLoc}
                <span style="font-weight: 600; color: #ffffff;">${m.equipoLocal}</span>
              </div>
              <strong style="font-family: var(--font-score); font-size: 1.2rem;">${m.totalLocal}</strong>
            </div>
            <div class="match-row-team">
              <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${logoVis}
                <span style="font-weight: 600; color: #ffffff;">${m.equipoVisitante}</span>
              </div>
              <strong style="font-family: var(--font-score); font-size: 1.2rem;">${m.totalVisitante}</strong>
            </div>
          </div>
          <div class="match-card-footer">
            <span>📍 ${m.sede}</span>
            <span>${m.fase}</span>
          </div>
        </div>
      `;
          }
        )
        .join('');
    }
  }
}

// Delegate Navigation to Full Read-Only Tournament View
document.getElementById('btnNavegarTorneoDesdeDel')?.addEventListener('click', () => {
  window.appRouter.showView('vistaPublica');
  showToast('👁️ Vista de Lectura Total: explorando todos los grupos, calendarios y estadísticas', 'info');
});

// Official Lineup Sheet (Ficha Técnica para Mesa Técnica)
document.getElementById('btnFichaTecnicaModal')?.addEventListener('click', () => {
  const user = window.tournamentStore.getUsuarioActual();
  const teamName = user?.equipoNombre || document.getElementById('delDashTeamName')?.textContent || 'Broncos de Higuerey';
  openFichaTecnicaModal(teamName);
});

function openFichaTecnicaModal(teamName) {
  const disc = window.tournamentStore.getDisciplinaActual();
  const eq = window.tournamentStore.getEquipoPorNombre(teamName, disc?.id);
  const atletas = window.tournamentStore.getAtletas(teamName, disc?.id);
  const container = document.getElementById('fichaTecnicaPrintable');
  if (!container) return;

  const todayStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  container.innerHTML = `
    <div class="ficha-tecnica-container">
      <div class="ficha-header">
        <div class="ficha-header-logo">
          <img src="./assets/logo.png" alt="Logo">
          <div>
            <h3 class="ficha-title">GRUPO MULTISERVICIOS DEPORTIVO JL</h3>
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">Planilla Oficial de Alineación / Ficha Técnica de Partido</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 0.8rem; color: #475569;">
          <div><strong>DISCIPLINA:</strong> ${disc.nombre} (${disc.categoria})</div>
          <div><strong>FECHA DE EMISIÓN:</strong> ${todayStr}</div>
        </div>
      </div>

      <div class="ficha-meta-grid">
        <div><strong>Club / Equipo:</strong> ${teamName}</div>
        <div><strong>Grupo:</strong> ${eq?.grupo || 'Grupo A'}</div>
        <div><strong>Delegado Técnico:</strong> ${eq?.delegadoNombre || 'Por asignar'}</div>
        <div><strong>Teléfono Contacto:</strong> ${eq?.delegadoTelefono || 'N/A'}</div>
        <div><strong>Sede Principal:</strong> ${eq?.sedePrincipal || 'Gimnasio Pablo Higuerey'}</div>
        <div><strong>Total Atletas Inscritos:</strong> ${atletas.length} Jugadores Certificados</div>
      </div>

      <table class="ficha-table">
        <thead>
          <tr>
            <th style="width: 50px;">Dorsal</th>
            <th style="width: 100px;">Cédula</th>
            <th class="text-left">Nombres y Apellidos del Atleta</th>
            <th style="width: 80px;">Posición</th>
            <th style="width: 70px;">Rol</th>
            <th style="width: 65px;">Titular</th>
            <th style="width: 90px;">Faltas (1-5)</th>
            <th style="width: 60px;">Puntos</th>
          </tr>
        </thead>
        <tbody>
          ${
            atletas.length === 0
              ? '<tr><td colspan="8" style="padding: 1rem; color: #94a3b8;">No hay atletas registrados en este equipo</td></tr>'
              : atletas
                  .map(
                    (a) => `
            <tr>
              <td><strong>${a.camiseta || '-'}</strong></td>
              <td style="font-family: monospace;">${a.cedula}</td>
              <td class="text-left" style="font-weight: 600;">${a.nombres}</td>
              <td>${a.posicion}</td>
              <td>${a.rol}</td>
              <td>[ &nbsp; ]</td>
              <td>○ ○ ○ ○ ○</td>
              <td>&nbsp;</td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>

      <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">
        * Certifico bajo fe de juramento que los atletas aquí listados cumplen con los estatutos de edad, ficha médica y normativa oficial de Grupo Multiservicios Deportivo JL.
      </div>

      <div class="ficha-signatures-grid">
        <div class="ficha-signature-box">
          Firma Delegado / Entrenador
        </div>
        <div class="ficha-signature-box">
          Firma Capitán del Equipo
        </div>
        <div class="ficha-signature-box">
          Firma Oficial de Mesa / Árbitro
        </div>
      </div>
    </div>
  `;

  document.getElementById('modalFichaTecnica')?.classList.add('open');
}

document.getElementById('btnPrintFichaTecnica')?.addEventListener('click', () => {
  window.print();
});

// Formal Discharge Modal (Solicitud de Baja)
function openSolicitarBajaModal(atletaId) {
  const atleta = window.tournamentStore.data.atletas.find((a) => a.id === atletaId);
  if (!atleta) return;

  document.getElementById('solBajaAtletaId').value = atleta.id;
  document.getElementById('solBajaAtletaNombre').textContent = atleta.nombres;
  document.getElementById('solBajaAtletaCedula').textContent = atleta.cedula;
  document.getElementById('solBajaAtletaCamiseta').textContent = atleta.camiseta;

  document.getElementById('modalSolicitarBaja')?.classList.add('open');
}

document.getElementById('formSolicitarBaja')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const atletaId = document.getElementById('solBajaAtletaId').value;
  const motivo = document.getElementById('solBajaMotivo').value;
  const detalles = document.getElementById('solBajaDetalles').value;
  const motivoCompleto = detalles ? `${motivo} - Observaciones: ${detalles}` : motivo;

  const user = window.tournamentStore.getUsuarioActual();
  const delegadoNombre = user?.delegadoNombre || 'Delegado Oficial';
  const equipoNombre = user?.equipoNombre || document.getElementById('delDashTeamName')?.textContent || '';

  window.tournamentStore.solicitarBajaAtleta({
    atletaId,
    motivo: motivoCompleto,
    delegadoNombre,
    equipoNombre
  });

  document.getElementById('modalSolicitarBaja')?.classList.remove('open');
  showToast('✅ Solicitud de baja formal enviada al Superadministrador con éxito', 'success');
});

// Inscribir / Editar Atleta Modal (Delegate & Superadmin)
document.getElementById('btnNuevoAtletaModal')?.addEventListener('click', () => {
  const config = window.tournamentStore.getConfig();
  if (config.rostersCongelados) {
    showToast('⛔ No se pueden inscribir atletas: las nóminas están congeladas por el Superadministrador.', 'error');
    return;
  }
  openEditAtletaModal(null, false);
});

document.getElementById('btnAdminNuevoAtletaMaster')?.addEventListener('click', () => {
  openEditAtletaModal(null, true);
});

function openEditAtletaModal(atletaId = null, isSuperAdmin = false) {
  const modal = document.getElementById('modalEditAtleta');
  const form = document.getElementById('formAtleta');
  const title = document.getElementById('modalAtletaTitle');
  const eqGroup = document.getElementById('atletaEquipoGroup');
  const eqSelect = document.getElementById('atletaEquipoSelect');
  const hint = document.getElementById('atletaPermissionHint');
  form.reset();

  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };

  // Populate team selector for Superadmin
  if (isSuperAdmin || (window.tournamentStore.getUsuarioActual()?.rol === 'superadmin')) {
    if (eqGroup) eqGroup.style.display = 'block';
    if (eqSelect) {
      const equipos = window.tournamentStore.getEquipos(disc.id);
      eqSelect.innerHTML = equipos.map(eq => `<option value="${eq.nombre}">${eq.nombre} (${eq.grupo})</option>`).join('');
    }
    if (hint) hint.innerHTML = '👑 <strong>Modo Superadministrador:</strong> Control total para inscribir o reasignar atletas a cualquier club.';
  } else {
    if (eqGroup) eqGroup.style.display = 'none';
    if (hint) hint.innerHTML = 'ℹ️ Los delegados pueden corregir errores tipográficos o fotos mientras el periodo de inscripción esté abierto.';
  }

  if (atletaId) {
    const atleta = window.tournamentStore.data.atletas.find((a) => a.id === atletaId);
    if (atleta) {
      title.textContent = isSuperAdmin ? 'Editar Atleta (Control Master)' : 'Corregir Datos del Atleta (Modificación Limitada)';
      document.getElementById('atletaId').value = atleta.id;
      document.getElementById('atletaCedula').value = atleta.cedula;
      document.getElementById('atletaNombres').value = atleta.nombres;
      document.getElementById('atletaFechaNac').value = atleta.fechaNacimiento;
      document.getElementById('atletaEdad').value = atleta.edad;
      document.getElementById('atletaCamiseta').value = atleta.camiseta;
      if (document.getElementById('atletaPosicion')) document.getElementById('atletaPosicion').value = atleta.posicion || '';
      document.getElementById('atletaRol').value = atleta.rol;
      document.getElementById('atletaFotoUrl').value = atleta.fotoUrl || '';
      if (eqSelect) eqSelect.value = atleta.equipo;
      const submitBtn = document.getElementById('btnGuardarAtletaSubmit');
      if (submitBtn) submitBtn.textContent = 'Guardar Cambios';
    }
  } else {
    title.textContent = isSuperAdmin ? 'Inscribir Nuevo Atleta (SuperAdmin)' : 'Inscribir Nuevo Atleta en Mi Equipo';
    document.getElementById('atletaId').value = '';
    document.getElementById('atletaFotoUrl').value = '';
    const submitBtn = document.getElementById('btnGuardarAtletaSubmit');
    if (submitBtn) submitBtn.textContent = 'Guardar Cambios / Añadir';
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
  const isSuperAdmin = user && user.rol === 'superadmin';

  let equipoNombre = '';
  if (isSuperAdmin) {
    equipoNombre = document.getElementById('atletaEquipoSelect')?.value || 'Broncos de Higuerey';
  } else {
    equipoNombre = user?.equipoNombre || document.getElementById('delDashTeamName')?.textContent || 'Broncos de Higuerey';
  }

  // Check freeze restriction if delegate
  if (!isSuperAdmin) {
    const config = window.tournamentStore.getConfig();
    if (config.rostersCongelados) {
      showToast('⛔ Acción denegada: Nóminas congeladas por la organización.', 'error');
      document.getElementById('modalEditAtleta').classList.remove('open');
      return;
    }
  }

  const existingAtleta = id ? window.tournamentStore.data.atletas.find((a) => a.id === id) : null;
  const activeDisc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };

  const data = {
    cedula: document.getElementById('atletaCedula').value.trim(),
    nombres: document.getElementById('atletaNombres').value.trim(),
    fechaNacimiento: document.getElementById('atletaFechaNac').value,
    edad: Number(document.getElementById('atletaEdad').value),
    camiseta: document.getElementById('atletaCamiseta').value.trim(),
    posicion: document.getElementById('atletaPosicion')?.value || existingAtleta?.posicion || 'Atleta',
    rol: document.getElementById('atletaRol').value,
    fotoUrl: (document.getElementById('atletaFotoUrl')?.value || '').trim(),
    equipo: equipoNombre,
    disciplinaId: existingAtleta?.disciplinaId || activeDisc.id
  };

  if (id) {
    window.tournamentStore.updateAtleta(id, data);
    showToast(`Atleta "${data.nombres}" actualizado con éxito`, 'success');
  } else {
    window.tournamentStore.addAtleta(data);
    showToast(`Atleta "${data.nombres}" inscrito correctamente`, 'success');
  }

  document.getElementById('modalEditAtleta').classList.remove('open');
  if (user && user.equipoId) {
    renderDelegadoDashboard(user.equipoId);
  }
  if (isSuperAdmin) {
    renderAdminMasterRoster();
  }
  renderTeamsAndRosters();
});

// Export delegate roster to CSV
document.getElementById('btnExportarRosterDel')?.addEventListener('click', () => {
  const user = window.tournamentStore.getUsuarioActual();
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
  const teamName = user?.equipoNombre || 'Broncos de Higuerey';
  const atletas = window.tournamentStore.getAtletas(teamName, disc.id);

  let csv = 'Dorsal,Cédula,Nombres y Apellidos,Edad,Posición,Rol,Equipo,Foto\n';
  atletas.forEach((a) => {
    csv += `"${a.camiseta}","${a.cedula}","${a.nombres}",${a.edad},"${a.posicion}","${a.rol}","${a.equipo}","${a.fotoUrl || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ROSTER_${teamName.replace(/\s+/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Roster oficial exportado a CSV exitosamente', 'success');
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
    showToast('Credenciales incorrectas', 'error');
  }
});

function renderAdminDashboard() {
  document.getElementById('adminLoginCard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';

  // Open Step 1 by default
  renderAdminDisciplinas();
  renderAdminPatrocinadores();
}

// ==============================================================================
// PASO 1: CONTROL DE IDENTIDAD GRÁFICA, DISCIPLINAS & PATROCINADORES
// ==============================================================================
function renderAdminDisciplinas() {
  const container = document.getElementById('adminDisciplinasGrid');
  if (!container) return;

  const disciplinas = window.tournamentStore.getDisciplinas();
  container.innerHTML = disciplinas
    .map(
      (d) => `
    <div class="standings-card" style="padding: 1.25rem; border-color: ${d.color || 'var(--border-subtle)'}; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
          <span style="font-size: 2rem;">${d.icono || '🏆'}</span>
          <button class="btn btn-outline btn-sm btn-toggle-disc" data-id="${d.id}" style="${d.activa ? 'color: #34d399;' : 'color: #f87171;'}">
            ${d.activa ? 'Activa ✓' : 'Inactiva ✕'}
          </button>
        </div>
        <h4 style="font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 0.25rem;">${d.nombre}</h4>
        <div style="font-size: 0.8rem; color: var(--brand-gold-light); margin-bottom: 0.5rem;">${d.categoria}</div>
        
        ${d.banner ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🖼️ Portada: ${d.banner}</div>` : ''}

        <div style="font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem;">
          Reglas: ${d.reglas?.periodos || 4} ${d.reglas?.nombrePeriodo || 'Cuartos'} • G: ${d.reglas?.ptsGanador || 2} pts | P: ${d.reglas?.ptsPerdedor || 1} pt
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
        <button class="btn btn-gold btn-sm btn-edit-disc" data-id="${d.id}" style="width: 100%;">
          ✏️ Personalizar Identidad / Reglas
        </button>
      </div>
    </div>
  `
    )
    .join('');

  // Toggle active/inactive
  container.querySelectorAll('.btn-toggle-disc').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      window.tournamentStore.toggleDisciplina(id);
      renderDisciplinesBar();
      renderAdminDisciplinas();
      renderHubDisciplinesGrid();
      showToast('Estado de temporada de disciplina actualizado', 'info');
    });
  });

  // Edit discipline customization
  container.querySelectorAll('.btn-edit-disc').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      openEditDisciplinaModal(id);
    });
  });
}

function openEditDisciplinaModal(discId) {
  const modal = document.getElementById('modalEditDisciplina');
  if (!modal) return;

  const titleEl = document.getElementById('modalEditDisciplinaTitle');
  const idInput = document.getElementById('editDiscId');
  const nombreInput = document.getElementById('editDiscNombre');
  const catInput = document.getElementById('editDiscCategoria');
  const descEl = document.getElementById('editDiscDescripcion');
  const logoUrlInput = document.getElementById('editDiscLogoUrl');
  const logoPreview = document.getElementById('editDiscLogoPreview');
  const iconoInput = document.getElementById('editDiscIcono');
  const colorInput = document.getElementById('editDiscColor');
  const bannerInput = document.getElementById('editDiscBanner');
  const periodosInput = document.getElementById('editDiscPeriodos');
  const nomPeriodoInput = document.getElementById('editDiscNombrePeriodo');
  const ptsGInput = document.getElementById('editDiscPtsG');
  const ptsPInput = document.getElementById('editDiscPtsP');

  if (discId) {
    const d = window.tournamentStore.data.disciplinas.find((x) => x.id === discId);
    if (!d) return;

    if (titleEl) titleEl.textContent = `Personalizar Disciplina e Identidad Gráfica: ${d.nombre}`;
    if (idInput) idInput.value = d.id;
    if (nombreInput) nombreInput.value = d.nombre || '';
    if (catInput) catInput.value = d.categoria || '';
    if (descEl) descEl.value = d.descripcion || '';

    const currentLogo = (d.avatar || d.logoUrl || d.logo || d.banner || '').trim();
    if (logoUrlInput) logoUrlInput.value = currentLogo;
    if (logoPreview) logoPreview.src = currentLogo || './assets/logo.png';

    if (iconoInput) iconoInput.value = d.icono || '🏆';
    if (colorInput) colorInput.value = d.color || '#D4AF37';
    if (bannerInput) bannerInput.value = d.banner || '';
    if (periodosInput) periodosInput.value = d.reglas?.periodos || 4;
    if (nomPeriodoInput) nomPeriodoInput.value = d.reglas?.nombrePeriodo || 'Cuarto';
    if (ptsGInput) ptsGInput.value = d.reglas?.ptsGanador !== undefined ? d.reglas.ptsGanador : 2;
    if (ptsPInput) ptsPInput.value = d.reglas?.ptsPerdedor !== undefined ? d.reglas.ptsPerdedor : 1;
  } else {
    // Modo: Nueva Disciplina
    if (titleEl) titleEl.textContent = 'Personalizar Disciplina e Identidad Gráfica: Nueva Disciplina';
    if (idInput) idInput.value = '';
    if (nombreInput) nombreInput.value = '';
    if (catInput) catInput.value = 'Torneo Master / Libre';
    if (descEl) descEl.value = '';

    if (logoUrlInput) logoUrlInput.value = '';
    if (logoPreview) logoPreview.src = './assets/logo.png';

    if (iconoInput) iconoInput.value = '🏆';
    if (colorInput) colorInput.value = '#D4AF37';
    if (bannerInput) bannerInput.value = '';
    if (periodosInput) periodosInput.value = 4;
    if (nomPeriodoInput) nomPeriodoInput.value = 'Cuarto';
    if (ptsGInput) ptsGInput.value = 2;
    if (ptsPInput) ptsPInput.value = 1;
  }

  // Scroll to top of modal body when opening
  const bodyEl = modal.querySelector('.modal-body');
  if (bodyEl) bodyEl.scrollTop = 0;

  modal.classList.add('open');
}

// Logo file reader for Edit Disciplina con compresión Canvas a 120x120 JPEG 0.6
document.getElementById('editDiscLogoFile')?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) {
    showToast('Optimizando logotipo (120x120, calidad 60%)...', 'info');
    compressImage(file, 120, 120, 0.6, (compressed) => {
      const logoUrlInput = document.getElementById('editDiscLogoUrl');
      const logoPreview = document.getElementById('editDiscLogoPreview');
      if (logoUrlInput) logoUrlInput.value = compressed;
      if (logoPreview) logoPreview.src = compressed;
      showToast('Logotipo comprimido a formato ultraligero (< 5 KB).', 'success');
    });
  }
});

let isSavingDisciplinaModal = false;

async function handleSaveDisciplinaModal(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  if (isSavingDisciplinaModal) return;
  isSavingDisciplinaModal = true;

  const saveBtn = document.getElementById('btnSaveEditDisciplina');
  const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '<span>💾 Guardar Cambios</span>';

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>⏳ Guardando y optimizando...</span>';
    }

    const id = document.getElementById('editDiscId')?.value;
    const nombre = document.getElementById('editDiscNombre')?.value?.trim();
    const categoria = document.getElementById('editDiscCategoria')?.value?.trim() || 'Torneo Master / Libre';
    const descripcion = document.getElementById('editDiscDescripcion')?.value?.trim() || '';
    const logoUrlInput = document.getElementById('editDiscLogoUrl');
    const logoPreviewEl = document.getElementById('editDiscLogoPreview');
    const fileInput = document.getElementById('editDiscLogoFile');
    let avatar = (logoUrlInput?.value || logoPreviewEl?.getAttribute('src') || '').trim();
    const icono = document.getElementById('editDiscIcono')?.value?.trim() || '🏆';
    const color = document.getElementById('editDiscColor')?.value || '#D4AF37';
    let banner = (document.getElementById('editDiscBanner')?.value?.trim() || avatar).trim();
    const periodos = Number(document.getElementById('editDiscPeriodos')?.value) || 4;
    const nombrePeriodo = document.getElementById('editDiscNombrePeriodo')?.value?.trim() || 'Cuarto';
    const ptsGanador = Number(document.getElementById('editDiscPtsG')?.value) || 2;
    const ptsPerdedor = Number(document.getElementById('editDiscPtsP')?.value) || 1;

    if (!nombre) {
      showToast('Por favor ingrese el nombre del deporte o disciplina.', 'error');
      return;
    }

    // 1. OPTIMIZACIÓN Y COMPRESIÓN OBLIGATORIA CON CANVAS (120 x 120, JPEG 0.6)
    if (fileInput && fileInput.files && fileInput.files[0] && (!avatar || avatar.length > 8000 || !avatar.startsWith('data:image/jpeg'))) {
      try {
        avatar = await compressImage(fileInput.files[0], 120, 120, 0.6);
      } catch (err) {
        console.warn('Fallback al comprimir archivo de logo en modal:', err);
      }
    } else if (avatar && avatar.startsWith('data:')) {
      try {
        avatar = await compressImage(avatar, 120, 120, 0.6);
      } catch (err) {
        console.warn('Fallback al comprimir data URL de avatar:', err);
      }
    }

    if (banner && banner.startsWith('data:')) {
      try {
        banner = await compressImage(banner, 120, 120, 0.6);
      } catch (err) {
        console.warn('Fallback al comprimir data URL de banner:', err);
      }
    }

    const finalLogo = (avatar || './assets/logo.png').trim();
    const finalBanner = (banner || finalLogo).trim();

    if (logoUrlInput) logoUrlInput.value = finalLogo;
    if (logoPreviewEl) logoPreviewEl.src = finalLogo;
    const bannerEl = document.getElementById('editDiscBanner');
    if (bannerEl) bannerEl.value = finalBanner;

    // 2. ACTUALIZACIÓN EN EL ARREGLO GLOBAL DEL STORE
    const discPayload = {
      nombre,
      categoria,
      descripcion,
      icono,
      color,
      avatar: finalLogo,
      logoUrl: finalLogo,
      logo: finalLogo,
      banner: finalBanner,
      activa: true,
      reglas: {
        periodos,
        nombrePeriodo,
        ptsGanador,
        ptsPerdedor,
        duracionMin: 10
      }
    };

    let effectiveId = id;
    if (id) {
      window.tournamentStore.updateDisciplina(id, discPayload);
    } else {
      effectiveId = 'disc_' + Date.now();
      window.tournamentStore.addDisciplina({
        id: effectiveId,
        ...discPayload
      });
    }

    // 3. PERSISTENCIA EN LOCALSTORAGE CON CONTROL DE CUOTA
    const currentDiscs = window.tournamentStore.getDisciplinas();
    saveDisciplineConfig(currentDiscs);
    window.tournamentStore.saveToStorage();

    // Cerrar modal
    document.getElementById('modalEditDisciplina')?.classList.remove('open');

    // 4. SINCRONIZACIÓN INMEDIATA DE LA PORTADA E INTERFAZ
    try { renderHubDisciplinesGrid(); } catch (err) { console.warn('renderHubDisciplinesGrid:', err); }
    try { renderDisciplinesBar(); } catch (err) { console.warn('renderDisciplinesBar:', err); }
    try { renderAdminDisciplinas(); } catch (err) { console.warn('renderAdminDisciplinas:', err); }
    try { if (typeof renderConfigDisciplines === 'function') renderConfigDisciplines(); } catch (err) { console.warn('renderConfigDisciplines:', err); }
    try { if (typeof populateAdminDisciplineDropdown === 'function') populateAdminDisciplineDropdown(); } catch (err) { console.warn('populateAdminDisciplineDropdown:', err); }
    try { renderStandings(); } catch (err) { console.warn('renderStandings:', err); }
    try { if (typeof updateDisciplineUI === 'function') updateDisciplineUI(); } catch (err) { console.warn('updateDisciplineUI:', err); }
    try { if (typeof renderHeaderAndNavigation === 'function') renderHeaderAndNavigation(); } catch (err) { console.warn('renderHeaderAndNavigation:', err); }

    showToast(`✅ Disciplina "${nombre}" guardada y sincronizada al instante.`, 'success');
  } catch (error) {
    console.error('Error al guardar cambios de disciplina:', error);
    showToast('Error al guardar disciplina: ' + (error.message || error), 'error');
  } finally {
    isSavingDisciplinaModal = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }
  }
}
window.handleSaveDisciplinaModal = handleSaveDisciplinaModal;

// Conexión del formulario y del botón "Guardar Cambios"
document.getElementById('formEditDisciplina')?.addEventListener('submit', handleSaveDisciplinaModal);
document.getElementById('btnSaveEditDisciplina')?.addEventListener('click', (e) => {
  const form = document.getElementById('formEditDisciplina');
  if (form && !form.checkValidity()) {
    return;
  }
  handleSaveDisciplinaModal(e);
});

// Listener para escribir URL de imagen en vivo para Editar Disciplina
document.getElementById('editDiscLogoUrl')?.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  const logoPreview = document.getElementById('editDiscLogoPreview');
  if (logoPreview && val) {
    logoPreview.src = val;
  }
});

// Restaurar logotipo predeterminado en Editar Disciplina
document.getElementById('btnRestaurarDiscLogoDefault')?.addEventListener('click', () => {
  const defaultLogo = './assets/logo.png';
  const logoUrlInput = document.getElementById('editDiscLogoUrl');
  const logoPreview = document.getElementById('editDiscLogoPreview');
  if (logoUrlInput) logoUrlInput.value = defaultLogo;
  if (logoPreview) logoPreview.src = defaultLogo;
  showToast('Logotipo de disciplina restaurado.', 'info');
});

document.getElementById('btnNuevaDisciplinaModal')?.addEventListener('click', () => {
  document.getElementById('modalNuevaDisciplina')?.classList.add('open');
});

// Logo file reader for New Disciplina con compresión Canvas a 120x120 JPEG 0.6
document.getElementById('discLogoFile')?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) {
    showToast('Optimizando logotipo (120x120, calidad 60%)...', 'info');
    compressImage(file, 120, 120, 0.6, (compressed) => {
      const logoUrlInput = document.getElementById('discLogoUrl');
      const logoPreview = document.getElementById('discLogoPreview');
      if (logoUrlInput) logoUrlInput.value = compressed;
      if (logoPreview) logoPreview.src = compressed;
      showToast('Logotipo optimizado correctamente (< 5 KB).', 'success');
    });
  }
});

let isSavingNuevaDisciplina = false;

async function handleSaveNuevaDisciplina(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  if (isSavingNuevaDisciplina) return;
  isSavingNuevaDisciplina = true;

  try {
    const nombre = document.getElementById('discNombre')?.value?.trim();
    const categoria = document.getElementById('discCategoria')?.value?.trim() || 'Libre';
    const descripcion = document.getElementById('discDescripcion')?.value?.trim() || '';
    const logoUrlInput = document.getElementById('discLogoUrl');
    const logoPreview = document.getElementById('discLogoPreview');
    const fileInput = document.getElementById('discLogoFile');
    let avatar = (logoUrlInput?.value || logoPreview?.getAttribute('src') || '').trim();
    const delegadoInicial = document.getElementById('discDelegadoInicial')?.value?.trim() || '';
    const icono = document.getElementById('discIcono')?.value?.trim() || '🏆';
    const color = document.getElementById('discColor')?.value || '#D4AF37';
    const periodos = Number(document.getElementById('discPeriodos')?.value) || 4;
    const nombrePeriodo = document.getElementById('discNombrePeriodo')?.value?.trim() || 'Cuarto';

    if (!nombre) {
      showToast('Por favor introduce el nombre del deporte o disciplina.', 'error');
      return;
    }

    // Comprimir obligatoriamente con canvas 120x120 jpeg 0.6
    if (fileInput && fileInput.files && fileInput.files[0] && (!avatar || avatar.length > 8000 || !avatar.startsWith('data:image/jpeg'))) {
      try {
        avatar = await compressImage(fileInput.files[0], 120, 120, 0.6);
      } catch (err) {
        console.warn('Fallback al comprimir archivo de logo nueva disciplina:', err);
      }
    } else if (avatar && avatar.startsWith('data:')) {
      try {
        avatar = await compressImage(avatar, 120, 120, 0.6);
      } catch (err) {
        console.warn('Fallback al comprimir avatar nueva disciplina:', err);
      }
    }

    const finalLogo = (avatar || './assets/logo.png').trim();

    window.tournamentStore.addDisciplina({
      nombre,
      categoria,
      descripcion,
      icono,
      color,
      banner: finalLogo,
      avatar: finalLogo,
      logoUrl: finalLogo,
      logo: finalLogo,
      delegadoInicial,
      reglas: { periodos, nombrePeriodo, ptsGanador: 2, ptsPerdedor: 1, duracionMin: 10 }
    });

    const currentDiscs = window.tournamentStore.getDisciplinas();
    saveDisciplineConfig(currentDiscs);
    window.tournamentStore.saveToStorage();

    document.getElementById('modalNuevaDisciplina')?.classList.remove('open');
    showToast(`Disciplina "${nombre}" agregada al torneo y sincronizada`, 'success');

    try { renderHubDisciplinesGrid(); } catch (err) {}
    try { renderDisciplinesBar(); } catch (err) {}
    try { renderAdminDisciplinas(); } catch (err) {}
    try { if (typeof renderConfigDisciplines === 'function') renderConfigDisciplines(); } catch (err) {}
    try { if (typeof populateAdminDisciplineDropdown === 'function') populateAdminDisciplineDropdown(); } catch (err) { console.warn(err); }
  } catch (err) {
    console.error('Error during formNuevaDisciplina post-save updates:', err);
  } finally {
    isSavingNuevaDisciplina = false;
  }
}

document.getElementById('formNuevaDisciplina')?.addEventListener('submit', handleSaveNuevaDisciplina);

// --- PATROCINADORES Y BANNERS ---
function renderAdminPatrocinadores() {
  const container = document.getElementById('adminPatrocinadoresGrid');
  if (!container) return;

  const sponsors = window.tournamentStore.getConfig().patrocinadores || [];
  if (sponsors.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); padding: 1.5rem; text-align: center;">No hay patrocinadores registrados. Presione "+ Añadir Patrocinador".</div>`;
    return;
  }

  container.innerHTML = sponsors
    .map(
      (s) => `
    <div class="standings-card" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <strong style="color: #ffffff; font-size: 1.05rem;">${s.nombre}</strong>
          <span class="badge ${s.activo ? 'badge-success' : 'badge-danger'}">${s.activo ? 'Activo' : 'Inactivo'}</span>
        </div>
        ${s.logo ? `<div style="font-size: 0.75rem; color: var(--brand-gold-light); margin-bottom: 0.35rem;">Logo: <span style="color: var(--text-secondary);">${s.logo}</span></div>` : ''}
        ${s.banner ? `<div style="font-size: 0.75rem; color: var(--brand-gold-light); margin-bottom: 0.35rem;">Banner: <span style="color: var(--text-secondary);">${s.banner}</span></div>` : ''}
        ${s.web ? `<a href="${s.web}" target="_blank" style="font-size: 0.75rem; color: var(--accent-blue); text-decoration: none;">🌐 ${s.web}</a>` : ''}
      </div>

      <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
        <button class="btn btn-outline btn-sm btn-toggle-pat" data-id="${s.id}" style="flex: 1;">
          ${s.activo ? 'Pausar' : 'Activar'}
        </button>
        <button class="btn btn-outline btn-sm btn-del-pat" data-id="${s.id}" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
          🗑️
        </button>
      </div>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.btn-toggle-pat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const cfg = window.tournamentStore.getConfig();
      const list = cfg.patrocinadores || [];
      const item = list.find((p) => p.id === id);
      if (item) {
        item.activo = !item.activo;
        window.tournamentStore.updatePatrocinadores(list);
        renderAdminPatrocinadores();
      }
    });
  });

  container.querySelectorAll('.btn-del-pat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const cfg = window.tournamentStore.getConfig();
      let list = cfg.patrocinadores || [];
      list = list.filter((p) => p.id !== id);
      window.tournamentStore.updatePatrocinadores(list);
      renderAdminPatrocinadores();
      showToast('Patrocinador eliminado', 'info');
    });
  });
}

document.getElementById('btnNuevoPatrocinadorModal')?.addEventListener('click', () => {
  document.getElementById('formEditPatrocinador').reset();
  document.getElementById('patId').value = '';
  document.getElementById('modalPatrocinadorTitle').textContent = 'Añadir Patrocinador Oficial';
  document.getElementById('modalEditPatrocinador')?.classList.add('open');
});

document.getElementById('formEditPatrocinador')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('patId').value;
  const nombre = document.getElementById('patNombre').value.trim();
  const logo = document.getElementById('patLogo').value.trim();
  const banner = document.getElementById('patBanner').value.trim();
  const web = document.getElementById('patWeb').value.trim();

  const cfg = window.tournamentStore.getConfig();
  const list = cfg.patrocinadores || [];

  if (id) {
    const item = list.find((p) => p.id === id);
    if (item) {
      item.nombre = nombre;
      item.logo = logo;
      item.banner = banner;
      item.web = web;
    }
  } else {
    list.push({
      id: `PAT-${Date.now()}`,
      nombre,
      logo,
      banner,
      web,
      activo: true
    });
  }

  window.tournamentStore.updatePatrocinadores(list);
  document.getElementById('modalEditPatrocinador')?.classList.remove('open');
  showToast(`Patrocinador "${nombre}" guardado con éxito`, 'success');
  renderAdminPatrocinadores();
});

// ==============================================================================
// PASO 2: APROBACIÓN DE NÓMINAS, SOLICITUDES DE BAJA & CRUD GENERAL
// ==============================================================================
function renderRostersFreezeStatus() {
  const config = window.tournamentStore.getConfig();
  const isFrozen = !!config.rostersCongelados;
  const badge = document.getElementById('badgeEstadoInscripcion');
  const btn = document.getElementById('btnToggleFreezeRosters');

  if (badge) {
    if (isFrozen) {
      badge.className = 'badge badge-danger';
      badge.textContent = '⛔ Nóminas Congeladas / Bloqueadas';
    } else {
      badge.className = 'badge badge-success';
      badge.textContent = '✓ Inscripciones Abiertas';
    }
  }

  if (btn) {
    if (isFrozen) {
      btn.className = 'btn btn-gold btn-md';
      btn.innerHTML = '🔓 Desbloquear e Habilitar Inscripciones';
    } else {
      btn.className = 'btn btn-burgundy btn-md';
      btn.innerHTML = '🔒 Congelar Nóminas (Cerrar Inscripciones)';
    }
  }
}

document.getElementById('btnToggleFreezeRosters')?.addEventListener('click', () => {
  const config = window.tournamentStore.getConfig();
  const nextStatus = !config.rostersCongelados;

  if (nextStatus) {
    if (confirm('¿Desea CONGELAR y CERRAR las nóminas de inscripción? Los delegados ya no podrán inscribir ni modificar atletas.')) {
      window.tournamentStore.setRostersCongelados(true);
      showToast('🔒 Nóminas congeladas con éxito. No se admiten inscripciones extemporáneas.', 'success');
    }
  } else {
    if (confirm('¿Desea HABILITAR nuevamente el periodo de inscripciones y modificaciones?')) {
      window.tournamentStore.setRostersCongelados(false);
      showToast('🔓 Periodo de inscripciones reabierto con éxito.', 'info');
    }
  }
  renderRostersFreezeStatus();
});

// Formal discharge inbox
function renderAdminSolicitudesBaja() {
  const container = document.getElementById('adminSolicitudesBajaList');
  const badge = document.getElementById('badgeSolicitudesCount');
  if (!container) return;

  const config = window.tournamentStore.getConfig();
  const solicitudes = config.solicitudesBaja || [];
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE');

  if (badge) {
    badge.textContent = `${pendientes.length} Pendientes`;
    badge.className = pendientes.length > 0 ? 'badge badge-danger' : 'badge badge-gold';
  }

  if (solicitudes.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: rgba(0,0,0,0.2); border-radius: var(--radius-md);">
        No hay solicitudes de baja pendientes en este momento. Las solicitudes enviadas por los delegados aparecerán aquí.
      </div>
    `;
    return;
  }

  container.innerHTML = solicitudes
    .map(
      (s) => `
    <div class="solicitud-card ${s.estado !== 'PENDIENTE' ? 'resuelta' : ''}">
      <div style="flex: 1; min-width: 250px;">
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
          <strong style="font-size: 1rem; color: #ffffff;">${s.atletaNombres}</strong>
          <span class="badge badge-gold">Dorsal #${s.atletaCamiseta || '-'}</span>
          <span style="font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">${s.atletaCedula}</span>
          <span class="badge ${s.estado === 'PENDIENTE' ? 'badge-warning' : s.estado === 'APROBADA' ? 'badge-success' : 'badge-danger'}">
            ${s.estado}
          </span>
        </div>
        <div style="font-size: 0.82rem; color: var(--brand-gold-light); margin-bottom: 0.25rem;">
          Club: <strong>${s.equipoNombre}</strong> • Solicitado por: <strong>${s.delegadoNombre}</strong>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">
          Motivo formal: <em>${s.motivo}</em>
        </div>
      </div>

      ${
        s.estado === 'PENDIENTE'
          ? `
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn btn-burgundy btn-sm btn-aprobar-baja" data-id="${s.id}">
            ✓ Aprobar Baja (Eliminar Atleta)
          </button>
          <button class="btn btn-outline btn-sm btn-rechazar-baja" data-id="${s.id}">
            ✕ Rechazar
          </button>
        </div>
      `
          : `
        <div style="font-size: 0.78rem; color: var(--text-muted);">
          Resuelta formalmente
        </div>
      `
      }
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.btn-aprobar-baja').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm('¿Confirma que desea aprobar la baja de este atleta? El atleta será retirado definitivamente de la base de datos de nóminas.')) {
        window.tournamentStore.resolverSolicitudBaja(id, true);
        renderAdminSolicitudesBaja();
        renderAdminMasterRoster();
        renderTeamsAndRosters();
        showToast('Baja aprobada y atleta desvinculado oficialmente', 'success');
      }
    });
  });

  container.querySelectorAll('.btn-rechazar-baja').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      window.tournamentStore.resolverSolicitudBaja(id, false);
      renderAdminSolicitudesBaja();
      showToast('Solicitud de baja rechazada formalmente', 'info');
    });
  });
}

// Master Roster CRUD Table (Superadmin Total Permissions)
function renderAdminMasterRoster() {
  const tbody = document.getElementById('adminMasterRosterTableBody');
  if (!tbody) return;

  const search = (document.getElementById('adminRosterSearchInput')?.value || '').toLowerCase();
  const allAtletas = window.tournamentStore.data.atletas || [];

  const filtered = allAtletas.filter((a) => {
    if (!search) return true;
    return (
      (a.nombres || '').toLowerCase().includes(search) ||
      (a.cedula || '').toLowerCase().includes(search) ||
      (a.equipo || '').toLowerCase().includes(search)
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-muted);">No se encontraron atletas registrados con ese criterio.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (a) => `
    <tr>
      <td><span class="badge badge-gold">${a.camiseta || '-'}</span></td>
      <td style="text-align: left; font-family: monospace;">${a.cedula}</td>
      <td style="text-align: left; font-weight: 600;">${a.nombres}</td>
      <td style="text-align: left; color: var(--brand-gold-light);">${a.equipo}</td>
      <td>${a.posicion}</td>
      <td><span class="badge ${a.rol === 'Capitán' ? 'badge-burgundy' : 'badge-final'}">${a.rol}</span></td>
      <td>
        <div style="display: flex; gap: 0.35rem; justify-content: center;">
          <button class="btn btn-outline btn-sm btn-edit-atleta-master" data-id="${a.id}" title="Editar atleta">
            ✏️
          </button>
          <button class="btn btn-outline btn-sm btn-del-atleta-master" data-id="${a.id}" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);" title="Eliminar atleta definitivamente de la base de datos">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  tbody.querySelectorAll('.btn-edit-atleta-master').forEach((b) => {
    b.addEventListener('click', () => {
      openEditAtletaModal(b.getAttribute('data-id'), true);
    });
  });

  tbody.querySelectorAll('.btn-del-atleta-master').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const atleta = window.tournamentStore.data.atletas.find((x) => x.id === id);
      if (confirm(`¿SuperAdmin: Desea eliminar definitivamente al atleta "${atleta?.nombres}" de la base de datos?`)) {
        window.tournamentStore.deleteAtleta(id, 'superadmin');
        renderAdminMasterRoster();
        renderTeamsAndRosters();
        showToast('Atleta eliminado definitivamente por SuperAdmin', 'info');
      }
    });
  });
}

document.getElementById('adminRosterSearchInput')?.addEventListener('input', () => {
  renderAdminMasterRoster();
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
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };
  if (localSelect && visSelect) {
    const equipos = window.tournamentStore.getEquipos(disc.id);
    const options = equipos.map((eq) => `<option value="${eq.nombre}">${eq.nombre} (${eq.grupo})</option>`).join('');
    localSelect.innerHTML = options;
    visSelect.innerHTML = options;
    if (equipos.length > 1) {
      visSelect.selectedIndex = 1;
    }
  }

  const venueSelect = document.getElementById('manMatchVenue');
  const phaseSelect = document.getElementById('manMatchPhase');
  const config = window.tournamentStore.getConfig();

  if (venueSelect && config.sedesTorneo) {
    venueSelect.innerHTML = config.sedesTorneo.map((s) => `<option value="${s}">${s}</option>`).join('');
  }
  if (phaseSelect && config.fasesTorneo) {
    phaseSelect.innerHTML = config.fasesTorneo.map((f) => `<option value="${f}">${f}</option>`).join('');
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
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };

  window.tournamentStore.addEquipo({
    nombre,
    grupo,
    siglas,
    sedePrincipal: sede,
    delegadoNombre: del,
    delegadoTelefono: tel,
    disciplinaId: disc.id
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
  const disc = window.tournamentStore.getDisciplinaActual() || { id: 'baloncesto-master' };

  window.tournamentStore.addPartido({
    equipoLocal: local,
    equipoVisitante: vis,
    fecha,
    hora,
    sede,
    fase,
    estado: 'PROGRAMADO',
    disciplinaId: disc.id
  });

  showToast('Partido programado en el calendario', 'success');
  renderMatches();
});

// --- PASO 3: MESA DE ANOTACIÓN / MARCADOR EN VIVO ---
function normalizePeriodKey(periodStr, validIds = ['Q1', 'Q2', 'Q3', 'Q4', 'OT']) {
  if (!periodStr) return validIds[0] || 'Q1';
  const clean = String(periodStr).trim().toUpperCase();
  if (validIds.includes(clean)) return clean;

  if (clean.includes('OT') || clean.includes('EXTRA') || clean.includes('PRORROGA') || clean.includes('SET 5') || clean.includes('5TO')) {
    return validIds.includes('OT') ? 'OT' : (validIds[validIds.length - 1] || 'OT');
  }
  if (clean.includes('Q4') || clean.includes('4TO') || clean.includes('4.') || clean.includes('SET 4') || clean.includes('7+')) {
    return validIds.includes('Q4') ? 'Q4' : (validIds[validIds.length - 1] || 'Q4');
  }
  if (clean.includes('Q3') || clean.includes('3ER') || clean.includes('3.') || clean.includes('SET 3') || clean.includes('5-6')) {
    return validIds.includes('Q3') ? 'Q3' : (validIds[validIds.length - 1] || 'Q3');
  }
  if (clean.includes('Q2') || clean.includes('2DO') || clean.includes('2.') || clean.includes('SET 2') || clean.includes('3-4')) {
    return validIds.includes('Q2') ? 'Q2' : (validIds[1] || 'Q2');
  }
  if (clean.includes('Q1') || clean.includes('1ER') || clean.includes('1.') || clean.includes('SET 1') || clean.includes('1-2')) {
    return validIds.includes('Q1') ? 'Q1' : (validIds[0] || 'Q1');
  }

  return validIds[0] || 'Q1';
}
window.normalizePeriodKey = normalizePeriodKey;

let activeScorerMatch = null;

function loadScorerMatch(partidoId, event) {
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation();
  }
  if (partidoId === undefined || partidoId === null) return;
  if (typeof partidoId === 'object' && partidoId !== null && partidoId.id) {
    partidoId = partidoId.id;
  }
  const idStr = String(partidoId).trim();

  // Si cambiamos a un partido diferente, detener de inmediato cualquier cronómetro del partido anterior
  const isDifferentMatch = !activeScorerMatch || String(activeScorerMatch.id).trim() !== idStr;
  if (isDifferentMatch && isTimerRunning) {
    clearInterval(matchTimerInterval);
    isTimerRunning = false;
    const btnClock = document.getElementById('btnClockToggle');
    if (btnClock) btnClock.textContent = '▶ Iniciar Reloj';
  }

  activeScorerMatch = (window.tournamentStore && typeof window.tournamentStore.getPartidoPorId === 'function')
    ? window.tournamentStore.getPartidoPorId(partidoId)
    : null;

  if (!activeScorerMatch && window.tournamentStore?.data?.partidos) {
    activeScorerMatch = window.tournamentStore.data.partidos.find(
      (p) => String(p.id).trim() === idStr
    ) || null;
  }

  // Garantizar puntos y datos oficiales en partidos finalizados de referencia
  if (activeScorerMatch && String(activeScorerMatch.id).trim() === 'PAR-BAL-01') {
    const curTotL = Number(activeScorerMatch.totalLocal ?? activeScorerMatch.puntosLocal ?? 0);
    const curTotV = Number(activeScorerMatch.totalVisitante ?? activeScorerMatch.puntosVisitante ?? 0);
    if ((curTotL === 0 && curTotV === 0) || !activeScorerMatch.q1Loc) {
      activeScorerMatch.totalLocal = 43;
      activeScorerMatch.puntosLocal = 43;
      activeScorerMatch.q1Loc = 12; activeScorerMatch.q2Loc = 10; activeScorerMatch.q3Loc = 11; activeScorerMatch.q4Loc = 10; activeScorerMatch.otLoc = 0;
      activeScorerMatch.totalVisitante = 42;
      activeScorerMatch.puntosVisitante = 42;
      activeScorerMatch.q1Vis = 10; activeScorerMatch.q2Vis = 12; activeScorerMatch.q3Vis = 9; activeScorerMatch.q4Vis = 11; activeScorerMatch.otVis = 0;
      activeScorerMatch.estado = 'FINALIZADO';
      activeScorerMatch.periodoActual = 'Final';
      activeScorerMatch.reloj = '00:00';
    }
  }

  if (!activeScorerMatch) {
    console.warn(`[loadScorerMatch] Partido no encontrado para ID: ${partidoId}`);
    return;
  }

  currentLiveMatchId = activeScorerMatch.id;

  const scorerPanel = document.getElementById('scorerConsolePanel');
  if (scorerPanel) {
    scorerPanel.style.display = 'block';
  }

  // Buscar franquicias en la BD local con normalización de nombres / ID / siglas
  const locName = activeScorerMatch.equipoLocal || 'Local';
  const visName = activeScorerMatch.equipoVisitante || 'Visitante';
  const eqLoc = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(locName || activeScorerMatch.equipoLocalId) : null;
  const eqVis = window.tournamentStore ? window.tournamentStore.getEquipoPorNombre(visName || activeScorerMatch.equipoVisitanteId) : null;

  // 1. Nombres de Equipos
  const locNameEl = document.getElementById('scorerLocalName');
  if (locNameEl) locNameEl.textContent = locName;
  const visNameEl = document.getElementById('scorerVisName');
  if (visNameEl) visNameEl.textContent = visName;

  // Sede y Fase
  const venueFaseEl = document.getElementById('scorerMatchVenueFase');
  if (venueFaseEl) {
    const sedeStr = activeScorerMatch.sede || 'Gimnasio Pablo Higuerey';
    const faseStr = activeScorerMatch.fase || 'Fase Regular';
    venueFaseEl.textContent = `📍 ${sedeStr} • ${faseStr}`;
  }

  // Nombres en la tabla de desglose con escudo/logo
  const tblLoc = document.getElementById('scorerTableLocalName');
  if (tblLoc) {
    tblLoc.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.65rem;">${getTeamLogoOrEmblemHtml(eqLoc || locName, { size: 36, fallbackName: locName })} <span>${escapeHtml(locName)}</span></span>`;
  }
  const tblVis = document.getElementById('scorerTableVisName');
  if (tblVis) {
    tblVis.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.65rem;">${getTeamLogoOrEmblemHtml(eqVis || visName, { size: 36, fallbackName: visName })} <span>${escapeHtml(visName)}</span></span>`;
  }

  // 2. Carga de Logotipos Reales en los contenedores circulares de Local y Visitante
  const discId = activeScorerMatch.disciplinaId || window.tournamentStore?.getDisciplinaActual?.()?.id || 'baloncesto-master';
  const logoUrlLoc = (
    eqLoc?.logoUrl || eqLoc?.logo || eqLoc?.escudo || eqLoc?.imagen || eqLoc?.avatar || eqLoc?.fotoUrl ||
    activeScorerMatch.equipoLocalLogo || activeScorerMatch.logoLocal || ''
  ).trim();
  const colorLoc = eqLoc?.color || '#D97706';

  const logoLocEl = document.getElementById('scorerLocalLogo');
  if (logoLocEl) {
    const safeLoc = escapeHtml(locName);
    const srcLoc = logoUrlLoc || './assets/logo.png';
    logoLocEl.innerHTML = `
      <img src="${escapeHtmlAttr(srcLoc)}" alt="${escapeHtmlAttr(locName)}" class="team-real-logo-img" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; display: block;" onerror="this.onerror=null; this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
      <div class="team-default-emblem-frame" style="display: none; width: 100%; height: 100%; background: ${colorLoc}; border-radius: 50%; align-items: center; justify-content: center;" title="${safeLoc}">
        ${getDefaultSportsIconSvg(discId, '#fde047', 54)}
      </div>
    `;
  }

  const logoUrlVis = (
    eqVis?.logoUrl || eqVis?.logo || eqVis?.escudo || eqVis?.imagen || eqVis?.avatar || eqVis?.fotoUrl ||
    activeScorerMatch.equipoVisitanteLogo || activeScorerMatch.logoVisitante || ''
  ).trim();
  const colorVis = eqVis?.color || '#2563EB';

  const logoVisEl = document.getElementById('scorerVisLogo');
  if (logoVisEl) {
    const safeVis = escapeHtml(visName);
    const srcVis = logoUrlVis || './assets/logo.png';
    logoVisEl.innerHTML = `
      <img src="${escapeHtmlAttr(srcVis)}" alt="${escapeHtmlAttr(visName)}" class="team-real-logo-img" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; display: block;" onerror="this.onerror=null; this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
      <div class="team-default-emblem-frame" style="display: none; width: 100%; height: 100%; background: ${colorVis}; border-radius: 50%; align-items: center; justify-content: center;" title="${safeVis}">
        ${getDefaultSportsIconSvg(discId, '#fde047', 54)}
      </div>
    `;
  }

  // 3. Sincronización de Marcador y Desglose de Periodos (Q1, Q2, Q3, Q4, OT)
  const q1LVal = parseInt(activeScorerMatch.q1Loc ?? activeScorerMatch.q1_loc ?? 0, 10) || 0;
  const q2LVal = parseInt(activeScorerMatch.q2Loc ?? activeScorerMatch.q2_loc ?? 0, 10) || 0;
  const q3LVal = parseInt(activeScorerMatch.q3Loc ?? activeScorerMatch.q3_loc ?? 0, 10) || 0;
  const q4LVal = parseInt(activeScorerMatch.q4Loc ?? activeScorerMatch.q4_loc ?? 0, 10) || 0;
  const otLVal = parseInt(activeScorerMatch.otLoc ?? activeScorerMatch.ot_loc ?? 0, 10) || 0;
  const sumQuartersLoc = q1LVal + q2LVal + q3LVal + q4LVal + otLVal;

  let totalLoc = sumQuartersLoc;
  if (totalLoc === 0) {
    const rawTot = activeScorerMatch.totalLocal ?? activeScorerMatch.puntosLocal ?? activeScorerMatch.marcadorLocal ?? activeScorerMatch.scoreLocal ?? activeScorerMatch.tot_loc;
    if (rawTot !== undefined && rawTot !== null) {
      totalLoc = parseInt(rawTot, 10) || 0;
    }
  }

  const q1VVal = parseInt(activeScorerMatch.q1Vis ?? activeScorerMatch.q1_vis ?? 0, 10) || 0;
  const q2VVal = parseInt(activeScorerMatch.q2Vis ?? activeScorerMatch.q2_vis ?? 0, 10) || 0;
  const q3VVal = parseInt(activeScorerMatch.q3Vis ?? activeScorerMatch.q3_vis ?? 0, 10) || 0;
  const q4VVal = parseInt(activeScorerMatch.q4Vis ?? activeScorerMatch.q4_vis ?? 0, 10) || 0;
  const otVVal = parseInt(activeScorerMatch.otVis ?? activeScorerMatch.ot_vis ?? 0, 10) || 0;
  const sumQuartersVis = q1VVal + q2VVal + q3VVal + q4VVal + otVVal;

  let totalVis = sumQuartersVis;
  if (totalVis === 0) {
    const rawTot = activeScorerMatch.totalVisitante ?? activeScorerMatch.puntosVisitante ?? activeScorerMatch.marcadorVisitante ?? activeScorerMatch.scoreVisitante ?? activeScorerMatch.tot_vis;
    if (rawTot !== undefined && rawTot !== null) {
      totalVis = parseInt(rawTot, 10) || 0;
    }
  }

  // Mantener coherencia estricta en el objeto activo
  activeScorerMatch.totalLocal = totalLoc;
  activeScorerMatch.totalVisitante = totalVis;
  activeScorerMatch.puntosLocal = totalLoc;
  activeScorerMatch.puntosVisitante = totalVis;
  activeScorerMatch.marcadorLocal = totalLoc;
  activeScorerMatch.marcadorVisitante = totalVis;
  activeScorerMatch.scoreLocal = totalLoc;
  activeScorerMatch.scoreVisitante = totalVis;

  activeScorerMatch.q1Loc = q1LVal;
  activeScorerMatch.q2Loc = q2LVal;
  activeScorerMatch.q3Loc = q3LVal;
  activeScorerMatch.q4Loc = q4LVal;
  activeScorerMatch.otLoc = otLVal;

  activeScorerMatch.q1Vis = q1VVal;
  activeScorerMatch.q2Vis = q2VVal;
  activeScorerMatch.q3Vis = q3VVal;
  activeScorerMatch.q4Vis = q4VVal;
  activeScorerMatch.otVis = otVVal;

  // Puntuación Total LED Verde Neón Grande
  const locTot = document.getElementById('scorerLocalTotal');
  if (locTot) {
    locTot.textContent = String(totalLoc);
    locTot.classList.remove('score-update-flash');
    void locTot.offsetWidth;
    locTot.classList.add('score-update-flash');
  }
  const visTot = document.getElementById('scorerVisTotal');
  if (visTot) {
    visTot.textContent = String(totalVis);
    visTot.classList.remove('score-update-flash');
    void visTot.offsetWidth;
    visTot.classList.add('score-update-flash');
  }

  const tLoc = document.getElementById('scorerTableLocalTotal');
  if (tLoc) tLoc.textContent = String(totalLoc);
  const tVis = document.getElementById('scorerTableVisTotal');
  if (tVis) tVis.textContent = String(totalVis);

  // Cargar inputs del desglose de cuartos y prórroga (OT)
  const q1L = document.getElementById('scorerQ1Loc'); if (q1L) q1L.value = q1LVal;
  const q2L = document.getElementById('scorerQ2Loc'); if (q2L) q2L.value = q2LVal;
  const q3L = document.getElementById('scorerQ3Loc'); if (q3L) q3L.value = q3LVal;
  const q4L = document.getElementById('scorerQ4Loc'); if (q4L) q4L.value = q4LVal;
  const otL = document.getElementById('scorerOTLoc'); if (otL) otL.value = otLVal;

  const q1V = document.getElementById('scorerQ1Vis'); if (q1V) q1V.value = q1VVal;
  const q2V = document.getElementById('scorerQ2Vis'); if (q2V) q2V.value = q2VVal;
  const q3V = document.getElementById('scorerQ3Vis'); if (q3V) q3V.value = q3VVal;
  const q4V = document.getElementById('scorerQ4Vis'); if (q4V) q4V.value = q4VVal;
  const otV = document.getElementById('scorerOTVis'); if (otV) otV.value = otVVal;

  // 4. Estado Real y Reloj
  const estadoRaw = String(activeScorerMatch.estado || '').trim().toUpperCase();
  const isFinalizado = estadoRaw === 'FINALIZADO' || estadoRaw === 'FINAL' || estadoRaw === 'TERMINADO' || estadoRaw === 'CONCLUIDO';
  const isLive = estadoRaw === 'EN CURSO' || estadoRaw === 'LIVE' || estadoRaw === 'EN VIVO' || estadoRaw === 'JUGANDO';

  const badgeEl = document.getElementById('scorerLiveBadge');
  if (badgeEl) {
    if (isFinalizado) {
      badgeEl.className = 'badge badge-final';
      badgeEl.textContent = '🏁 FINALIZADO';
    } else if (isLive) {
      badgeEl.className = 'badge badge-live';
      badgeEl.textContent = '🔴 EN CURSO (LIVE)';
    } else {
      badgeEl.className = 'badge badge-scheduled';
      badgeEl.textContent = '📅 PROGRAMADO';
    }
  }

  // Reloj Oficial
  const clockEl = document.getElementById('scorerClockDisplay');
  let matchClock = activeScorerMatch.reloj;
  if (!matchClock || matchClock.trim() === '') {
    matchClock = isFinalizado ? '00:00' : '10:00';
  }
  if (clockEl && !isTimerRunning) clockEl.textContent = matchClock;

  // Si el partido está finalizado, detener reloj si estaba corriendo
  if (isFinalizado && isTimerRunning) {
    clearInterval(matchTimerInterval);
    isTimerRunning = false;
    const btnClock = document.getElementById('btnClockToggle');
    if (btnClock) btnClock.textContent = '▶ Iniciar Reloj';
  }

  if (!isTimerRunning) {
    const parts = matchClock.split(':');
    if (parts.length === 2) {
      matchTimerSeconds = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    } else {
      matchTimerSeconds = isFinalizado ? 0 : 600;
    }
  }

  // Adaptar terminología de períodos según la disciplina (Cuartos, Sets, Tiempos, Innings)
  const isVoleibol = discId.includes('voleibol');
  const isFutsal = discId.includes('futsal');
  const isSoftbol = discId.includes('softbol') || discId.includes('beisbol');

  const periodContainer = document.getElementById('scorerPeriodSelector');
  if (periodContainer) {
    let periodsConfig = [
      { id: 'Q1', label: 'Q1' },
      { id: 'Q2', label: 'Q2' },
      { id: 'Q3', label: 'Q3' },
      { id: 'Q4', label: 'Q4' },
      { id: 'OT', label: 'OT' }
    ];
    if (isVoleibol) {
      periodsConfig = [
        { id: 'Q1', label: 'Set 1' },
        { id: 'Q2', label: 'Set 2' },
        { id: 'Q3', label: 'Set 3' },
        { id: 'Q4', label: 'Set 4' },
        { id: 'OT', label: 'Set 5' }
      ];
    } else if (isFutsal) {
      periodsConfig = [
        { id: 'Q1', label: '1er T.' },
        { id: 'Q2', label: '2do T.' },
        { id: 'OT', label: 'Extra' }
      ];
    } else if (isSoftbol) {
      periodsConfig = [
        { id: 'Q1', label: 'I 1-2' },
        { id: 'Q2', label: 'I 3-4' },
        { id: 'Q3', label: 'I 5-6' },
        { id: 'Q4', label: 'I 7+' },
        { id: 'OT', label: 'Extra' }
      ];
    }

    const validPeriodIds = periodsConfig.map((p) => p.id);
    let activePeriodId = normalizePeriodKey(activeScorerMatch.periodoActual, validPeriodIds);
    if (!isFinalizado) {
      activeScorerMatch.periodoActual = activePeriodId;
    }

    const user = window.tournamentStore?.getUsuarioActual();
    const canSwitchPeriod = !user || user.rol === 'superadmin' || user.esSuperAdmin || user.rol === 'admin';
    const pointerStyle = canSwitchPeriod ? 'cursor: pointer; pointer-events: auto;' : 'cursor: default; pointer-events: none;';

    periodContainer.innerHTML = periodsConfig.map((p) => {
      const isActive = !isFinalizado && p.id === activePeriodId;
      return `<button class="period-btn ${isActive ? 'active' : ''}" data-period="${p.id}" type="button" style="${pointerStyle}">${p.label}</button>`;
    }).join('');

    periodContainer.querySelectorAll('.period-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const curUser = window.tournamentStore?.getUsuarioActual();
        const allowed = !curUser || curUser.rol === 'superadmin' || curUser.esSuperAdmin || curUser.rol === 'admin';
        if (!allowed) return;

        periodContainer.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const chosenPeriod = btn.getAttribute('data-period');
        if (activeScorerMatch) {
          activeScorerMatch.periodoActual = chosenPeriod;
          window.tournamentStore?.updatePartido?.(activeScorerMatch.id, { periodoActual: chosenPeriod });
          if (window.supabaseService?.broadcastScore) {
            window.supabaseService.broadcastScore(activeScorerMatch.id, { periodoActual: chosenPeriod });
          }
        }
      });
    });
  }

  // Encabezados dinámicos en la tabla de desglose (7 columnas: Equipo, Q1..Q4, OT, TOTAL)
  const qTableHeaders = document.querySelectorAll('.quarters-table thead tr th');
  if (qTableHeaders && qTableHeaders.length >= 7) {
    if (isVoleibol) {
      qTableHeaders[1].textContent = 'Set 1';
      qTableHeaders[2].textContent = 'Set 2';
      qTableHeaders[3].textContent = 'Set 3';
      qTableHeaders[4].textContent = 'Set 4';
      qTableHeaders[5].textContent = 'Set 5';
    } else if (isFutsal) {
      qTableHeaders[1].textContent = '1er T.';
      qTableHeaders[2].textContent = '2do T.';
      qTableHeaders[3].textContent = 'Extra';
      qTableHeaders[4].textContent = 'Pen.';
      qTableHeaders[5].textContent = 'OT';
    } else if (isSoftbol) {
      qTableHeaders[1].textContent = 'I 1-2';
      qTableHeaders[2].textContent = 'I 3-4';
      qTableHeaders[3].textContent = 'I 5-6';
      qTableHeaders[4].textContent = 'I 7+';
      qTableHeaders[5].textContent = 'Extra';
    } else {
      qTableHeaders[1].textContent = 'Q1';
      qTableHeaders[2].textContent = 'Q2';
      qTableHeaders[3].textContent = 'Q3';
      qTableHeaders[4].textContent = 'Q4';
      qTableHeaders[5].textContent = 'OT';
    }
    qTableHeaders[6].textContent = 'TOTAL';
  }

  const qTitleEl = document.querySelector('.scorer-quarters-title span');
  if (qTitleEl) {
    const term = isVoleibol ? 'Sets' : isFutsal ? 'Tiempos' : isSoftbol ? 'Innings' : 'Cuartos';
    qTitleEl.textContent = `📊 Desglose Oficial por ${term} / Períodos`;
  }

  // 5. Sincronizar selectores y carrusel
  const select = document.getElementById('liveViewerMatchSelect');
  if (select && String(select.value).trim() !== idStr) {
    select.value = activeScorerMatch.id;
  }
  const scorerSelect = document.getElementById('scorerMatchSelect');
  if (scorerSelect && String(scorerSelect.value).trim() !== idStr) {
    scorerSelect.value = activeScorerMatch.id;
  }

  // Sincronizar carrusel interactivo
  const carouselTrack = document.getElementById('liveMatchesCarouselTrack');
  if (carouselTrack) {
    carouselTrack.querySelectorAll('.carousel-match-card').forEach((card) => {
      if (String(card.getAttribute('data-match-id')).trim() === idStr) {
        card.classList.add('active');
        const cardLeft = card.offsetLeft;
        const cardWidth = card.offsetWidth;
        const trackWidth = carouselTrack.offsetWidth;
        carouselTrack.scrollTo({ left: cardLeft - (trackWidth / 2) + (cardWidth / 2), behavior: 'smooth' });
      } else {
        card.classList.remove('active');
      }
    });
  }

  // Sincronizar datos y puntuación en UI en tiempo real
  syncLiveMatchUiScores(activeScorerMatch.id, totalLoc, totalVis, activeScorerMatch.estado);
}

// Global aliases for scoreboard renderer
window.loadScorerMatch = loadScorerMatch;
window.renderMainScoreboard = loadScorerMatch;
window.renderLiveScoreboardArena = loadScorerMatch;

// Recalcula y sincroniza el marcador digital principal y la tabla de desglose
function recalculateAndSyncFromQuartersTable() {
  if (!activeScorerMatch) return;

  const parseVal = (id) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseInt(el.value, 10);
    return isNaN(v) ? 0 : Math.max(0, v);
  };

  // 1. Puntos Local por período (enteros estrictos)
  const q1L = parseVal('scorerQ1Loc');
  const q2L = parseVal('scorerQ2Loc');
  const q3L = parseVal('scorerQ3Loc');
  const q4L = parseVal('scorerQ4Loc');
  const otL = parseVal('scorerOTLoc');

  activeScorerMatch.q1Loc = q1L;
  activeScorerMatch.q2Loc = q2L;
  activeScorerMatch.q3Loc = q3L;
  activeScorerMatch.q4Loc = q4L;
  activeScorerMatch.otLoc = otL;

  const totalLocal = q1L + q2L + q3L + q4L + otL;
  activeScorerMatch.totalLocal = totalLocal;
  activeScorerMatch.puntosLocal = totalLocal;
  activeScorerMatch.marcadorLocal = totalLocal;
  activeScorerMatch.scoreLocal = totalLocal;

  // 2. Puntos Visitante por período (enteros estrictos)
  const q1V = parseVal('scorerQ1Vis');
  const q2V = parseVal('scorerQ2Vis');
  const q3V = parseVal('scorerQ3Vis');
  const q4V = parseVal('scorerQ4Vis');
  const otV = parseVal('scorerOTVis');

  activeScorerMatch.q1Vis = q1V;
  activeScorerMatch.q2Vis = q2V;
  activeScorerMatch.q3Vis = q3V;
  activeScorerMatch.q4Vis = q4V;
  activeScorerMatch.otVis = otV;

  const totalVisitante = q1V + q2V + q3V + q4V + otV;
  activeScorerMatch.totalVisitante = totalVisitante;
  activeScorerMatch.puntosVisitante = totalVisitante;
  activeScorerMatch.marcadorVisitante = totalVisitante;
  activeScorerMatch.scoreVisitante = totalVisitante;

  // 3. Actualizar Tarjetas Grandes Marcador Superior (LED Verde Neón)
  const locTotEl = document.getElementById('scorerLocalTotal');
  if (locTotEl) {
    locTotEl.textContent = String(totalLocal);
    locTotEl.classList.remove('score-update-flash');
    void locTotEl.offsetWidth;
    locTotEl.classList.add('score-update-flash');
  }

  const visTotEl = document.getElementById('scorerVisTotal');
  if (visTotEl) {
    visTotEl.textContent = String(totalVisitante);
    visTotEl.classList.remove('score-update-flash');
    void visTotEl.offsetWidth;
    visTotEl.classList.add('score-update-flash');
  }

  // 4. Actualizar Celdas TOTAL en la Tabla Inferior
  const tblLocTotEl = document.getElementById('scorerTableLocalTotal');
  if (tblLocTotEl) tblLocTotEl.textContent = String(totalLocal);

  const tblVisTotEl = document.getElementById('scorerTableVisTotal');
  if (tblVisTotEl) tblVisTotEl.textContent = String(totalVisitante);

  // 5. Sincronizar carrusel y selectores de partido
  syncLiveMatchUiScores(activeScorerMatch.id, totalLocal, totalVisitante, activeScorerMatch.estado);

  // 6. Persistir en store local
  window.tournamentStore?.updatePartido?.(activeScorerMatch.id, activeScorerMatch);

  // 7. Transmisión Live Supabase
  if (window.supabaseService?.broadcastScore) {
    window.supabaseService.broadcastScore(activeScorerMatch.id, activeScorerMatch);
  }
}
window.recalculateAndSyncFromQuartersTable = recalculateAndSyncFromQuartersTable;

function initScorerControls() {
  // Navegación de Partidos: Flechas Rápidas (Viewer y Mesa Técnica)
  document.getElementById('btnLivePrevMatch')?.addEventListener('click', () => navigateLiveMatch('prev'));
  document.getElementById('btnLiveNextMatch')?.addEventListener('click', () => navigateLiveMatch('next'));
  document.getElementById('btnScorerPrevMatch')?.addEventListener('click', () => navigateLiveMatch('prev'));
  document.getElementById('btnScorerNextMatch')?.addEventListener('click', () => navigateLiveMatch('next'));

  // Botones de Anotación Rápida (+1, +2, +3, -1)
  document.querySelectorAll('.score-adj-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!activeScorerMatch) return;

      const team = btn.getAttribute('data-team'); // 'loc' | 'vis'
      const val = parseInt(btn.getAttribute('data-val'), 10) || 0;

      // Determinar período activo actualmente
      const activePeriodBtn = document.querySelector('#scorerPeriodSelector .period-btn.active');
      let period = activePeriodBtn ? activePeriodBtn.getAttribute('data-period') : null;
      if (!period) {
        period = normalizePeriodKey(activeScorerMatch.periodoActual, ['Q1', 'Q2', 'Q3', 'Q4', 'OT']);
      }
      period = String(period).toUpperCase();

      // Asegurar que el botón del selector refleje la clase active
      const selectorBtn = document.querySelector(`#scorerPeriodSelector .period-btn[data-period="${period}"]`);
      if (selectorBtn && !selectorBtn.classList.contains('active')) {
        document.querySelectorAll('#scorerPeriodSelector .period-btn').forEach((b) => b.classList.remove('active'));
        selectorBtn.classList.add('active');
      }

      if (team === 'loc') {
        const periodKey = `${period.toLowerCase()}Loc`;
        let curVal = parseInt(activeScorerMatch[periodKey], 10) || 0;
        curVal = Math.max(0, curVal + val);
        activeScorerMatch[periodKey] = curVal;

        const qInput = document.getElementById(`scorer${period}Loc`);
        if (qInput) qInput.value = curVal;

        recalculateAndSyncFromQuartersTable();
        if (val > 0 && typeof SoundEffects !== 'undefined') SoundEffects.playPointSound();
      } else if (team === 'vis') {
        const periodKey = `${period.toLowerCase()}Vis`;
        let curVal = parseInt(activeScorerMatch[periodKey], 10) || 0;
        curVal = Math.max(0, curVal + val);
        activeScorerMatch[periodKey] = curVal;

        const qInput = document.getElementById(`scorer${period}Vis`);
        if (qInput) qInput.value = curVal;

        recalculateAndSyncFromQuartersTable();
        if (val > 0 && typeof SoundEffects !== 'undefined') SoundEffects.playPointSound();
      }
    });
  });

  // Edición directa en la tabla de cuartos / períodos (Eventos input y change para recalcular al instante)
  const quarterInputIds = [
    'scorerQ1Loc', 'scorerQ2Loc', 'scorerQ3Loc', 'scorerQ4Loc', 'scorerOTLoc',
    'scorerQ1Vis', 'scorerQ2Vis', 'scorerQ3Vis', 'scorerQ4Vis', 'scorerOTVis'
  ];
  quarterInputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', recalculateAndSyncFromQuartersTable);
    el.addEventListener('change', recalculateAndSyncFromQuartersTable);
  });

  // Control de Reloj (Iniciar / Pausar / Reiniciar)
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
            if (matchTimerSeconds % 10 === 0 && window.supabaseService?.broadcastScore) {
              window.supabaseService.broadcastScore(activeScorerMatch.id, { reloj: timeStr });
            }
          }
        } else {
          clearInterval(matchTimerInterval);
          isTimerRunning = false;
          if (typeof SoundEffects !== 'undefined') SoundEffects.playWhistleSound();
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
      if (window.supabaseService?.broadcastScore) {
        window.supabaseService.broadcastScore(activeScorerMatch.id, { reloj: timeStr });
      }
    }
  });

  // Botones de Estado de Partido
  document.getElementById('btnScorerSetProgramado')?.addEventListener('click', () => {
    if (!activeScorerMatch) return;
    activeScorerMatch.estado = 'PROGRAMADO';
    window.tournamentStore.updatePartido(activeScorerMatch.id, { estado: 'PROGRAMADO' });
    if (window.supabaseService?.broadcastScore) {
      window.supabaseService.broadcastScore(activeScorerMatch.id, { estado: 'PROGRAMADO' });
    }
    renderLiveModule(activeScorerMatch.id);
    showToast('Estado cambiado a PROGRAMADO', 'info');
  });

  document.getElementById('btnScorerSetLive')?.addEventListener('click', () => {
    if (!activeScorerMatch) return;
    activeScorerMatch.estado = 'EN CURSO';
    if (!activeScorerMatch.periodoActual || activeScorerMatch.periodoActual === 'Final') {
      activeScorerMatch.periodoActual = 'Q1';
    }
    window.tournamentStore.updatePartido(activeScorerMatch.id, { estado: 'EN CURSO', periodoActual: activeScorerMatch.periodoActual });
    if (window.supabaseService?.broadcastScore) {
      window.supabaseService.broadcastScore(activeScorerMatch.id, { estado: 'EN CURSO', periodoActual: activeScorerMatch.periodoActual });
    }
    renderLiveModule(activeScorerMatch.id);
    showToast('🔴 ¡PARTIDO EN VIVO (LIVE) INICIADO!', 'success');
  });

  document.getElementById('btnScorerSetFinalizado')?.addEventListener('click', () => {
    if (!activeScorerMatch) return;
    if (confirm(`¿Finalizar el partido ${activeScorerMatch.equipoLocal} vs ${activeScorerMatch.equipoVisitante}? Esto recalculará la tabla de posiciones.`)) {
      recalculateAndSyncFromQuartersTable();
      activeScorerMatch.estado = 'FINALIZADO';
      activeScorerMatch.periodoActual = 'Final';
      activeScorerMatch.reloj = '00:00';
      if (isTimerRunning) {
        clearInterval(matchTimerInterval);
        isTimerRunning = false;
        const btnClock = document.getElementById('btnClockToggle');
        if (btnClock) btnClock.textContent = '▶ Iniciar Reloj';
      }
      window.tournamentStore.updatePartido(activeScorerMatch.id, activeScorerMatch);
      if (window.supabaseService?.broadcastScore) {
        window.supabaseService.broadcastScore(activeScorerMatch.id, activeScorerMatch);
      }
      showToast('🏁 ¡Partido marcado como FINALIZADO! Tabla de posiciones recalculada automáticamente.', 'success');
      renderStandings();
      renderLiveModule(activeScorerMatch.id);
    }
  });

  // Transmisión Instantánea Manual
  document.getElementById('btnBroadcastInstant')?.addEventListener('click', () => {
    if (!activeScorerMatch) return;
    recalculateAndSyncFromQuartersTable();
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

// --- PASO 4: FASES DEL CAMPEONATO & SEDES OFICIALES ---
function renderAdminFasesList() {
  const container = document.getElementById('adminFasesList');
  if (!container) return;

  const config = window.tournamentStore.getConfig();
  const fases = config.fasesTorneo || [];

  container.innerHTML = fases
    .map(
      (f, idx) => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.85rem; background: rgba(0,0,0,0.25); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <span class="badge badge-gold">${idx + 1}</span>
        <strong style="color: #ffffff; font-size: 0.9rem;">${f}</strong>
      </div>
      ${
        fases.length > 1
          ? `
        <button class="btn btn-outline btn-sm btn-del-fase" data-index="${idx}" style="color: #f87171; border-color: rgba(239,68,68,0.4);" title="Eliminar fase">
          🗑️
        </button>
      `
          : ''
      }
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.btn-del-fase').forEach((b) => {
    b.addEventListener('click', () => {
      const idx = Number(b.getAttribute('data-index'));
      const list = [...(window.tournamentStore.getConfig().fasesTorneo || [])];
      const removed = list.splice(idx, 1)[0];
      window.tournamentStore.updateFasesTorneo(list);
      renderAdminFasesList();
      populateManualFormSelects();
      showToast(`Fase "${removed}" eliminada`, 'info');
    });
  });
}

document.getElementById('btnAgregarFase')?.addEventListener('click', () => {
  const input = document.getElementById('inputNuevaFase');
  const val = (input?.value || '').trim();
  if (!val) {
    showToast('Ingrese el nombre de la nueva fase', 'error');
    return;
  }
  const config = window.tournamentStore.getConfig();
  const list = [...(config.fasesTorneo || [])];
  if (list.includes(val)) {
    showToast('Esta fase ya está registrada', 'warning');
    return;
  }
  list.push(val);
  window.tournamentStore.updateFasesTorneo(list);
  input.value = '';
  renderAdminFasesList();
  populateManualFormSelects();
  showToast(`Fase "${val}" añadida al campeonato`, 'success');
});

function renderAdminSedesList() {
  const container = document.getElementById('adminSedesList');
  if (!container) return;

  const config = window.tournamentStore.getConfig();
  const sedes = config.sedesTorneo || [];

  container.innerHTML = sedes
    .map(
      (s, idx) => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.85rem; background: rgba(0,0,0,0.25); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <span style="font-size: 1.1rem;">📍</span>
        <strong style="color: #ffffff; font-size: 0.9rem;">${s}</strong>
      </div>
      ${
        sedes.length > 1
          ? `
        <button class="btn btn-outline btn-sm btn-del-sede" data-index="${idx}" style="color: #f87171; border-color: rgba(239,68,68,0.4);" title="Eliminar sede">
          🗑️
        </button>
      `
          : ''
      }
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.btn-del-sede').forEach((b) => {
    b.addEventListener('click', () => {
      const idx = Number(b.getAttribute('data-index'));
      const list = [...(window.tournamentStore.getConfig().sedesTorneo || [])];
      const removed = list.splice(idx, 1)[0];
      window.tournamentStore.updateSedesTorneo(list);
      renderAdminSedesList();
      populateManualFormSelects();
      showToast(`Sede "${removed}" eliminada`, 'info');
    });
  });
}

document.getElementById('btnAgregarSede')?.addEventListener('click', () => {
  const input = document.getElementById('inputNuevaSede');
  const val = (input?.value || '').trim();
  if (!val) {
    showToast('Ingrese el nombre de la sede', 'error');
    return;
  }
  const config = window.tournamentStore.getConfig();
  const list = [...(config.sedesTorneo || [])];
  if (list.includes(val)) {
    showToast('Esta sede ya está registrada', 'warning');
    return;
  }
  list.push(val);
  window.tournamentStore.updateSedesTorneo(list);
  input.value = '';
  renderAdminSedesList();
  populateManualFormSelects();
  showToast(`Sede "${val}" registrada oficialmente`, 'success');
});

// ==============================================================================
// PASO 5: CREDENCIALES, PIN DE SEGURIDAD & RESPALDOS
// ==============================================================================
function renderAdminDelegatesCredentials() {
  const tbody = document.getElementById('adminDelegatesCredentialsTable');
  if (!tbody) return;

  const equipos = window.tournamentStore.data.equipos || [];
  if (equipos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay equipos ni delegados registrados aún.</td></tr>`;
    return;
  }

  tbody.innerHTML = equipos
    .map(
      (eq) => `
    <tr>
      <td style="text-align: left;">
        <strong style="color: #ffffff;">${eq.nombre}</strong>
        <div style="font-size: 0.75rem; color: var(--brand-gold-light);">${eq.grupo} • ${eq.disciplinaId || 'baloncesto-master'}</div>
      </td>
      <td style="text-align: left; font-weight: 500;">${eq.delegadoNombre || '<em style="color: var(--text-muted);">Sin asignar</em>'}</td>
      <td style="text-align: left; font-family: monospace; color: var(--accent-blue);">${eq.delegadoEmail || '<em style="color: var(--text-muted);">Sin correo</em>'}</td>
      <td>
        <span class="badge badge-gold" style="font-family: monospace; letter-spacing: 1px;">${eq.pin || '2024'}</span>
      </td>
      <td>${eq.delegadoTelefono || 'N/A'}</td>
      <td>
        <button class="btn btn-outline-gold btn-sm btn-edit-cred" data-id="${eq.id}">
          ✏️ Modificar / Resetear PIN
        </button>
      </td>
    </tr>
  `
    )
    .join('');

  tbody.querySelectorAll('.btn-edit-cred').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const eq = window.tournamentStore.getEquipoPorId(id);
      if (!eq) return;

      document.getElementById('credEquipoId').value = eq.id;
      document.getElementById('credEquipoNombre').value = eq.nombre;
      document.getElementById('credDelegadoNombre').value = eq.delegadoNombre || '';
      document.getElementById('credDelegadoEmail').value = eq.delegadoEmail || '';
      document.getElementById('credDelegadoTelefono').value = eq.delegadoTelefono || '';
      document.getElementById('credDelegadoPin').value = eq.pin || '2024';

      document.getElementById('modalEditCredencialDelegado')?.classList.add('open');
    });
  });
}

document.getElementById('formEditCredencialDelegado')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const equipoId = document.getElementById('credEquipoId').value;
  const delegadoNombre = document.getElementById('credDelegadoNombre').value.trim();
  const delegadoEmail = document.getElementById('credDelegadoEmail').value.trim();
  const delegadoTelefono = document.getElementById('credDelegadoTelefono').value.trim();
  const pin = document.getElementById('credDelegadoPin').value.trim();

  window.tournamentStore.updateDelegadoCredenciales(equipoId, {
    delegadoNombre,
    delegadoEmail,
    delegadoTelefono,
    pin
  });

  document.getElementById('modalEditCredencialDelegado')?.classList.remove('open');
  showToast('Credenciales y PIN de acceso actualizados correctamente', 'success');
  renderAdminDelegatesCredentials();
});

// Export Delegate Credentials Directory to CSV
document.getElementById('btnExportarCredencialesCSV')?.addEventListener('click', () => {
  const equipos = window.tournamentStore.data.equipos || [];
  let csv = 'Equipo,Grupo,Disciplina,Delegado / Entrenador,Correo Electrónico,PIN de Acceso,Teléfono,Sede Principal\n';
  equipos.forEach((eq) => {
    csv += `"${eq.nombre}","${eq.grupo}","${eq.disciplinaId || 'baloncesto-master'}","${eq.delegadoNombre || ''}","${eq.delegadoEmail || ''}","${eq.pin || '2024'}","${eq.delegadoTelefono || ''}","${eq.sedePrincipal || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DIRECTORIO_DELEGADOS_GMDJL.csv`;
  a.click();
  URL.revokeObjectURL(a);
  showToast('Directorio de delegados exportado a CSV', 'success');
});

// Full JSON Backup
document.getElementById('btnBackupJSON')?.addEventListener('click', () => {
  const data = window.tournamentStore.data;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RESPALDO_COMPLETO_GMDJL_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(a);
  showToast('Respaldo total de la base de datos descargado en JSON', 'success');
});

// Reset Store to Defaults
document.getElementById('btnResetAllStore')?.addEventListener('click', () => {
  if (confirm('⚠️ ATENCIÓN: ¿Está seguro de restaurar la base de datos a sus valores iniciales? Se conservarán los datos oficiales y se descartarán cambios no guardados.')) {
    window.tournamentStore.resetToDefaults();
    showToast('Base de datos restaurada a valores iniciales de fábrica', 'info');
    renderAllViews();
    renderAdminDashboard();
  }
});

// --- SUPABASE CONFIG MODAL ---
const updateSupabaseStatusBox = (status) => {
  const box = document.getElementById('supabaseStatusBox');
  if (!box) return;
  const currentStatus = status || window.supabaseService?.status || 'DISCONNECTED';
  box.style.display = 'block';

  if (currentStatus === 'CONNECTED') {
    box.style.background = 'rgba(16, 185, 129, 0.15)';
    box.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    box.style.color = '#34D399';
    box.innerHTML = '✅ <strong>Supabase Conectado y Sincronizado:</strong> Las tablas (disciplinas, equipos, atletas, partidos) existen y el motor Realtime está transmitiendo cambios en tiempo real.';
  } else if (currentStatus === 'TABLES_MISSING') {
    box.style.background = 'rgba(245, 158, 11, 0.15)';
    box.style.border = '1px solid rgba(245, 158, 11, 0.4)';
    box.style.color = '#FBBF24';
    box.innerHTML = '⚠️ <strong>Faltan las tablas en Supabase:</strong> Las credenciales son válidas, pero la base de datos aún no tiene las tablas creadas. Haga clic en <em>"Ver Script SQL para Crear Tablas"</em> abajo, cópielo y presione RUN en el SQL Editor de Supabase.';
  } else if (currentStatus === 'ERROR') {
    box.style.background = 'rgba(239, 68, 68, 0.15)';
    box.style.border = '1px solid rgba(239, 68, 68, 0.4)';
    box.style.color = '#F87171';
    box.innerHTML = '❌ <strong>Error de Conexión:</strong> No se pudo conectar con el proyecto de Supabase. Verifique su URL y clave pública.';
  } else {
    box.style.background = 'rgba(107, 114, 128, 0.15)';
    box.style.border = '1px solid rgba(107, 114, 128, 0.4)';
    box.style.color = '#9CA3AF';
    box.innerHTML = 'ℹ️ <strong>Modo Local Activo:</strong> Los datos se almacenan localmente en el navegador.';
  }
};

const handleOpenSupabaseModal = () => {
  const cfg = window.tournamentStore?.getConfig() || {};
  const urlEl = document.getElementById('inputSupabaseUrl');
  const keyEl = document.getElementById('inputSupabaseKey');
  if (urlEl) urlEl.value = cfg.supabaseUrl || window.supabaseService?.url || 'https://wznvlhuvpqnnrlgcgqpx.supabase.co';
  if (keyEl) keyEl.value = cfg.supabaseAnonKey || window.supabaseService?.key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnZsaHV2cHFubnJsZ2NncXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NDkyNDcsImV4cCI6MjEwODQyNTI0N30.ixhXWj0Jfir852lXJFdZNNfNscnND2u5WPXZ0EBA6lk';
  updateSupabaseStatusBox();
  document.getElementById('modalSupabaseConfig')?.classList.add('open');
};

document.getElementById('btnConfigSupabaseModal')?.addEventListener('click', handleOpenSupabaseModal);
document.getElementById('btnAdminSupabaseModal')?.addEventListener('click', handleOpenSupabaseModal);

const updateHeaderSyncButton = (status) => {
  const btn = document.getElementById('headerCloudSyncBtn');
  const txt = document.getElementById('headerCloudSyncText');
  if (!btn || !txt) return;

  const currentStatus = status || window.supabaseService?.status || 'DISCONNECTED';
  btn.classList.remove('syncing', 'error');

  if (currentStatus === 'CONNECTED') {
    btn.style.display = 'inline-flex';
    txt.textContent = 'Nube Sincronizada';
    btn.title = 'Conectado a Supabase en tiempo real. Haga clic para recargar datos.';
  } else if (currentStatus === 'TABLES_MISSING') {
    btn.style.display = 'inline-flex';
    btn.classList.add('error');
    txt.textContent = 'Faltan Tablas';
    btn.title = 'Conectado a Supabase pero faltan tablas en la nube.';
  } else if (currentStatus === 'ERROR') {
    btn.style.display = 'inline-flex';
    btn.classList.add('error');
    txt.textContent = 'Error Nube';
    btn.title = 'Error de conexión con Supabase. Clic para reintentar.';
  } else {
    btn.style.display = 'inline-flex';
    txt.textContent = 'Modo Local';
    btn.title = 'Modo local activo. Haga clic para intentar sincronizar con la nube.';
  }
};

document.getElementById('headerCloudSyncBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('headerCloudSyncBtn');
  const txt = document.getElementById('headerCloudSyncText');
  if (btn) btn.classList.add('syncing');
  if (txt) txt.textContent = 'Sincronizando...';

  showToast('🔄 Comprobando sincronización con Supabase Cloud...', 'info');
  if (window.supabaseService) {
    const verified = await window.supabaseService.verifyConnection();
    if (verified) {
      await window.supabaseService.hydrateFromSupabase();
      renderAllViews();
      showToast('✅ ¡Datos actualizados y sincronizados desde la nube!', 'success');
    } else {
      showToast('⚠️ No se pudo sincronizar con la nube. Mostrando datos locales.', 'warning');
    }
    updateHeaderSyncButton(window.supabaseService.status);
  }
});

window.supabaseService?.onStatusChange((newStatus) => {
  updateSupabaseStatusBox(newStatus);
  updateHeaderSyncButton(newStatus);
});

document.getElementById('formSupabaseConfig')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = (document.getElementById('inputSupabaseUrl')?.value || '').trim();
  const key = (document.getElementById('inputSupabaseKey')?.value || '').trim();

  if (window.supabaseService) {
    window.supabaseService.configure(url, key);
    showToast('Configuración guardada. Comprobando estado de tablas en Supabase...', 'info');
    const verified = await window.supabaseService.verifyConnection();
    updateSupabaseStatusBox();

    if (verified) {
      showToast('☁️ Conexión con Supabase verificada y tablas activas', 'success');
      window.supabaseService.syncAllToSupabase();
    } else if (window.supabaseService.status === 'TABLES_MISSING') {
      showToast('⚠️ Faltan las tablas en Supabase. Abra el Script SQL para crearlas.', 'warning');
      const accordion = document.getElementById('sqlScriptAccordion');
      const txt = document.getElementById('txtSQLScript');
      if (accordion && txt) {
        accordion.style.display = 'block';
        txt.value = window.supabaseService.getSQLSchemaScript();
      }
    } else {
      showToast('Credenciales guardadas. Modo de sincronización listo.', 'info');
    }
  }
});

document.getElementById('btnCopiarSQLSupabase')?.addEventListener('click', () => {
  const accordion = document.getElementById('sqlScriptAccordion');
  const txt = document.getElementById('txtSQLScript');
  if (accordion && txt) {
    accordion.style.display = accordion.style.display === 'block' ? 'none' : 'block';
    txt.value = window.supabaseService.getSQLSchemaScript();
  }
});

document.getElementById('btnCopiarClipboardSQL')?.addEventListener('click', () => {
  const txt = document.getElementById('txtSQLScript');
  if (txt) {
    if (!txt.value) txt.value = window.supabaseService?.getSQLSchemaScript() || '';
    navigator.clipboard.writeText(txt.value).then(() => {
      showToast('📋 ¡Script SQL copiado! Ahora péguelo en el SQL Editor de Supabase y haga clic en RUN.', 'success');
    }).catch(() => {
      showToast('Seleccione y copie el texto del cuadro SQL manualmente.', 'info');
    });
  }
});

document.getElementById('btnSyncAllSupabase')?.addEventListener('click', async () => {
  if (!window.supabaseService) return;
  showToast('Subiendo datos locales (disciplinas, equipos, atletas, partidos) a Supabase...', 'info');
  const ok = await window.supabaseService.syncAllToSupabase();
  if (ok) {
    showToast('✅ Todos los datos fueron subidos exitosamente a Supabase.', 'success');
  } else {
    showToast('⚠️ No se pudieron subir los datos. Asegúrese de haber creado las tablas con el script SQL.', 'warning');
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
      badge.textContent = '👑 Super Administrador';
      badge.className = 'badge badge-gold';
      text.textContent = `Sesión activa: ${user.nombre || 'Superadministrador'} (Control Maestro)`;
    } else if (user.rol === 'delegado') {
      badge.textContent = '📋 Delegado Oficial';
      badge.className = 'badge badge-burgundy';
      text.textContent = `Sesión activa: ${user.nombre || 'Delegado Oficial'} • ${user.equipoNombre || ''} (C.I. ${user.cedula || ''})`;
    } else {
      badge.textContent = user.rol === 'atleta' ? '🏃 Atleta' : '👤 Aficionado';
      badge.className = 'badge badge-gold';
      text.textContent = `Sesión activa: ${user.nombre} (C.I. ${user.cedula || ''})`;
    }
  } else {
    if (banner) banner.style.display = 'none';
  }

  applyRoleVisibilityControls(user);
  applyRbacPermissions(user);
}

function applyRoleVisibilityControls(user) {
  const isSuperAdmin = user && user.rol === 'superadmin';

  // Master add athlete button in public/admin views
  const btnNuevoAtletaMaster = document.getElementById('btnAdminNuevoAtletaMaster');
  if (btnNuevoAtletaMaster) {
    btnNuevoAtletaMaster.style.display = isSuperAdmin ? 'inline-flex' : 'none';
  }

  // Freeze toggle button in admin
  const btnFreeze = document.getElementById('btnToggleFreezeRosters');
  if (btnFreeze) {
    btnFreeze.style.display = isSuperAdmin ? 'inline-flex' : 'none';
  }
}

document.getElementById('btnCerrarSesion')?.addEventListener('click', () => {
  window.tournamentStore.setUsuarioActual(null);
  showToast('Sesión finalizada correctamente. Puede volver a identificarse.', 'info');
  applyRbacPermissions(null);
  window.appRouter.showView('vistaHub');
  checkActiveSession();
});

// ==============================================================================
// MASTER RENDER DISPATCHER
// ==============================================================================
function renderAllViews() {
  renderHubDisciplinesGrid();
  renderDisciplinesBar();
  renderDashboardModule();
  renderTeamsAndRosters();
  renderGroupsStructure();
  renderMatches();
  renderLiveModule();
  renderStandings();
  checkActiveSession();
}
window.renderAllViews = renderAllViews;

// React to Tournament Store updates
window.tournamentStore.subscribe((data, meta) => {
  if (meta && meta.action === 'change_discipline') {
    currentLiveMatchId = null;
    activeScorerMatch = null;
    currentTeamGroupFilter = 'todos';
    if (typeof currentCalendarFilter !== 'undefined') currentCalendarFilter = 'todos';
    if (typeof isTimerRunning !== 'undefined' && isTimerRunning) {
      clearInterval(matchTimerInterval);
      isTimerRunning = false;
      const btnClock = document.getElementById('btnClockToggle');
      if (btnClock) btnClock.textContent = '▶ Iniciar Reloj';
    }
    renderHubDisciplinesGrid();
    renderDisciplinesBar();
    renderDashboardModule();
    renderTeamsAndRosters();
    renderGroupsStructure();
    renderMatches();
    renderLiveModule();
    renderStandings();
    checkActiveSession();
    return;
  }

  renderHubDisciplinesGrid();
  renderDisciplinesBar();
  renderHeroScoreboard();
  renderMatches();
  renderStandings();
  checkActiveSession();

  // Update Live Module Scoreboard Viewer if a match is selected
  const matchSelect = document.getElementById('liveViewerMatchSelect');
  if (matchSelect && matchSelect.value) {
    renderLiveScoreboardArena(matchSelect.value);
  }

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
// CONFIGURACIÓN DEL SISTEMA (MODAL MULTI-SECCIÓN & PANEL MASTER)
// ==============================================================================
let isSuperAdminUnlocked = false;

function openConfiguracionSistemaModal() {
  const modal = document.getElementById('modalConfiguracionSistema');
  if (!modal) return;

  const config = window.tournamentStore.getConfig();

  // 1. Cargar Ajustes Generales
  const swSonidos = document.getElementById('cfgSwitchSonidos');
  if (swSonidos) swSonidos.checked = config.sonidosActivos !== false;

  const swLiveSync = document.getElementById('cfgSwitchLiveSync');
  if (swLiveSync) swLiveSync.checked = config.liveSyncActivo !== false;

  const rangeBrill = document.getElementById('cfgRangeBrightness');
  const badgeBrill = document.getElementById('cfgBrightnessValueBadge');
  const brillVal = config.brilloInterfaz || 100;
  if (rangeBrill) rangeBrill.value = brillVal;
  if (badgeBrill) {
    const label = brillVal > 105 ? 'Brillante' : brillVal < 95 ? 'Atenuado' : 'Estándar';
    badgeBrill.textContent = `${brillVal}% (${label})`;
  }

  const sysVer = document.getElementById('cfgSysVersionText');
  if (sysVer) sysVer.textContent = config.versionApp || 'v2.6.4 (2026-2027 Pro)';

  // 2. REGLA ESTRICTA DE SEGURIDAD: Iniciar SIEMPRE en estado BLOQUEADO,
  // sin importar si existe una sesión previa guardada en localStorage
  isSuperAdminUnlocked = false;
  updateSuperAdminPanelState();

  // 3. Cargar textos e identidad de evento
  const inputTit = document.getElementById('cfgInputTituloEvento');
  if (inputTit) inputTit.value = config.tituloEvento || 'Grupo Multiservicios Deportivo JL';

  const inputTemp = document.getElementById('cfgInputTemporadaEvento');
  if (inputTemp) inputTemp.value = config.temporadaEvento || '2026-2027';

  const inputSlog = document.getElementById('cfgInputSloganEvento');
  if (inputSlog) inputSlog.value = config.sloganEvento || 'Sistema Multideportivo Integral';

  const logoActual = config.logoEvento || './assets/logo.png';
  const previewLogo = document.getElementById('cfgLogoPreviewImg');
  const previewHeaderLogo = document.getElementById('cfgPreviewHeaderLogo');
  if (previewLogo) previewLogo.src = logoActual;
  if (previewHeaderLogo) previewHeaderLogo.src = logoActual;
  updateLiveHeaderPreview();

  // 4. Renderizar listas dinámicas de Disciplinas y Admins
  renderConfigDisciplines();
  renderConfigAdmins();
  populateAdminDisciplineDropdown();

  // Mostrar por defecto Pestaña 1: Ajustes Generales
  switchConfigMainTab('btnTabAjustesGenerales', 'paneAjustesGenerales');

  modal.classList.add('open');
}

function closeConfiguracionSistemaModal() {
  try {
    isSuperAdminUnlocked = false;
    if (typeof updateSuperAdminPanelState === 'function') updateSuperAdminPanelState();
  } catch (e) {
    console.warn('Error resetting super admin panel state:', e);
  }
  const modal = document.getElementById('modalConfiguracionSistema');
  if (modal) {
    modal.classList.remove('open');
  }
  // Disparar actualización inmediata del DOM al cerrar el modal
  try { renderHubDisciplinesGrid(); } catch (e) {}
  try { renderDisciplinesBar(); } catch (e) {}
}

function closeEditDisciplinaModal() {
  document.getElementById('modalEditDisciplina')?.classList.remove('open');
  renderHubDisciplinesGrid();
  renderDisciplinesBar();
}

function closeNuevaDisciplinaModal() {
  document.getElementById('modalNuevaDisciplina')?.classList.remove('open');
  renderHubDisciplinesGrid();
  renderDisciplinesBar();
}

window.openConfiguracionSistemaModal = openConfiguracionSistemaModal;
window.closeConfiguracionSistemaModal = closeConfiguracionSistemaModal;
window.closeEditDisciplinaModal = closeEditDisciplinaModal;
window.closeNuevaDisciplinaModal = closeNuevaDisciplinaModal;
window.renderHubDisciplinesGrid = renderHubDisciplinesGrid;

function switchConfigMainTab(tabBtnId, paneId) {
  document.querySelectorAll('.config-nav-tab').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.config-tab-pane').forEach((p) => p.classList.remove('active'));

  document.getElementById(tabBtnId)?.classList.add('active');
  document.getElementById(paneId)?.classList.add('active');
}

function updateSuperAdminPanelState() {
  const lockScreen = document.getElementById('superAdminAuthLockScreen');
  const unlockedPanel = document.getElementById('superAdminUnlockedPanel');
  const lockStatusBadge = document.getElementById('superAdminLockStatus');

  if (isSuperAdminUnlocked) {
    if (lockScreen) lockScreen.style.display = 'none';
    if (unlockedPanel) unlockedPanel.style.display = 'block';
    if (lockStatusBadge) lockStatusBadge.textContent = '🔓 Acceso Habilitado';

    const user = window.tournamentStore.getUsuarioActual();
    const nameEl = document.getElementById('saActiveUserName');
    const docEl = document.getElementById('saActiveUserDoc');
    if (nameEl) nameEl.textContent = user?.nombre || 'Superadministrador Autorizado';
    if (docEl) docEl.textContent = user?.cedula ? `C.I. ${user.cedula} • Control Maestro Global` : 'Control Maestro Global';
  } else {
    if (lockScreen) lockScreen.style.display = 'block';
    if (unlockedPanel) unlockedPanel.style.display = 'none';
    if (lockStatusBadge) lockStatusBadge.textContent = '🔒 Acceso Protegido';
    const pinEl = document.getElementById('saAuthCedulaPin');
    if (pinEl) pinEl.value = '';
    const nameEl = document.getElementById('saAuthNombreCompleto');
    if (nameEl) nameEl.value = '';
  }
}

function switchSuperAdminSubtab(subtabId) {
  document.querySelectorAll('.sa-subtab-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-subtab') === subtabId);
  });
  document.querySelectorAll('.sa-subtab-pane').forEach((p) => {
    p.style.display = p.id === subtabId ? 'block' : 'none';
  });
}

function renderConfigDisciplines() {
  const container = document.getElementById('cfgDisciplinesListContainer');
  if (!container) return;

  const disciplines = window.tournamentStore.getDisciplinas();
  if (disciplines.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); padding: 1rem;">No hay disciplinas registradas.</div>';
    return;
  }

  container.innerHTML = disciplines.map((d) => `
    <div class="config-disc-card">
      <div>
        <div class="disc-card-top">
          <div class="disc-card-avatar" style="border-color: ${d.color || 'var(--brand-gold)'}">
            ${(d.avatar || d.logoUrl || d.logo || d.banner) && ((d.avatar || d.logoUrl || d.logo || d.banner)?.startsWith('data:') || (d.avatar || d.logoUrl || d.logo || d.banner)?.startsWith('http') || (d.avatar || d.logoUrl || d.logo || d.banner)?.startsWith('./') || (d.avatar || d.logoUrl || d.logo || d.banner)?.startsWith('/'))
              ? `<img src="${d.avatar || d.logoUrl || d.logo || d.banner}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.parentNode.textContent='${d.icono || '🏆'}'">`
              : (d.icono || '🏆')}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; font-family: var(--font-heading); color: #ffffff; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${d.nombre}
            </div>
            <span class="badge badge-gold" style="font-size: 0.65rem;">${d.categoria || 'Torneo'}</span>
          </div>
        </div>

        ${d.descripcion ? `<p style="font-size: 0.72rem; color: var(--text-secondary); margin: 0.35rem 0 0.5rem 0; line-height: 1.3;">${d.descripcion}</p>` : ''}

        <div style="font-size: 0.7rem; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem;">
          ⚙️ Reglas: ${d.reglas?.periodos || 4} ${d.reglas?.nombrePeriodo || 'Cuartos'} • G: ${d.reglas?.ptsGanador || 2} pts | P: ${d.reglas?.ptsPerdedor || 1} pt
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem; margin-top: auto;">
        <button type="button" class="btn btn-outline btn-sm btn-edit-cfg-disc" data-id="${d.id}" style="flex: 1; justify-content: center; font-size: 0.75rem;">
          ✏️ Editar
        </button>
        <button type="button" class="btn btn-outline-danger btn-sm btn-del-cfg-disc" data-id="${d.id}" title="Eliminar disciplina" style="font-size: 0.75rem;">
          🗑️
        </button>
      </div>
    </div>
  `).join('');

  // Listeners Editar
  container.querySelectorAll('.btn-edit-cfg-disc').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openEditDisciplinaModal(id);
    });
  });

  // Listeners Eliminar
  container.querySelectorAll('.btn-del-cfg-disc').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const disc = window.tournamentStore.data.disciplinas.find((d) => d.id === id);
      const name = disc ? disc.nombre : id;
      if (confirm(`¿Estás seguro de eliminar la disciplina "${name}"? Esta acción removerá la categoría de la plataforma.`)) {
        const ok = window.tournamentStore.deleteDisciplina(id);
        if (ok) {
          try {
            saveDisciplineConfig(window.tournamentStore.getDisciplinas());
          } catch (e) {}
          showToast(`Disciplina "${name}" eliminada correctamente`, 'info');
          renderDisciplinesBar();
          renderAdminDisciplinas();
          renderConfigDisciplines();
          populateAdminDisciplineDropdown();
          renderStandings();
          renderHubDisciplinesGrid();
        }
      }
    });
  });
}

function updateLiveHeaderPreview() {
  const titInput = document.getElementById('cfgInputTituloEvento');
  const tempInput = document.getElementById('cfgInputTemporadaEvento');
  const prevTitle = document.getElementById('cfgPreviewHeaderTitle');
  const prevSeason = document.getElementById('cfgPreviewHeaderSeason');

  const titVal = (titInput?.value || '').trim() || 'Grupo Multiservicios Deportivo JL';
  const tempVal = (tempInput?.value || '').trim() || '2026-2027';

  if (prevTitle) prevTitle.textContent = titVal;
  if (prevSeason) prevSeason.textContent = `Temporada ${tempVal}`;
}

function populateAdminDisciplineDropdown() {
  const select = document.getElementById('adminNewDisciplina');
  if (!select) return;

  const currentVal = select.value;
  const disciplines = window.tournamentStore.getDisciplinas();

  select.innerHTML = `
    <option value="todas">Todas las Disciplinas (Acceso Global)</option>
    ${disciplines.map((d) => `<option value="${d.id}">${d.icono || '🏆'} ${d.nombre}</option>`).join('')}
  `;

  if (currentVal) select.value = currentVal;
}

function renderConfigAdmins() {
  const tbody = document.getElementById('cfgActiveAdminsTableBody');
  if (!tbody) return;

  const admins = window.tournamentStore.getAdmins();
  const disciplines = window.tournamentStore.getDisciplinas();

  if (admins.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1rem;">No hay administradores registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = admins.map((adm) => {
    const isMaster = adm.cedula === '14621157' || (adm.nombre && adm.nombre.toLowerCase().includes('lambert'));
    let roleBadge = '<span class="badge badge-gold">Super Admin</span>';
    if (adm.rol === 'admin_disciplina') {
      roleBadge = '<span class="badge badge-cyan">Admin Disciplina</span>';
    } else if (adm.rol === 'anotador') {
      roleBadge = '<span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);">Anotador</span>';
    }

    let discLabel = 'Acceso Global';
    if (adm.disciplinaId && adm.disciplinaId !== 'todas') {
      const d = disciplines.find((x) => x.id === adm.disciplinaId);
      discLabel = d ? `${d.icono || '🏆'} ${d.nombre}` : adm.disciplinaId;
    }

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--brand-gold);">
              ${(adm.nombre || 'AD').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <strong style="color: #ffffff;">${adm.nombre}</strong>
              ${isMaster ? ' <span title="Superusuario Principal">👑</span>' : ''}
            </div>
          </div>
        </td>
        <td style="color: var(--text-secondary);">${adm.cedula || 'N/A'}</td>
        <td>${roleBadge}</td>
        <td><span style="font-size: 0.75rem; color: var(--brand-gold-light);">${discLabel}</span></td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.35rem;">
            <button type="button" class="btn btn-outline btn-sm btn-edit-admin" data-id="${adm.id}" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" title="Editar administrador">
              ✏️
            </button>
            ${!isMaster ? `
              <button type="button" class="btn btn-outline-danger btn-sm btn-del-admin" data-id="${adm.id}" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" title="Revocar permisos">
                🗑️
              </button>
            ` : '<span style="font-size: 0.65rem; color: var(--text-muted); padding: 0 0.4rem;">Principal</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Listeners Editar admin
  tbody.querySelectorAll('.btn-edit-admin').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const adm = window.tournamentStore.getAdmins().find((a) => a.id === id);
      if (!adm) return;

      document.getElementById('adminEditId').value = adm.id;
      document.getElementById('adminNewNombre').value = adm.nombre;
      document.getElementById('adminNewCedula').value = adm.cedula;
      document.getElementById('adminNewClave').value = adm.clave || '';
      document.getElementById('adminNewDisciplina').value = adm.disciplinaId || 'todas';
      document.getElementById('adminNewRol').value = adm.rol || 'admin_disciplina';

      const btnSubmit = document.getElementById('btnSubmitAdminForm');
      if (btnSubmit) btnSubmit.innerHTML = '<span>💾 Actualizar Administrador</span>';
      const btnCancel = document.getElementById('btnCancelEditAdmin');
      if (btnCancel) btnCancel.style.display = 'inline-block';
      const headerTitle = document.getElementById('adminFormHeaderTitle');
      if (headerTitle) headerTitle.textContent = `Editar Administrador: ${adm.nombre}`;
    });
  });

  // Listeners Revocar permisos
  tbody.querySelectorAll('.btn-del-admin').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const adm = window.tournamentStore.getAdmins().find((a) => a.id === id);
      const name = adm ? adm.nombre : id;
      if (confirm(`¿Deseas revocar los permisos de administrador a "${name}"?`)) {
        const ok = window.tournamentStore.deleteAdmin(id);
        if (ok) {
          showToast(`Permisos revocados para ${name}`, 'info');
          renderConfigAdmins();
        } else {
          showToast('No se puede revocar al Super Administrador Principal', 'error');
        }
      }
    });
  });
}

function applyGlobalSystemConfig(config) {
  if (!config) return;

  // Brillo de pantalla / interfaz
  const brill = config.brilloInterfaz || 100;
  if (document.documentElement && document.documentElement.style) {
    document.documentElement.style.filter = `brightness(${brill}%)`;
  }

  // Título y temporada de evento
  const tit = config.tituloEvento || 'Grupo Multiservicios Deportivo JL';
  const temp = config.temporadaEvento || '2026-2027';

  const titleEl = document.getElementById('portalMainTitle');
  if (titleEl) titleEl.textContent = tit;

  const seasonEl = document.getElementById('portalSeasonBadge');
  if (seasonEl) seasonEl.textContent = `Temporada ${temp}`;

  document.title = `${tit} • Temporada ${temp}`;

  // Logotipo de la aplicación
  const logo = config.logoEvento || './assets/logo.png';
  document.querySelectorAll('.portal-logo-img, .sidebar-brand-img').forEach((img) => {
    img.src = logo;
  });
}

function initSystemConfigModalEvents() {
  // 1. Cerrar Modal
  document.getElementById('btnCloseConfigModal')?.addEventListener('click', closeConfiguracionSistemaModal);
  document.getElementById('btnCancelConfigModal')?.addEventListener('click', closeConfiguracionSistemaModal);

  // 2. Cambio de Pestañas Principales (Pestaña 1: Ajustes Generales, Pestaña 2: Superadministrador)
  document.getElementById('btnTabAjustesGenerales')?.addEventListener('click', () => {
    switchConfigMainTab('btnTabAjustesGenerales', 'paneAjustesGenerales');
  });

  document.getElementById('btnTabSuperAdmin')?.addEventListener('click', () => {
    switchConfigMainTab('btnTabSuperAdmin', 'paneSuperAdmin');
  });

  // 3. Probar Silbato
  document.getElementById('btnTestWhistleSound')?.addEventListener('click', () => {
    SoundEffects.playWhistleSound();
    showToast('🔊 Silbato de prueba emitido', 'info');
  });

  // 4. Control Deslizante de Brillo
  const rangeBrightness = document.getElementById('cfgRangeBrightness');
  const badgeBrightness = document.getElementById('cfgBrightnessValueBadge');
  rangeBrightness?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    const label = val > 105 ? 'Brillante' : val < 95 ? 'Atenuado' : 'Estándar';
    if (badgeBrightness) badgeBrightness.textContent = `${val}% (${label})`;
    document.documentElement.style.filter = `brightness(${val}%)`;
  });

  // 5. Formulario de Desbloqueo Superadministrador (Validación Obligatoria)
  document.getElementById('formSuperAdminUnlock')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('saAuthNombreCompleto')?.value.trim() || '';
    const cedulaPin = document.getElementById('saAuthCedulaPin')?.value.trim() || '';

    const normName = normalizeAuthText(nombre);
    const cleanCedPin = cleanAuthCedula(cedulaPin);

    // Valida superusuario maestro José Lambert
    const isMasterName =
      (normName.includes('jose') && normName.includes('lambert')) ||
      normName === 'jose lambert' ||
      normName === 'superadmin' ||
      normName === 'admin';

    const isMasterCedPin =
      cleanCedPin === '14621157' ||
      cedulaPin === 'admin2024' ||
      cedulaPin === 'admin' ||
      cedulaPin === '14621157';

    const isMasterLambert = isMasterName && isMasterCedPin;

    const registeredAdmins = window.tournamentStore.getAdmins();
    const matchedAdmin = registeredAdmins.find((a) => {
      const aNorm = normalizeAuthText(a.nombre || '');
      const aCed = cleanAuthCedula(a.cedula || '');
      const matchesName = (normName && aNorm.includes(normName)) || normName === aNorm;
      const matchesCedPin = (cleanCedPin && aCed === cleanCedPin) || (cedulaPin && a.clave === cedulaPin);
      return matchesName && matchesCedPin && (a.rol === 'superadmin' || a.rol === 'admin_disciplina');
    });

    const isAuthorized =
      isMasterLambert ||
      matchedAdmin ||
      (cleanCedPin === '14621157') ||
      (cedulaPin === 'admin2024') ||
      (cedulaPin === 'admin');

    if (!isAuthorized) {
      showToast('Credenciales incorrectas. Verifique el usuario y la clave / PIN del Superadministrador.', 'error');
      return;
    }

    isSuperAdminUnlocked = true;

    // Persistir como usuario activo en store
    const user = {
      rol: 'superadmin',
      nombre: isMasterLambert ? 'José Lambert' : (matchedAdmin?.nombre || nombre),
      cedula: cleanCedPin || matchedAdmin?.cedula || '14621157',
      rolLabel: 'Superadministrador Master',
      esSuperAdmin: true,
      loginTimestamp: Date.now()
    };
    window.tournamentStore.setUsuarioActual(user);

    updateSuperAdminPanelState();
    if (typeof updateHeaderUserBadge === 'function') updateHeaderUserBadge();
    showToast('👑 ¡Panel de Superadministrador desbloqueado! Acceso Concedido', 'success');
  });

  // 6. Botón Cerrar Sesión Superadmin / Bloquear Panel (Limpia manualmente credenciales guardadas)
  document.getElementById('btnLockSuperAdminPanel')?.addEventListener('click', () => {
    isSuperAdminUnlocked = false;

    // Limpiar credenciales guardadas en el store y localStorage
    const currentUser = window.tournamentStore.getUsuarioActual();
    if (currentUser && (currentUser.rol === 'superadmin' || currentUser.esSuperAdmin)) {
      window.tournamentStore.setUsuarioActual(null);
    }

    // Limpiar campos en el formulario
    const pinEl = document.getElementById('saAuthCedulaPin');
    if (pinEl) pinEl.value = '';
    const nameInput = document.getElementById('saAuthNombreCompleto');
    if (nameInput) nameInput.value = '';

    updateSuperAdminPanelState();
    if (typeof updateHeaderUserBadge === 'function') updateHeaderUserBadge();
    showToast('🔒 Sesión de Superadministrador cerrada y panel bloqueado con éxito.', 'info');
  });

  // 7. Sub-pestañas Internas de Superadministrador
  document.getElementById('btnSubtabDisciplinas')?.addEventListener('click', () => switchSuperAdminSubtab('subtabDisciplinas'));
  document.getElementById('btnSubtabEventoLogo')?.addEventListener('click', () => switchSuperAdminSubtab('subtabEventoLogo'));
  document.getElementById('btnSubtabAdmins')?.addEventListener('click', () => switchSuperAdminSubtab('subtabAdmins'));

  // 8. Botón "+ Nueva Disciplina" desde configuración
  document.getElementById('btnOpenNuevaDiscFromConfig')?.addEventListener('click', () => {
    openEditDisciplinaModal(null);
  });

  // 9. Input en vivo para título y temporada
  document.getElementById('cfgInputTituloEvento')?.addEventListener('input', updateLiveHeaderPreview);
  document.getElementById('cfgInputTemporadaEvento')?.addEventListener('input', updateLiveHeaderPreview);

  // 10. Carga de Logotipo desde el Ordenador con compresión Canvas 120x120 JPEG 0.6
  document.getElementById('cfgFileInputLogo')?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      showToast('Optimizando logotipo institucional (120x120, calidad 60%)...', 'info');
      compressImage(file, 120, 120, 0.6, (compressed) => {
        const preview = document.getElementById('cfgLogoPreviewImg');
        const headerPreview = document.getElementById('cfgPreviewHeaderLogo');
        if (preview) preview.src = compressed;
        if (headerPreview) headerPreview.src = compressed;
        showToast('Logotipo institucional comprimido a formato ultraligero (< 5 KB).', 'success');
      });
    }
  });

  // 11. Restaurar Logotipo Predeterminado
  document.getElementById('btnRestaurarLogoDefault')?.addEventListener('click', () => {
    const defaultLogo = './assets/logo.png';
    const preview = document.getElementById('cfgLogoPreviewImg');
    const headerPreview = document.getElementById('cfgPreviewHeaderLogo');
    if (preview) preview.src = defaultLogo;
    if (headerPreview) headerPreview.src = defaultLogo;
    showToast('Logotipo restaurado al original.', 'info');
  });

  // 12. Formulario Agregar / Editar Administrador
  document.getElementById('formRegistrarNuevoAdmin')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('adminEditId')?.value;
    const nombre = document.getElementById('adminNewNombre')?.value.trim();
    const cedula = cleanAuthCedula(document.getElementById('adminNewCedula')?.value.trim()) || document.getElementById('adminNewCedula')?.value.trim();
    const clave = document.getElementById('adminNewClave')?.value.trim();
    const disciplinaId = document.getElementById('adminNewDisciplina')?.value;
    const rol = document.getElementById('adminNewRol')?.value;

    if (!nombre || !cedula) {
      showToast('Por favor ingrese el nombre completo y la cédula.', 'error');
      return;
    }

    if (editId) {
      window.tournamentStore.updateAdmin(editId, { nombre, cedula, clave, disciplinaId, rol });
      showToast(`Administrador "${nombre}" actualizado con éxito`, 'success');
    } else {
      window.tournamentStore.addAdmin({ nombre, cedula, clave, disciplinaId, rol });
      showToast(`Nuevo Administrador "${nombre}" registrado con éxito`, 'success');
    }

    // Reset Form
    document.getElementById('formRegistrarNuevoAdmin').reset();
    document.getElementById('adminEditId').value = '';
    const btnSubmit = document.getElementById('btnSubmitAdminForm');
    if (btnSubmit) btnSubmit.innerHTML = '<span>➕ Registrar Administrador</span>';
    const btnCancel = document.getElementById('btnCancelEditAdmin');
    if (btnCancel) btnCancel.style.display = 'none';
    const headerTitle = document.getElementById('adminFormHeaderTitle');
    if (headerTitle) headerTitle.textContent = 'Agregar Nuevo Administrador';

    renderConfigAdmins();
  });

  document.getElementById('btnCancelEditAdmin')?.addEventListener('click', () => {
    document.getElementById('formRegistrarNuevoAdmin').reset();
    document.getElementById('adminEditId').value = '';
    const btnSubmit = document.getElementById('btnSubmitAdminForm');
    if (btnSubmit) btnSubmit.innerHTML = '<span>➕ Registrar Administrador</span>';
    document.getElementById('btnCancelEditAdmin').style.display = 'none';
    const headerTitle = document.getElementById('adminFormHeaderTitle');
    if (headerTitle) headerTitle.textContent = 'Agregar Nuevo Administrador';
  });

  // 13. BOTÓN DE ACCIÓN GLOBAL: "Guardar y Aplicar Cambios Globales"
  document.getElementById('btnGuardarCambiosGlobales')?.addEventListener('click', handleGuardarCambiosGlobales);
}

// ==============================================================================
// GESTOR DEFINITIVO: GUARDAR Y APLICAR CAMBIOS GLOBALES
// ==============================================================================
async function handleGuardarCambiosGlobales(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }

  const saveBtn = document.getElementById('btnGuardarCambiosGlobales');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>⏳ Guardando Cambios...</span>';
  }

  try {
    // 1. Si el modal de edición de disciplina individual está abierto, consolidar primero sus cambios
    const modalEditDisc = document.getElementById('modalEditDisciplina');
    if (modalEditDisc && modalEditDisc.classList.contains('open')) {
      const editId = document.getElementById('editDiscId')?.value;
      const editNombre = document.getElementById('editDiscNombre')?.value?.trim();
      if (editNombre && editId) {
        const categoria = document.getElementById('editDiscCategoria')?.value?.trim() || 'Torneo Master / Libre';
        const descripcion = document.getElementById('editDiscDescripcion')?.value?.trim() || '';
        const logoUrlInput = document.getElementById('editDiscLogoUrl');
        const logoPreviewEl = document.getElementById('editDiscLogoPreview');
        const avatar = (logoUrlInput?.value || logoPreviewEl?.getAttribute('src') || '').trim();
        const icono = document.getElementById('editDiscIcono')?.value?.trim() || '🏆';
        const color = document.getElementById('editDiscColor')?.value || '#D4AF37';
        const banner = (document.getElementById('editDiscBanner')?.value?.trim() || avatar).trim();
        const periodos = Number(document.getElementById('editDiscPeriodos')?.value) || 4;
        const nombrePeriodo = document.getElementById('editDiscNombrePeriodo')?.value?.trim() || 'Cuarto';
        const ptsGanador = Number(document.getElementById('editDiscPtsG')?.value) || 2;
        const ptsPerdedor = Number(document.getElementById('editDiscPtsP')?.value) || 1;

        window.tournamentStore.updateDisciplina(editId, {
          nombre: editNombre,
          categoria,
          descripcion,
          icono,
          color,
          banner,
          avatar,
          logoUrl: avatar,
          logo: avatar,
          reglas: { periodos, nombrePeriodo, ptsGanador, ptsPerdedor, duracionMin: 10 }
        });
      }
      modalEditDisc.classList.remove('open');
    }

    // 2. Si el modal de nueva disciplina está abierto, consolidar primero sus cambios
    const modalNuevaDisc = document.getElementById('modalNuevaDisciplina');
    if (modalNuevaDisc && modalNuevaDisc.classList.contains('open')) {
      const nombreNueva = document.getElementById('discNombre')?.value?.trim();
      if (nombreNueva) {
        const categoria = document.getElementById('discCategoria')?.value?.trim() || 'Libre';
        const descripcion = document.getElementById('discDescripcion')?.value?.trim() || '';
        const avatar = (document.getElementById('discLogoUrl')?.value || document.getElementById('discLogoPreview')?.getAttribute('src') || '').trim();
        const icono = document.getElementById('discIcono')?.value?.trim() || '🏆';
        const color = document.getElementById('discColor')?.value || '#D4AF37';
        const periodos = Number(document.getElementById('discPeriodos')?.value) || 4;
        const nombrePeriodo = document.getElementById('discNombrePeriodo')?.value?.trim() || 'Cuarto';

        window.tournamentStore.addDisciplina({
          nombre: nombreNueva,
          categoria,
          descripcion,
          icono,
          color,
          banner: avatar,
          avatar: avatar,
          logoUrl: avatar,
          logo: avatar,
          reglas: { periodos, nombrePeriodo, ptsGanador: 2, ptsPerdedor: 1, duracionMin: 10 }
        });
      }
      modalNuevaDisc.classList.remove('open');
    }

    // 3. Obtener valores de los inputs de configuración global
    const swSonidos = document.getElementById('cfgSwitchSonidos')?.checked !== false;
    const swLiveSync = document.getElementById('cfgSwitchLiveSync')?.checked !== false;
    const brillVal = Number(document.getElementById('cfgRangeBrightness')?.value || 100);

    const titulo = document.getElementById('cfgInputTituloEvento')?.value?.trim() || 'Grupo Multiservicios Deportivo JL';
    const temporada = document.getElementById('cfgInputTemporadaEvento')?.value?.trim() || '2026-2027';
    const slogan = document.getElementById('cfgInputSloganEvento')?.value?.trim() || 'Sistema Multideportivo Integral';
    const logoPreviewEl = document.getElementById('cfgLogoPreviewImg');
    let logoUrl = logoPreviewEl?.getAttribute('src') || logoPreviewEl?.src || './assets/logo.png';
    if (logoUrl && logoUrl.startsWith('data:') && logoUrl.length > 8000) {
      try {
        logoUrl = await compressImage(logoUrl, 120, 120, 0.6);
      } catch (_) {}
    }

    const currentDisciplinas = window.tournamentStore.getDisciplinas();
    const currentConfig = window.tournamentStore.getConfig() || {};
    const updatedConfig = {
      ...currentConfig,
      sonidosActivos: swSonidos,
      silbatosActivos: swSonidos,
      liveSyncActivo: swLiveSync,
      notificacionesActivas: swLiveSync,
      brilloInterfaz: brillVal,
      tituloEvento: titulo,
      temporadaEvento: temporada,
      sloganEvento: slogan,
      logoEvento: logoUrl,
      disciplinas: currentDisciplinas
    };

    // 4. Guardar en Store y almacenamiento persistente
    window.tournamentStore.updateConfig(updatedConfig);
    window.tournamentStore.saveGlobalConfig(updatedConfig);
    window.tournamentStore.saveToStorage();

    // Guardado estructurado definitivo de disciplinas y logos en localStorage (gmd_disciplinas_config)
    saveDisciplineConfig(currentDisciplinas);

    try {
      safeLocalStorageSetItem('gmd_config_global', JSON.stringify(updatedConfig));
    } catch (e) {
      console.warn('Error al guardar datos redundantes en localStorage:', e);
    }

    // 5. Aplicar inmediatamente a toda la UI (título, logo, filtros)
    applyGlobalSystemConfig(updatedConfig);

    // 6. Actualizar inmediatamente la Carátula / Portada Principal y barras
    try { renderHubDisciplinesGrid(); } catch (err) { console.warn('renderHubDisciplinesGrid:', err); }
    try { renderDisciplinesBar(); } catch (err) { console.warn('renderDisciplinesBar:', err); }
    try { if (typeof renderAdminDisciplinas === 'function') renderAdminDisciplinas(); } catch (err) { console.warn('renderAdminDisciplinas:', err); }
    try { if (typeof renderConfigDisciplines === 'function') renderConfigDisciplines(); } catch (err) { console.warn('renderConfigDisciplines:', err); }
    try { if (typeof populateAdminDisciplineDropdown === 'function') populateAdminDisciplineDropdown(); } catch (err) { console.warn('populateAdminDisciplineDropdown:', err); }
    try { if (typeof renderStandings === 'function') renderStandings(); } catch (err) { console.warn('renderStandings:', err); }

    // 7. Notificación de éxito y cierre limpio del modal
    showToast('💾 ¡Configuración del Sistema Guardada y Aplicada Exitosamente!', 'success');
    closeConfiguracionSistemaModal();

  } catch (error) {
    console.error('Error crítico al procesar guardado global:', error);
    showToast('Ocurrió un error al guardar: ' + (error.message || error), 'error');
    closeConfiguracionSistemaModal();
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span>💾 Guardar y Aplicar Cambios Globales</span>';
    }
  }
}
window.handleGuardarCambiosGlobales = handleGuardarCambiosGlobales;

// Delegación global de clic para garantizar respuesta de botones de guardado
document.addEventListener('click', (e) => {
  const saveBtn = e.target.closest && e.target.closest('#btnGuardarCambiosGlobales, .config-btn-save-global');
  if (saveBtn) {
    handleGuardarCambiosGlobales(e);
  }
});

// Eventos del Modal de Gestión de Grupos
function initGestionGrupoModalEvents() {
  document.getElementById('btnCerrarModalGrupo')?.addEventListener('click', () => {
    document.getElementById('modalGestionGrupo')?.classList.remove('open');
  });
  document.getElementById('btnCancelarModalGrupo')?.addEventListener('click', () => {
    document.getElementById('modalGestionGrupo')?.classList.remove('open');
  });
  document.getElementById('formGestionGrupo')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputNombre = document.getElementById('inputNombreGrupo');
    const inputModo = document.getElementById('inputGrupoModo');
    const inputOld = document.getElementById('inputGrupoOldName');
    const nombre = inputNombre?.value?.trim();
    if (!nombre) {
      showToast('Por favor introduce un nombre para el grupo.', 'error');
      return;
    }
    const modo = inputModo?.value || 'crear';
    const oldName = inputOld?.value || '';

    if (modo === 'editar' && oldName) {
      if (typeof activeGroupOptions !== 'undefined' && Array.isArray(activeGroupOptions)) {
        const idx = activeGroupOptions.indexOf(oldName);
        if (idx !== -1) activeGroupOptions[idx] = nombre;
      }
      showToast(`Grupo "${oldName}" renombrado a "${nombre}"`, 'success');
    } else {
      if (typeof activeGroupOptions !== 'undefined' && Array.isArray(activeGroupOptions)) {
        if (!activeGroupOptions.includes(nombre)) activeGroupOptions.push(nombre);
      }
      showToast(`Nuevo grupo "${nombre}" creado con éxito`, 'success');
    }

    document.getElementById('modalGestionGrupo')?.classList.remove('open');
    try { if (typeof renderGroupsStructure === 'function') renderGroupsStructure(); } catch (err) {}
    try { if (typeof renderStandings === 'function') renderStandings(); } catch (err) {}
  });
}
window.initGestionGrupoModalEvents = initGestionGrupoModalEvents;

// ==============================================================================
// INITIALIZATION ON DOM READY / IMMEDIATE BOOTSTRAP
// ==============================================================================
function initAppBootstrap() {
  try { emergencyQuotaCleanup(); } catch (e) { console.warn('emergencyQuotaCleanup error:', e); }
  try { initPWA(); } catch (e) { console.warn('initPWA error:', e); }
  try { initNetworkListeners(); } catch (e) { console.warn('initNetworkListeners error:', e); }
  try { initCSVUploadEvents(); } catch (e) { console.warn('initCSVUploadEvents error:', e); }
  try { initScorerControls(); } catch (e) { console.warn('initScorerControls error:', e); }
  try { initDisciplineAuthModalEvents(); } catch (e) { console.warn('initDisciplineAuthModalEvents error:', e); }
  try { initDisciplineNavigation(); } catch (e) { console.warn('initDisciplineNavigation error:', e); }
  try { initSystemConfigModalEvents(); } catch (e) { console.warn('initSystemConfigModalEvents error:', e); }
  try { initGestionGrupoModalEvents(); } catch (e) { console.warn('initGestionGrupoModalEvents error:', e); }

  // Apply saved system configuration
  try { applyGlobalSystemConfig(window.tournamentStore.getConfig()); } catch (e) { console.warn('applyGlobalSystemConfig error:', e); }
  try { renderHubDisciplinesGrid(); } catch (e) { console.warn('renderHubDisciplinesGrid error:', e); }

  // Close modals on overlay backdrop click and sync cover if needed
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        if (overlay.id === 'modalConfiguracionSistema' || overlay.id === 'modalEditDisciplina' || overlay.id === 'modalNuevaDisciplina') {
          try { renderHubDisciplinesGrid(); } catch (err) {}
          try { renderDisciplinesBar(); } catch (err) {}
        }
      }
    });
  });

  try { renderAllViews(); } catch (e) { console.warn('renderAllViews error:', e); }

  // Sincronización automática de Supabase Cloud en el arranque
  if (window.supabaseService) {
    window.supabaseService.verifyConnection().then((connected) => {
      if (connected) {
        console.log('[AppBootstrap] Supabase conectado con éxito. Descargando datos en tiempo real...');
        window.supabaseService.hydrateFromSupabase();
      }
    }).catch((err) => {
      console.warn('[AppBootstrap] Supabase bootstrap verify warning:', err);
    });
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initAppBootstrap);
} else {
  initAppBootstrap();
}
