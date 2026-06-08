const bcrypt = require('bcryptjs');
const { leerDatos, guardarDatos, generarId } = require('./db');

const SALT_ROUNDS = 10;

function registrarUsuario({ fullname, email, phone, password }) {
  if (!fullname || !email || !phone || !password) {
    return { ok: false, error: 'Todos los campos son obligatorios.' };
  }

  if (password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const datos = leerDatos();
  const emailNormalizado = email.trim().toLowerCase();

  const duplicado = datos.usuarios.find(u => u.email === emailNormalizado);
  if (duplicado) {
    return { ok: false, error: 'Ya existe una cuenta con ese correo electrónico.' };
  }

  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const nuevoUsuario = {
    id: generarId(),
    fullname: fullname.trim(),
    email: emailNormalizado,
    phone: phone.trim(),
    passwordHash: hash,
    creadoEn: new Date().toISOString()
  };

  datos.usuarios.push(nuevoUsuario);
  guardarDatos(datos);

  return { ok: true, usuario: sinPassword(nuevoUsuario) };
}

function autenticarUsuario({ email, password }) {
  if (!email || !password) {
    return { ok: false, error: 'Correo y contraseña son obligatorios.' };
  }

  const datos = leerDatos();
  const emailNormalizado = email.trim().toLowerCase();
  const usuario = datos.usuarios.find(u => u.email === emailNormalizado);

  if (!usuario || !bcrypt.compareSync(password, usuario.passwordHash)) {
    return { ok: false, error: 'Credenciales inválidas.' };
  }

  return { ok: true, usuario: sinPassword(usuario) };
}

function sinPassword(usuario) {
  const { passwordHash, ...resto } = usuario;
  return resto;
}

module.exports = { registrarUsuario, autenticarUsuario };
