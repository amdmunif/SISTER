
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Role } from '../types';
import Card from '../components/Card';
import DataTable, { type Column } from '../components/DataTable';
import { exportToExcel } from '../utils/export';
import { useToast } from '../contexts/ToastContext';
import { PencilIcon, TrashIcon } from '../components/icons/Icons';

interface ManajemenUserProps {
  usersData: User[];
  apiHandler: (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body: any, successMessage: string) => Promise<boolean>;
}

const initialFormState: Omit<User, 'id_user' | 'password'> & { password?: string } = {
  username: '',
  nama: '',
  role: Role.WALI_KELAS,
  kelas: '',
  password: '',
};

const ManajemenUser: React.FC<ManajemenUserProps> = ({ usersData, apiHandler }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterRole, setFilterRole] = useState('Semua');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const needsKelasInput = formData.role === Role.WALI_KELAS;
  const availableRoles = Object.values(Role).filter(r => r !== Role.SISWA && r !== Role.KETUA_KELAS_SISWA);
  
  const filteredUsers = useMemo(() => {
    if (filterRole === 'Semua') return usersData;
    return usersData.filter(u => u.role === filterRole);
  }, [usersData, filterRole]);

  useEffect(() => {
    if (isModalOpen) {
      if (editingUser) {
        setFormData({
            username: editingUser.username,
            nama: editingUser.nama || '',
            role: editingUser.role,
            kelas: editingUser.kelas || '',
            password: '',
        });
      } else {
        setFormData(initialFormState);
      }
    }
  }, [isModalOpen, editingUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newFormData = { ...prev, [name]: value };
        if (name === 'role' && value !== Role.WALI_KELAS) {
            newFormData.kelas = '';
        }
        return newFormData;
    });
  };
  
  const openAddModal = () => {
      setEditingUser(null);
      setIsModalOpen(true);
  }
  
  const openEditModal = (user: User) => {
      setEditingUser(user);
      setIsModalOpen(true);
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.nama || !formData.role || (needsKelasInput && !formData.kelas)) return;
    if (!editingUser && !formData.password) return;

    setIsSubmitting(true);
    let success = false;
    if (editingUser) {
        const payload = {
            ...formData,
            id_user: editingUser.id_user,
            password: formData.password ? formData.password : undefined,
        };
        success = await apiHandler('user_handler.php', 'PUT', payload, 'Data user berhasil diperbarui.');
    } else {
        success = await apiHandler('user_handler.php', 'POST', formData, 'User baru berhasil ditambahkan.');
    }
    if(success) setIsModalOpen(false);
    setIsSubmitting(false);
  };
  
  const handleDeleteUser = async (id_user: number) => {
      if (window.confirm('Apakah Anda yakin ingin menghapus data user ini?')) {
          await apiHandler('user_handler.php', 'DELETE', { id_user }, 'Data user berhasil dihapus.');
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
        const newUsers = json.map((row, index) => {
            if(!row['Username'] || !row['Nama Lengkap'] || !row['Role'] || !row['Password']) {
                throw new Error(`Data tidak lengkap pada baris ${index + 2}.`);
            }
            const role = row['Role'] as Role;
            if (!availableRoles.includes(role)) {
                throw new Error(`Role '${role}' tidak valid pada baris ${index + 2}.`);
            }
            if (role === Role.WALI_KELAS && !row['Kelas (Wali Kelas)']) {
                throw new Error(`Kolom 'Kelas (Wali Kelas)' wajib diisi untuk role Wali Kelas pada baris ${index + 2}.`);
            }
            return {
                username: String(row['Username']),
                nama: String(row['Nama Lengkap']),
                password: String(row['Password']),
                role: role,
                kelas: role === Role.WALI_KELAS ? String(row['Kelas (Wali Kelas)']) : '',
            }
        });

        if (window.confirm(`Anda akan mengimpor ${newUsers.length} data user. Lanjutkan?`)) {
            await apiHandler('user_handler.php', 'POST', { bulk: newUsers }, `${newUsers.length} data user berhasil diimpor.`);
        }

      } catch (error: any) {
        console.error("Import failed", error);
        showToast(`Gagal mengimpor: ${error.message}`, 'error');
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleExportExcel = () => {
    const dataToExport = filteredUsers.map(({ password, ...user }) => user); // Don't export passwords
    exportToExcel(dataToExport, 'data_user', 'Users');
  }
  
  const handleExportTemplate = () => {
      const templateData = [{'Username': 'contohuser', 'Nama Lengkap': 'Nama Contoh', 'Role': 'Guru', 'Password': 'password_rahasia', 'Kelas (Wali Kelas)': ''}];
      exportToExcel(templateData, 'template_import_user', 'Template');
  }

  const columns = useMemo<Column<User>[]>(() => [
    { header: 'Username', accessor: 'username', sortable: true },
    { header: 'Nama Lengkap', accessor: 'nama', sortable: true },
    { header: 'Role', accessor: 'role', sortable: true },
    { header: 'Kelas (jika ada)', accessor: 'kelas', sortable: true, cell: (row: User) => row.kelas || '-' },
    {
      header: 'Aksi', accessor: 'id_user',
      cell: (row: User) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEditModal(row)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors" title="Edit User">
            <PencilIcon />
          </button>
          <button onClick={() => handleDeleteUser(row.id_user)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors" title="Hapus User">
            <TrashIcon />
          </button>
        </div>
      )
    }
  ], []); 

  return (
    <Card title="Manajemen Data Guru & Staf">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <button onClick={openAddModal} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded">
              + Tambah User
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
            <button onClick={() => fileInputRef.current?.click()} className="bg-success hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
              Import Excel
            </button>
            <button onClick={handleExportExcel} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Export Excel
            </button>
          </div>
          <button onClick={handleExportTemplate} className="text-sm text-blue-600 hover:underline">
              Unduh Template Excel
          </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <label htmlFor="role-filter" className="font-semibold mr-2">Filter Role:</label>
        <select id="role-filter" value={filterRole} onChange={e => setFilterRole(e.target.value)} className="p-2 border rounded">
            <option value="Semua">Semua Role</option>
            {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={filteredUsers} />
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit Data User' : 'Tambah User Baru'}</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-4"><label className="block text-gray-700">Username</label><input type="text" name="username" value={formData.username} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
              <div className="mb-4"><label className="block text-gray-700">Nama Lengkap</label><input type="text" name="nama" value={formData.nama || ''} onChange={handleInputChange} className="w-full p-2 border rounded" required /></div>
              <div className="mb-4"><label className="block text-gray-700">Password</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder={editingUser ? '(Biarkan kosong jika tidak diubah)' : ''} className="w-full p-2 border rounded" required={!editingUser} /></div>
              <div className="mb-4"><label className="block text-gray-700">Role</label><select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 border rounded" required>{availableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></div>
              {needsKelasInput && (<div className="mb-4"><label className="block text-gray-700">Kelas</label><input type="text" name="kelas" value={formData.kelas} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="Contoh: VII-A" required /></div>)}
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

export default ManajemenUser;