import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { ExpenseConcept, ExpenseType, Profile, Rol } from '../types';

function mensajeError(err: { code?: string; message: string }, siExisteYa: string) {
  return err.code === '23505' ? siExisteYa : err.message;
}

export function Ajustes() {
  const [tipos, setTipos] = useState<ExpenseType[]>([]);
  const [conceptos, setConceptos] = useState<ExpenseConcept[]>([]);
  const [usuarios, setUsuarios] = useState<Profile[]>([]);

  async function loadAll() {
    const [{ data: t }, { data: c }, { data: u }] = await Promise.all([
      supabase.from('expense_types').select('*').order('nombre'),
      supabase.from('expense_concepts').select('*').order('nombre'),
      supabase.from('profiles').select('*').order('email'),
    ]);
    setTipos((t as ExpenseType[]) || []);
    setConceptos((c as ExpenseConcept[]) || []);
    setUsuarios((u as Profile[]) || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div>
      <h1 className="page-title">Ajustes</h1>
      <div className="settings-columns">
        <TiposGasto tipos={tipos} onChange={loadAll} />
        <Conceptos tipos={tipos} conceptos={conceptos} onChange={loadAll} />
        <Usuarios usuarios={usuarios} onChange={loadAll} />
      </div>
    </div>
  );
}

function TiposGasto({ tipos, onChange }: { tipos: ExpenseType[]; onChange: () => void }) {
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [error, setError] = useState('');

  async function agregar() {
    if (!nombre.trim()) return;
    const { error: err } = await supabase.from('expense_types').insert({ nombre: nombre.trim(), color });
    if (err) {
      setError(mensajeError(err, 'Ya existe un tipo de gasto con ese nombre.'));
      return;
    }
    setNombre('');
    setError('');
    onChange();
  }

  async function eliminar(id: string) {
    await supabase.from('expense_types').delete().eq('id', id);
    onChange();
  }

  return (
    <div>
      <h2>Tipos de gasto</h2>
      {tipos.map((t) => (
        <div key={t.id} className="list-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
            {t.nombre}
          </span>
          <button className="btn-link" onClick={() => eliminar(t.id)}>
            Borrar
          </button>
        </div>
      ))}
      <div className="mini-form">
        <input placeholder="Nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
        <input type="color" value={color} onChange={(ev) => setColor(ev.target.value)} style={{ width: 60, padding: 2 }} />
        {error && <div className="error-text">{error}</div>}
        <button className="btn" onClick={agregar}>
          Agregar tipo
        </button>
      </div>
    </div>
  );
}

function Conceptos({
  tipos,
  conceptos,
  onChange,
}: {
  tipos: ExpenseType[];
  conceptos: ExpenseConcept[];
  onChange: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [error, setError] = useState('');

  async function agregar() {
    if (!nombre.trim() || !tipoId) return;
    const { error: err } = await supabase.from('expense_concepts').insert({ nombre: nombre.trim(), tipo_id: tipoId });
    if (err) {
      setError(mensajeError(err, 'Ese tipo ya tiene un concepto con ese nombre.'));
      return;
    }
    setNombre('');
    setError('');
    onChange();
  }

  async function eliminar(id: string) {
    await supabase.from('expense_concepts').delete().eq('id', id);
    onChange();
  }

  return (
    <div>
      <h2>Conceptos</h2>
      {conceptos.map((c) => (
        <div key={c.id} className="list-row">
          <span>
            {c.nombre}{' '}
            <span className="text-muted">({tipos.find((t) => t.id === c.tipo_id)?.nombre})</span>
          </span>
          <button className="btn-link" onClick={() => eliminar(c.id)}>
            Borrar
          </button>
        </div>
      ))}
      <div className="mini-form">
        <select value={tipoId} onChange={(ev) => setTipoId(ev.target.value)}>
          <option value="">Tipo...</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        <input placeholder="Nombre del concepto" value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
        {error && <div className="error-text">{error}</div>}
        <button className="btn" onClick={agregar}>
          Agregar concepto
        </button>
      </div>
    </div>
  );
}

function Usuarios({ usuarios, onChange }: { usuarios: Profile[]; onChange: () => void }) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<Rol>('empleado');
  const [error, setError] = useState('');

  async function agregar() {
    if (!email.trim()) return;
    const { error: err } = await supabase.from('profiles').insert({ email: email.trim().toLowerCase(), nombre: nombre || null, rol });
    if (err) {
      setError(mensajeError(err, 'Ese email ya está dado de alta.'));
      return;
    }
    setEmail('');
    setNombre('');
    setError('');
    onChange();
  }

  async function cambiarRol(id: string, nuevoRol: Rol) {
    await supabase.from('profiles').update({ rol: nuevoRol }).eq('id', id);
    onChange();
  }

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from('profiles').update({ activo: !activo }).eq('id', id);
    onChange();
  }

  return (
    <div>
      <h2>Usuarios</h2>
      {usuarios.map((u) => (
        <div key={u.id} className="list-row">
          <span>
            {u.nombre || u.email}
            <br />
            <span className="text-muted">{u.email}</span>
          </span>
          <span className="list-row-actions">
            <select value={u.rol} onChange={(ev) => cambiarRol(u.id, ev.target.value as Rol)}>
              <option value="admin">admin</option>
              <option value="empleado">empleado</option>
            </select>
            <button className="btn-link" onClick={() => toggleActivo(u.id, u.activo)}>
              {u.activo ? 'Desactivar' : 'Activar'}
            </button>
          </span>
        </div>
      ))}
      <div className="mini-form">
        <input placeholder="Email de Gmail" value={email} onChange={(ev) => setEmail(ev.target.value)} />
        <input placeholder="Nombre (opcional)" value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
        <select value={rol} onChange={(ev) => setRol(ev.target.value as Rol)}>
          <option value="empleado">empleado</option>
          <option value="admin">admin</option>
        </select>
        {error && <div className="error-text">{error}</div>}
        <button className="btn" onClick={agregar}>
          Invitar usuario
        </button>
      </div>
    </div>
  );
}
