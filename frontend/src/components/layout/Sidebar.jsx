import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import client from "../../api/client";
import styles from "./Layout.module.css";

export default function Sidebar({ isCollapsed, onToggle }) {
    const location = useLocation();
    const [unreadAnomalies, setUnreadAnomalies] = useState(0);
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:4000";
    const isKubernetes = /30080|kubernetes|health-platform/i.test(apiUrl);
    const runtimeLabel = isKubernetes ? "Kubernetes" : "Docker";

    // Récupérer le nombre d'anomalies non lues
    useEffect(() => {
        const fetchAnomalies = async () => {
            try {
                const response = await client.get("/api/anomalies/summary");
                const unreadCount = response.data.data.unread_count || 0;
                setUnreadAnomalies(unreadCount);
            } catch (error) {
                console.error("Erreur lors de la récupération des anomalies:", error);
                setUnreadAnomalies(0);
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
                <p className={styles.sidebarVersion}>v1.0.0</p>
                <div className={styles.runtimeBadge}>
                    <span
                        className={styles.runtimeDot}
                        style={{ backgroundColor: isKubernetes ? "#10b981" : "#60a5fa" }}
                    ></span>
                    <span className={styles.runtimeLabel}>{runtimeLabel}</span>
                </div>
            </div>
        </aside>
    );
}
