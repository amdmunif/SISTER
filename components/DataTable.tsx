import React, { useState, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => any);
  sortable?: boolean;
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  defaultSort?: { accessor: keyof T | ((row: T) => any), direction: 'asc' | 'desc' };
}

const DataTable = <T extends {}>({ columns, data, defaultSort }: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T | ((row: T) => any); direction: 'asc' | 'desc' } | null>(defaultSort ? { key: defaultSort.accessor, direction: defaultSort.direction } : null);

  const getAccessorValue = (row: T, accessor: keyof T | ((row: T) => any)): any => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor];
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      return columns.some(column => {
        const value = getAccessorValue(item, column.accessor);
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, columns]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = getAccessorValue(a, sortConfig.key);
        const bValue = getAccessorValue(b, sortConfig.key);
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = sortedData.length > 0 ? Math.ceil(sortedData.length / itemsPerPage) : 1;

  const requestSort = (key: keyof T | ((row: T) => any)) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const renderSortArrow = (key: keyof T | ((row: T) => any)) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'asc') {
      return <ChevronUpIcon className="inline ml-1 w-4 h-4" />;
    }
    return <ChevronDownIcon className="inline ml-1 w-4 h-4" />;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <input
          type="text"
          placeholder="Cari data..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="p-2 border rounded w-full md:w-1/3"
        />
        <select
          value={itemsPerPage}
          onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          className="p-2 border rounded"
        >
          {[10, 20, 50, 100].map(size => (
            <option key={size} value={size}>
              Tampil {size}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto table-stacked">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="py-3 px-4 text-left uppercase font-semibold text-sm cursor-pointer"
                  onClick={() => column.sortable && requestSort(column.accessor)}
                >
                  {column.header}
                  {column.sortable && renderSortArrow(column.accessor)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="py-3 px-4" data-label={column.header}>
                    {column.cell ? column.cell(row) : String(getAccessorValue(row, column.accessor))}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedData.length === 0 && (
                <tr>
                    <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                        Tidak ada data yang ditemukan.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
        <span className="text-sm text-gray-700">
          Halaman {currentPage} dari {totalPages} (Total {sortedData.length} data)
        </span>
        <div className="flex items-center">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border rounded disabled:opacity-50"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="px-4">{currentPage}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border rounded disabled:opacity-50"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;