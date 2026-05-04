import { useState, useCallback } from "react";
import client from "../api/client";

function normalizeSleepRecord(row) {
    return {
        id: row.sleep_id ?? row.sleepId ?? row.id ?? null,
        sleep_id: row.sleep_id ?? row.sleepId ?? row.id ?? null,
        user_id: row.user_id ?? row.userId ?? null,
        sleep_date: row.sleep_date ?? row.date ?? null,
        total_hours: row.total_hours ?? row.totalHours ?? 0,
        deep_sleep_hours: row.deep_sleep_hours ?? row.deepSleepHours ?? 0,
        light_sleep_hours: row.light_sleep_hours ?? row.lightSleepHours ?? 0,
        rem_sleep_hours: row.rem_sleep_hours ?? row.remSleepHours ?? 0,
        quality_score: row.quality_score ?? row.qualityScore ?? 0,
        timestamp: row.timestamp ?? null,
        notes: row.notes ?? null,
    };
}

export function useSleep() {
    const [sleepRecords, setSleepRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Récupérer tous les enregistrements de sommeil
     */
    const getSleepRecords = useCallback(
        async (page = 1, limit = 100) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await client.get("/api/sleep", {
                    params: { page, limit },
                });
                const raw = response?.data?.data;
                const list = Array.isArray(raw) ? raw : raw?.sleepRecords || [];
                const normalized = list.map(normalizeSleepRecord);
                setSleepRecords(normalized);
                return {
                    sleepRecords: normalized,
                    meta: response?.data?.meta || null,
                };
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
                const newRecord = normalizeSleepRecord(response?.data?.data || {});
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
