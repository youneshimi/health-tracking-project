"""
Générateur d'activités physiques
"""

import random
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Imports locaux
sys.path.append(str(Path(__file__).resolve().parents[2]))
from config.database import get_connection
from scripts.generation.gen_config import (
    ACTIVITY_TYPES,
    ACTIVITY_PROFILES,
    START_DATE,
    NUM_DAYS
)


def generate_activities_for_user(user_id, user_data, num_days):
    """
    Génère des activités pour un utilisateur sur X jours
    
    Args:
        user_id (int): ID de l'utilisateur
        user_data (dict): Données de l'utilisateur (weight_kg, activity_profile, etc.)
        num_days (int): Nombre de jours
        
    Returns:
        list: Liste d'activités
    """
    activities = []
    profile = ACTIVITY_PROFILES[user_data['activity_profile']]
    
    for day in range(num_days):
        current_date = START_DATE + timedelta(days=day)
        
        # Détermine si c'est un jour de semaine ou weekend
        is_weekend = current_date.weekday() >= 5  # 5=samedi, 6=dimanche
        
        # Nombre d'activités selon le profil
        if is_weekend:
            min_act, max_act = profile['activities_per_day_weekend']
        else:
            min_act, max_act = profile['activities_per_day_weekday']
        
        num_activities = random.randint(min_act, max_act)
        
        # Génère les activités pour ce jour
        for _ in range(num_activities):
            activity = generate_single_activity(user_id, user_data, current_date)
            activities.append(activity)
    
    return activities


def generate_single_activity(user_id, user_data, date):
    """
    Génère une activité unique
    
    Args:
        user_id (int): ID utilisateur
        user_data (dict): Données utilisateur
        date (datetime): Date de l'activité
        
    Returns:
        dict: Activité générée
    """
    # Choix aléatoire du type d'activité
    activity_type = random.choice(list(ACTIVITY_TYPES.keys()))
    activity_config = ACTIVITY_TYPES[activity_type]
    
    # Génère la distance (si applicable)
    distance_min, distance_max = activity_config['distance_km']
    if distance_max > 0:
        distance_km = round(random.uniform(distance_min, distance_max), 2)
    else:
        distance_km = 0
    
    # Génère la durée
    duration_min, duration_max = activity_config['duration_minutes']
    duration_minutes = random.randint(duration_min, duration_max)
    
    # Calcule les pas (si applicable)
    if distance_km > 0:
        # Approximation : 1 km ≈ 1300 pas
        steps = int(distance_km * 1300 * random.uniform(0.9, 1.1))
    else:
        steps = 0
    
    # Calcule les calories brûlées
    # Formule : calories = durée (h) × MET × poids (kg)
    calories_burned = int((duration_minutes / 60) * activity_config['met'] * user_data['weight_kg'])
    
    # Génère la fréquence cardiaque
    hr_avg_min, hr_avg_max = activity_config['hr_avg']
    avg_heart_rate = random.randint(hr_avg_min, hr_avg_max)
    
    hr_max_min, hr_max_max = activity_config['hr_max']
    max_heart_rate = random.randint(hr_max_min, hr_max_max)
    
    # Assure que max >= avg
    if max_heart_rate < avg_heart_rate:
        max_heart_rate = avg_heart_rate + random.randint(10, 20)
    
    # Timestamp de l'activité (heure aléatoire dans la journée)
    hour = random.randint(6, 22)  # Entre 6h et 22h
    minute = random.randint(0, 59)
    timestamp = date.replace(hour=hour, minute=minute, second=0)
    
    activity = {
        'user_id': user_id,
        'activity_type': activity_type,
        'distance_km': distance_km if distance_km > 0 else None,
        'duration_minutes': duration_minutes,
        'calories_burned': calories_burned,
        'steps': steps if steps > 0 else None,
        'avg_heart_rate': avg_heart_rate,
        'max_heart_rate': max_heart_rate,
        'timestamp': timestamp,
        'notes': None
    }
    
    return activity


def insert_activities(activities):
    """
    Insère les activités avec batching
    """
    if not activities:
        return 0
    
    conn = get_connection()
    cursor = conn.cursor()
    
    insert_query = """
    INSERT INTO activities 
    (user_id, activity_type, distance_km, duration_minutes, calories_burned, 
     steps, avg_heart_rate, max_heart_rate, timestamp, notes)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    batch_data = [
        (
            act['user_id'], act['activity_type'], act['distance_km'],
            act['duration_minutes'], act['calories_burned'], act['steps'],
            act['avg_heart_rate'], act['max_heart_rate'], act['timestamp'], act['notes']
        )
        for act in activities
    ]
    
    cursor.executemany(insert_query, batch_data)
    
    conn.commit()
    count = cursor.rowcount
    cursor.close()
    conn.close()
    
    return count


# Test du module
if __name__ == "__main__":
    print("🏃 Test générateur d'activités")
    print("=" * 60)
    
    # Simule un utilisateur
    test_user = {
        'user_id': 1,
        'weight_kg': 75,
        'activity_profile': 'active'
    }
    
    # Génère des activités pour 7 jours
    activities = generate_activities_for_user(
        user_id=test_user['user_id'],
        user_data=test_user,
        num_days=7
    )
    
    print(f"\n {len(activities)} activités générées pour 7 jours")
    print(f"   Profil : {test_user['activity_profile']}")
    
    # Affiche quelques exemples
    print("\n Exemples d'activités :")
    for i, activity in enumerate(activities[:5], 1):
        print(f"\n   Activité {i}:")
        print(f"      Type     : {activity['activity_type']}")
        print(f"      Durée    : {activity['duration_minutes']} min")
        print(f"      Distance : {activity['distance_km']} km" if activity['distance_km'] else "      Distance : N/A")
        print(f"      Calories : {activity['calories_burned']} kcal")
        print(f"      Steps    : {activity['steps']}" if activity['steps'] else "      Steps    : N/A")
        print(f"      FC moy   : {activity['avg_heart_rate']} bpm")
        print(f"      FC max   : {activity['max_heart_rate']} bpm")
        print(f"      Date     : {activity['timestamp'].strftime('%Y-%m-%d %H:%M')}")
    
    # Statistiques
    print(f"\n Statistiques :")
    types = {}
    for act in activities:
        types[act['activity_type']] = types.get(act['activity_type'], 0) + 1
    
    for activity_type, count in types.items():
        print(f"   {activity_type:12} : {count}")
    
    print("\n" + "=" * 60)
    print("Test réussi !")