// csv-importer.js - Procesador Masivo de Archivos CSV / Excel para Grupo Multiservicios Deportivo JL

class CSVProcessor {
  /**
   * Parser universal de texto CSV que soporta comillas, saltos de línea y delimitadores
   */
  static parseCSV(text) {
    const lines = [];
    let row = [''];
    let inQuotes = false;

    // Normalize CRLF to LF
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push('');
      } else if (char === '\n' && !inQuotes) {
        // Strip trailing whitespace from row elements
        const trimmedRow = row.map((c) => c.trim());
        if (trimmedRow.some((c) => c.length > 0)) {
          lines.push(trimmedRow);
        }
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }

    if (row.some((c) => c.trim().length > 0)) {
      lines.push(row.map((c) => c.trim()));
    }

    if (lines.length === 0) return { headers: [], rows: [] };

    // Standardize headers (lowercase without accents for easy mapping)
    const headers = lines[0].map((h) => this.normalizeHeader(h));
    const rawHeaders = lines[0];
    const dataRows = lines.slice(1);

    return {
      rawHeaders,
      headers,
      rows: dataRows.map((r) => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = r[idx] !== undefined ? r[idx] : '';
        });
        return obj;
      })
    };
  }

  static normalizeHeader(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Detecta el tipo de plantilla según las cabeceras presentes
   */
  static detectType(headers) {
    const headerStr = headers.join(' ');
    if (headerStr.includes('cedula') || headerStr.includes('atleta') || headerStr.includes('camiseta')) {
      return 'ROSTER_Y_EQUIPOS';
    }
    if (headerStr.includes('grupo') && headerStr.includes('sede') && headerStr.includes('equipo')) {
      return 'CONFIG_GRUPOS';
    }
    if (headerStr.includes('partido') || (headerStr.includes('local') && headerStr.includes('visitante'))) {
      return 'CALENDARIO_Y_RESULTADOS';
    }
    return 'UNKNOWN';
  }

  /**
   * Procesa ROSTER_Y_EQUIPOS.csv
   */
  static processRosterCSV(parsedData, disciplinaId, store = window.tournamentStore) {
    const atletas = [];
    const equiposMap = {};

    parsedData.rows.forEach((row, index) => {
      // Find team name
      const equipoNombre = row.equipo || row.nombre_del_equipo || row.nombre_equipo;
      if (!equipoNombre) return;

      const delegadoNombre = row.nombre_delegado || row.delegado || '';
      const delegadoTel = row.telefono_delegado || row.telefono || '';
      const urlLogo = row.url_logo || row.logo || '';

      if (!equiposMap[equipoNombre]) {
        equiposMap[equipoNombre] = {
          id: `EQ-${String(Object.keys(equiposMap).length + 1).padStart(2, '0')}`,
          nombre: equipoNombre,
          disciplinaId: disciplinaId || store.getDisciplinaActual().id,
          grupo: 'Grupo A', // Default, can be adjusted in CONFIG_GRUPOS
          sedePrincipal: 'Gimnasio Pablo Higuerey',
          siglas: equipoNombre.substring(0, 3).toUpperCase(),
          logoUrl: urlLogo,
          color: '#800020',
          delegadoNombre,
          delegadoTelefono: delegadoTel,
          pin: '2024'
        };
      }

      // Check if athlete data exists in this row
      const nombres = row.nombres_y_apellidos || row.nombres || row.atleta;
      if (nombres) {
        atletas.push({
          id: row.id_atleta || `ATL-${String(index + 1).padStart(3, '0')}`,
          cedula: row.cedula || '',
          nombres: nombres,
          fechaNacimiento: row.fecha_nacimiento || '',
          edad: Number(row.edad) || 0,
          camiseta: String(row.camiseta || row.dorsal || '0'),
          posicion: row.posicion || 'Alero',
          equipo: equipoNombre,
          rol: row.rol || 'Atleta',
          fotoUrl: urlLogo
        });
      }
    });

    const equipos = Object.values(equiposMap);

    // Save to store
    store.importData({ equipos, atletas, replace: false });

    return {
      tipo: 'ROSTER_Y_EQUIPOS',
      equiposCount: equipos.length,
      atletasCount: atletas.length
    };
  }

  /**
   * Procesa CONFIG_GRUPOS.csv
   */
  static processGruposCSV(parsedData, disciplinaId, store = window.tournamentStore) {
    const equipos = [];

    parsedData.rows.forEach((row, index) => {
      const nombre = row.nombre_del_equipo || row.equipo || row.nombre;
      if (!nombre) return;

      equipos.push({
        id: row.id_equipo || `EQ-${String(index + 1).padStart(2, '0')}`,
        nombre,
        disciplinaId: disciplinaId || store.getDisciplinaActual().id,
        grupo: row.grupo || 'Grupo A',
        sedePrincipal: row.sede_principal || row.sede || 'Gimnasio Pablo Higuerey',
        siglas: row.siglas_logo || row.siglas || nombre.substring(0, 3).toUpperCase(),
        logoUrl: '',
        color: '#800020',
        delegadoNombre: '',
        delegadoTelefono: '',
        pin: '2024'
      });
    });

    store.importData({ equipos, replace: false });

    return {
      tipo: 'CONFIG_GRUPOS',
      equiposCount: equipos.length
    };
  }

  /**
   * Procesa CALENDARIO_Y_RESULTADOS.csv
   */
  static processCalendarioCSV(parsedData, disciplinaId, store = window.tournamentStore) {
    const partidos = [];

    parsedData.rows.forEach((row, index) => {
      const local = row.equipo_local || row.local;
      const visitante = row.equipo_visitante || row.visitante;
      if (!local || !visitante) return;

      const q1L = Number(row.q1_loc || row.q1_local || 0);
      const q2L = Number(row.q2_loc || row.q2_local || 0);
      const q3L = Number(row.q3_loc || row.q3_local || 0);
      const q4L = Number(row.q4_loc || row.q4_local || 0);
      const totL = Number(row.total_local || row.tot_loc || (q1L + q2L + q3L + q4L));

      const q1V = Number(row.q1_vis || row.q1_visitante || 0);
      const q2V = Number(row.q2_vis || row.q2_visitante || 0);
      const q3V = Number(row.q3_vis || row.q3_visitante || 0);
      const q4V = Number(row.q4_vis || row.q4_visitante || 0);
      const totV = Number(row.total_visitante || row.tot_vis || (q1V + q2V + q3V + q4V));

      let estado = (row.estado || '').toUpperCase();
      if (!estado) {
        estado = (totL > 0 || totV > 0) ? 'FINALIZADO' : 'PROGRAMADO';
      }

      partidos.push({
        id: row.id_partido || `PAR-${String(index + 1).padStart(3, '0')}`,
        disciplinaId: disciplinaId || store.getDisciplinaActual().id,
        fecha: row.fecha || new Date().toISOString().split('T')[0],
        hora: row.hora || '18:00',
        sede: row.sede || 'Gimnasio Pablo Higuerey',
        fase: row.fase || 'Fase de Grupos',
        grupo: row.grupo || (row.fase?.includes('Grupo B') ? 'Grupo B' : 'Grupo A'),
        equipoLocal: local,
        q1Loc: q1L, q2Loc: q2L, q3Loc: q3L, q4Loc: q4L, totalLocal: totL,
        equipoVisitante: visitante,
        q1Vis: q1V, q2Vis: q2V, q3Vis: q3V, q4Vis: q4V, totalVisitante: totV,
        estado: estado,
        periodoActual: estado === 'FINALIZADO' ? 'Final' : 'Por Iniciar',
        reloj: estado === 'FINALIZADO' ? '00:00' : '10:00',
        faltasLoc: 0,
        faltasVis: 0,
        actualizadoEn: new Date().toISOString()
      });
    });

    store.importData({ partidos, replace: false });

    return {
      tipo: 'CALENDARIO_Y_RESULTADOS',
      partidosCount: partidos.length
    };
  }

  /**
   * Helper para descargar plantillas CSV oficiales
   */
  static downloadTemplate(filename) {
    const templates = {
      'ROSTER_Y_EQUIPOS.csv': `ID_Atleta,Cédula,Nombres y Apellidos,Fecha Nacimiento,Edad,Camiseta,Posición,Equipo,Rol,Nombre Delegado,Teléfono Delegado,URL Logo
ATL-001,V-24589123,Carlos Eduardo Mendoza,1996-05-14,28,7,Base,Broncos de Higuerey,Atleta,Prof. Roberto Gómez,+58 414-8765432,
ATL-002,V-26102948,José Alejandro Salazar,1998-11-20,26,11,Escolta,Broncos de Higuerey,Atleta,Prof. Roberto Gómez,+58 414-8765432,
ATL-003,V-22441902,Miguel Ángel Rondón,1994-03-08,30,15,Alero,Broncos de Higuerey,Capitán,Prof. Roberto Gómez,+58 414-8765432,
ATL-004,V-25890124,David Jesús Marcano,1997-09-12,27,23,Ala-Pívot,Broncos de Higuerey,Atleta,Prof. Roberto Gómez,+58 414-8765432,
ATL-005,V-21394850,Luis Fernando Cedeño,1993-01-30,31,33,Pívot,Broncos de Higuerey,Atleta,Prof. Roberto Gómez,+58 414-8765432,`,

      'CONFIG_GRUPOS.csv': `ID_Equipo,Nombre del Equipo,Grupo,Sede Principal,Siglas / Logo
EQ-01,Broncos de Higuerey,Grupo A,Gimnasio Pablo Higuerey,BHY
EQ-02,Centauros del Este,Grupo A,Gimnasio Pablo Higuerey,CDE
EQ-03,Guerreros de Guanta,Grupo A,Cancha Los Robles,GDG
EQ-04,Titanes de Oriente,Grupo A,Domo Bolivariano,TDO
EQ-05,Halcones de Puerto,Grupo B,Gimnasio Pablo Higuerey,HDP
EQ-06,Espartanos JL,Grupo B,Complejo Deportivo JL,EJL
EQ-07,Navegantes Sport,Grupo B,Cancha Los Robles,NAV
EQ-08,Vencedores BBC,Grupo B,Domo Bolivariano,VBC`,

      'CALENDARIO_Y_RESULTADOS.csv': `ID_Partido,Fecha,Hora,Sede,Fase,Equipo Local,Q1 Loc,Q2 Loc,Q3 Loc,Q4 Loc,Total Local,Equipo Visitante,Q1 Vis,Q2 Vis,Q3 Vis,Q4 Vis,Total Visitante,Estado
PAR-001,2026-10-12,18:00,Gimnasio Pablo Higuerey,Fase de Grupos - Grupo A,Broncos de Higuerey,22,19,25,20,86,Titanes de Oriente,18,20,17,21,76,FINALIZADO
PAR-002,2026-10-12,19:45,Gimnasio Pablo Higuerey,Fase de Grupos - Grupo A,Centauros del Este,24,18,21,26,89,Guerreros de Guanta,20,22,19,21,82,FINALIZADO
PAR-003,2026-10-14,18:30,Gimnasio Pablo Higuerey,Fase de Grupos - Grupo A,Broncos de Higuerey,21,18,17,14,70,Centauros del Este,19,22,15,12,68,EN CURSO
PAR-004,2026-10-14,20:15,Gimnasio Pablo Higuerey,Fase de Grupos - Grupo A,Guerreros de Guanta,0,0,0,0,0,Titanes de Oriente,0,0,0,0,0,PROGRAMADO`
    };

    const content = templates[filename];
    if (!content) return false;

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
}

window.CSVProcessor = CSVProcessor;
