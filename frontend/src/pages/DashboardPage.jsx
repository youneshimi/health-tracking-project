import React from "react";
import Layout from "../components/layout/Layout";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
    return (
        <Layout pageTitle="Dashboard">
            <div className={styles.welcomeSection}>
                <h2 className={styles.sectionTitle}>Bienvenue sur Health Tracker</h2>
                <p className={styles.sectionDescription}>
                    Suivi complète de votre santé en un seul endroit.
                </p>

                <div className={styles.featuresGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>⚡</div>
                        <h3>Activités</h3>
                        <p>Suivi de vos exercices, calories et durée d'activité</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>😴</div>
                        <h3>Sommeil</h3>
                        <p>Enregistrement et analyse de la qualité de votre sommeil</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>❤️</div>
                        <h3>Fréquence Cardiaque</h3>
                        <p>Monitoring continu de votre santé cardiaque</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>📈</div>
                        <h3>Analyses & Tendances</h3>
                        <p>Graphiques, prédictions et corrélations avancées</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>⚠️</div>
                        <h3>Détection d'Anomalies</h3>
                        <p>Alertes intelligentes sur vos données anormales</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🔒</div>
                        <h3>Sécurité</h3>
                        <p>Vos données sont protégées par authentification JWT</p>
                    </div>
                </div>
            </div>

            <div className={styles.statsSection}>
                <h2 className={styles.sectionTitle}>Résumé Rapide</h2>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>--</div>
                        <div className={styles.statLabel}>Activités cette semaine</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>--</div>
                        <div className={styles.statLabel}>Sommeil moyen</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>--</div>
                        <div className={styles.statLabel}>FC repos</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>--</div>
                        <div className={styles.statLabel}>Anomalies détectées</div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
