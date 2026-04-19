import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./AuthPages.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading, error } = useAuth();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [formError, setFormError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFormError(""); // Effacer l'erreur lors de la modification
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!formData.email || !formData.password) {
            setFormError("Tous les champs sont obligatoires");
            return;
        }

        const result = await login(formData.email, formData.password);

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
                <h2>Connexion</h2>

                <form onSubmit={handleSubmit}>
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
                            placeholder="Votre mot de passe"
                            disabled={isLoading}
                        />
                    </div>

                    {(error || formError) && (
                        <div className="error-message">
                            {error || formError}
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} className="btn-primary">
                        {isLoading ? "Connexion en cours..." : "Se connecter"}
                    </button>
                </form>

                <p className="auth-link">
                    Pas encore de compte ?{" "}
                    <Link to="/register">S'inscrire</Link>
                </p>
            </div>
        </div>
    );
}
