import React, { useState, useMemo } from 'react';
import { Siswa, User, Role } from '../types';
import Card from '../components/Card';
import { sortKelas } from '../utils/helpers';

interface CetakKartuProps {
    mode: 'siswa' | 'guru';
    siswaData?: Siswa[];
    usersData?: User[];
}

const LoginCard: React.FC<{ item: Siswa | User, mode: 'siswa' | 'guru' }> = ({ item, mode }) => {
    const isSiswa = mode === 'siswa';
    const data = item as any; // Cast to any to access properties dynamically

    return (
        <div className="w-[8.5cm] h-[5.4cm] border-2 border-dashed border-gray-400 p-3 flex flex-col justify-between break-inside-avoid">
            <div>
                <h3 className="text-center font-bold text-sm">Sistem Absensi SMPN 3 Kalikajar</h3>
                <h4 className="text-center font-semibold text-xs mb-3">Kartu Login {isSiswa ? 'Siswa' : 'Staf'}</h4>
                <hr className="my-1"/>
                <table className="text-xs w-full">
                    <tbody>
                        <tr>
                            <td className="font-semibold w-1/3">Nama</td>
                            <td>: {data.nama}</td>
                        </tr>
                        <tr>
                            <td className="font-semibold">{isSiswa ? 'Kelas' : 'Jabatan'}</td>
                            <td>: {isSiswa ? data.kelas : data.role}</td>
                        </tr>
                        <tr>
                            <td className="font-semibold">{isSiswa ? 'NIS' : 'Username'}</td>
                            <td>: {isSiswa ? data.nis : data.username}</td>
                        </tr>
                        <tr>
                            <td className="font-semibold">Password</td>
                            <td className="font-mono">: {data.password}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="text-[8px] text-gray-500 text-center">Harap simpan kartu ini dengan baik dan jangan berikan kepada orang lain.</p>
        </div>
    );
}

const CetakKartu: React.FC<CetakKartuProps> = ({ mode, siswaData = [], usersData = [] }) => {
    const isSiswaMode = mode === 'siswa';
    
    // States for filtering
    const [filterKelas, setFilterKelas] = useState('Semua');
    const availableKelas = useMemo(() => ['Semua', ...[...new Set(siswaData.map(s => s.kelas))].sort(sortKelas)], [siswaData]);

    const staffRoles = Object.values(Role).filter(r => r !== Role.SISWA && r !== Role.KETUA_KELAS_SISWA);
    const [filterRole, setFilterRole] = useState('Semua');

    const filteredData = useMemo(() => {
        if (isSiswaMode) {
            if (filterKelas === 'Semua') return siswaData;
            return siswaData.filter(s => s.kelas === filterKelas);
        } else {
            const staffUsers = usersData.filter(u => u.role !== Role.SISWA && u.role !== Role.KETUA_KELAS_SISWA);
            if (filterRole === 'Semua') return staffUsers;
            return staffUsers.filter(u => u.role === filterRole);
        }
    }, [isSiswaMode, siswaData, usersData, filterKelas, filterRole]);
    
    const title = isSiswaMode ? 'Cetak Kartu Login Siswa' : 'Cetak Kartu Login Guru';

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-4">
            <Card title={title} className="print-hide">
                <div className="flex flex-wrap gap-4 items-center mb-4">
                    {isSiswaMode && (
                        <div>
                            <label htmlFor="kelas-filter" className="font-semibold mr-2">Filter Kelas:</label>
                            <select id="kelas-filter" value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="p-2 border rounded">
                                {availableKelas.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    )}
                    {!isSiswaMode && (
                         <div>
                            <label htmlFor="role-filter" className="font-semibold mr-2">Filter Role:</label>
                            <select id="role-filter" value={filterRole} onChange={e => setFilterRole(e.target.value)} className="p-2 border rounded">
                                <option value="Semua">Semua Role</option>
                                {staffRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}
                     <button onClick={handlePrint} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded">
                        Cetak Kartu
                    </button>
                </div>
                 <p className="text-sm text-gray-600">
                    Menampilkan <span className="font-bold">{filteredData.length}</span> kartu.
                    Kartu akan dicetak 10 per halaman A4.
                </p>
            </Card>

            <div id="print-area">
                <div className="flex flex-row flex-wrap gap-x-[1cm] gap-y-[0.55cm]">
                    {filteredData.map((item: Siswa | User, index) => {
                        const defaultPassword = isSiswaMode ? 'xxx' : 'xxx';
                        // Create a new object with the default password for printing, leaving the original data unchanged
                        const itemToPrint = { ...item, password: defaultPassword };
                        return (
                            <LoginCard key={(item as any).id_siswa || (item as any).id_user || index} item={itemToPrint} mode={mode} />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default CetakKartu;
