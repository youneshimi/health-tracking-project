# Guide de lancement (Docker + Kubernetes)

Ce guide permet a chaque membre de l'equipe de recuperer la branche, lancer le projet avec des donnees pre-remplies, puis acceder a l'interface.

## 1) Recuperer la branche

```bash
git fetch origin
git checkout feature/kubernetes
git pull origin feature/kubernetes
```

## 2) Prerequis

- Docker Desktop installe
- Kubernetes active dans Docker Desktop (Settings > Kubernetes)
- `kubectl` disponible

Verification rapide:

```bash
docker --version
docker compose version
kubectl version --client
```

---

## 3) Mode Docker (simple)

### Reset propre

```bash
docker compose down -v --remove-orphans
```

### Lancer la stack

```bash
docker compose up -d --build
```

### Initialiser les donnees (user de demo + data + anomalies)

```bash
docker compose run --rm seed
```

### Verifier

```bash
docker compose ps
curl -i http://localhost:3000
curl -i http://localhost:4000/health
```

### URL et compte

- Front: http://localhost:3000
- API: http://localhost:4000
- User: `younes@gmail.com`
- Mot de passe: `123456`

---

## 4) Mode Kubernetes

### Contexte Kubernetes

```bash
kubectl config use-context docker-desktop
```

### (Optionnel) Nettoyage complet

```bash
kubectl delete namespace health-platform --ignore-not-found=true
```

### Build des images locales utilisees par les manifests

```bash
docker build -t health-backend:local ./backend
docker build -t health-frontend:local --build-arg REACT_APP_API_URL=http://localhost:30080 ./frontend
```

### Deployer tous les manifests

```bash
kubectl apply -f k8s/namespace.yaml -f k8s/secret.yaml -f k8s/mysql/configmap.yaml -f k8s/mysql/pvc.yaml -f k8s/mysql/deployment.yaml -f k8s/mysql/service.yaml -f k8s/backend/configmap.yaml -f k8s/backend/deployment.yaml -f k8s/backend/service.yaml -f k8s/frontend/deployment.yaml -f k8s/frontend/service.yaml
```

### Attendre les rollouts

```bash
kubectl rollout status deployment/mysql -n health-platform --timeout=300s
kubectl rollout status deployment/backend -n health-platform --timeout=300s
kubectl rollout status deployment/frontend -n health-platform --timeout=300s
```

### Verifier

```bash
kubectl get all -n health-platform
curl -i http://localhost:30000
curl -i http://localhost:30080/health
```

### URL et compte

- Front: http://localhost:30000
- API: http://localhost:30080
- User: `younes@gmail.com`
- Mot de passe: `123456`

---

## 5) Diagnostic rapide

### Docker

```bash
docker compose logs --tail=200 seed
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
```

### Kubernetes

```bash
kubectl logs -n health-platform deployment/backend -c seed --tail=200
kubectl logs -n health-platform deployment/backend --tail=200
kubectl logs -n health-platform deployment/frontend --tail=200
```

## 6) Note importante

- Le badge en bas de la sidebar affiche le mode courant:
  - `Docker` en mode compose
  - `Kubernetes` en mode cluster
- Faire un refresh force (`Ctrl+F5`) apres deploiement pour vider le cache navigateur.
