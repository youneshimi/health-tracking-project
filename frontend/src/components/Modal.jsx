import React from "react";
import styles from "./Modal.module.css";

/**
 * Composant Modal réutilisable
 */
export default function Modal({ isOpen, title, children, onClose, size = "medium" }) {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
            <div className={`${styles.modal} ${styles[`modal${size.charAt(0).toUpperCase() + size.slice(1)}`]}`}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{title}</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Fermer"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className={styles.modalContent}>{children}</div>
            </div>
        </div>
    );
}
