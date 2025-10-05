

import React, { useState, useMemo, useEffect } from 'react';
import { User, Siswa, StatusKehadiran, Absensi, StatusValidasi, TahunAjaran, Semester, Role } from '../types';
import Card from '../components/Card';
import { getLocalDateString, formatIndonesianDate } from '../utils/date';
import { sortKelas } from '../utils/helpers';
import { UserGroupIcon } from '../components/icons/Icons';

interface InputAbsensiProps {
  user: User;
  siswaData: Siswa[];
  absensiData: Absensi[];
  tahunAjaranData: TahunAjaran[];
  addAbsensi: (newAbsensiList: Omit<Absensi, 'id_absensi'>[]) => Promise<boolean>;
  bulkUpdateAbsensi: (updatedAbsensiList: { id_absensi: number; status: StatusKehadiran; keterangan: string }[]) => Promise<boolean>;
}

type AbsensiInput = {
  id_absensi?: number;
  id_siswa: number;
  status: StatusKehadiran;
  keterangan: string;
};

const getAcademicPeriodForDate = (dateStr: string, tahunAjaranData: TahunAjaran[]): { tahunAjaran: TahunAjaran | null, semester: Semester | null } => {
    for (const ta of tahunAjaranData) {
        if (dateStr >= ta.semester_ganjil_start && dateStr <= ta.semester_ganjil_end) {
            return { tahunAjaran: ta, semester: Semester.GANJIL };
        }
        if (dateStr >= ta.semester_genap_start && dateStr <= ta.semester_genap_end) {
            return { tahunAjaran: ta, semester: Semester.GENAP };
        }
    }
    return { tahunAjaran: null, semester: null };
};

const InputAbsensi: React.FC<InputAbsensiProps> = ({ user, siswaData, absensiData, addAbsensi, bulkUpdateAbsensi, tahunAjaranData }) => {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  
  const getInitialKelas = () => {
    // For Admin and Guru BK, force them to select a class by starting with null
    if (user.role === Role.ADMIN || user.role === Role.GURU_BK) {
      return null;
    }
    // For other roles like Wali Kelas, default to their assigned class
    return user.kelas || null;
  };

  const [selectedKelas, setSelectedKelas] = useState<string | null>(getInitialKelas());
  const [absensiForm, setAbsensiForm] = useState<AbsensiInput[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const isSunday = useMemo(() => {
    // Adding T00:00:00 prevents timezone issues from shifting the day
    const date = new Date(selectedDate + 'T00:00:00');
    return date.getDay() === 0; // 0 is Sunday
  }, [selectedDate]);

  const availableKelas = useMemo(() => [...new Set(siswaData.map(s => s.kelas))].sort(sortKelas), [siswaData]);
  
  const kelasUntukDipilih = useMemo(() => {
    if (user.role !== Role.ADMIN && user.role !== Role.GURU_BK) {
        return availableKelas;
    }
    const kelasSudahAbsen = new Set(
        absensiData
            .filter(a => a.tanggal === selectedDate)
            .map(a => {
                const siswa = siswaData.find(s => s.id_siswa === a.id_siswa);
                return siswa?.kelas;
            })
            .filter(Boolean) as string[]
    );
    return availableKelas.filter(kelas => !kelasSudahAbsen.has(kelas));
  }, [availableKelas, absensiData, selectedDate, siswaData, user.role]);

  const siswaDiKelas = useMemo(() => {
    if (!selectedKelas) return [];
    return siswaData.filter(s => s.kelas === selectedKelas);
  }, [siswaData, selectedKelas]);

  useEffect(() => {
    setError('');
    if (!selectedKelas) return;

    const existingAbsensi = absensiData.filter(a => {
        const siswa = siswaData.find(s => s.id_siswa === a.id_siswa);
        return siswa?.kelas === selectedKelas && a.tanggal === selectedDate;
    });

    if (existingAbsensi.length > 0) {
        setIsEditMode(true);
        setIsValidated(existingAbsensi[0].status_validasi === StatusValidasi.VALID);
        setAbsensiForm(
            existingAbsensi.map(a => ({
                id_absensi: a.id_absensi,
                id_siswa: a.id_siswa,
                status: a.status,
                keterangan: a.keterangan || '',
            }))
        );
    } else {
        setIsEditMode(false);
        setIsValidated(false);
        setAbsensiForm(
            siswaDiKelas.map(s => ({
                id_siswa: s.id_siswa,
                status: StatusKehadiran.HADIR,
                keterangan: '',
            }))
        );
    }
  }, [selectedKelas, selectedDate, absensiData, siswaData, siswaDiKelas]);

  const handleStatusChange = (id_siswa: number, status: StatusKehadiran) => {
    setAbsensiForm(prev =>
      prev.map(item => (item.id_siswa === id_siswa ? { ...item, status, keterangan: status === StatusKehadiran.HADIR ? '' : item.keterangan } : item))
    );
  };

  const handleKeteranganChange = (id_siswa: number, keterangan: string) => {
    setAbsensiForm(prev =>
      prev.map(item => (item.id_siswa === id_siswa ? { ...item, keterangan } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { tahunAjaran, semester } = getAcademicPeriodForDate(selectedDate, tahunAjaranData);
    if (!tahunAjaran || !semester) {
        setError('Tanggal absensi tidak termasuk dalam tahun ajaran yang terdaftar. Hubungi Admin.');
        return;
    }

    const actionText = isEditMode ? 'memperbarui' : 'mengirim';
    if (window.confirm(`Apakah Anda yakin ingin ${actionText} absensi untuk kelas ${selectedKelas} tanggal ${selectedDate}?`)) {
        setIsSubmitting(true);
        let success = false;
        if (isEditMode) {
            const updatedList = absensiForm.map(item => ({
                id_absensi: item.id_absensi!,
                status: item.status,
                keterangan: item.keterangan,
            }));
            success = await bulkUpdateAbsensi(updatedList);
        } else {
            const newAbsensiList = absensiForm.map(item => ({
                ...item,
                tanggal: selectedDate,
                status_validasi: StatusValidasi.BELUM_VALID,
                tahun_ajaran: tahunAjaran.tahun_ajaran,
                semester: semester
            }));
            success = await addAbsensi(newAbsensiList);
        }
        setIsSubmitting(false);
    }
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    // Reset selected class for Admin/Guru BK so they see the updated list
    if (user.role === Role.ADMIN || user.role === Role.GURU_BK) {
      setSelectedKelas(null);
    }
  }

  const renderForm = () => {
    const isLocked = isValidated && user.role !== Role.ADMIN;
    
    if (isSunday) {
        return (
            <Card title="Input Absensi Harian">
                <div className="mb-4">
                    <label className="block text-gray-700 font-bold mb-2">Pilih Tanggal</label>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={handleDateChange} 
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                    />
                </div>
                <div className="text-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h2 className="text-xl font-bold text-yellow-800">Hari Libur</h2>
                    <p className="mt-2 text-gray-600">Input absensi tidak dapat dilakukan pada hari Minggu.</p>
                </div>
            </Card>
        );
    }

    if (isLocked) {
        return (
            <Card title={`Absensi Kelas ${selectedKelas} - ${selectedDate}`}>
                 <div className="mb-4">
                    <label className="block text-gray-700 font-bold mb-2">Pilih Tanggal Lain</label>
                    <input type="date" value={selectedDate} onChange={handleDateChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                  </div>
                <div className="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
                    <h2 className="text-xl font-bold text-blue-800">Data Terkunci</h2>
                    <p className="mt-2 text-gray-600">Absensi untuk tanggal ini telah divalidasi dan tidak dapat diubah lagi oleh peran Anda.</p>
                </div>
            </Card>
        );
    }
  
    return (
      <Card title={`${isEditMode ? 'Edit' : 'Input'} Absensi Harian - Kelas ${selectedKelas}`}>
        <form onSubmit={handleSubmit}>
          {isValidated && user.role === Role.ADMIN && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
              <p className="font-bold">Mode Admin</p>
              <p>Anda sedang mengedit data yang sudah divalidasi. Perubahan akan disimpan.</p>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Tanggal</label>
            <input type="date" value={selectedDate} onChange={handleDateChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
  
          {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
  
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left py-3 px-4 uppercase font-semibold text-sm">NIS</th>
                  <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Nama Siswa</th>
                  <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Keterangan</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {siswaDiKelas.map((siswa, index) => {
                    const currentAbsen = absensiForm.find(a => a.id_siswa === siswa.id_siswa);
                    return (
                      <tr key={siswa.id_siswa} className={index % 2 === 0 ? 'bg-gray-100' : ''}>
                          <td className="text-left py-3 px-4">{siswa.nis}</td>
                          <td className="text-left py-3 px-4">{siswa.nama}</td>
                          <td className="text-left py-3 px-4">
                              <select
                                  value={currentAbsen?.status ?? ''}
                                  onChange={(e) => handleStatusChange(siswa.id_siswa, e.target.value as StatusKehadiran)}
                                  className="w-full p-1 border rounded"
                                  disabled={isLocked}
                              >
                                  {Object.values(StatusKehadiran).map(status => (
                                      <option key={status} value={status}>{status}</option>
                                  ))}
                              </select>
                          </td>
                          <td className="text-left py-3 px-4">
                              <input
                                  type="text"
                                  value={currentAbsen?.keterangan ?? ''}
                                  onChange={(e) => handleKeteranganChange(siswa.id_siswa, e.target.value)}
                                  className="w-full p-1 border rounded"
                                  disabled={isLocked || currentAbsen?.status === StatusKehadiran.HADIR}
                              />
                          </td>
                      </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6">
            <button type="submit" disabled={isSubmitting || isLocked} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400">
              {isSubmitting ? 'Menyimpan...' : (isEditMode ? 'Update Absensi' : 'Kirim Absensi')}
            </button>
          </div>
        </form>
      </Card>
    );
  }

  const canSelectClass = user.role === Role.GURU_BK || user.role === Role.ADMIN;
  if (canSelectClass && !selectedKelas) {
    return (
        <Card title="Pilih Kelas untuk Input Absensi">
             <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2">Pilih Tanggal</label>
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={handleDateChange} 
                    className="shadow appearance-none border rounded w-full md:w-auto py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                />
            </div>
            {isSunday ? (
                 <div className="text-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h2 className="text-xl font-bold text-yellow-800">Hari Libur</h2>
                    <p className="mt-2 text-gray-600">Input absensi tidak dapat dilakukan pada hari Minggu.</p>
                </div>
            ) : (
                <div>
                    <p className="text-gray-600 mb-4">Silakan pilih kelas yang ingin Anda isi absensinya untuk tanggal <span className="font-semibold">{formatIndonesianDate(selectedDate)}</span>.</p>
                    {kelasUntukDipilih.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {kelasUntukDipilih.map(kelas => (
                                <button 
                                    key={kelas} 
                                    onClick={() => setSelectedKelas(kelas)}
                                    className="p-4 text-gray-700 bg-white rounded-lg shadow-md hover:shadow-xl hover:bg-primary hover:text-white group transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                    <div className="flex flex-col items-center justify-center">
                                        <UserGroupIcon />
                                        <span className="text-lg font-bold mt-2">{kelas}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : <p className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">Semua kelas sudah diabsen untuk tanggal ini.</p>}
                </div>
            )}
        </Card>
    )
  }

  if (!selectedKelas) {
      return <Card title="Input Absensi"><p className="text-red-500">Data kelas tidak ditemukan untuk user ini.</p></Card>
  }

  return renderForm();
};

export default InputAbsensi;