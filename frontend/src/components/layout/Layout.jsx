import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import styles from "./Layout.module.css";

/**
 * Layout principal du dashboard
 * Contient: Sidebar + Header + Main content area
 */
export default function Layout({ children, pageTitle = "Dashboard" }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Sur mobile, fermer la sidebar au changement de page
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsSidebarCollapsed(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Fermer la sidebar au clic sur le contenu (mobile)
    const handleMainClick = () => {
        if (window.innerWidth <= 768 && isSidebarCollapsed === false) {
            // Laisser la sidebar ouverte sur mobile par défaut
        }
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className={styles.layoutContainer}>
            {/* Sidebar */}
            <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />

            {/* Header */}
            <Header
                isCollapsed={isSidebarCollapsed}
                onToggleMenu={toggleSidebar}
                pageTitle={pageTitle}
            />

            {/* Main Content */}
            <main
                className={`${styles.main} ${isSidebarCollapsed ? styles.sidebarCollapsed : ""
                    }`}
                onClick={handleMainClick}
            >
                <div className={styles.content}>{children}</div>
            </main>
        </div>
    );
}
