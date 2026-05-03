# DevOps & CI/CD – Health Tracking Platform

## 1. Objectif

L’objectif de cette partie est d’automatiser le processus de validation du projet :

- Vérification automatique du backend
- Vérification automatique du frontend
- Exécution des tests
- Build Docker

---

## 2. Architecture

Le projet repose sur une architecture conteneurisée :

- Backend : Node.js (Express)
- Frontend : React
- Base de données : MySQL
- Orchestration : Docker Compose

---

## 3. Pipeline CI

Un pipeline GitHub Actions a été mis en place.

### Déclenchement

- Push sur :
  - main
  - develop
  - feature/*
- Pull Request

---

### Étapes du pipeline

#### Backend

1. Installation des dépendances
2. Démarrage d’un service MySQL
3. Import du schéma SQL
4. Exécution des tests (Jest)
5. Build Docker

#### Frontend

1. Installation des dépendances
2. Build React
3. Build Docker

---

## 4. Résultat

Le pipeline permet de garantir :

- Aucune régression
- Build fonctionnel
- Code testable
- Environnement reproductible

---

## 5. Améliorations possibles

- Déploiement automatique (CD)
- Ajout d’un environnement staging
- Analyse de qualité (SonarQube)
- Scan sécurité (Snyk, Trivy)