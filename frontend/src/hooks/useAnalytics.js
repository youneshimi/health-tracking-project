import { useState, useCallback } from "react";
import client from "../api/client";

export function useAnalytics() {
    const [trendsData, setTrendsData] = useState(null);
    const [predictionsData, setPredictionsData] = useState(null);
    const [correlationsData, setCorrelationsData] = useState(null);
    const [weeklySummaryData, setWeeklySummaryData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Récupérer les données de tendance
     */
    const getTrends = useCallback(async (metric, period) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await client.get("/api/analytics/trends", {
                params: { metric, period },
            });
            setTrendsData(response.data.data);
            return response.data.data;
        } catch (err) {
            const message = err.response?.data?.message || "Erreur lors du chargement des tendances";
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Récupérer les prédictions
     */
    const getPredictions = useCallback(async (metric) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await client.get("/api/analytics/predictions", {
                params: { metric },
            });
            setPredictionsData(response.data.data);
            return response.data.data;
        } catch (err) {
            const message = err.response?.data?.message || "Erreur lors du chargement des prédictions";
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Récupérer les corrélations
     */
    const getCorrelations = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await client.get("/api/analytics/correlations");
            setCorrelationsData(response.data.data);
            return response.data.data;
        } catch (err) {
            const message = err.response?.data?.message || "Erreur lors du chargement des corrélations";
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Récupérer le résumé hebdomadaire
     */
    const getWeeklySummary = useCallback(async (metric) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await client.get("/api/analytics/weekly-summary", {
                params: { metric },
            });
            setWeeklySummaryData(response.data.data);
            return response.data.data;
        } catch (err) {
            const message = err.response?.data?.message || "Erreur lors du chargement du résumé";
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        trendsData,
        predictionsData,
        correlationsData,
        weeklySummaryData,
        isLoading,
        error,
        getTrends,
        getPredictions,
        getCorrelations,
        getWeeklySummary,
    };
}
