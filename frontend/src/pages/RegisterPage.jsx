import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./AuthPages.css";

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register, isLoading, error } = useAuth();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [formError, setFormError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFormError(""); // Effacer l'erreur lors de la modification
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");

        if (
            !formData.name ||
            !formData.email ||
            !formData.password ||
            !formData.confirmPassword
        ) {
            setFormError("Tous les champs sont obligatoires");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setFormError("Les mots de passe ne correspondent pas");
            return;
        }

        if (formData.password.length < 6) {
            setFormError("Le mot de passe doit contenir au moins 6 caractères");
            return;
        }

        const result = await register(
            formData.email,
            formData.password,
            formData.name
        );

        if (result.success) {
            navigate("/"); // Rediriger vers le dashboard
        } else {
            setFormError(result.error);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Health Tracker</h1>
                <h2>Inscription</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Nom</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Votre nom"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="votre@email.com"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mot de passe</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Au moins 6 caractères"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirmer votre mot de passe"
                            disabled={isLoading}
                        />
                    </div>

                    {(error || formError) && (
                        <div className="error-message">
                            {error || formError}
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} className="btn-primary">
                        {isLoading ? "Inscription en cours..." : "S'inscrire"}
                    </button>
                </form>

                <p className="auth-link">
                    Vous avez déjà un compte ?{" "}
                    <Link to="/login">Se connecter</Link>
                </p>
            </div>
        </div>
    );
}
