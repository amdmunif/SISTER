import { Role, StatusKehadiran, StatusValidasi, JenisKelamin, Semester, TahunAjaran, Siswa, Absensi, User } from './types';
import { getLocalDateString } from './utils/date';

// --- MOCK DATABASE ---

const initialTahunAjaranData: TahunAjaran[] = [
  { id: 1, tahun_ajaran: '2024/2025', semester_ganjil_start: '2024-07-15', semester_ganjil_end: '2024-12-20', semester_genap_start: '2025-01-06', semester_genap_end: '2025-06-20' },
  { id: 2, tahun_ajaran: '2025/2026', semester_ganjil_start: '2025-07-14', semester_ganjil_end: '2025-12-19', semester_genap_start: '2026-01-05', semester_genap_end: '2026-06-19' },
];

const initialSiswaData: Siswa[] = [
  { id_siswa: 1, nis: '1001', nama: 'Budi Santoso', kelas: 'VII-A', jenis_kelamin: JenisKelamin.L, tanggal_lahir: '2012-05-10', password: 'password123', isKetuaKelas: true },
  { id_siswa: 2, nis: '1002', nama: 'Citra Lestari', kelas: 'VII-A', jenis_kelamin: JenisKelamin.P, tanggal_lahir: '2012-08-22', password: 'password123', isKetuaKelas: false },
  { id_siswa: 3, nis: '1003', nama: 'Dewi Anggraini', kelas: 'VII-A', jenis_kelamin: JenisKelamin.P, tanggal_lahir: '2012-03-15', password: 'password123', isKetuaKelas: false },
  { id_siswa: 4, nis: '2001', nama: 'Eko Prasetyo', kelas: 'VII-B', jenis_kelamin: JenisKelamin.L, tanggal_lahir: '2012-01-30', password: 'password123', isKetuaKelas: true },
  { id_siswa: 5, nis: '2002', nama: 'Fitri Handayani', kelas: 'VII-B', jenis_kelamin: JenisKelamin.P, tanggal_lahir: '2012-11-05', password: 'password123', isKetuaKelas: false },
  { id_siswa: 6, nis: '3001', nama: 'Gilang Ramadhan', kelas: 'VIII-A', jenis_kelamin: JenisKelamin.L, tanggal_lahir: '2011-07-19', password: 'password123', isKetuaKelas: false },
];

const initialUsersData: User[] = [
  // Admin
  { id_user: 1, username: 'admin', nama: 'Administrator', password: 'admin', role: Role.ADMIN },
  // Guru BK
  { id_user: 2, username: 'gurubk', nama: 'Bu Susi (BK)', password: 'gurubk', role: Role.GURU_BK },
  // Wali Kelas
  { id_user: 3, username: 'walikelas', nama: 'Pak Budi (Wali Kelas VII-A)', password: 'walikelas', role: Role.WALI_KELAS, kelas: 'VII-A' },
  // Kepala Sekolah
  { id_user: 4, username: 'kepsek', nama: 'Kepala Sekolah', password: 'kepsek', role: Role.KEPALA_SEKOLAH },
  // Guru Biasa
  { id_user: 5, username: 'guru', nama: 'Pak Guru', password: 'guru', role: Role.GURU },
  // Siswa / Ketua Kelas (linked to Siswa data)
  { id_user: 101, username: '1001', nama: 'Budi Santoso', role: Role.KETUA_KELAS_SISWA, kelas: 'VII-A', original_id: 1 },
  { id_user: 102, username: '1002', nama: 'Citra Lestari', role: Role.SISWA, kelas: 'VII-A', original_id: 2 },
];


const initialAbsensiData: Absensi[] = [
    { id_absensi: 1, id_siswa: 1, tanggal: getLocalDateString(), status: StatusKehadiran.HADIR, keterangan: '', status_validasi: StatusValidasi.BELUM_VALID, tahun_ajaran: '2024/2025', semester: Semester.GANJIL },
    { id_absensi: 2, id_siswa: 2, tanggal: getLocalDateString(), status: StatusKehadiran.HADIR, keterangan: '', status_validasi: StatusValidasi.BELUM_VALID, tahun_ajaran: '2024/2025', semester: Semester.GANJIL },
    { id_absensi: 3, id_siswa: 3, tanggal: getLocalDateString(), status: StatusKehadiran.SAKIT, keterangan: 'Demam', status_validasi: StatusValidasi.BELUM_VALID, tahun_ajaran: '2024/2025', semester: Semester.GANJIL },
];


let db = {
  siswa: initialSiswaData,
  users: initialUsersData,
  absensi: initialAbsensiData,
  tahun_ajaran: initialTahunAjaranData,
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const createResponse = (data: any, ok = true, status = 200) => ({
    ok,
    status,
    json: () => Promise.resolve(data),
});

const mockApi = {
    getAllData: async () => {
        await delay(300);
        return createResponse(JSON.parse(JSON.stringify(db))); // deep copy
    },
    login: async (body: any) => {
        await delay(500);
        const { username, password } = body;

        // First, find a user by username in the main users table.
        // A student's username is their NIS.
        const user = db.users.find(u => u.username === username);

        // If no user found at all, login fails.
        if (!user) {
            return createResponse({ error: 'Username atau password salah' }, false, 401);
        }

        // Now, check if the user is a student or staff
        const isStudent = user.role === Role.SISWA || user.role === Role.KETUA_KELAS_SISWA;

        if (isStudent) {
            // For students, find their details in the siswa table
            // and verify the password there.
            const studentDetails = db.siswa.find(s => s.id_siswa === user.original_id);

            if (studentDetails && studentDetails.password === password) {
                // Password matches. Return the user object from the users table.
                return createResponse({ user: user });
            }
        } else {
            // For staff, the password is in the user object itself.
            if (user.password === password) {
                // Password matches. Return the user object (without password).
                const { password: pw, ...userWithoutPassword } = user;
                return createResponse({ user: userWithoutPassword });
            }
        }

        // If we reach here, it means the user was found but the password was incorrect.
        return createResponse({ error: 'Username atau password salah' }, false, 401);
    },
    handleRequest: async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body: any) => {
        await delay(400);
        
        // --- Siswa Handler ---
        if (endpoint === 'siswa_handler.php') {
            if (method === 'POST') {
                if (body.bulk) {
                    body.bulk.forEach((s: any) => {
                       const newId = Math.max(0, ...db.siswa.map(s => s.id_siswa)) + 1;
                       db.siswa.push({ ...s, id_siswa: newId });
                    });
                } else {
                    const newId = Math.max(0, ...db.siswa.map(s => s.id_siswa)) + 1;
                    db.siswa.push({ ...body, id_siswa: newId });
                }
            } else if (method === 'PUT') {
                db.siswa = db.siswa.map(s => s.id_siswa === body.id_siswa ? { ...s, ...body } : s);
            } else if (method === 'DELETE') {
                db.siswa = db.siswa.filter(s => s.id_siswa !== body.id_siswa);
            }
            return createResponse({ success: true });
        }
        
        // --- User Handler ---
        if (endpoint === 'user_handler.php') {
             if (method === 'POST') {
                if (body.bulk) {
                     body.bulk.forEach((u: any) => {
                       const newId = Math.max(0, ...db.users.map(u => u.id_user)) + 1;
                       db.users.push({ ...u, id_user: newId });
                    });
                } else {
                    const newId = Math.max(0, ...db.users.map(u => u.id_user)) + 1;
                    db.users.push({ ...body, id_user: newId });
                }
            } else if (method === 'PUT') {
                db.users = db.users.map(u => u.id_user === body.id_user ? { ...u, ...body } : u);
            } else if (method === 'DELETE') {
                db.users = db.users.filter(u => u.id_user !== body.id_user);
            }
            return createResponse({ success: true });
        }
        
        // --- Absensi Handler ---
        if (endpoint === 'absensi_handler.php') {
            if (method === 'POST') { // Add new
                body.absensi.forEach((a: any) => {
                    const newId = Math.max(0, ...db.absensi.map(a => a.id_absensi)) + 1;
                    db.absensi.push({ ...a, id_absensi: newId });
                });
            } else if (method === 'PUT') {
                if (body.action === 'bulk-update') {
                    body.absensi.forEach((updated: any) => {
                        db.absensi = db.absensi.map(a => a.id_absensi === updated.id_absensi ? { ...a, ...updated } : a);
                    });
                } else if (body.action === 'validate') {
                    db.absensi.forEach(absen => {
                        const siswa = db.siswa.find(s => s.id_siswa === absen.id_siswa);
                        if (siswa && siswa.kelas === body.kelas && absen.tanggal === body.tanggal) {
                            absen.status_validasi = StatusValidasi.VALID;
                        }
                    });
                } else { // Single update
                    db.absensi = db.absensi.map(a => a.id_absensi === body.id_absensi ? { ...a, ...body } : a);
                }
            }
            return createResponse({ success: true });
        }

        // --- Tahun Ajaran Handler ---
        if (endpoint === 'tahun_ajaran_handler.php') {
            if (method === 'POST') {
                const newId = Math.max(0, ...db.tahun_ajaran.map(ta => ta.id)) + 1;
                db.tahun_ajaran.push({ ...body, id: newId });
            } else if (method === 'PUT') {
                db.tahun_ajaran = db.tahun_ajaran.map(ta => ta.id === body.id ? { ...ta, ...body } : ta);
            } else if (method === 'DELETE') {
                db.tahun_ajaran = db.tahun_ajaran.filter(ta => ta.id !== body.id);
            }
            return createResponse({ success: true });
        }

        return createResponse({ error: `Mock endpoint for ${endpoint} not found.` }, false, 404);
    }
};

export default mockApi;