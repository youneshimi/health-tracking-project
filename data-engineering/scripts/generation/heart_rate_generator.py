"""
Générateur de mesures de fréquence cardiaque
"""

import random
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Imports locaux
sys.path.append(str(Path(__file__).resolve().parents[2]))
from config.database import get_connection
from scripts.generation.gen_config import (
    HR_MEASUREMENTS_PER_DAY,
    HR_RANGES,
    START_DATE,
    NUM_DAYS
)


def generate_heart_rate_for_user(user_id, num_days, activities=None):
    """
    Génère des mesures de fréquence cardiaque pour un utilisateur
    
    Args:
        user_id (int): ID utilisateur
        num_days (int): Nombre de jours
        activities (list): Liste des activités (optionnel, pour synchroniser)
        
    Returns:
        list: Liste de mesures de fréquence cardiaque
    """
    hr_measurements = []
    
    for day in range(num_days):
        current_date = START_DATE + timedelta(days=day)
        
        # Nombre de mesures pour ce jour
        num_measurements = random.randint(*HR_MEASUREMENTS_PER_DAY)
        
        # Génère les mesures
        daily_measurements = generate_daily_heart_rate(
            user_id,
            current_date,
            num_measurements,
            activities
        )
        
        hr_measurements.extend(daily_measurements)
    
    return hr_measurements


def generate_daily_heart_rate(user_id, date, num_measurements, activities):
    """
    Génère les mesures de FC pour une journée
    
    Args:
        user_id (int): ID utilisateur
        date (datetime): Date
        num_measurements (int): Nombre de mesures
        activities (list): Activités du jour
        
    Returns:
        list: Mesures de FC
    """
    measurements = []
    
    # Crée une liste d'heures aléatoires sur 24h
    times = []
    for _ in range(num_measurements):
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        timestamp = date.replace(hour=hour, minute=minute, second=second)
        times.append(timestamp)
    
    # Trie par ordre chronologique
    times.sort()
    
    # Pour chaque mesure
    for timestamp in times:
        # Détermine le contexte selon l'heure
        hour = timestamp.hour
        
        # Pendant le sommeil (0h-6h)
        if 0 <= hour < 6:
            context = 'sleeping'
            bpm_min, bpm_max = HR_RANGES['sleeping']
            bpm = random.randint(bpm_min, bpm_max)
        
        # Pendant une activité (si on a des activités et qu'on est proche)
        elif activities and is_during_activity(timestamp, activities, user_id):
            context = 'exercising'
            bpm_min, bpm_max = HR_RANGES['exercising']
            bpm = random.randint(bpm_min, bpm_max)
        
        # Période de stress possible (8h-10h, 17h-19h)
        elif (8 <= hour < 10) or (17 <= hour < 19):
            # 30% de chance d'être stressé
            if random.random() < 0.3:
                context = 'stressed'
                bpm_min, bpm_max = HR_RANGES['stressed']
                bpm = random.randint(bpm_min, bpm_max)
            else:
                context = 'resting'
                bpm_min, bpm_max = HR_RANGES['resting']
                bpm = random.randint(bpm_min, bpm_max)
        
        # Au repos (le reste du temps)
        else:
            context = 'resting'
            bpm_min, bpm_max = HR_RANGES['resting']
            bpm = random.randint(bpm_min, bpm_max)
        
        measurement = {
            'user_id': user_id,
            'bpm': bpm,
            'context': context,
            'timestamp': timestamp
        }
        
        measurements.append(measurement)
    
    return measurements


def is_during_activity(timestamp, activities, user_id):
    """
    Vérifie si une mesure est pendant une activité
    
    Args:
        timestamp (datetime): Heure de la mesure
        activities (list): Liste des activités
        user_id (int): ID utilisateur
        
    Returns:
        bool: True si pendant une activité
    """
    if not activities:
        return False
    
    for activity in activities:
        if activity['user_id'] != user_id:
            continue
        
        activity_start = activity['timestamp']
        activity_end = activity_start + timedelta(minutes=activity['duration_minutes'])
        
        if activity_start <= timestamp <= activity_end:
            return True
    
    return False


def insert_heart_rate(measurements):
    """
    Insère les mesures de FC dans MySQL
    
    Args:
        measurements (list): Liste de mesures
        
    Returns:
        int: Nombre de mesures insérées
    """
    if not measurements:
        return 0
    
    conn = get_connection()
    cursor = conn.cursor()
    
    insert_query = """
    INSERT INTO heart_rate 
    (user_id, bpm, context, timestamp)
    VALUES (%s, %s, %s, %s)
    """
    
    batch_data = [
        (m['user_id'], m['bpm'], m['context'], m['timestamp'])
        for m in measurements
    ]
    
    cursor.executemany(insert_query, batch_data)
    
    conn.commit()
    count = cursor.rowcount
    cursor.close()
    conn.close()
    
    return count


# Test du module
if __name__ == "__main__":
    print(" Test générateur de fréquence cardiaque")
    print("=" * 60)
    
    # Génère des mesures pour 3 jours
    hr_measurements = generate_heart_rate_for_user(
        user_id=1,
        num_days=3,
        activities=None
    )
    
    print(f"\n {len(hr_measurements)} mesures générées pour 3 jours")
    print(f"   Moyenne : {len(hr_measurements) / 3:.0f} mesures/jour")
    
    # Affiche quelques exemples
    print("\n Exemples de mesures :")
    for i, measurement in enumerate(hr_measurements[:10], 1):
        print(f"   {i:2}. {measurement['timestamp'].strftime('%Y-%m-%d %H:%M:%S')} "
              f"| {measurement['bpm']:3} BPM | {measurement['context']:10}")
    
    # Statistiques par contexte
    print(f"\n Statistiques par contexte :")
    contexts = {}
    for m in hr_measurements:
        context = m['context']
        if context not in contexts:
            contexts[context] = []
        contexts[context].append(m['bpm'])
    
    for context, bpms in contexts.items():
        avg_bpm = sum(bpms) / len(bpms)
        min_bpm = min(bpms)
        max_bpm = max(bpms)
        print(f"   {context:12} : {len(bpms):4} mesures | "
              f"Moy: {avg_bpm:5.1f} BPM | "
              f"Min: {min_bpm:3} | Max: {max_bpm:3}")
    
    # Distribution par heure
    print(f"\n Distribution par heure :")
    hours = {}
    for m in hr_measurements:
        hour = m['timestamp'].hour
        hours[hour] = hours.get(hour, 0) + 1
    
    for hour in sorted(hours.keys()):
        bar = '' * (hours[hour] // 2)
        print(f"   {hour:02d}h : {bar} ({hours[hour]})")
    
    print("\n" + "=" * 60)
    print(" Test réussi !")