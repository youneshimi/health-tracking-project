import { useState, useCallback } from "react";
import client from "../api/client";

export function useActivities() {
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Récupérer toutes les activités
     */
    const getActivities = useCallback(
        async (page = 1, limit = 10) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await client.get("/api/activities", {
                    params: { page, limit },
                });
                setActivities(response.data.data.activities || []);
                return response.data.data;
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
                const newActivity = response.data.data;
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
