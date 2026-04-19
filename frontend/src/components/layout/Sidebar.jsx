import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import client from "../../api/client";
import styles from "./Layout.module.css";

export default function Sidebar({ isCollapsed, onToggle }) {
    const location = useLocation();
    const [unreadAnomalies, setUnreadAnomalies] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Récupérer le nombre d'anomalies non lues
    useEffect(() => {
        const fetchAnomalies = async () => {
            try {
                setIsLoading(true);
                const response = await client.get("/api/anomalies/summary");
                const unreadCount = response.data.data.unread_count || 0;
                setUnreadAnomalies(unreadCount);
            } catch (error) {
                console.error("Erreur lors de la récupération des anomalies:", error);
                setUnreadAnomalies(0);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnomalies();
        // Actualiser toutes les 30 secondes
        const interval = setInterval(fetchAnomalies, 30000);

        return () => clearInterval(interval);
    }, []);

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: "/", label: "Dashboard", icon: "🏠" },
        { path: "/activities", label: "Activités", icon: "⚡" },
        { path: "/sleep", label: "Sommeil", icon: "😴" },
        { path: "/heart-rate", label: "Fréquence Cardiaque", icon: "❤️" },
        { path: "/analytics", label: "Analyses & Tendances", icon: "📈" },
        {
            path: "/anomalies",
            label: "Anomalies",
            icon: "⚠️",
            badge: unreadAnomalies,
        },
    ];

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
            {/* Brand */}
            <div className={styles.sidebarBrand}>
                <h1 className={styles.brandTitle}>Health Tracker</h1>
            </div>

            {/* Navigation */}
            <nav className={styles.sidebarNav}>
                {navItems.map((item) => (
                    <li key={item.path} className={styles.navItem}>
                        <Link
                            to={item.path}
                            className={`${styles.navLink} ${isActive(item.path) ? styles.active : ""
                                }`}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                            {item.badge && item.badge > 0 && (
                                <span className={styles.badge}>{item.badge}</span>
                            )}
                        </Link>
                    </li>
                ))}
            </nav>

            {/* Footer */}
            <div className={styles.sidebarFooter}>
                <p
                    style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                        margin: "0 0 8px 0",
                        textAlign: "center",
                    }}
                >
                    v1.0.0
                </p>
            </div>
        </aside>
    );
}
