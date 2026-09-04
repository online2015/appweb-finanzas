import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Expense, ExpenseConcept, ExpenseType } from '../types';
import { ventanaPagoDesdeFecha } from '../types';

const hoy = new Date();

function formatMonto(monto: number, moneda: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda || 'ARS' }).format(monto);
}

interface Filtros {
  mes: number;
  anio: number;
  tipoId: string;
  estado: string;
  ventana: string;
  desde: string;
  hasta: string;
}

export function Gastos() {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === 'admin';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tipos, setTipos] = useState<ExpenseType[]>([]);
  const [conceptos, setConceptos] = useState<ExpenseConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [duplicando, setDuplicando] = useState(false);

  const [filtros, setFiltros] = useState<Filtros>({
    mes: hoy.getMonth() + 1,
    anio: hoy.getFullYear(),
    tipoId: '',
    estado: '',
    ventana: '',
    desde: '',
    hasta: '',
  });

  async function loadCatalogos() {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('expense_types').select('*').order('nombre'),
      supabase.from('expense_concepts').select('*').order('nombre'),
    ]);
    setTipos((t as ExpenseType[]) || []);
    setConceptos((c as ExpenseConcept[]) || []);
  }

  async function loadExpenses() {
    setLoading(true);
    let query = supabase
      .from('expenses')
      .select('*, expense_types(*), expense_concepts(*)')
      .order('fecha_vencimiento', { ascending: false });

    if (filtros.desde) {
      query = query.gte('fecha_vencimiento', filtros.desde);
    } else {
      const desdeMes = `${filtros.anio}-${String(filtros.mes).padStart(2, '0')}-01`;
      query = query.gte('fecha_vencimiento', desdeMes);
      const finMes = new Date(filtros.anio, filtros.mes, 0).getDate();
      const hastaMes = `${filtros.anio}-${String(filtros.mes).padStart(2, '0')}-${String(finMes).padStart(2, '0')}`;
      query = query.lte('fecha_vencimiento', hastaMes);
    }
    if (filtros.hasta) query = query.lte('fecha_vencimiento', filtros.hasta);
    if (filtros.tipoId) query = query.eq('tipo_id', filtros.tipoId);
    if (filtros.estado) query = query.eq('estado', filtros.estado);
    if (filtros.ventana) query = query.eq('ventana_pago', filtros.ventana);

    const { data, error } = await query;
    if (!error) setExpenses((data as Expense[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  async function duplicarMesAnterior() {
    setDuplicando(true);
    const mesAnteriorFecha = new Date(filtros.anio, filtros.mes - 2, 1);
    const anioAnt = mesAnteriorFecha.getFullYear();
    const mesAnt = mesAnteriorFecha.getMonth() + 1;
    const desde = `${anioAnt}-${String(mesAnt).padStart(2, '0')}-01`;
    const finMesAnt = new Date(anioAnt, mesAnt, 0).getDate();
    const hasta = `${anioAnt}-${String(mesAnt).padStart(2, '0')}-${String(finMesAnt).padStart(2, '0')}`;

    const { data: previos } = await supabase
      .from('expenses')
      .select('*')
      .eq('recurrente', true)
      .gte('fecha_vencimiento', desde)
      .lte('fecha_vencimiento', hasta);

    if (previos && previos.length > 0) {
      const nuevos = (previos as Expense[]).map((p) => {
        const fechaOriginal = new Date(p.fecha_vencimiento + 'T00:00:00');
        const nuevaFecha = new Date(filtros.anio, filtros.mes - 1, fechaOriginal.getDate());
        const fechaISO = nuevaFecha.toISOString().slice(0, 10);
        return {
          tipo_id: p.tipo_id,
          concepto_id: p.concepto_id,
          detalle: p.detalle,
          proveedor: p.proveedor,
          monto: p.monto,
          moneda: p.moneda,
          fecha_vencimiento: fechaISO,
          ventana_pago: ventanaPagoDesdeFecha(fechaISO),
          estado: 'pendiente' as const,
          recurrente: true,
          periodicidad: 'mensual' as const,
          creado_por: profile?.id,
        };
      });
      await supabase.from('expenses').insert(nuevos);
      await loadExpenses();
    }
    setDuplicando(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Gastos
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={duplicarMesAnterior} disabled={duplicando}>
            {duplicando ? 'Duplicando...' : 'Duplicar del mes anterior'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Nuevo gasto
          </button>
        </div>
      </div>

      <FiltrosBar filtros={filtros} setFiltros={setFiltros} tipos={tipos} />

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">No hay gastos para los filtros seleccionados.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Vencimiento</th>
              <th>Tipo</th>
              <th>Concepto</th>
              <th>Proveedor</th>
              <th>Ventana</th>
              <th>Monto</th>
              <th>Estado</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.fecha_vencimiento}</td>
                <td>{e.expense_types?.nombre}</td>
                <td>{e.expense_concepts?.nombre}</td>
                <td>{e.proveedor || '—'}</td>
                <td>{e.ventana_pago}</td>
                <td>{formatMonto(e.monto, e.moneda)}</td>
                <td>
                  <span className={`badge badge-${e.estado}`}>{e.estado}</span>
                </td>
                {isAdmin && (
                  <td>
                    {e.estado === 'pendiente' && (
                      <button className="btn-link" onClick={() => setPayingId(e.id)}>
                        Marcar pagado
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <NuevoGastoModal
          tipos={tipos}
          conceptos={conceptos}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadExpenses();
          }}
        />
      )}

      {payingId && (
        <MarcarPagadoModal
          expenseId={payingId}
          onClose={() => setPayingId(null)}
          onSaved={() => {
            setPayingId(null);
            loadExpenses();
          }}
        />
      )}
    </div>
  );
}

function FiltrosBar({
  filtros,
  setFiltros,
  tipos,
}: {
  filtros: Filtros;
  setFiltros: (f: Filtros) => void;
  tipos: ExpenseType[];
}) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return (
    <div className="filters-bar">
      <label>
        Mes
        <select
          value={filtros.mes}
          onChange={(ev) => setFiltros({ ...filtros, mes: Number(ev.target.value), desde: '', hasta: '' })}
        >
          {meses.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label>
        Año
        <input
          type="number"
          value={filtros.anio}
          style={{ width: 90 }}
          onChange={(ev) => setFiltros({ ...filtros, anio: Number(ev.target.value), desde: '', hasta: '' })}
        />
      </label>
      <label>
        Desde
        <input type="date" value={filtros.desde} onChange={(ev) => setFiltros({ ...filtros, desde: ev.target.value })} />
      </label>
      <label>
        Hasta
        <input type="date" value={filtros.hasta} onChange={(ev) => setFiltros({ ...filtros, hasta: ev.target.value })} />
      </label>
      <label>
        Tipo
        <select value={filtros.tipoId} onChange={(ev) => setFiltros({ ...filtros, tipoId: ev.target.value })}>
          <option value="">Todos</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Estado
        <select value={filtros.estado} onChange={(ev) => setFiltros({ ...filtros, estado: ev.target.value })}>
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
        </select>
      </label>
      <label>
        Ventana
        <select value={filtros.ventana} onChange={(ev) => setFiltros({ ...filtros, ventana: ev.target.value })}>
          <option value="">Todas</option>
          <option value="1-10">1-10</option>
          <option value="10-20">10-20</option>
          <option value="20-fin">20-fin</option>
        </select>
      </label>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 480, background: '#fff' }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function NuevoGastoModal({
  tipos,
  conceptos,
  onClose,
  onSaved,
}: {
  tipos: ExpenseType[];
  conceptos: ExpenseConcept[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [tipoId, setTipoId] = useState('');
  const [conceptoId, setConceptoId] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [detalle, setDetalle] = useState('');
  const [recurrente, setRecurrente] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const conceptosFiltrados = useMemo(
    () => conceptos.filter((c) => c.tipo_id === tipoId),
    [conceptos, tipoId]
  );

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!tipoId || !conceptoId || !monto || !fechaVencimiento) {
      setError('Completá tipo, concepto, monto y fecha de vencimiento.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('expenses').insert({
      tipo_id: tipoId,
      concepto_id: conceptoId,
      proveedor: proveedor || null,
      monto: Number(monto),
      fecha_vencimiento: fechaVencimiento,
      ventana_pago: ventanaPagoDesdeFecha(fechaVencimiento),
      detalle: detalle || null,
      recurrente,
      periodicidad: recurrente ? 'mensual' : null,
      creado_por: profile?.id,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onSaved();
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Nuevo gasto</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Tipo
            <select
              value={tipoId}
              onChange={(ev) => {
                setTipoId(ev.target.value);
                setConceptoId('');
              }}
            >
              <option value="">Seleccionar...</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Concepto
            <select value={conceptoId} onChange={(ev) => setConceptoId(ev.target.value)} disabled={!tipoId}>
              <option value="">Seleccionar...</option>
              {conceptosFiltrados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Proveedor
            <input value={proveedor} onChange={(ev) => setProveedor(ev.target.value)} />
          </label>
          <label>
            Monto
            <input type="number" step="0.01" value={monto} onChange={(ev) => setMonto(ev.target.value)} />
          </label>
          <label>
            Fecha de vencimiento
            <input type="date" value={fechaVencimiento} onChange={(ev) => setFechaVencimiento(ev.target.value)} />
          </label>
          <label>
            <span>&nbsp;</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={recurrente} onChange={(ev) => setRecurrente(ev.target.checked)} style={{ width: 'auto' }} />
              Es recurrente (mensual)
            </span>
          </label>
        </div>
        <label style={{ marginTop: 14 }}>
          Detalle (opcional)
          <textarea value={detalle} onChange={(ev) => setDetalle(ev.target.value)} rows={2} />
        </label>
        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MarcarPagadoModal({
  expenseId,
  onClose,
  onSaved,
}: {
  expenseId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setError('');

    let comprobanteUrl: string | null = null;
    if (archivo) {
      const path = `${expenseId}/${Date.now()}-${archivo.name}`;
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, archivo);
      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }
      comprobanteUrl = path;
    }

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        estado: 'pagado',
        fecha_pago: fechaPago,
        pagado_por: profile?.id,
        ...(comprobanteUrl ? { comprobante_url: comprobanteUrl } : {}),
      })
      .eq('id', expenseId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Marcar como pagado</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Fecha de pago
          <input type="date" value={fechaPago} onChange={(ev) => setFechaPago(ev.target.value)} />
        </label>
        <label style={{ marginTop: 12 }}>
          Comprobante (opcional)
          <input type="file" accept="image/*,application/pdf" onChange={(ev) => setArchivo(ev.target.files?.[0] || null)} />
        </label>
        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
