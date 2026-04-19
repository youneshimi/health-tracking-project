import React from "react";
import { useAuth } from "../hooks/useAuth";
import "./DashboardPage.css";

export default function DashboardPage() {
    const { user, logout } = useAuth();

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Health Tracker Dashboard</h1>
                <div className="header-actions">
                    <span className="user-info">Bienvenue, {user?.email}!</span>
                    <button className="btn-logout" onClick={logout}>
                        Déconnexion
                    </button>
                </div>
            </header>

            <main className="dashboard-main">
                <section className="welcome-section">
                    <h2>Bienvenue sur Health Tracker</h2>
                    <p>Cette section est en cours de construction...</p>
                    <p>
                        Vous pouvez maintenant :
                    </p>
                    <ul>
                        <li>📊 Suivre vos activités</li>
                        <li>😴 Enregistrer votre sommeil</li>
                        <li>❤️ Monitorer votre fréquence cardiaque</li>
                        <li>📈 Consulter vos analytics avancés</li>
                        <li>🔍 Analyser les corrélations entre vos données</li>
                    </ul>
                </section>

                <section className="features-grid">
                    <div className="feature-card">
                        <h3>📊 Activités</h3>
                        <p>Suivi de vos exercices et calories brûlées</p>
                    </div>
                    <div className="feature-card">
                        <h3>😴 Sommeil</h3>
                        <p>Enregistrement et analyse de vos nuits</p>
                    </div>
                    <div className="feature-card">
                        <h3>❤️ Fréquence Cardiaque</h3>
                        <p>Monitoring de votre santé cardiaque</p>
                    </div>
                    <div className="feature-card">
                        <h3>📈 Analytics</h3>
                        <p>Tendances et prédictions de vos données</p>
                    </div>
                </section>
            </main>
        </div>
    );
}
