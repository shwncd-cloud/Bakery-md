import { useEffect, useState } from 'react';
import * as api from '../api/client';
import type { TableSummary } from '../api/types';
import { TableDetail } from '../components/TableDetail';

export function FloorPage() {
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [openCounts, setOpenCounts] = useState<Record<string, number>>({});
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTables() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listTables();
      setTables(list);
      const counts = await Promise.all(
        list.map(async (table) => {
          const items = await api.getTableItems(table.id);
          return [table.id, items.length] as const;
        }),
      );
      setOpenCounts(Object.fromEntries(counts));
    } catch {
      setError('No se pudieron cargar las mesas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTables();
  }, []);

  if (selectedTableId) {
    return (
      <div className="page">
        <TableDetail
          tableId={selectedTableId}
          tables={tables}
          onBack={() => {
            setSelectedTableId(null);
            void loadTables();
          }}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>Mesas</h2>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Cargando...</p>
      ) : tables.length === 0 ? (
        <div className="empty-state">No hay mesas configuradas todavía.</div>
      ) : (
        <div className="grid grid-tables">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`table-tile ${openCounts[table.id] ? 'table-tile--open' : ''}`}
              onClick={() => setSelectedTableId(table.id)}
            >
              {table.label}
              {openCounts[table.id] ? <div className="badge" style={{ marginTop: 8 }}>{openCounts[table.id]} pedidos</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
