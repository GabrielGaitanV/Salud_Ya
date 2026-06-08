jest.mock('../lib/db');

const db = require('../lib/db');
const { listarCitasPorUsuario, crearCita, cancelarCita } = require('../lib/citas');

describe('lib/citas (unitarias con mock de db)', () => {
  let base;

  beforeEach(() => {
    base = { usuarios: [], citas: [] };
    db.leerDatos.mockImplementation(() => base);
    db.guardarDatos.mockImplementation(datos => { base = datos; });
    let n = 0;
    db.generarId.mockImplementation(() => `cita-${++n}`);
  });

  test('crearCita falla cuando faltan campos', () => {
    const r = crearCita({ usuarioId: 'u1', medico: '', especialidad: 'X', fecha: '2026-07-01', hora: '10:00' });
    expect(r.ok).toBe(false);
    expect(db.guardarDatos).not.toHaveBeenCalled();
  });

  test('crearCita guarda la cita asociada al usuario', () => {
    const r = crearCita({
      usuarioId: 'u1', medico: 'Dr. X', especialidad: 'Cardio',
      fecha: '2026-07-01', hora: '10:00', ubicacion: 'Sala 1'
    });
    expect(r.ok).toBe(true);
    expect(base.citas).toHaveLength(1);
    expect(base.citas[0]).toMatchObject({ usuarioId: 'u1', estado: 'pendiente' });
  });

  test('listarCitasPorUsuario sólo devuelve citas del usuario y ordenadas', () => {
    crearCita({ usuarioId: 'u1', medico: 'A', especialidad: 'X', fecha: '2026-08-01', hora: '09:00' });
    crearCita({ usuarioId: 'u2', medico: 'B', especialidad: 'Y', fecha: '2026-07-15', hora: '10:00' });
    crearCita({ usuarioId: 'u1', medico: 'C', especialidad: 'Z', fecha: '2026-07-10', hora: '08:00' });

    const citas = listarCitasPorUsuario('u1');
    expect(citas).toHaveLength(2);
    expect(citas[0].fecha).toBe('2026-07-10');
    expect(citas[1].fecha).toBe('2026-08-01');
  });

  test('cancelarCita elimina sólo si pertenece al usuario', () => {
    crearCita({ usuarioId: 'u1', medico: 'A', especialidad: 'X', fecha: '2026-07-01', hora: '09:00' });
    const idCita = base.citas[0].id;

    const ajeno = cancelarCita({ citaId: idCita, usuarioId: 'otro' });
    expect(ajeno.ok).toBe(false);
    expect(base.citas).toHaveLength(1);

    const ok = cancelarCita({ citaId: idCita, usuarioId: 'u1' });
    expect(ok.ok).toBe(true);
    expect(base.citas).toHaveLength(0);
  });
});
