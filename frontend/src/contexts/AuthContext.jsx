import React, { createContext, useState, useEffect } from "react";
import client from "../api/client";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialiser depuis localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }

        setIsLoading(false);
    }, []);

    /**
     * Fonction login : Envoyer credentials au backend
     */
    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await client.post("/api/auth/login", {
                email,
                password,
            });

            const { token: newToken, user: userData } = response.data.data;

            // Sauvegarder en localStorage
            localStorage.setItem("token", newToken);
            localStorage.setItem("user", JSON.stringify(userData));

            setToken(newToken);
            setUser(userData);

            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.message || "Erreur de connexion";
            setError(message);
            return { success: false, error: message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Fonction register : Créer un nouveau compte
     */
    const register = async (email, password, name) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await client.post("/api/auth/register", {
                email,
                password,
                name,
            });

            const { token: newToken, user: userData } = response.data.data;

            // Sauvegarder en localStorage
            localStorage.setItem("token", newToken);
            localStorage.setItem("user", JSON.stringify(userData));

            setToken(newToken);
            setUser(userData);

            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.message || "Erreur d'inscription";
            setError(message);
            return { success: false, error: message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Fonction logout : Nettoyer l'authentification
     */
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        setError(null);
    };

    const value = {
        user,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!token,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
