
import React, { useState, useMemo, useEffect } from 'react';
import { CatatanKasus, Siswa, User, Role, AppSettings } from '../types';
import Card from '../components/Card';
import DataTable, { type Column } from '../components/DataTable';
import { getLocalDateString, formatIndonesianDate, formatIndonesianDateShort } from '../utils/date';
import { useToast } from '../contexts/ToastContext';
import { sortKelas } from '../utils/helpers';
import { PencilIcon, TrashIcon, PrintIcon, EyeIcon } from '../components/icons/Icons';

interface ManajemenKasusProps {
    currentUser: User;
    catatanKasusData: CatatanKasus[];
    siswaData: Siswa[];
    usersData: User[];
    apiHandler: (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body: any, successMessage: string) => Promise<boolean>;
    appSettings: AppSettings | null;
}

type KasusFormState = Omit<CatatanKasus, 'id_kasus'> & { kelas: string };

const initialFormState: KasusFormState = {
    id_siswa: 0,
    tanggal_kasus: getLocalDateString(),
    kasus: '',
    tindak_lanjut: '',
    dilaporkan_oleh: 0,
    kelas: '',
};

type EnrichedKasus = CatatanKasus & {
    nama_siswa: string;
    nis: string;
    kelas: string;
    nama_pelapor: string;
};

const PrintLayout: React.FC<{ kasus: EnrichedKasus, kepalaSekolah?: User, appSettings: AppSettings | null }> = ({ kasus, kepalaSekolah, appSettings }) => {
    return (
        <div className="bg-white p-8 font-serif text-black w-[210mm] min-h-[297mm] mx-auto">
            <div className="flex items-center justify-center border-b-4 border-black pb-2">
                {appSettings?.logo_sekolah && (
                    <img src={appSettings.logo_sekolah} alt="Logo Sekolah" className="h-20 w-20 object-contain mr-4" />
                )}
                <div className="text-center">
                    <h1 className="text-xl font-bold">PEMERINTAH {appSettings?.kabupaten?.toUpperCase() || 'KABUPATEN'}</h1>
                    <h2 className="text-2xl font-bold">{appSettings?.nama_sekolah?.toUpperCase() || 'NAMA SEKOLAH'}</h2>
                    <p className="text-sm">{appSettings?.alamat_sekolah || 'Alamat Sekolah'}</p>
                </div>
            </div>
            
            <div className="text-center mt-8">
                <h3 className="text-lg font-bold underline">CATATAN KASUS SISWA</h3>
            </div>
            
            <div className="mt-8 text-base leading-relaxed">
                <p>Pada hari ini, {formatIndonesianDate(kasus.tanggal_kasus)}, telah dibuat catatan kasus terhadap siswa:</p>
                <table className="my-4 ml-4">
                    <tbody>
                        <tr><td className="w-40 align-top">Nama</td><td className="align-top">: {kasus.nama_siswa}</td></tr>
                        <tr><td className="align-top">NIS</td><td className="align-top">: {kasus.nis}</td></tr>
                        <tr><td className="align-top">Kelas</td><td className="align-top">: {kasus.kelas}</td></tr>
                    </tbody>
                </table>
                
                <p className="font-bold mt-6">A. Detail Kasus:</p>
                <p className="pl-4 mt-2 whitespace-pre-wrap border-l-2 ml-2">{kasus.kasus}</p>
                
                <p className="font-bold mt-6">B. Tindak Lanjut:</p>
                <p className="pl-4 mt-2 whitespace-pre-wrap border-l-2 ml-2">{kasus.tindak_lanjut || 'Belum ada.'}</p>
            </div>
            
            <div className="mt-20 flex justify-around text-base">
                <div className="text-center">
                    <p>Siswa ybs.</p>
                    <div className="h-24"></div>
                    <p className="font-bold underline">{kasus.nama_siswa}</p>
                    <p>NIS: {kasus.nis}</p>
                </div>
                <div className="text-center">
                    <p>Guru BK,</p>
                    <div className="h-24"></div>
                    <p className="font-bold underline">{kasus.nama_pelapor}</p>
                </div>
            </div>
            <div className="mt-16 flex justify-center">
                 <div className="text-center text-base">
                    <p>Mengetahui,</p>
                    <p>Kepala Sekolah</p>
                    <div className="h-24"></div>
                    <p className="font-bold underline">{kepalaSekolah?.nama || '.....................................'}</p>
                </div>
            </div>
        </div>
    );
};


const ManajemenKasus: React.FC<ManajemenKasusProps> = ({ currentUser, catatanKasusData, siswaData, usersData, apiHandler, appSettings }) => {
    const [formData, setFormData] = useState<KasusFormState>(initialFormState);
    const [editingKasus, setEditingKasus] = useState<CatatanKasus | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedKasus, setSelectedKasus] = useState<EnrichedKasus | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [kasusToPrint, setKasusToPrint] = useState<EnrichedKasus | null>(null);
    const { showToast } = useToast();

    const isGuruBK = currentUser.role === Role.GURU_BK;
    const kepalaSekolah = useMemo(() => usersData.find(u => u.role === Role.KEPALA_SEKOLAH), [usersData]);

    const enrichedKasusData: EnrichedKasus[] = useMemo(() => {
        let filteredCatatan = catatanKasusData;

        if (currentUser.role === Role.WALI_KELAS) {
            const siswaIdsInClass = siswaData
                .filter(s => s.kelas === currentUser.kelas)
                .map(s => s.id_siswa);
            filteredCatatan = catatanKasusData.filter(kasus => siswaIdsInClass.includes(kasus.id_siswa));
        }

        return filteredCatatan.map(kasus => {
            const siswa = siswaData.find(s => s.id_siswa === kasus.id_siswa);
            const pelapor = usersData.find(u => u.id_user === kasus.dilaporkan_oleh);
            return {
                ...kasus,
                nama_siswa: siswa?.nama || 'Siswa Dihapus',
                nis: siswa?.nis || 'N/A',
                kelas: siswa?.kelas || 'N/A',
                nama_pelapor: pelapor?.nama || 'User Dihapus',
            };
        }).sort((a, b) => new Date(b.tanggal_kasus).getTime() - new Date(a.tanggal_kasus).getTime());
    }, [catatanKasusData, siswaData, usersData, currentUser]);
    
    const availableKelas = useMemo(() => [...new Set(siswaData.map(s => s.kelas))].sort(sortKelas), [siswaData]);
    
    const siswaInSelectedKelas = useMemo(() => {
        if (!formData.kelas) return [];
        return siswaData.filter(s => s.kelas === formData.kelas).sort((a,b) => a.nama.localeCompare(b.nama));
    }, [siswaData, formData.kelas]);

    useEffect(() => {
        if (isModalOpen) {
            if (editingKasus) {
                const siswa = siswaData.find(s => s.id_siswa === editingKasus.id_siswa);
                setFormData({
                    id_siswa: editingKasus.id_siswa,
                    tanggal_kasus: editingKasus.tanggal_kasus,
                    kasus: editingKasus.kasus,
                    tindak_lanjut: editingKasus.tindak_lanjut,
                    dilaporkan_oleh: editingKasus.dilaporkan_oleh,
                    kelas: siswa?.kelas || '',
                });
            } else {
                setFormData({ ...initialFormState, dilaporkan_oleh: currentUser.id_user });
            }
        }
    }, [isModalOpen, editingKasus, currentUser.id_user, siswaData]);

    useEffect(() => {
        if (kasusToPrint) {
            const timer = setTimeout(() => {
                window.print();
                setKasusToPrint(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [kasusToPrint]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const newState = { ...prev };

            switch (name) {
                case 'kelas':
                    newState.kelas = value;
                    newState.id_siswa = 0; 
                    break;
                
                case 'id_siswa':
                    newState.id_siswa = Number(value);
                    break;
                
                default:
                    (newState as any)[name] = value;
                    break;
            }
            
            return newState;
        });
    };

    const openAddModal = () => {
        setEditingKasus(null);
        setIsModalOpen(true);
    };

    const openEditModal = (kasus: CatatanKasus) => {
        setEditingKasus(kasus);
        setIsModalOpen(true);
    };
    
    const handleShowDetail = (kasus: EnrichedKasus) => {
        setSelectedKasus(kasus);
        setIsDetailModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id_siswa || !formData.kasus) {
            showToast('Siswa dan detail kasus wajib diisi.', 'error');
            return;
        }

        setIsSubmitting(true);
        const { kelas, ...payload } = formData;
        
        let success = false;
        if (editingKasus) {
            success = await apiHandler('kasus_handler.php', 'PUT', { ...payload, id_kasus: editingKasus.id_kasus }, 'Catatan kasus berhasil diperbarui.');
        } else {
            success = await apiHandler('kasus_handler.php', 'POST', payload, 'Catatan kasus baru berhasil ditambahkan.');
        }
        if (success) setIsModalOpen(false);
        setIsSubmitting(false);
    };

    const handleDelete = async (id_kasus: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus catatan kasus ini?')) {
            await apiHandler('kasus_handler.php', 'DELETE', { id_kasus }, 'Catatan kasus berhasil dihapus.');
        }
    };

    const handlePrint = (kasus: EnrichedKasus) => {
        setKasusToPrint(kasus);
    };

    const columns = useMemo<Column<EnrichedKasus>[]>(() => {
        return [
            { header: 'Tanggal', accessor: 'tanggal_kasus', sortable: true, cell: (row) => formatIndonesianDateShort(row.tanggal_kasus) },
            { header: 'NIS', accessor: 'nis', sortable: true },
            { header: 'Nama Siswa', accessor: 'nama_siswa', sortable: true },
            { header: 'Kelas', accessor: 'kelas', sortable: true },
            { header: 'Pelapor', accessor: 'nama_pelapor', sortable: true },
            {
                header: 'Aksi',
                accessor: 'id_kasus',
                cell: (row) => (
                    <div className="flex gap-2 flex-wrap items-center">
                        <button title="Lihat Detail" onClick={() => handleShowDetail(row)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors">
                            <EyeIcon />
                        </button>
                        <button title="Cetak" onClick={() => handlePrint(row)} className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors">
                            <PrintIcon />
                        </button>
                        {isGuruBK && (
                            <>
                                <button title="Edit" onClick={() => openEditModal(row)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors">
                                    <PencilIcon />
                                </button>
                                <button title="Hapus" onClick={() => handleDelete(row.id_kasus)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors">
                                    <TrashIcon />
                                </button>
                            </>
                        )}
                    </div>
                )
            }
        ];
    }, [isGuruBK]);

    return (
        <>
            <div className="print-hide">
                <Card title="Manajemen Catatan Kasus Siswa">
                    {isGuruBK && (
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={openAddModal} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded">
                                + Tambah Catatan Kasus
                            </button>
                        </div>
                    )}
                    
                    <DataTable columns={columns} data={enrichedKasusData} />

                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                                <h2 className="text-xl font-bold mb-4">{editingKasus ? 'Edit Catatan Kasus' : 'Tambah Catatan Kasus'}</h2>
                                <form onSubmit={handleFormSubmit}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-gray-700">Kelas</label>
                                            <select
                                                name="kelas"
                                                value={formData.kelas}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border rounded"
                                                required
                                            >
                                                <option value="" disabled>-- Pilih Kelas --</option>
                                                {availableKelas.map(k => (
                                                    <option key={k} value={k}>{k}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700">Siswa</label>
                                            <select
                                                name="id_siswa"
                                                value={formData.id_siswa}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border rounded"
                                                required
                                                disabled={!formData.kelas}
                                            >
                                                <option value={0} disabled>-- Pilih Siswa --</option>
                                                {siswaInSelectedKelas.map(s => (
                                                    <option key={s.id_siswa} value={s.id_siswa}>{s.nama}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700">Tanggal Kasus</label>
                                        <input type="date" name="tanggal_kasus" value={formData.tanggal_kasus} onChange={handleInputChange} className="w-full p-2 border rounded" required />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700">Detail Kasus</label>
                                        <textarea name="kasus" value={formData.kasus} onChange={handleInputChange} rows={4} className="w-full p-2 border rounded" required />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700">Tindak Lanjut</label>
                                        <textarea name="tindak_lanjut" value={formData.tindak_lanjut} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded" />
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded mr-2">Batal</button>
                                        <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-4 py-2 rounded disabled:bg-gray-400">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {isDetailModalOpen && selectedKasus && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-gray-800">Detail Catatan Kasus</h2>
                                    <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
                                </div>
                                <div className="space-y-4 text-gray-700">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Siswa</h3>
                                        <p>{selectedKasus.nama_siswa} ({selectedKasus.nis}) - Kelas {selectedKasus.kelas}</p>
                                    </div>
                                    <hr/>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Tanggal & Pelapor</h3>
                                        <p>{formatIndonesianDate(selectedKasus.tanggal_kasus)} oleh {selectedKasus.nama_pelapor}</p>
                                    </div>
                                    <hr/>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Detail Kasus</h3>
                                        <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md border">{selectedKasus.kasus}</p>
                                    </div>
                                    <hr/>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Tindak Lanjut</h3>
                                        <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md border">{selectedKasus.tindak_lanjut || 'Belum ada.'}</p>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button type="button" onClick={() => setIsDetailModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Tutup</button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
            {kasusToPrint && (
                <div id="print-area">
                    <PrintLayout kasus={kasusToPrint} kepalaSekolah={kepalaSekolah} appSettings={appSettings} />
                </div>
            )}
        </>
    );
};

export default ManajemenKasus;
