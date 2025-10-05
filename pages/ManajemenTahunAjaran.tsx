
import React, { useState, useEffect, useMemo } from 'react';
import { TahunAjaran } from '../types';
import Card from '../components/Card';
import DataTable, { type Column } from '../components/DataTable';
import { formatIndonesianDateShort } from '../utils/date';
import { PencilIcon, TrashIcon } from '../components/icons/Icons';

interface ManajemenTahunAjaranProps {
  tahunAjaranData: TahunAjaran[];
  apiHandler: (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body: any, successMessage: string) => Promise<boolean>;
}

const initialFormState: Omit<TahunAjaran, 'id'> = {
  tahun_ajaran: '',
  semester_ganjil_start: '',
  semester_ganjil_end: '',
  semester_genap_start: '',
  semester_genap_end: '',
};

const ManajemenTahunAjaran: React.FC<ManajemenTahunAjaranProps> = ({ tahunAjaranData, apiHandler }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [editingTA, setEditingTA] = useState<TahunAjaran | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      if (editingTA) {
        setFormData({
          tahun_ajaran: editingTA.tahun_ajaran,
          semester_ganjil_start: editingTA.semester_ganjil_start,
          semester_ganjil_end: editingTA.semester_ganjil_end,
          semester_genap_start: editingTA.semester_genap_start,
          semester_genap_end: editingTA.semester_genap_end,
        });
      } else {
        setFormData(initialFormState);
      }
    }
  }, [isModalOpen, editingTA]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setEditingTA(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ta: TahunAjaran) => {
    setEditingTA(ta);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tahun_ajaran || !formData.semester_ganjil_start || !formData.semester_ganjil_end || !formData.semester_genap_start || !formData.semester_genap_end) {
      return;
    }

    setIsSubmitting(true);
    let success = false;
    if (editingTA) {
        success = await apiHandler('tahun_ajaran_handler.php', 'PUT', { ...formData, id: editingTA.id }, 'Data Tahun Ajaran berhasil diperbarui.');
    } else {
        success = await apiHandler('tahun_ajaran_handler.php', 'POST', formData, 'Tahun Ajaran baru berhasil ditambahkan.');
    }
    if (success) setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        await apiHandler('tahun_ajaran_handler.php', 'DELETE', { id }, 'Data Tahun Ajaran berhasil dihapus.');
    }
  };

  const columns = useMemo<Column<TahunAjaran>[]>(() => [
    { header: 'Tahun Ajaran', accessor: 'tahun_ajaran', sortable: true },
    { header: 'Semester Ganjil', accessor: 'semester_ganjil_start', sortable: true, cell: (row) => `${formatIndonesianDateShort(row.semester_ganjil_start)} s/d ${formatIndonesianDateShort(row.semester_ganjil_end)}` },
    { header: 'Semester Genap', accessor: 'semester_genap_start', sortable: true, cell: (row) => `${formatIndonesianDateShort(row.semester_genap_start)} s/d ${formatIndonesianDateShort(row.semester_genap_end)}` },
    {
      header: 'Aksi', accessor: 'id',
      cell: (row: TahunAjaran) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEditModal(row)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors" title="Edit Tahun Ajaran">
            <PencilIcon />
          </button>
          <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors" title="Hapus Tahun Ajaran">
            <TrashIcon />
          </button>
        </div>
      )
    }
  ], []);

  return (
    <Card title="Manajemen Tahun Ajaran dan Semester">
      <div className="flex justify-between items-center mb-4">
        <button onClick={openAddModal} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded">
          + Tambah Tahun Ajaran
        </button>
      </div>
      
      <div className="table-stacked">
        <DataTable columns={columns} data={tahunAjaranData} />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">{editingTA ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-4"><label className="block text-gray-700">Tahun Ajaran (Contoh: 2024/2025)</label><input type="text" name="tahun_ajaran" value={formData.tahun_ajaran} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div><label className="block text-gray-700">Tgl Mulai Semester Ganjil</label><input type="date" name="semester_ganjil_start" value={formData.semester_ganjil_start} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
                <div><label className="block text-gray-700">Tgl Selesai Semester Ganjil</label><input type="date" name="semester_ganjil_end" value={formData.semester_ganjil_end} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
              </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div><label className="block text-gray-700">Tgl Mulai Semester Genap</label><input type="date" name="semester_genap_start" value={formData.semester_genap_start} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
                 <div><label className="block text-gray-700">Tgl Selesai Semester Genap</label><input type="date" name="semester_genap_end" value={formData.semester_genap_end} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded mr-2">Batal</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-4 py-2 rounded disabled:bg-gray-400">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ManajemenTahunAjaran;