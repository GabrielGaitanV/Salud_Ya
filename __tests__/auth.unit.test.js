jest.mock('../lib/db');

const db = require('../lib/db');
const { registrarUsuario, autenticarUsuario } = require('../lib/auth');

function nuevaBase() {
  return { usuarios: [], citas: [] };
}

describe('lib/auth - registrarUsuario (unitarias con mock de db)', () => {
  let base;

  beforeEach(() => {
    base = nuevaBase();
    db.leerDatos.mockImplementation(() => base);
    db.guardarDatos.mockImplementation(datos => { base = datos; });
    db.generarId.mockReturnValue('id-fijo-123');
  });

  test('rechaza cuando faltan campos obligatorios', () => {
    const r = registrarUsuario({ fullname: '', email: 'a@a.com', phone: '1', password: 'secreto' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/obligatorios/i);
    expect(db.guardarDatos).not.toHaveBeenCalled();
  });

  test('rechaza contraseña con menos de 6 caracteres', () => {
    const r = registrarUsuario({
      fullname: 'Ana Pérez', email: 'ana@correo.com', phone: '300', password: '123'
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/6 caracteres/i);
  });

  test('registra correctamente un usuario nuevo (hashea password)', () => {
    const r = registrarUsuario({
      fullname: '  Ana Pérez ', email: 'ANA@correo.com', phone: '300', password: 'secreto123'
    });

    expect(r.ok).toBe(true);
    expect(r.usuario).toMatchObject({
      id: 'id-fijo-123',
      fullname: 'Ana Pérez',
      email: 'ana@correo.com',
      phone: '300'
    });
    expect(r.usuario).not.toHaveProperty('passwordHash');

    expect(db.guardarDatos).toHaveBeenCalledTimes(1);
    const guardado = base.usuarios[0];
    expect(guardado.passwordHash).toBeDefined();
    expect(guardado.passwordHash).not.toBe('secreto123');
  });

  test('rechaza email duplicado (case-insensitive)', () => {
    registrarUsuario({
      fullname: 'Ana', email: 'dup@correo.com', phone: '1', password: 'secreto123'
    });
    db.guardarDatos.mockClear();

    const r = registrarUsuario({
      fullname: 'Otra', email: 'DUP@correo.com', phone: '2', password: 'secreto456'
    });

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ya existe/i);
    expect(db.guardarDatos).not.toHaveBeenCalled();
  });
});

describe('lib/auth - autenticarUsuario (unitarias con mock de db)', () => {
  let base;

  beforeEach(() => {
    base = nuevaBase();
    db.leerDatos.mockImplementation(() => base);
    db.guardarDatos.mockImplementation(datos => { base = datos; });
    db.generarId.mockReturnValue('user-1');

    registrarUsuario({
      fullname: 'Carlos', email: 'carlos@correo.com', phone: '555', password: 'miClave123'
    });
  });

  test('autentica con credenciales válidas y omite passwordHash', () => {
    const r = autenticarUsuario({ email: 'carlos@correo.com', password: 'miClave123' });
    expect(r.ok).toBe(true);
    expect(r.usuario.email).toBe('carlos@correo.com');
    expect(r.usuario).not.toHaveProperty('passwordHash');
  });

  test('falla con contraseña incorrecta', () => {
    const r = autenticarUsuario({ email: 'carlos@correo.com', password: 'incorrecta' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/credenciales/i);
  });

  test('falla con email inexistente', () => {
    const r = autenticarUsuario({ email: 'noexiste@correo.com', password: 'miClave123' });
    expect(r.ok).toBe(false);
  });

  test('rechaza cuando faltan campos', () => {
    const r = autenticarUsuario({ email: '', password: '' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/obligatorios/i);
  });
});
