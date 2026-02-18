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
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
      <h3 className="text-2xl font-semibold mb-6 text-gray-800">{title}</h3>
      <div className="flex gap-8 items-start flex-col lg:flex-row">
        {barPosition === 'left' && (
          <div className="flex-1 min-w-[320px] w-full">
            <BarGraph data={barData} title="" color={barColor} yLabel={yLabel} />
          </div>
        )}
        <div className="flex-1 w-full">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  {columns.map(col => (
                    <th key={String(col.key)} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {data.map((row, i) => (
                  <tr key={row._id || i} className="hover:bg-gray-50 transition-colors">
                    {columns.map(col => (
                      <td key={String(col.key)} className="px-4 py-3 text-center text-sm text-gray-700 border-b border-gray-100">
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
          <div className="flex-1 min-w-[320px] w-full">
            <BarGraph data={barData} title="" color={barColor} yLabel={yLabel} />
          </div>
        )}
      </div>
    </div>
  );
}

export default TableWithBar;
