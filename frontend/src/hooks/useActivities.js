import { useState, useCallback } from "react";
import client from "../api/client";

function normalizeActivity(row) {
    return {
        id: row.activity_id ?? row.activityId ?? row.id ?? null,
        activity_id: row.activity_id ?? row.activityId ?? row.id ?? null,
        user_id: row.user_id ?? row.userId ?? null,
        type: row.activity_type ?? row.activityType ?? row.type ?? "other",
        activity_type: row.activity_type ?? row.activityType ?? row.type ?? "other",
        date: row.timestamp ?? row.date ?? null,
        timestamp: row.timestamp ?? row.date ?? null,
        duration_minutes: row.duration_minutes ?? row.durationMinutes ?? 0,
        distance_km: row.distance_km ?? row.distanceKm ?? 0,
        calories_burned: row.calories_burned ?? row.caloriesBurned ?? 0,
        steps: row.steps ?? 0,
        avg_heart_rate: row.avg_heart_rate ?? row.avgHeartRate ?? null,
        max_heart_rate: row.max_heart_rate ?? row.maxHeartRate ?? null,
        notes: row.notes ?? null,
    };
}

export function useActivities() {
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Récupérer toutes les activités
     */
    const getActivities = useCallback(
        async (page = 1, limit = 100) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await client.get("/api/activities", {
                    params: { page, limit },
                });
                const raw = response?.data?.data;
                const list = Array.isArray(raw) ? raw : raw?.activities || [];
                const normalized = list.map(normalizeActivity);
                setActivities(normalized);
                return {
                    activities: normalized,
                    meta: response?.data?.meta || null,
                };
            } catch (err) {
                const message =
                    err.response?.data?.message || "Erreur lors du chargement des activités";
                setError(message);
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    /**
     * Créer une activité
     */
    const createActivity = useCallback(
        async (activityData) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await client.post("/api/activities", activityData);
                const newActivity = normalizeActivity(response?.data?.data || {});
                setActivities((prev) => [newActivity, ...prev]);
                return { success: true, data: newActivity };
            } catch (err) {
                const message =
                    err.response?.data?.message || "Erreur lors de la création d'activité";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    /**
     * Récupérer les stats d'activité
     */
    const getActivityStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await client.get("/api/activities/stats");
            return response.data.data;
        } catch (err) {
            const message =
                err.response?.data?.message || "Erreur lors du chargement des stats";
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        activities,
        isLoading,
        error,
        getActivities,
        createActivity,
        getActivityStats,
    };
}
