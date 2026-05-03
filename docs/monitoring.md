# Monitoring & Observability

## Objectif

Mettre en place une observabilité complète du backend.

## Stack

* Prometheus → collecte des métriques
* Grafana → visualisation
* prom-client → instrumentation Node.js

## Métriques exposées

* Disponibilité (`/health`)
* Nombre de requêtes
* Latence API
* Taux d’erreur
* Consommation mémoire

## Endpoint

GET /metrics

## Dashboard Grafana

* Backend availability
* API requests/sec
* Average latency
* Error rate
* Memory usage

## Bénéfices

* Détection rapide des erreurs
* Analyse des performances
* Monitoring en temps réel
