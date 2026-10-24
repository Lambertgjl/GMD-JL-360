// standings.js - Motor de Cálculo Automatizado de Tablas de Posiciones
// Cumple con las reglas oficiales: 2 pts al ganador, 1 pt al perdedor (Baloncesto)
// Futsal/Fútbol: 3 pts ganador, 1 pt empate, 0 pt perdedor

class StandingsEngine {
  /**
   * Calcula la tabla de posiciones completa para una disciplina
   * @param {string} disciplinaId
   * @param {TournamentStore} store
   * @returns {Object} { 'Grupo A': [...], 'Grupo B': [...] }
   */
  static compute(disciplinaId, store = window.tournamentStore) {
    if (!store) return {};
    const disc = (typeof store.getDisciplinas === 'function' ? store.getDisciplinas() : []).find((d) => d && d.id === disciplinaId) ||
                 (typeof store.getDisciplinaActual === 'function' ? store.getDisciplinaActual() : null) ||
                 { id: disciplinaId || 'baloncesto-master', nombre: 'Baloncesto', reglas: { ptsGanador: 2, ptsPerdedor: 1, ptsEmpate: 0 } };
    const targetDiscId = disc?.id || disciplinaId || 'baloncesto-master';
    const equipos = typeof store.getEquipos === 'function' ? (store.getEquipos(targetDiscId) || []) : [];
    const partidos = typeof store.getPartidos === 'function' ? (store.getPartidos(targetDiscId) || []) : [];

    const isFutsal = (disc?.id || '').includes('futsal') || (disc?.nombre || '').toLowerCase().includes('fútbol');
    const ptsGanador = disc?.reglas?.ptsGanador ?? (isFutsal ? 3 : 2);
    const ptsPerdedor = disc?.reglas?.ptsPerdedor ?? (isFutsal ? 0 : 1);
    const ptsEmpate = disc?.reglas?.ptsEmpate ?? (isFutsal ? 1 : 0);

    // Initial table map by team name
    const tableMap = {};

    equipos.forEach((eq) => {
      tableMap[eq.nombre] = {
        id: eq.id,
        equipo: eq.nombre,
        siglas: eq.siglas || eq.nombre.substring(0, 3).toUpperCase(),
        grupo: eq.grupo || 'Grupo A',
        logoUrl: eq.logoUrl || '',
        color: eq.color || '#800020',
        sede: eq.sedePrincipal || 'Gimnasio Pablo Higuerey',
        jj: 0, // Juegos Jugados
        jg: 0, // Juegos Ganados
        je: 0, // Juegos Empatados (para futsal)
        jp: 0, // Juegos Perdidos
        pf: 0, // Puntos/Goles a Favor
        pc: 0, // Puntos/Goles en Contra
        dp: 0, // Diferencia de Puntos (PF - PC)
        pts: 0, // Puntos de Clasificación
        racha: [] // Últimos resultados ['G', 'P']
      };
    });

    // Process all FINALIZED matches
    const finalizados = partidos.filter((p) => p.estado === 'FINALIZADO');

    finalizados.forEach((m) => {
      const loc = m.equipoLocal;
      const vis = m.equipoVisitante;
      const scoreLoc = Number(m.totalLocal) || 0;
      const scoreVis = Number(m.totalVisitante) || 0;

      // Ensure teams exist in map even if added dynamically
      if (!tableMap[loc]) {
        const foundEq = typeof store.getEquipoPorNombre === 'function' ? store.getEquipoPorNombre(loc, disciplinaId) : null;
        tableMap[loc] = {
          id: foundEq?.id || `EQ-AUTO-${loc}`,
          equipo: loc,
          siglas: foundEq?.siglas || loc.substring(0, 3).toUpperCase(),
          grupo: foundEq?.grupo || m.grupo || 'Grupo A',
          logoUrl: foundEq?.logoUrl || '',
          color: foundEq?.color || '#800020',
          sede: foundEq?.sedePrincipal || m.sede,
          jj: 0, jg: 0, je: 0, jp: 0, pf: 0, pc: 0, dp: 0, pts: 0, racha: []
        };
      }

      if (!tableMap[vis]) {
        const foundEq = typeof store.getEquipoPorNombre === 'function' ? store.getEquipoPorNombre(vis, disciplinaId) : null;
        tableMap[vis] = {
          id: foundEq?.id || `EQ-AUTO-${vis}`,
          equipo: vis,
          siglas: foundEq?.siglas || vis.substring(0, 3).toUpperCase(),
          grupo: foundEq?.grupo || m.grupo || 'Grupo A',
          logoUrl: foundEq?.logoUrl || '',
          color: foundEq?.color || '#1E3A8A',
          sede: foundEq?.sedePrincipal || m.sede,
          jj: 0, jg: 0, je: 0, jp: 0, pf: 0, pc: 0, dp: 0, pts: 0, racha: []
        };
      }

      const teamLoc = tableMap[loc];
      const teamVis = tableMap[vis];

      // Update games played
      teamLoc.jj += 1;
      teamVis.jj += 1;

      // Update points scored and conceded
      teamLoc.pf += scoreLoc;
      teamLoc.pc += scoreVis;

      teamVis.pf += scoreVis;
      teamVis.pc += scoreLoc;

      // Determine Winner / Loser / Tie
      if (scoreLoc > scoreVis) {
        teamLoc.jg += 1;
        teamLoc.pts += ptsGanador;
        teamLoc.racha.push('G');

        teamVis.jp += 1;
        teamVis.pts += ptsPerdedor;
        teamVis.racha.push('P');
      } else if (scoreVis > scoreLoc) {
        teamVis.jg += 1;
        teamVis.pts += ptsGanador;
        teamVis.racha.push('G');

        teamLoc.jp += 1;
        teamLoc.pts += ptsPerdedor;
        teamLoc.racha.push('P');
      } else {
        // Empate (si la disciplina lo admite)
        teamLoc.je += 1;
        teamLoc.pts += ptsEmpate;
        teamLoc.racha.push('E');

        teamVis.je += 1;
        teamVis.pts += ptsEmpate;
        teamVis.racha.push('E');
      }
    });

    // Compute Diferencia de Puntos (DP)
    Object.values(tableMap).forEach((t) => {
      t.dp = t.pf - t.pc;
      t.ultimos5 = t.racha.slice(-5).reverse();
    });

    // Group tables by Group Name according to tournament format
    const grouped = {};
    const formato = (typeof store.getFormatoCompeticion === 'function' ? store.getFormatoCompeticion(disciplinaId) : null) || disc?.formatoTorneo || 'por_grupo';

    Object.values(tableMap).forEach((row) => {
      let gName = row.grupo || 'Grupo A';
      if (formato === 'todos_contra_todos') {
        gName = 'Grupo Único (Liga General)';
      } else if (formato === 'eliminacion_directa') {
        gName = 'Cuadro Clasificatorio (Playoffs)';
      } else if (formato === 'combinado_mixto') {
        gName = `${row.grupo || 'Grupo A'} (Fase Regular / Playoff)`;
      }
      if (!grouped[gName]) grouped[gName] = [];
      grouped[gName].push(row);
    });

    // Sort each group:
    // 1. PTS desc
    // 2. DP desc (Diferencia de Puntos)
    // 3. PF desc (Puntos a Favor)
    // 4. Nombre asc
    Object.keys(grouped).forEach((groupName) => {
      grouped[groupName].sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dp !== a.dp) return b.dp - a.dp;
        if (b.pf !== a.pf) return b.pf - a.pf;
        return a.equipo.localeCompare(b.equipo);
      });

      // Add position rank (1, 2, 3...)
      grouped[groupName].forEach((row, idx) => {
        row.posicion = idx + 1;
        // Classification indicator: Top 2 qualify to playoffs
        row.clasificado = idx < 2;
      });
    });

    return grouped;
  }

  /**
   * Genera un CSV de la tabla de posiciones para exportar a Excel
   */
  static exportToCSV(disciplinaId, store = window.tournamentStore) {
    const grouped = this.compute(disciplinaId, store);
    let csv = 'Grupo,Posición,Equipo,Siglas,JJ,JG,JP,PF,PC,DP,PTS\n';

    Object.keys(grouped).forEach((grp) => {
      grouped[grp].forEach((row) => {
        csv += `"${grp}",${row.posicion},"${row.equipo}","${row.siglas}",${row.jj},${row.jg},${row.jp},${row.pf},${row.pc},${row.dp},${row.pts}\n`;
      });
    });

    return csv;
  }
}

window.StandingsEngine = StandingsEngine;
