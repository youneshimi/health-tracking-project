import { useState, useCallback } from "react";
import client from "../api/client";

function normalizeHeartRateRecord(row) {
    const timestamp = row.timestamp ?? row.recorded_at ?? null;
    return {
        id: row.hr_id ?? row.hrId ?? row.id ?? null,
        hr_id: row.hr_id ?? row.hrId ?? row.id ?? null,
        user_id: row.user_id ?? row.userId ?? null,
        recorded_at: timestamp,
        timestamp,
        bpm: row.bpm ?? 0,
        context: row.context ?? "other",
    };
}

export function useHeartRate() {
    const [heartRateRecords, setHeartRateRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Récupérer tous les enregistrements de fréquence cardiaque
     */
    const getHeartRateRecords = useCallback(
        async (page = 1, limit = 500) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await client.get("/api/heart-rate", {
                    params: { page, limit },
                });
                const list = Array.isArray(response?.data?.data) ? response.data.data : [];
                const normalized = list.map(normalizeHeartRateRecord);
                setHeartRateRecords(normalized);
                return {
                    heartRateRecords: normalized,
                    meta: response?.data?.meta || null,
                };
            } catch (err) {
                const message =
                    err.response?.data?.message || "Erreur lors du chargement de la fréquence cardiaque";
                setError(message);
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    /**
     * Créer un enregistrement de fréquence cardiaque
     */
    const createHeartRateRecord = useCallback(
        async (heartRateData) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await client.post("/api/heart-rate", heartRateData);
                const newRecord = normalizeHeartRateRecord(response?.data?.data || {});
                setHeartRateRecords((prev) => [newRecord, ...prev]);
                return { success: true, data: newRecord };
            } catch (err) {
                const message =
                    err.response?.data?.message || "Erreur lors de la création d'enregistrement de fréquence cardiaque";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    /**
     * Récupérer les stats de fréquence cardiaque
     */
    const getHeartRateStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await client.get("/api/heart-rate/stats");
            return response.data.data;
        } catch (err) {
            const message =
                err.response?.data?.message || "Erreur lors du chargement des stats de fréquence cardiaque";
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        heartRateRecords,
        isLoading,
        error,
        getHeartRateRecords,
        createHeartRateRecord,
        getHeartRateStats,
    };
}
