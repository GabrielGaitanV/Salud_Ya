const express = require('express');
const session = require('express-session');
const path = require('path');

const { registrarUsuario, autenticarUsuario } = require('./lib/auth');
const { listarCitasPorUsuario, crearCita, cancelarCita } = require('./lib/citas');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const enProduccion = process.env.NODE_ENV === 'production';
if (enProduccion) app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'saludya-mvp-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8,
    secure: enProduccion,
    sameSite: 'lax'
  }
}));

function requiereAuth(req, res, next) {
  if (req.session && req.session.usuario) return next();
  return res.redirect('/login');
}

function soloInvitados(req, res, next) {
  if (req.session && req.session.usuario) return res.redirect('/dashboard');
  next();
}

// ===== RUTAS GET =====
app.get('/', (req, res) => {
  if (req.session.usuario) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', soloInvitados, (req, res) => {
  res.render('login', {
    titulo: 'Iniciar Sesión',
    error: req.session.error || null,
    mensaje: req.session.mensaje || null
  });
  req.session.error = null;
  req.session.mensaje = null;
});

app.get('/registro', soloInvitados, (req, res) => {
  res.render('registro', {
    titulo: 'Crear Cuenta',
    error: req.session.error || null,
    datos: req.session.datosFormulario || {}
  });
  req.session.error = null;
  req.session.datosFormulario = null;
});

app.get('/dashboard', requiereAuth, (req, res) => {
  const citas = listarCitasPorUsuario(req.session.usuario.id);
  res.render('dashboard', {
    titulo: 'Mi Panel',
    usuario: req.session.usuario,
    citas,
    error: req.session.error || null,
    mensaje: req.session.mensaje || null
  });
  req.session.error = null;
  req.session.mensaje = null;
});

// ===== RUTAS POST =====
app.post('/registro', soloInvitados, (req, res) => {
  const { fullname, email, phone, password } = req.body;
  const passwordConfirm = req.body['password-confirm'];

  if (password !== passwordConfirm) {
    req.session.error = 'Las contraseñas no coinciden.';
    req.session.datosFormulario = { fullname, email, phone };
    return res.redirect('/registro');
  }

  const resultado = registrarUsuario({ fullname, email, phone, password });
  if (!resultado.ok) {
    req.session.error = resultado.error;
    req.session.datosFormulario = { fullname, email, phone };
    return res.redirect('/registro');
  }

  req.session.mensaje = 'Cuenta creada con éxito. Inicia sesión para continuar.';
  res.redirect('/login');
});

app.post('/login', soloInvitados, (req, res) => {
  const { email, password } = req.body;
  const resultado = autenticarUsuario({ email, password });

  if (!resultado.ok) {
    req.session.error = resultado.error;
    return res.redirect('/login');
  }

  req.session.usuario = resultado.usuario;
  res.redirect('/dashboard');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.post('/citas', requiereAuth, (req, res) => {
  const { medico, especialidad, fecha, hora, ubicacion } = req.body;
  const resultado = crearCita({
    usuarioId: req.session.usuario.id,
    medico, especialidad, fecha, hora, ubicacion
  });

  if (!resultado.ok) req.session.error = resultado.error;
  else req.session.mensaje = 'Cita agendada correctamente.';

  res.redirect('/dashboard');
});

app.post('/citas/:id/cancelar', requiereAuth, (req, res) => {
  const resultado = cancelarCita({
    citaId: req.params.id,
    usuarioId: req.session.usuario.id
  });

  if (!resultado.ok) req.session.error = resultado.error;
  else req.session.mensaje = 'Cita cancelada.';

  res.redirect('/dashboard');
});

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Servidor SaludYa escuchando en http://localhost:${PORT}`);
  });
}

module.exports = app;
