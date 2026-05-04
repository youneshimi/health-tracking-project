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

- Ajout d’un environnement staging
- Analyse de qualité (SonarQube)
- Scan sécurité (Snyk, Trivy)

## Déploiement automatique

Un workflow GitHub Actions `deploy-ec2.yml` déclenche automatiquement le déploiement sur l’instance AWS EC2 après un push ou merge sur `main`.

Le workflow :
1. se connecte au serveur EC2 en SSH ;
2. récupère la dernière version du code avec `git pull` ;
3. relance la stack Docker Compose de production ;
4. vérifie que le backend répond via `/health`.

Cela permet de passer d’un déploiement manuel à un déploiement continu.