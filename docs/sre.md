# SRE – Health Tracking Platform

## Objectif

L’objectif SRE est de garantir la fiabilité de la plateforme de suivi de santé connectée.

La supervision repose sur :
- Prometheus pour la collecte de métriques
- Grafana pour la visualisation
- Grafana Alerting pour les alertes

---

## SLA

Le SLA représente l’engagement de disponibilité du service.

Pour ce projet, nous définissons un SLA cible de :

**99 % de disponibilité mensuelle du backend**

---

## SLO

Les SLO définissent les objectifs techniques mesurables.

### Disponibilité backend

- Objectif : backend disponible au moins 99 % du temps
- Métrique : `up{instance="backend:4000"}`
- Condition : le backend est considéré disponible si `up = 1`

### Latence API

- Objectif : latence moyenne inférieure à 500 ms
- Métrique : `http_request_duration_seconds`
- Alerte : déclenchée si la latence dépasse le seuil défini

### Taux d’erreur

- Objectif : taux d’erreur inférieur à 5 %
- Métrique : ratio entre les réponses HTTP en erreur et le total des requêtes
- Alerte : déclenchée si le taux dépasse 5 %

---

## Error Budget

Avec un SLA de 99 %, l’application peut être indisponible environ 1 % du temps sur une période donnée.

L’Error Budget permet de mesurer la marge d’erreur acceptable avant que la fiabilité du service soit considérée comme insuffisante.

---

## Alertes configurées

### Backend Down

Détecte l’indisponibilité du backend.

```promql
max(up{instance="backend:4000"})

Condition : inférieur à 1.

Error Rate

Détecte un taux d’erreur HTTP trop élevé.

sum(rate(http_request_duration_seconds_count{status_code=~"4..|5.."}[5m]))
/
sum(rate(http_request_duration_seconds_count[5m]))

Condition : supérieur à 0.05.

High API Latency

Détecte une latence moyenne trop élevée.

rate(http_request_duration_seconds_sum[1m])
/
rate(http_request_duration_seconds_count[1m])

Condition : supérieure au seuil défini.

Bénéfices

Cette démarche permet de passer d’une simple application fonctionnelle à une application supervisée :

détection rapide des incidents
suivi de la performance
visualisation temps réel
support à la prise de décision
meilleure fiabilité applicative