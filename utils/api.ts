/**
 * A generic function to handle fetch requests to the backend API.
 * @param endpoint The PHP file endpoint (e.g., 'siswa_handler.php').
 * @param method The HTTP method ('GET', 'POST', 'PUT', 'DELETE').
 * @param body Optional data to send with the request. Can be a JSON object or FormData.
 * @returns The JSON response from the server.
 */
export const fetchApi = async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any) => {
    const API_BASE_URL = 'api/';
    
    const isFormData = body instanceof FormData;

    const options: RequestInit = {
        method,
        headers: {}, // Headers will be set dynamically
    };
    
    // Do not set Content-Type for FormData; the browser will set it with the correct boundary.
    // For JSON, set it explicitly.
    if (!isFormData && body) {
        (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    } else if (isFormData) {
        options.body = body;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (response.status === 404) {
            throw new Error(`Endpoint API tidak ditemukan di server (${response.url}). Pastikan folder 'api' dan file PHP sudah diunggah dengan benar.`);
        }

        const result = await response.json().catch(() => {
            throw new Error(`Server memberikan respons yang tidak valid (bukan JSON) dengan status: ${response.status}`);
        });
        
        if (!response.ok) {
            throw new Error(result.error || `Terjadi kesalahan HTTP dengan status: ${response.status}`);
        }
        
        return result;
    } catch (error: any) {
        console.error("Fetch API Error:", error);
        if (error.message.includes('Failed to fetch')) {
             throw new Error("Gagal terhubung ke server. Periksa koneksi internet Anda. Jika koneksi normal, ini kemungkinan besar adalah masalah CORS di server. Pastikan server API Anda mengizinkan permintaan dari domain ini.");
        }
        throw error;
    }
};
