const { leerDatos, guardarDatos, generarId } = require('./db');

function listarCitasPorUsuario(usuarioId) {
  const datos = leerDatos();
  return datos.citas
    .filter(c => c.usuarioId === usuarioId)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

function crearCita({ usuarioId, medico, especialidad, fecha, hora, ubicacion }) {
  if (!usuarioId || !medico || !especialidad || !fecha || !hora) {
    return { ok: false, error: 'Faltan campos obligatorios para agendar la cita.' };
  }

  const datos = leerDatos();
  const nuevaCita = {
    id: generarId(),
    usuarioId,
    medico: medico.trim(),
    especialidad: especialidad.trim(),
    fecha,
    hora,
    ubicacion: (ubicacion || '').trim(),
    estado: 'pendiente',
    creadaEn: new Date().toISOString()
  };

  datos.citas.push(nuevaCita);
  guardarDatos(datos);

  return { ok: true, cita: nuevaCita };
}

function cancelarCita({ citaId, usuarioId }) {
  const datos = leerDatos();
  const idx = datos.citas.findIndex(c => c.id === citaId && c.usuarioId === usuarioId);
  if (idx === -1) return { ok: false, error: 'Cita no encontrada.' };

  datos.citas.splice(idx, 1);
  guardarDatos(datos);
  return { ok: true };
}

module.exports = { listarCitasPorUsuario, crearCita, cancelarCita };
