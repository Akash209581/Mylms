import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default config
export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for cookies/JWT
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor for authentication and debugging
api.interceptors.request.use(
    (config) => {
        // Add JWT token from localStorage if available
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        if (error.response) {
            console.error(`❌ API Error: ${error.response.status} ${error.config.url}`, error.response.data);
        } else {
            console.error('❌ API Error:', error.message);
        }
        return Promise.reject(error);
    }
);

