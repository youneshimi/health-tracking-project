import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/Toast";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import SleepPage from "./pages/SleepPage";
import HeartRatePage from "./pages/HeartRatePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AnomaliesPage from "./pages/AnomaliesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
    return (
        <Router>
            <AuthProvider>
            <ToastProvider>
                <Routes>
                    {/* Routes publiques */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Routes protégées */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/activities"
                        element={
                            <ProtectedRoute>
                                <ActivitiesPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/sleep"
                        element={
                            <ProtectedRoute>
                                <SleepPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/heart-rate"
                        element={
                            <ProtectedRoute>
                                <HeartRatePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/analytics"
                        element={
                            <ProtectedRoute>
                                <AnalyticsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/anomalies"
                        element={
                            <ProtectedRoute>
                                <AnomaliesPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Redirection par défaut */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ToastProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
