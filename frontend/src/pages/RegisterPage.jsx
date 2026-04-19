import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./RegisterPage.module.css";

/**
 * Valide le format email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register, isLoading, error: authError } = useAuth();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        age: "",
        weight: "",
        height: "",
    });
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

        // Nom
        if (!formData.name.trim()) {
            newErrors.name = "Le nom est requis";
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Le nom doit contenir au moins 2 caractères";
        }

        // Email
        if (!formData.email.trim()) {
            newErrors.email = "L'email est requis";
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = "Veuillez entrer une adresse email valide";
        }

        // Password
        if (!formData.password) {
            newErrors.password = "Le mot de passe est requis";
        } else if (formData.password.length < 6) {
            newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
        }

        // Confirm Password
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Veuillez confirmer votre mot de passe";
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
        }

        // Age (optionnel, mais si rempli doit être valide)
        if (formData.age) {
            const ageNum = parseInt(formData.age);
            if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
                newErrors.age = "L'âge doit être entre 1 et 150";
            }
        }

        // Weight (optionnel, mais si rempli doit être valide)
        if (formData.weight) {
            const weightNum = parseFloat(formData.weight);
            if (isNaN(weightNum) || weightNum < 10 || weightNum > 500) {
                newErrors.weight = "Le poids doit être entre 10 et 500 kg";
            }
        }

        // Height (optionnel, mais si rempli doit être valide)
        if (formData.height) {
            const heightNum = parseInt(formData.height);
            if (isNaN(heightNum) || heightNum < 50 || heightNum > 300) {
                newErrors.height = "La taille doit être entre 50 et 300 cm";
            }
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
        setTouched({
            name: true,
            email: true,
            password: true,
            confirmPassword: true,
            age: true,
            weight: true,
            height: true,
        });

        // Valider
        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Préparer les données pour l'API
        const registerData = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
        };

        // Ajouter les champs optionnels s'ils sont remplis
        if (formData.age) {
            registerData.age = parseInt(formData.age);
        }
        if (formData.weight) {
            registerData.weight = parseFloat(formData.weight);
        }
        if (formData.height) {
            registerData.height = parseInt(formData.height);
        }

        // Soumettre
        const result = await register(
            registerData.email,
            registerData.password,
            registerData.name
        );

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
                    <h2 className={styles.pageTitle}>Créer un compte</h2>
                </div>

                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                    {/* Nom */}
                    <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>
                            Nom complet
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Votre nom"
                            disabled={isLoading}
                            className={`${styles.input} ${errors.name && touched.name ? styles.error : ""
                                }`}
                            autoComplete="name"
                            required
                        />
                        {errors.name && touched.name && (
                            <div className={styles.errorText}>⚠ {errors.name}</div>
                        )}
                    </div>

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
                            placeholder="Min. 6 caractères"
                            disabled={isLoading}
                            className={`${styles.input} ${errors.password && touched.password ? styles.error : ""
                                }`}
                            autoComplete="new-password"
                            required
                        />
                        {errors.password && touched.password && (
                            <div className={styles.errorText}>⚠ {errors.password}</div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>
                            Confirmer le mot de passe
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Confirmez votre mot de passe"
                            disabled={isLoading}
                            className={`${styles.input} ${errors.confirmPassword && touched.confirmPassword
                                    ? styles.error
                                    : ""
                                }`}
                            autoComplete="new-password"
                            required
                        />
                        {errors.confirmPassword && touched.confirmPassword && (
                            <div className={styles.errorText}>⚠ {errors.confirmPassword}</div>
                        )}
                    </div>

                    {/* Section optionnelle */}
                    <div className={styles.optionalSection}>
                        <div className={styles.optionalSectionTitle}>
                            Informations optionnelles
                        </div>

                        {/* Grille 2 colonnes pour age, weight, height */}
                        <div className={styles.formGroupsRow}>
                            {/* Age */}
                            <div className={styles.formGroup}>
                                <label htmlFor="age" className={styles.label}>
                                    Âge <span className={styles.labelOptional}>(optionnel)</span>
                                </label>
                                <input
                                    type="number"
                                    id="age"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Ex: 28"
                                    disabled={isLoading}
                                    className={`${styles.input} ${errors.age && touched.age ? styles.error : ""
                                        }`}
                                    min="1"
                                    max="150"
                                />
                                {errors.age && touched.age && (
                                    <div className={styles.errorText}>⚠ {errors.age}</div>
                                )}
                            </div>

                            {/* Weight */}
                            <div className={styles.formGroup}>
                                <label htmlFor="weight" className={styles.label}>
                                    Poids (kg)
                                    <span className={styles.labelOptional}>(optionnel)</span>
                                </label>
                                <input
                                    type="number"
                                    id="weight"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Ex: 75"
                                    disabled={isLoading}
                                    className={`${styles.input} ${errors.weight && touched.weight ? styles.error : ""
                                        }`}
                                    min="10"
                                    max="500"
                                    step="0.1"
                                />
                                {errors.weight && touched.weight && (
                                    <div className={styles.errorText}>⚠ {errors.weight}</div>
                                )}
                            </div>

                            {/* Height */}
                            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                <label htmlFor="height" className={styles.label}>
                                    Taille (cm)
                                    <span className={styles.labelOptional}>(optionnel)</span>
                                </label>
                                <input
                                    type="number"
                                    id="height"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Ex: 180"
                                    disabled={isLoading}
                                    className={`${styles.input} ${errors.height && touched.height ? styles.error : ""
                                        }`}
                                    min="50"
                                    max="300"
                                />
                                {errors.height && touched.height && (
                                    <div className={styles.errorText}>⚠ {errors.height}</div>
                                )}
                            </div>
                        </div>
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
                                Inscription en cours...
                            </>
                        ) : (
                            "S'inscrire"
                        )}
                    </button>
                </form>

                {/* Lien vers connexion */}
                <div className={styles.footer}>
                    Vous avez déjà un compte ?{" "}
                    <Link to="/login" className={styles.footerLink}>
                        Se connecter
                    </Link>
                </div>
            </div>
        </div>
    );
}
