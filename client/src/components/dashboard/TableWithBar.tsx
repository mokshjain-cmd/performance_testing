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
  return (
    <div className="flex gap-8 mb-8 items-start">
      {barPosition === 'left' && (
        <div className="flex-1 min-w-[320px]">
          <BarGraph data={barData} title="" color={barColor} yLabel={yLabel} />
        </div>
      )}
      <div className="flex-1">
        <h3 className="mb-2 font-semibold text-lg">{title}</h3>
        <div className="overflow-x-auto rounded-xl shadow bg-white/70">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                {columns.map(col => (
                  <th key={String(col.key)} className="px-4 py-2 border border-slate-200 text-center text-base font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row._id || i}>
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-2 border border-slate-200 text-center text-base">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {barPosition === 'right' && (
        <div className="flex-1 min-w-[320px]">
          <BarGraph data={barData} title="" color={barColor} yLabel={yLabel} />
        </div>
      )}
    </div>
  );
}

export default TableWithBar;
