import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./LoginPage.module.css";

/**
 * Valide le format email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading, error: authError } = useAuth();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Rediriger si utilisateur déjà authentifié
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            navigate("/", { replace: true });
        }
    }, [navigate]);

    /**
     * Valider les champs
     */
    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = "L'email est requis";
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = "Veuillez entrer une adresse email valide";
        }

        if (!formData.password) {
            newErrors.password = "Le mot de passe est requis";
        } else if (formData.password.length < 1) {
            newErrors.password = "Le mot de passe ne peut pas être vide";
        }

        return newErrors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Effacer l'erreur du champ lors de la modification
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Marquer tous les champs comme touchés
        setTouched({ email: true, password: true });

        // Valider
        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Soumettre
        const result = await login(formData.email, formData.password);
        if (result.success) {
            // Redirection automatique via AuthContext
            navigate("/", { replace: true });
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.header}>
                    <h1 className={styles.appTitle}>Health Tracker</h1>
                    <h2 className={styles.pageTitle}>Connexion</h2>
                </div>

                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                    {/* Email */}
                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Adresse email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="nom@exemple.com"
                            disabled={isLoading}
                            className={`${styles.input} ${errors.email && touched.email ? styles.error : ""
                                }`}
                            autoComplete="email"
                            required
                        />
                        {errors.email && touched.email && (
                            <div className={styles.errorText}>⚠ {errors.email}</div>
                        )}
                    </div>

                    {/* Password */}
                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Entrez votre mot de passe"
                            disabled={isLoading}
                            className={`${styles.input} ${errors.password && touched.password ? styles.error : ""
                                }`}
                            autoComplete="current-password"
                            required
                        />
                        {errors.password && touched.password && (
                            <div className={styles.errorText}>⚠ {errors.password}</div>
                        )}
                    </div>

                    {/* Erreur API */}
                    {authError && (
                        <div className={styles.errorMessage}>
                            <span className={styles.errorIcon}>✕</span>
                            <span>{authError}</span>
                        </div>
                    )}

                    {/* Bouton submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={styles.submitButton}
                    >
                        {isLoading ? (
                            <>
                                <span className={styles.spinner}></span>
                                Connexion en cours...
                            </>
                        ) : (
                            "Se connecter"
                        )}
                    </button>
                </form>

                {/* Lien vers inscription */}
                <div className={styles.footer}>
                    Pas encore de compte ?{" "}
                    <Link to="/register" className={styles.footerLink}>
                        S'inscrire
                    </Link>
                </div>
            </div>
        </div>
    );
}
