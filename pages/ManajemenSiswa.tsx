
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Siswa, JenisKelamin } from '../types';
import Card from '../components/Card';
import { exportToExcel } from '../utils/export';
import DataTable, { type Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import { sortKelas } from '../utils/helpers';
import { PencilIcon, TrashIcon } from '../components/icons/Icons';

interface ManajemenSiswaProps {
  siswaData: Siswa[];
  apiHandler: (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body: any, successMessage: string) => Promise<boolean>;
}

const initialFormState: Omit<Siswa, 'id_siswa' | 'password'> & { password?: string, isKetuaKelas: boolean } = {
  nis: '',
  nama: '',
  kelas: '',
  jenis_kelamin: JenisKelamin.L,
  tanggal_lahir: '',
  password: '',
  isKetuaKelas: false,
};

const ManajemenSiswa: React.FC<ManajemenSiswaProps> = ({ siswaData, apiHandler }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterKelas, setFilterKelas] = useState('Semua');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const availableKelas = useMemo(() => ['Semua', ...[...new Set(siswaData.map(s => s.kelas))].sort(sortKelas)], [siswaData]);
  
  const filteredSiswa = useMemo(() => {
    if (filterKelas === 'Semua') {
      return siswaData;
    }
    return siswaData.filter(s => s.kelas === filterKelas);
  }, [siswaData, filterKelas]);

  useEffect(() => {
    if (isModalOpen) {
      if (editingSiswa) {
        setFormData({
            nis: editingSiswa.nis,
            nama: editingSiswa.nama,
            kelas: editingSiswa.kelas,
            jenis_kelamin: editingSiswa.jenis_kelamin,
            tanggal_lahir: editingSiswa.tanggal_lahir,
            isKetuaKelas: editingSiswa.isKetuaKelas,
            password: '', // Keep password blank for editing for security
        });
      } else {
        setFormData(initialFormState);
      }
    }
  }, [isModalOpen, editingSiswa]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData({ ...formData, [name]: checked });
    } else {
        setFormData({ ...formData, [name]: value });
    }
  };
  
  const openAddModal = () => {
      setEditingSiswa(null);
      setIsModalOpen(true);
  }
  
  const openEditModal = (siswa: Siswa) => {
      setEditingSiswa(siswa);
      setIsModalOpen(true);
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nis || !formData.nama || !formData.kelas || !formData.tanggal_lahir) return;
    if (!editingSiswa && !formData.password) {
        showToast('Password wajib diisi untuk siswa baru.', 'error');
        return;
    }
    
    setIsSubmitting(true);
    let success = false;
    if (editingSiswa) {
        const payload = { 
          ...formData, 
          id_siswa: editingSiswa.id_siswa,
          password: formData.password ? formData.password : undefined 
        };
        success = await apiHandler('siswa_handler.php', 'PUT', payload, 'Data siswa berhasil diperbarui.');
    } else {
        success = await apiHandler('siswa_handler.php', 'POST', formData, 'Siswa baru berhasil ditambahkan.');
    }
    if (success) setIsModalOpen(false);
    setIsSubmitting(false);
  };
  
  const handleDeleteSiswa = async (id_siswa: number) => {
      if (window.confirm('Apakah Anda yakin ingin menghapus data siswa ini?')) {
        await apiHandler('siswa_handler.php', 'DELETE', { id_siswa }, 'Data siswa berhasil dihapus.');
      }
  }
  
  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result;
      const workbook = (window as any).XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = (window as any).XLSX.utils.sheet_to_json(worksheet);
      
      try {
        const newStudents = json.map((row, index) => {
            if(!row['NIS'] || !row['Nama Siswa'] || !row['Kelas'] || !row['Password']) {
                throw new Error(`Data tidak lengkap pada baris ${index + 2}.`);
            }
            return {
                nis: String(row['NIS']),
                nama: String(row['Nama Siswa']),
                kelas: String(row['Kelas']),
                jenis_kelamin: String(row['Jenis Kelamin']).toUpperCase() === 'P' ? JenisKelamin.P : JenisKelamin.L,
                tanggal_lahir: new Date((row['Tanggal Lahir'] - (25567 + 1)) * 86400 * 1000).toISOString().slice(0, 10),
                password: String(row['Password']),
                isKetuaKelas: String(row['Ketua Kelas']).toLowerCase() === 'ya',
            }
        });

        if (window.confirm(`Anda akan mengimpor ${newStudents.length} data siswa. Lanjutkan?`)) {
            const success = await apiHandler('siswa_handler.php', 'POST', { bulk: newStudents }, `${newStudents.length} data siswa berhasil diimpor.`);
            if (!success) {
                // The apiHandler already shows a toast on failure, but you could add more specific logic here if needed.
            }
        }

      } catch (error: any) {
        console.error("Import failed:", error);
        showToast(`Gagal mengimpor: ${error.message}`, 'error');
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleExportTemplate = () => {
      const templateData = [{'NIS': '1001', 'Nama Siswa': 'Contoh Siswa', 'Kelas': 'VII-A', 'Jenis Kelamin': 'L', 'Tanggal Lahir': '2010-01-15', 'Password': 'password_siswa', 'Ketua Kelas': 'Ya'}];
      exportToExcel(templateData, 'template_import_siswa', 'Template');
  }

  const columns = useMemo<Column<Siswa>[]>(() => [
    { header: 'NIS', accessor: 'nis', sortable: true },
    { header: 'Nama', accessor: 'nama', sortable: true },
    { header: 'Kelas', accessor: 'kelas', sortable: true },
    { header: 'Ketua Kelas', accessor: 'isKetuaKelas', sortable: true, cell: (row: Siswa) => row.isKetuaKelas ? 'Ya' : 'Tidak' },
    {
      header: 'Aksi', accessor: 'id_siswa',
      cell: (row: Siswa) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEditModal(row)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors" title="Edit Siswa">
            <PencilIcon />
          </button>
          <button onClick={() => handleDeleteSiswa(row.id_siswa)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors" title="Hapus Siswa">
            <TrashIcon />
          </button>
        </div>
      )
    }
  ], []);

  return (
    <Card title="Manajemen Data Siswa">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex gap-2">
          <button onClick={openAddModal} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded">
            + Tambah Siswa
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-success hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
            Import Excel
          </button>
        </div>
        <button onClick={handleExportTemplate} className="text-sm text-blue-600 hover:underline">
            Unduh Template Excel
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <label htmlFor="kelas-filter" className="font-semibold mr-2">Filter Kelas:</label>
        <select id="kelas-filter" value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="p-2 border rounded">
            {availableKelas.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={filteredSiswa} />
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="mb-4"><label className="block text-gray-700">NIS</label><input type="text" name="nis" value={formData.nis} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
                <div className="mb-4"><label className="block text-gray-700">Kelas</label><input type="text" name="kelas" value={formData.kelas} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
              </div>
              <div className="mb-4"><label className="block text-gray-700">Nama Lengkap</label><input type="text" name="nama" value={formData.nama} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
              <div className="mb-4"><label className="block text-gray-700">Password</label><input type="password" name="password" placeholder={editingSiswa ? "(Biarkan kosong jika tidak diubah)" : ""} value={formData.password} onChange={handleInputChange} className="w-full p-2 border rounded" required={!editingSiswa} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="mb-4"><label className="block text-gray-700">Jenis Kelamin</label><select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleInputChange} className="w-full p-2 border rounded" required><option value={JenisKelamin.L}>Laki-laki</option><option value={JenisKelamin.P}>Perempuan</option></select></div>
                   <div className="mb-4"><label className="block text-gray-700">Tanggal Lahir</label><input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
              </div>
              <div className="mb-4 flex items-center"><input type="checkbox" id="isKetuaKelas" name="isKetuaKelas" checked={formData.isKetuaKelas} onChange={handleInputChange} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" /><label htmlFor="isKetuaKelas" className="ml-2 block text-sm text-gray-900">Jadikan Ketua Kelas</label></div>
              <div className="flex justify-end">
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

export default ManajemenSiswa;