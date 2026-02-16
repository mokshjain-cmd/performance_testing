import React from 'react';

interface TableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface TableWithBarProps<T> {
  title: string;
  data: T[];
  columns: TableColumn<T>[];
  barData: { name: string; accuracy: number }[];
  barColor: string;
  yLabel?: string;
  BarGraph: React.ComponentType<any>;
  barPosition?: 'left' | 'right'; // default right
}

function TableWithBar<T extends { [key: string]: any }>({
  title,
  data,
  columns,
  barData,
  barColor,
  yLabel,
  BarGraph,
  barPosition = 'right',
}: TableWithBarProps<T>) {
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 8,
  };
  const thtd: React.CSSProperties = {
    padding: 8,
    border: '1px solid #eee',
    textAlign: 'center',
  };
  return (
    <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
      {barPosition === 'left' && (
        <div style={{ flex: 1, minWidth: 320 }}>
          <BarGraph data={barData} title="" color={barColor} yLabel={yLabel} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <h3 style={{ marginBottom: 8 }}>{title}</h3>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {columns.map(col => (
                <th key={String(col.key)} style={thtd}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row._id || i}>
                {columns.map(col => (
                  <td key={String(col.key)} style={thtd}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {barPosition === 'right' && (
        <div style={{ flex: 1, minWidth: 320 }}>
          <BarGraph data={barData} title="" color={barColor} yLabel={yLabel} />
        </div>
      )}
    </div>
  );
}

export default TableWithBar;
