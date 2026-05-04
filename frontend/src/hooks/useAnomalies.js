import { useState, useCallback } from "react";
import client from "../api/client";

function normalizeAnomaly(row) {
    return {
        id: row.anomaly_id ?? row.id ?? null,
        anomaly_id: row.anomaly_id ?? row.id ?? null,
        type: row.type ?? "other",
        anomaly_type: row.type ?? "other",
        severity: row.severity ?? "low",
        description: row.description ?? "",
        message: row.description ?? "",
        detected_at: row.detected_at ?? row.created_at ?? null,
        created_at: row.created_at ?? row.detected_at ?? null,
        is_read: row.is_read ?? false,
        related_id: row.related_id ?? null,
        metric_type: row.type ?? null,
    };
}

/**
 * Hook custom pour les anomalies
 */
export function useAnomalies() {
    const [anomalies, setAnomalies] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAnomalies = useCallback(async (limit = 10) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await client.get(`/api/anomalies`, {
                params: { limit },
            });
            const raw = Array.isArray(response?.data?.data) ? response.data.data : [];
            const normalized = raw.map(normalizeAnomaly);
            setAnomalies(normalized);
            return normalized;
        } catch (err) {
            console.error("Erreur anomalies:", err);
            setError(err.response?.data?.message || "Erreur lors du chargement");
            setAnomalies([]);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        anomalies,
        isLoading,
        error,
        getAnomalies,
    };
}

