
import React, { useState, useMemo } from 'react';
import { Siswa, Absensi, StatusKehadiran, StatusValidasi, User, Role } from '../types';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { getLocalDateString, formatIndonesianDateShort } from '../utils/date';
import { sortKelas } from '../utils/helpers';

interface DashboardGuruBKProps {
  currentUser: User;
  siswaData: Siswa[];
  absensiData: Absensi[];
  updateAbsensi: (updatedAbsensi: Absensi) => Promise<boolean>;
  validateAbsensiKelas: (kelas: string, tanggal: string) => Promise<boolean>;
}

const DashboardGuruBK: React.FC<DashboardGuruBKProps> = ({ currentUser, siswaData, absensiData, updateAbsensi, validateAbsensiKelas }) => {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedKelas, setSelectedKelas] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTodaySunday = new Date().getDay() === 0;

  const absensiByKelasAndDate = useMemo(() => {
    const enrichedDataForDate = absensiData
        .filter(a => a.tanggal === selectedDate)
        .map(absen => {
            const siswa = siswaData.find(s => s.id_siswa === absen.id_siswa);
            return siswa ? { ...absen, siswa } : null;
        })
        .filter((item): item is Absensi & { siswa: Siswa } => item !== null);

    const groupedByClass = enrichedDataForDate.reduce((acc, item) => {
        const kelas = item.siswa.kelas;
        if (!acc[kelas]) {
            acc[kelas] = [];
        }
        acc[kelas].push(item);
        return acc;
    }, {} as { [key: string]: (Absensi & { siswa: Siswa })[] });

    const result: { [key: string]: { absensi: (Absensi & { siswa: Siswa })[], status: StatusValidasi } } = {};
    for (const kelas in groupedByClass) {
        const absensiList = groupedByClass[kelas];
        const isClassValidated = absensiList.length > 0 && absensiList.every(a => a.status_validasi === StatusValidasi.VALID);
        
        result[kelas] = {
            absensi: absensiList,
            status: isClassValidated ? StatusValidasi.VALID : StatusValidasi.BELUM_VALID,
        };
    }

    return result;
  }, [absensiData, siswaData, selectedDate]);


  const handleStatusChange = async (absen: Absensi, newStatus: StatusKehadiran) => {
    setIsSubmitting(true);
    await updateAbsensi({ ...absen, status: newStatus });
    setIsSubmitting(false);
  };
  
  const handleValidate = async (kelas: string) => {
    if (window.confirm(`Anda yakin ingin memvalidasi absensi kelas ${kelas} untuk tanggal ${formatIndonesianDateShort(selectedDate)}? Data akan dikunci.`)) {
        setIsSubmitting(true);
        const success = await validateAbsensiKelas(kelas, selectedDate);
        setIsSubmitting(false);
        // No redirect, stay on page to see changes
    }
  };

  const getStatusBadge = (status: StatusValidasi) => {
    if (status === StatusValidasi.VALID) {
      return <Badge color="green">Valid</Badge>;
    }
    return <Badge color="yellow">Belum Valid</Badge>;
  };

  if (isTodaySunday) {
    return (
        <Card title="Selamat Hari Minggu!">
            <div className="text-center p-8 bg-blue-50 rounded-lg">
                <h2 className="text-2xl font-bold text-blue-800">Saatnya Rebahan! 🏖️</h2>
                <p className="mt-4 text-gray-700 max-w-md mx-auto">
                    Validasi bisa menunggu besok. Nikmati hari liburmu!
                </p>
            </div>
        </Card>
    );
  }

  if (selectedKelas && absensiByKelasAndDate[selectedKelas]) {
    const data = absensiByKelasAndDate[selectedKelas];
    const canEdit = data.status === StatusValidasi.BELUM_VALID || currentUser.role === Role.ADMIN;
    
    return (
      <Card title={`Detail Absensi Kelas ${selectedKelas} - ${formatIndonesianDateShort(selectedDate)}`}>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <button onClick={() => setSelectedKelas(null)} className="bg-secondary text-white px-4 py-2 rounded hover:bg-gray-600">
                &larr; Kembali
            </button>
            {data.status === StatusValidasi.BELUM_VALID && (
                 <button onClick={() => handleValidate(selectedKelas)} disabled={isSubmitting} className="bg-success text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400">
                    {isSubmitting ? 'Memproses...' : 'Validasi Semua'}
                </button>
            )}
        </div>
         {data.status === StatusValidasi.VALID && currentUser.role === Role.ADMIN && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
              <p className="font-bold">Mode Admin</p>
              <p>Anda dapat mengedit data yang sudah divalidasi.</p>
            </div>
         )}
         <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4">NIS</th>
                <th className="text-left py-3 px-4">Nama Siswa</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {data.absensi.map((absen, i) => (
                <tr key={absen.id_absensi} className={i % 2 === 0 ? 'bg-gray-100' : ''}>
                  <td className="py-3 px-4">{absen.siswa.nis}</td>
                  <td className="py-3 px-4">{absen.siswa.nama}</td>
                  <td className="py-3 px-4">
                    <select value={absen.status} onChange={(e) => handleStatusChange(absen, e.target.value as StatusKehadiran)} disabled={isSubmitting || !canEdit} className="p-1 border rounded w-full disabled:bg-gray-200">
                        {Object.values(StatusKehadiran).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-4">{absen.keterangan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Validasi Absensi Harian">
      <div className="mb-4">
        <label htmlFor="date-filter" className="font-bold mr-2">Tanggal:</label>
        <input type="date" id="date-filter" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 border rounded"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(absensiByKelasAndDate).length > 0 ? (
            Object.keys(absensiByKelasAndDate).sort(sortKelas).map((kelas) => {
                const data = absensiByKelasAndDate[kelas];
                return (
                    <div key={kelas} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-primary">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{kelas}</h3>
                            {getStatusBadge(data.status)}
                        </div>
                        <p className="text-gray-600 text-sm mt-2">{data.absensi.length} siswa telah diabsen.</p>
                        <button onClick={() => setSelectedKelas(kelas)} className="mt-4 bg-primary text-white w-full py-2 rounded hover:bg-primary-dark">
                            Lihat & Validasi
                        </button>
                    </div>
                );
            })
        ) : (
            <p className="text-gray-500 col-span-full text-center py-8">Belum ada data absensi untuk tanggal ini.</p>
        )}
      </div>
    </Card>
  );
};

export default DashboardGuruBK;