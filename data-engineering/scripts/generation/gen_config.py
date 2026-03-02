"""
Configuration pour la génération de données
Tous les paramètres et constantes
"""

from datetime import datetime, timedelta
import sys
from pathlib import Path

# Ajoute le chemin pour importer settings
sys.path.append(str(Path(__file__).resolve().parents[2]))
from config.settings import settings

# ========================================
# PARAMÈTRES GLOBAUX
# ========================================

NUM_USERS = settings.NUM_USERS
NUM_DAYS = settings.NUM_DAYS

# Date de début (30 jours dans le passé)
START_DATE = datetime.now() - timedelta(days=NUM_DAYS)

# ========================================
# PROFILS UTILISATEURS - ACTIVITÉ
# ========================================

ACTIVITY_PROFILES = {
    'very_active': {
        'probability': 0.15,  # 15% des users
        'activities_per_day_weekday': (2, 3),
        'activities_per_day_weekend': (1, 2),
    },
    'active': {
        'probability': 0.30,  # 30%
        'activities_per_day_weekday': (1, 2),
        'activities_per_day_weekend': (1, 2),
    },
    'moderate': {
        'probability': 0.35,  # 35%
        'activities_per_day_weekday': (0, 1),
        'activities_per_day_weekend': (1, 2),
    },
    'sedentary': {
        'probability': 0.20,  # 20%
        'activities_per_day_weekday': (0, 0),
        'activities_per_day_weekend': (0, 1),
    }
}

# ========================================
# TYPES D'ACTIVITÉS
# ========================================

ACTIVITY_TYPES = {
    'running': {
        'distance_km': (3, 15),
        'duration_minutes': (20, 90),
        'pace_min_per_km': (5, 8),
        'hr_avg': (140, 170),
        'hr_max': (160, 185),
        'met': 10,  # Intensité métabolique
    },
    'walking': {
        'distance_km': (2, 10),
        'duration_minutes': (20, 90),
        'pace_min_per_km': (12, 15),
        'hr_avg': (100, 130),
        'hr_max': (120, 145),
        'met': 4,
    },
    'cycling': {
        'distance_km': (10, 50),
        'duration_minutes': (30, 120),
        'pace_min_per_km': (2, 4),
        'hr_avg': (120, 160),
        'hr_max': (140, 175),
        'met': 8,
    },
    'gym': {
        'distance_km': (0, 0),
        'duration_minutes': (45, 90),
        'pace_min_per_km': (0, 0),
        'hr_avg': (110, 150),
        'hr_max': (130, 170),
        'met': 6,
    },
    'swimming': {
        'distance_km': (1, 3),
        'duration_minutes': (30, 60),
        'pace_min_per_km': (20, 30),
        'hr_avg': (120, 150),
        'hr_max': (140, 165),
        'met': 8,
    },
    'yoga': {
        'distance_km': (0, 0),
        'duration_minutes': (30, 90),
        'pace_min_per_km': (0, 0),
        'hr_avg': (80, 110),
        'hr_max': (100, 125),
        'met': 3,
    }
}

# ========================================
# PROFILS DE SOMMEIL
# ========================================

SLEEP_PROFILES = {
    'excellent': {
        'probability': 0.20,
        'total_hours': (7.5, 9),
        'quality_score': (80, 95),
        'awakenings': (0, 2),
    },
    'good': {
        'probability': 0.35,
        'total_hours': (7, 8),
        'quality_score': (70, 85),
        'awakenings': (1, 3),
    },
    'average': {
        'probability': 0.30,
        'total_hours': (6, 7.5),
        'quality_score': (50, 75),
        'awakenings': (2, 4),
    },
    'poor': {
        'probability': 0.15,
        'total_hours': (4, 6.5),
        'quality_score': (30, 60),
        'awakenings': (3, 6),
    }
}

# Proportions des phases de sommeil
SLEEP_PHASES = {
    'deep_percent': (0.15, 0.25),    # 15-25% du total
    'rem_percent': (0.20, 0.25),     # 20-25% du total
    # light = reste (calculé automatiquement)
}

# ========================================
# FRÉQUENCE CARDIAQUE
# ========================================

# Nombre de mesures par jour
HR_MEASUREMENTS_PER_DAY = (50, 200)

# Plages normales selon le contexte
HR_RANGES = {
    'resting': (55, 85),      # Au repos
    'sleeping': (45, 65),     # Pendant le sommeil
    'exercising': (120, 180), # Pendant l'effort
    'stressed': (90, 120),    # Sous stress
}

# ========================================
# SEUILS POUR ANOMALIES
# ========================================

ANOMALY_THRESHOLDS = {
    'high_resting_hr': {
        'threshold': settings.HIGH_HR_THRESHOLD,
        'consecutive_days': 2,
        'severity': 'high'
    },
    'low_resting_hr': {
        'threshold': 50,
        'consecutive_days': 2,
        'severity': 'medium'
    },
    'insufficient_sleep': {
        'threshold': settings.LOW_SLEEP_THRESHOLD,
        'consecutive_days': 3,
        'severity': 'medium'
    },
    'excessive_sleep': {
        'threshold': 10.0,
        'consecutive_days': 3,
        'severity': 'low'
    },
    'low_activity': {
        'threshold': settings.LOW_ACTIVITY_THRESHOLD,
        'consecutive_days': 5,
        'severity': 'low'
    }
}


# Test du module
if __name__ == "__main__":
    print("  Configuration de génération")
    print("=" * 60)
    print(f"Utilisateurs : {NUM_USERS}")
    print(f"Jours        : {NUM_DAYS}")
    print(f"Date début   : {START_DATE.strftime('%Y-%m-%d')}")
    print(f"\nProfils activité : {len(ACTIVITY_PROFILES)}")
    print(f"Types activité   : {len(ACTIVITY_TYPES)}")
    print(f"Profils sommeil  : {len(SLEEP_PROFILES)}")
    print("=" * 60)