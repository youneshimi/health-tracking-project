import { useState, useCallback } from "react";
import client from "../api/client";

export function useSleep() {
    const [sleepRecords, setSleepRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Récupérer tous les enregistrements de sommeil
     */
    const getSleepRecords = useCallback(
        async (page = 1, limit = 10) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await client.get("/api/sleep", {
                    params: { page, limit },
                });
                setSleepRecords(response.data.data.sleepRecords || []);
                return response.data.data;
            } catch (err) {
                const message =
                    err.response?.data?.message || "Erreur lors du chargement des enregistrements de sommeil";
                setError(message);
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    /**
     * Créer un enregistrement de sommeil
     */
    const createSleepRecord = useCallback(
        async (sleepData) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await client.post("/api/sleep", sleepData);
                const newRecord = response.data.data;
                setSleepRecords((prev) => [newRecord, ...prev]);
                return { success: true, data: newRecord };
            } catch (err) {
                const message =
                    err.response?.data?.message || "Erreur lors de la création d'enregistrement de sommeil";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    /**
     * Récupérer les stats de sommeil
     */
    const getSleepStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await client.get("/api/sleep/stats");
            return response.data.data;
        } catch (err) {
            const message =
                err.response?.data?.message || "Erreur lors du chargement des stats de sommeil";
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        sleepRecords,
        isLoading,
        error,
        getSleepRecords,
        createSleepRecord,
        getSleepStats,
    };
}
