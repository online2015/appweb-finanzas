export type Rol = 'admin' | 'empleado';
export type Estado = 'pendiente' | 'pagado';
export type VentanaPago = '1-10' | '10-20' | '20-fin';

export interface Profile {
  id: string;
  user_id: string | null;
  email: string;
  nombre: string | null;
  rol: Rol;
  activo: boolean;
}

export interface ExpenseType {
  id: string;
  nombre: string;
  color: string;
}

export interface ExpenseConcept {
  id: string;
  tipo_id: string;
  nombre: string;
}

export interface Expense {
  id: string;
  tipo_id: string;
  concepto_id: string;
  detalle: string | null;
  proveedor: string | null;
  monto: number;
  moneda: string;
  fecha_vencimiento: string;
  ventana_pago: VentanaPago;
  estado: Estado;
  recurrente: boolean;
  periodicidad: 'mensual' | null;
  fecha_pago: string | null;
  comprobante_url: string | null;
  pagado_por: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
  expense_types?: ExpenseType;
  expense_concepts?: ExpenseConcept;
}

export function ventanaPagoDesdeFecha(fechaISO: string): VentanaPago {
  const dia = new Date(fechaISO + 'T00:00:00').getDate();
  if (dia <= 10) return '1-10';
  if (dia <= 20) return '10-20';
  return '20-fin';
}
