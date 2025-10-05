
import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, TahunAjaran, Semester } from '../types';
import Card from '../components/Card';
import { useToast } from '../contexts/ToastContext';

interface ManajemenSettingProps {
  appSettings: AppSettings;
  apiHandler: (endpoint: string, method: 'POST', body: any, successMessage: string) => Promise<boolean>;
  tahunAjaranData: TahunAjaran[];
  activeTahunAjaranId: number;
  setActiveTahunAjaranId: (id: number) => void;
  activeSemester: Semester;
  setActiveSemester: (semester: Semester) => void;
}

const ManajemenSetting: React.FC<ManajemenSettingProps> = ({ 
  appSettings, 
  apiHandler,
  tahunAjaranData,
  activeTahunAjaranId,
  setActiveTahunAjaranId,
  activeSemester,
  setActiveSemester
}) => {
  const [formData, setFormData] = useState<AppSettings>(appSettings);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(appSettings.logo_sekolah || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setFormData(appSettings);
    setPreviewUrl(appSettings.logo_sekolah || null);
  }, [appSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB
        showToast('Ukuran file tidak boleh lebih dari 2MB.', 'error');
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        showToast('Hanya file PNG, JPG, atau GIF yang diizinkan.', 'error');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const dataToSend = new FormData();
    dataToSend.append('nama_sekolah', formData.nama_sekolah);
    dataToSend.append('kabupaten', formData.kabupaten);
    dataToSend.append('alamat_sekolah', formData.alamat_sekolah);
    if (selectedFile) {
      dataToSend.append('logo_sekolah', selectedFile);
    }
    
    const success = await apiHandler('setting_handler.php', 'POST', dataToSend, 'Pengaturan aplikasi berhasil diperbarui.');
    
    if (!success) {
      showToast('Gagal menyimpan. Perubahan dibatalkan.', 'error');
    } else {
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <Card title="Pengaturan Periode Aktif">
        <p className="text-gray-600 mb-4">Pilih tahun ajaran dan semester yang sedang aktif. Pengaturan ini akan memengaruhi data yang ditampilkan di seluruh aplikasi.</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center">
            <label htmlFor="tahun-ajaran-select" className="text-sm font-medium text-gray-700 mr-2">Tahun Ajaran:</label>
            <select
              id="tahun-ajaran-select"
              value={activeTahunAjaranId}
              onChange={(e) => setActiveTahunAjaranId(Number(e.target.value))}
              className="p-2 border rounded bg-gray-50 text-sm focus:ring-primary focus:border-primary"
              disabled={tahunAjaranData.length === 0}
            >
              {tahunAjaranData.length > 0 ? (
                tahunAjaranData.map(ta => (
                  <option key={ta.id} value={ta.id}>{ta.tahun_ajaran}</option>
                ))
              ) : (
                <option>Data T.A Kosong</option>
              )}
            </select>
          </div>
          <div className="flex items-center">
            <label htmlFor="semester-select" className="text-sm font-medium text-gray-700 mr-2">Semester:</label>
            <select
              id="semester-select"
              value={activeSemester}
              onChange={(e) => setActiveSemester(e.target.value as Semester)}
              className="p-2 border rounded bg-gray-50 text-sm focus:ring-primary focus:border-primary"
            >
              <option value={Semester.GANJIL}>{Semester.GANJIL}</option>
              <option value={Semester.GENAP}>{Semester.GENAP}</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Pengaturan Informasi Sekolah">
        <p className="text-gray-600 mb-6">Ubah informasi dasar dan logo sekolah yang akan ditampilkan di seluruh aplikasi.</p>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label htmlFor="nama_sekolah" className="block text-sm font-medium text-gray-700">Nama Sekolah</label>
                <input type="text" id="nama_sekolah" name="nama_sekolah" value={formData.nama_sekolah || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"/>
              </div>
              <div>
                <label htmlFor="kabupaten" className="block text-sm font-medium text-gray-700">Kabupaten/Kota</label>
                <input type="text" id="kabupaten" name="kabupaten" value={formData.kabupaten || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"/>
              </div>
              <div>
                <label htmlFor="alamat_sekolah" className="block text-sm font-medium text-gray-700">Alamat Sekolah</label>
                <textarea id="alamat_sekolah" name="alamat_sekolah" value={formData.alamat_sekolah || ''} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Logo Sekolah</label>
              <div className="mt-1 flex flex-col items-center">
                  <div className="w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
                      {previewUrl ? (
                           <img src={previewUrl} alt="Preview Logo" className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-sm text-gray-500">Pratinjau Logo</span>
                      )}
                  </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" className="hidden" id="logo_upload" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm text-blue-600 hover:underline">Ganti Logo</button>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF (Max 2MB)</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ManajemenSetting;
