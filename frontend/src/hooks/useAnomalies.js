import { useState, useEffect } from "react";
import client from "../api/client";

/**
 * Hook custom pour les anomalies
 */
export function useAnomalies() {
    const [anomalies, setAnomalies] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAnomalies = async (limit = 10) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await client.get(`/api/anomalies`, {
                params: { limit },
            });
            setAnomalies(response.data.data || []);
        } catch (err) {
            console.error("Erreur anomalies:", err);
            setError(err.response?.data?.message || "Erreur lors du chargement");
            setAnomalies([]);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        anomalies,
        isLoading,
        error,
        getAnomalies,
    };
}
