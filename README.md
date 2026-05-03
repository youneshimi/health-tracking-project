# Health Tracking Platform

## 🧱 Stack
- Frontend: React
- Backend: Node.js (Express)
- Database: MySQL
- DevOps: Docker & Docker Compose
- DB Admin: phpMyAdmin

---

## 🚀 CI/CD

Le projet utilise GitHub Actions pour automatiser :

- Tests backend
- Build frontend
- Build Docker

📍 Pipeline visible ici :
https://github.com/youneshimi/health-tracking-project/actions

### Exemple de workflow

- Push → Tests lancés automatiquement
- PR → Validation automatique

## ✅ Services & URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Backend Healthcheck: http://localhost:4000/health
- phpMyAdmin: http://localhost:8080
- MySQL: localhost:3306

---

## 🚀 Run with Docker (recommended)

### Start
```bash
docker compose up --build