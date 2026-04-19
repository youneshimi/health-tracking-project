import React from "react";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Layout.module.css";

export default function Header({ isCollapsed, onToggleMenu, pageTitle = "Dashboard" }) {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        // La redirection vers /login est faite par le contexte
    };

    return (
        <header className={`${styles.header} ${isCollapsed ? styles.sidebarCollapsed : ""}`}>
            {/* Hamburger menu pour mobile */}
            <button
                className={styles.hamburger}
                onClick={onToggleMenu}
                aria-label="Toggle menu"
                title="Toggle sidebar"
            >
                ☰
            </button>

            {/* Titre de la page */}
            <h1 className={styles.headerTitle}>{pageTitle}</h1>

            {/* Actions */}
            <div className={styles.headerActions}>
                <div className={styles.userInfo}>
                    <div>
                        <div className={styles.userName}>{user?.email || "User"}</div>
                        <div className={styles.userEmail}>{user?.name || ""}</div>
                    </div>
                </div>

                <button
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    title="Se déconnecter"
                >
                    Déconnexion
                </button>
            </div>
        </header>
    );
}
