# Déploiement Cloud AWS EC2

## Objectif

Déployer la plateforme Health Tracking sur une infrastructure Cloud AWS EC2.

## Infrastructure utilisée

- Cloud provider : AWS
- Service : EC2
- OS : Ubuntu 24.04 LTS
- Conteneurisation : Docker
- Orchestration : Docker Compose

## Services déployés

- Frontend React : port 3000
- Backend Node.js/Express : port 4000
- MySQL : port 3306, utilisé par les conteneurs
- Prometheus : port 9090
- Grafana : port 3001

## Étapes réalisées

1. Création d’une instance EC2 Ubuntu
2. Configuration du Security Group
3. Ouverture des ports nécessaires : 22, 3000, 3001, 4000, 9090
4. Installation de Docker
5. Clonage du repository GitHub
6. Création du fichier `.env.production`
7. Lancement de la stack avec `docker-compose.prod.yml`
8. Ajout d’un swap de 2 Go pour stabiliser l’instance
9. Génération de données simulées avec le script seed

## Commande de lancement

```bash
docker-compose --env-file .env.production -f docker-compose.prod.yml up -d --build