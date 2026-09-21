export function formatCOP(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('es-CO')}`;
}
