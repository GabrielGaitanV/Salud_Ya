const fs = require('fs');
const path = require('path');

const RUTA_DATOS = path.join(__dirname, '..', 'datos.json');

function leerDatos() {
  const contenido = fs.readFileSync(RUTA_DATOS, 'utf-8');
  return JSON.parse(contenido);
}

function guardarDatos(datos) {
  fs.writeFileSync(RUTA_DATOS, JSON.stringify(datos, null, 2), 'utf-8');
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = { leerDatos, guardarDatos, generarId, RUTA_DATOS };
