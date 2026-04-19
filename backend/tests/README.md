# Tests d'Intégration - Health Tracking Platform

## 📋 Configuration

### Prérequis
- Node.js 16+
- MySQL 8.0+
- Base de données de test créée

### Installation des dépendances de test

```bash
npm install
```

Les dépendances suivantes ont été ajoutées :
- `jest` - Framework de test
- `supertest` - Client HTTP pour les tests d'API
- `@jest/globals` - Globales Jest

### Configuration de la base de données de test

```sql
CREATE DATABASE test_health_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Importez le schéma :
```bash
mysql -u root -p test_health_db < database/schema.sql
```

## 🧪 Exécution des tests

### Tous les tests
```bash
npm test
```

### Tests en mode watch (développement)
```bash
npm run test:watch
```

### Tests avec couverture détaillée
```bash
npm test -- --coverage
```

### Tests spécifiques
```bash
# Tests d'authentification uniquement
npm test auth.test.js

# Tests d'activités uniquement
npm test activities.test.js

# Tests de sommeil uniquement
npm test sleep.test.js

# Tests de fréquence cardiaque
npm test heartRate.test.js

# Tests du détecteur d'anomalies
npm test anomalyDetector.test.js
```

## 📊 Couverture de test

### Objectif : > 80% coverage

La configuration Jest est définie dans `jest.config.js` :
- Coverage collecté pour : `src/**/*.js` (sauf config, scripts, server.js)
- Seuil minimum : 80% coverage

Rapports générés dans : `coverage/`

Visualiser le rapport HTML :
```bash
open coverage/lcov-report/index.html
```

## 🧬 Structure des tests

### `auth.test.js` (38 tests)
- **POST /api/auth/signup**
  - ✅ Cas nominal (création utilisateur)
  - ❌ Email dupliqué
  - ❌ Champs manquants
  - ❌ Email invalide
  - ❌ Mot de passe faible

- **POST /api/auth/login**
  - ✅ Succès
  - ❌ Mauvais mot de passe
  - ❌ Utilisateur inexistant
  - ❌ Données manquantes

- **GET /api/auth/me**
  - ✅ Avec token valide
  - ❌ Sans token
  - ❌ Token invalide
  - ❌ Token expiré

### `activities.test.js` (25+ tests)
- **POST /api/activities** (CREATE)
  - ✅ Cas nominal
  - ❌ Type invalide
  - ❌ Durée négative
  - ❌ Sans token

- **GET /api/activities** (READ + PAGINATION)
  - ✅ Récupération des activités
  - ✅ Pagination (page 1, 2, etc.)
  - ✅ Filtrage par type
  - ✅ Isolation des données utilisateur

- **PUT /api/activities/:id** (UPDATE)
  - ✅ Mise à jour par propriétaire
  - ❌ Tentative de modif par autre user

- **DELETE /api/activities/:id**
  - ✅ Suppression par propriétaire
  - ❌ Tentative de suppression par autre user

- **Ownership Tests**
  - ✅ User A ne peut pas accéder aux données de User B

### `sleep.test.js` (18+ tests)
- **POST /api/sleep** (CREATE)
  - ✅ Cas nominal
  - ❌ Validation total_hours = deep + light + rem
  - ❌ Quality score invalide (< 1 ou > 10)
  - ❌ Sans token

- **Uniqueness Constraint**
  - ✅ Rejet doublon (même user + date)
  - ✅ Plusieurs users peuvent avoir même date

- **GET /api/sleep** (READ)
  - ✅ Récupération des données
  - ✅ Isolation utilisateur
  - ✅ Pagination

- **PUT /api/sleep/:id** & **DELETE /api/sleep/:id**
  - ✅ CRUD complet

### `heartRate.test.js` (25+ tests)
- **POST /api/heart-rate** (CREATE)
  - ✅ Cas nominal
  - ❌ BPM invalide (< 30 ou > 250)
  - ❌ Contexte invalide
  - ❌ Sans token

- **POST /api/heart-rate/batch** (BATCH INSERT)
  - ✅ Cas nominal (< 100 records)
  - ❌ Rejet batch > 100 records
  - ❌ Rollback en cas d'erreur

- **GET /api/heart-rate** (READ)
  - ✅ Récupération avec filtrage contexte
  - ✅ Pagination
  - ✅ Filtrage par plage BPM
  - ✅ Isolation utilisateur

- **PUT/DELETE** + **Stats**
  - ✅ CRUD complet + endpoint stats

### `anomalyDetector.test.js` (40+ tests)
Unit tests pour les fonctions de détection :

- **detectHeartRateAnomalies()**
  - ✅ Détection tachycardia (> 100 BPM)
  - ✅ Détection bradycardia (< 50 BPM)
  - ✅ Détection variabilité FC (> 30 BPM)
  - ✅ Cas normal (pas d'anomalie)
  - ✅ Gestion edge cases (null, BPM extrêmes)

- **detectSleepAnomalies()**
  - ✅ Détection sommeil insuffisant (< 6h / 3 nuits)
  - ✅ Détection mauvaise qualité (< 4/5 / 3 nuits)
  - ✅ Détection peu de sommeil profond (< 10%)
  - ✅ Cas normal
  - ✅ Gestion floats et zéros

- **detectActivityAnomalies()**
  - ✅ Détection inactivité (14+ jours sans activité)
  - ✅ Détection activité excessive (> 1500 cal/jour)
  - ✅ Cas normal
  - ✅ Gestion edge cases

- **Combined & Edge Cases**
  - ✅ Sévérité correcte (HIGH/MEDIUM/LOW)
  - ✅ Messages descriptifs
  - ✅ Données invalides (null, undefined, etc.)

## 🔧 Configuration Jest

Fichier : `jest.config.js`

```javascript
{
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 10000,
  collectCoverageFrom: ["src/**/*.js"],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 70,
      branches: 70,
      statements: 80
    }
  }
}
```

## 🚀 Workflow CI/CD

Recommandations pour l'intégration continue :

```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

## 📝 Notes

- Les tests créent/nettoient les données de test automatiquement
- Base de données `test_health_db` doit exister avant les tests
- Timeout par défaut : 10s (ajustable dans jest.config.js)
- Erreurs de connexion MySQL : vérifier host/port/credentials

## 🐛 Dépannage

### "ECONNREFUSED 127.0.0.1:3306"
MySQL n'est pas en cours d'exécution. Démarrez-le :
```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# Windows
net start MySQL80
```

### "ER_BAD_DB_ERROR: Unknown database 'test_health_db'"
Créez la base de test :
```bash
mysql -u root -p -e "CREATE DATABASE test_health_db"
mysql -u root -p test_health_db < database/schema.sql
```

### Certificat SSL
Si erreur SSL, vérifiez la variable d'environnement `DB_SSL` dans `.env.test`

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MySQL2 Documentation](https://www.npmjs.com/package/mysql2)
