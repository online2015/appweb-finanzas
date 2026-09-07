import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import type { Expense, ExpenseType } from '../types';

const hoy = new Date();

function formatMonto(monto: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto);
}

export function Dashboard() {
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [tipos, setTipos] = useState<ExpenseType[]>([]);
  const [expensesMes, setExpensesMes] = useState<Expense[]>([]);
  const [evolucion, setEvolucion] = useState<{ mes: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('expense_types')
      .select('*')
      .then(({ data }) => setTipos((data as ExpenseType[]) || []));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const desdeMes = `${anio}-${String(mes).padStart(2, '0')}-01`;
      const finMes = new Date(anio, mes, 0).getDate();
      const hastaMes = `${anio}-${String(mes).padStart(2, '0')}-${String(finMes).padStart(2, '0')}`;

      const { data: mesData } = await supabase
        .from('expenses')
        .select('*, expense_types(*)')
        .gte('fecha_vencimiento', desdeMes)
        .lte('fecha_vencimiento', hastaMes);
      setExpensesMes((mesData as Expense[]) || []);

      const desdeEvolucion = new Date(anio, mes - 6, 1).toISOString().slice(0, 10);
      const { data: evoData } = await supabase
        .from('expenses')
        .select('monto, fecha_vencimiento')
        .gte('fecha_vencimiento', desdeEvolucion)
        .lte('fecha_vencimiento', hastaMes);

      const porMes = new Map<string, number>();
      for (const row of (evoData as { monto: number; fecha_vencimiento: string }[]) || []) {
        const key = row.fecha_vencimiento.slice(0, 7);
        porMes.set(key, (porMes.get(key) || 0) + Number(row.monto));
      }
      const meses: { mes: string; total: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anio, mes - 1 - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        meses.push({
          mes: d.toLocaleDateString('es-AR', { month: 'short' }),
          total: porMes.get(key) || 0,
        });
      }
      setEvolucion(meses);
      setLoading(false);
    }
    load();
  }, [mes, anio]);

  const totalMes = expensesMes.reduce((acc, e) => acc + Number(e.monto), 0);
  const totalPagado = expensesMes.filter((e) => e.estado === 'pagado').reduce((acc, e) => acc + Number(e.monto), 0);
  const totalPendiente = totalMes - totalPagado;

  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expensesMes) {
      const nombre = e.expense_types?.nombre || 'Sin tipo';
      map.set(nombre, (map.get(nombre) || 0) + Number(e.monto));
    }
    return Array.from(map.entries()).map(([nombre, total]) => ({
      nombre,
      total,
      color: tipos.find((t) => t.nombre === nombre)?.color || '#94a3b8',
    }));
  }, [expensesMes, tipos]);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Dashboard
        </h1>
        <div className="filters-bar" style={{ marginBottom: 0 }}>
          <select value={mes} onChange={(ev) => setMes(Number(ev.target.value))}>
            {meses.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input type="number" value={anio} style={{ width: 90 }} onChange={(ev) => setAnio(Number(ev.target.value))} />
        </div>
      </div>

      {loading ? (
        <>
          <div className="stats-row" style={{ marginTop: 24 }}>
            <div className="stat-block">
              <div className="stat-label">Total del mes</div>
              <div className="skeleton" style={{ height: 44, width: '70%' }} />
            </div>
            <div className="stat-block">
              <div className="stat-label">Pagado</div>
              <div className="skeleton" style={{ height: 34, width: '65%' }} />
            </div>
            <div className="stat-block">
              <div className="stat-label">Pendiente</div>
              <div className="skeleton" style={{ height: 34, width: '65%' }} />
            </div>
          </div>
          <div className="charts-row">
            <div className="chart-block">
              <p className="chart-title">Distribución por tipo</p>
              <div className="skeleton" style={{ height: 260, width: '100%' }} />
            </div>
            <div className="chart-block">
              <p className="chart-title">Evolución mensual</p>
              <div className="skeleton" style={{ height: 260, width: '100%' }} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="stats-row" style={{ marginTop: 24 }}>
            <div className="stat-block">
              <div className="stat-label">Total del mes</div>
              <div className="stat-value">{formatMonto(totalMes)}</div>
            </div>
            <div className="stat-block">
              <div className="stat-label">Pagado</div>
              <div className="stat-value" style={{ color: 'var(--pagado)' }}>
                {formatMonto(totalPagado)}
              </div>
            </div>
            <div className="stat-block">
              <div className="stat-label">Pendiente</div>
              <div className="stat-value" style={{ color: 'var(--pendiente)' }}>
                {formatMonto(totalPendiente)}
              </div>
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-block">
              <p className="chart-title">Distribución por tipo</p>
              {porTipo.length === 0 ? (
                <div className="empty-state">Sin datos para este mes.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={porTipo} dataKey="total" nameKey="nombre" innerRadius={55} outerRadius={90}>
                      {porTipo.map((entry) => (
                        <Cell key={entry.nombre} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatMonto(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="chart-block">
              <p className="chart-title">Evolución mensual</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={evolucion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatMonto(Number(v))} cursor={{ fill: 'var(--bg-alt)' }} />
                  <Bar dataKey="total" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
