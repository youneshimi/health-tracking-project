import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

// Créer l'instance axios
const client = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Interceptor REQUEST : Ajouter le token JWT
 */
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Interceptor RESPONSE : Gérer les erreurs 401
 */
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expiré ou invalide
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            // Rediriger vers login
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default client;
