import { useState, useCallback } from "react";
import client from "../api/client";

function mapTrendResponse(raw) {
    const points = (raw?.data || []).map((item, index) => ({
        date: item.date,
        value: Number(item.value || 0),
        value_trend:
            Number(raw?.regression?.slope || 0) * index +
            Number(raw?.regression?.intercept || 0),
    }));

    return {
        metric: raw?.metric || null,
        period: raw?.period || null,
        points,
        regression: raw?.regression || { slope: 0, intercept: 0, r_squared: 0 },
        regression_line: true,
    };
}

function mapPredictionResponse(raw, metric) {
    const selected = raw?.[metric] || null;
    if (!selected || !selected.j7 || !selected.j30) {
        return null;
    }

    const directionValue =
        selected.trend_direction === "up"
            ? 1
            : selected.trend_direction === "down"
                ? -1
                : 0;

    return {
        prediction_7d: {
            value: Number(selected.j7.predicted_value || 0),
            trend_direction: directionValue,
            confidence_interval_lower: Number(selected.j7.confidence_interval_lower || 0),
            confidence_interval_upper: Number(selected.j7.confidence_interval_upper || 0),
        },
        prediction_30d: {
            value: Number(selected.j30.predicted_value || 0),
            trend_direction: directionValue,
            confidence_interval_lower: Number(selected.j30.confidence_interval_lower || 0),
            confidence_interval_upper: Number(selected.j30.confidence_interval_upper || 0),
        },
    };
}

function mapCorrelationResponse(raw) {
    return {
        sleep_hr_next_day: {
            coefficient: Number(raw?.sleep_impacts_heart_rate?.coefficient || 0),
        },
        activity_sleep_next_day: {
            coefficient: Number(raw?.activity_improves_sleep?.coefficient || 0),
        },
    };
}

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
            const mapped = mapTrendResponse(response?.data?.data || {});
            setTrendsData(mapped);
            return mapped;
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
            const mapped = mapPredictionResponse(response?.data?.data || {}, metric);
            setPredictionsData(mapped);
            return mapped;
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
            const mapped = mapCorrelationResponse(response?.data?.data || {});
            setCorrelationsData(mapped);
            return mapped;
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
