jest.mock('../lib/db');

const db = require('../lib/db');
const request = require('supertest');
const app = require('../server');

describe('Rutas HTTP (integración con supertest)', () => {
  let base;

  beforeEach(() => {
    base = { usuarios: [], citas: [] };
    db.leerDatos.mockImplementation(() => base);
    db.guardarDatos.mockImplementation(datos => { base = datos; });
    let n = 0;
    db.generarId.mockImplementation(() => `id-${++n}`);
  });

  describe('Protección de rutas', () => {
    test('GET /dashboard sin sesión redirige a /login (302)', async () => {
      const res = await request(app).get('/dashboard');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });

    test('GET / sin sesión redirige a /login', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });

    test('POST /citas sin sesión redirige a /login', async () => {
      const res = await request(app).post('/citas').send({ medico: 'X' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  describe('GET de vistas públicas', () => {
    test('GET /login responde 200 y renderiza el formulario', async () => {
      const res = await request(app).get('/login');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/Iniciar Sesión/);
      expect(res.text).toMatch(/action="\/login"/);
    });

    test('GET /registro responde 200', async () => {
      const res = await request(app).get('/registro');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/Crear Cuenta/);
    });
  });

  describe('Flujo registro + login + dashboard', () => {
    test('POST /registro válido redirige a /login', async () => {
      const res = await request(app).post('/registro').send({
        fullname: 'Test User',
        email: 'test@correo.com',
        phone: '555',
        password: 'secreto123',
        'password-confirm': 'secreto123'
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
      expect(base.usuarios).toHaveLength(1);
      expect(base.usuarios[0].email).toBe('test@correo.com');
    });

    test('POST /registro con contraseñas distintas vuelve a /registro', async () => {
      const res = await request(app).post('/registro').send({
        fullname: 'Test', email: 't@t.com', phone: '1',
        password: 'secreto123', 'password-confirm': 'otra'
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/registro');
      expect(base.usuarios).toHaveLength(0);
    });

    test('POST /login con credenciales inválidas redirige a /login', async () => {
      const res = await request(app).post('/login').send({
        email: 'noexiste@correo.com', password: 'xxx'
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });

    test('flujo completo: registro → login → GET /dashboard 200', async () => {
      const agent = request.agent(app);

      await agent.post('/registro').send({
        fullname: 'Flujo Total', email: 'flujo@correo.com', phone: '999',
        password: 'secreto123', 'password-confirm': 'secreto123'
      });

      const loginRes = await agent.post('/login').send({
        email: 'flujo@correo.com', password: 'secreto123'
      });
      expect(loginRes.status).toBe(302);
      expect(loginRes.headers.location).toBe('/dashboard');

      const dash = await agent.get('/dashboard');
      expect(dash.status).toBe(200);
      expect(dash.text).toMatch(/Bienvenido, Flujo/);
    });

    test('usuario autenticado puede crear cita vía POST /citas', async () => {
      const agent = request.agent(app);
      await agent.post('/registro').send({
        fullname: 'Citas User', email: 'citas@correo.com', phone: '1',
        password: 'secreto123', 'password-confirm': 'secreto123'
      });
      await agent.post('/login').send({ email: 'citas@correo.com', password: 'secreto123' });

      const res = await agent.post('/citas').send({
        medico: 'Dr. Test', especialidad: 'General',
        fecha: '2027-01-01', hora: '10:00', ubicacion: 'Sala A'
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/dashboard');
      expect(base.citas).toHaveLength(1);
      expect(base.citas[0].medico).toBe('Dr. Test');
    });
  });
});
