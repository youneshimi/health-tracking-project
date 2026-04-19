import React from "react";
import Layout from "../components/layout/Layout";

export default function AnomaliesPage() {
    return (
        <Layout pageTitle="Anomalies">
            <div style={{ textAlign: "center", padding: "40px" }}>
                <h2>⚠️ Anomalies Détectées</h2>
                <p style={{ fontSize: "16px", color: "#64748b" }}>
                    Cette page est en cours de construction...
                </p>
                <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "20px" }}>
                    Bientôt disponible : Liste complète, filtres, gestion des alertes
                </p>
            </div>
        </Layout>
    );
}
