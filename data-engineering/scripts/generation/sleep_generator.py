"""
Générateur d'enregistrements de sommeil
"""

import random
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Imports locaux
sys.path.append(str(Path(__file__).resolve().parents[2]))
from config.database import get_connection
from scripts.generation.gen_config import (
    SLEEP_PROFILES,
    SLEEP_PHASES,
    START_DATE,
    NUM_DAYS
)


def generate_sleep_for_user(user_id, user_data, num_days):
    """
    Génère des enregistrements de sommeil pour un utilisateur
    
    Args:
        user_id (int): ID de l'utilisateur
        user_data (dict): Données utilisateur (sleep_profile)
        num_days (int): Nombre de jours
        
    Returns:
        list: Liste d'enregistrements de sommeil
    """
    sleep_records = []
    profile = SLEEP_PROFILES[user_data['sleep_profile']]
    
    for day in range(num_days):
        sleep_date = START_DATE + timedelta(days=day)
        
        # Génère un enregistrement de sommeil
        sleep_record = generate_single_sleep(user_id, profile, sleep_date)
        sleep_records.append(sleep_record)
    
    return sleep_records


def generate_single_sleep(user_id, profile, date):
    """
    Génère un enregistrement de sommeil unique
    
    Args:
        user_id (int): ID utilisateur
        profile (dict): Profil de sommeil
        date (datetime): Date du sommeil
        
    Returns:
        dict: Enregistrement de sommeil
    """
    # Heures totales de sommeil
    total_min, total_max = profile['total_hours']
    total_hours = round(random.uniform(total_min, total_max), 2)
    
    # Calcule les phases de sommeil (en heures)
    deep_min, deep_max = SLEEP_PHASES['deep_percent']
    deep_percent = random.uniform(deep_min, deep_max)
    deep_sleep_hours = round(total_hours * deep_percent, 2)
    
    rem_min, rem_max = SLEEP_PHASES['rem_percent']
    rem_percent = random.uniform(rem_min, rem_max)
    rem_sleep_hours = round(total_hours * rem_percent, 2)
    
    # Le reste est du sommeil léger
    light_sleep_hours = round(total_hours - deep_sleep_hours - rem_sleep_hours, 2)
    
    # Assure que light >= 0
    if light_sleep_hours < 0:
        light_sleep_hours = 0.1
    
    # Nombre de réveils
    awakenings_min, awakenings_max = profile['awakenings']
    awakenings = random.randint(awakenings_min, awakenings_max)
    
    # Score de qualité
    quality_min, quality_max = profile['quality_score']
    quality_score = random.randint(quality_min, quality_max)
    
    # Ajuste le score selon les réveils (plus de réveils = score plus bas)
    quality_score -= awakenings * 2
    quality_score = max(0, min(100, quality_score))  # Entre 0 et 100
    
    # Timestamp (enregistré le matin au réveil)
    wake_hour = random.randint(6, 9)  # Réveil entre 6h et 9h
    wake_minute = random.randint(0, 59)
    timestamp = date.replace(hour=wake_hour, minute=wake_minute, second=0)
    
    sleep_record = {
        'user_id': user_id,
        'sleep_date': date.date(),
        'total_hours': total_hours,
        'deep_sleep_hours': deep_sleep_hours,
        'light_sleep_hours': light_sleep_hours,
        'rem_sleep_hours': rem_sleep_hours,
        'awakenings': awakenings,
        'quality_score': quality_score,
        'timestamp': timestamp,
        'notes': None
    }
    
    return sleep_record


def insert_sleep_records(sleep_records):
    """
    Insère les enregistrements de sommeil dans MySQL
    
    Args:
        sleep_records (list): Liste d'enregistrements
        
    Returns:
        int: Nombre d'enregistrements insérés
    """
    if not sleep_records:
        return 0
    
    conn = get_connection()
    cursor = conn.cursor()
    
    insert_query = """
    INSERT INTO sleep_records 
    (user_id, sleep_date, total_hours, deep_sleep_hours, light_sleep_hours, 
     rem_sleep_hours, awakenings, quality_score, timestamp, notes)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    batch_data = [
        (
            record['user_id'], record['sleep_date'], record['total_hours'],
            record['deep_sleep_hours'], record['light_sleep_hours'],
            record['rem_sleep_hours'], record['awakenings'],
            record['quality_score'], record['timestamp'], record['notes']
        )
        for record in sleep_records
    ]
    
    cursor.executemany(insert_query, batch_data)
    
    conn.commit()
    count = cursor.rowcount
    cursor.close()
    conn.close()
    
    return count


# Test du module
if __name__ == "__main__":
    print(" Test générateur de sommeil")
    print("=" * 60)
    
    # Simule un utilisateur
    test_user = {
        'user_id': 1,
        'sleep_profile': 'good'
    }
    
    # Génère du sommeil pour 7 jours
    sleep_records = generate_sleep_for_user(
        user_id=test_user['user_id'],
        user_data=test_user,
        num_days=7
    )
    
    print(f"\n {len(sleep_records)} nuits générées")
    print(f"   Profil : {test_user['sleep_profile']}")
    
    # Affiche quelques exemples
    print("\n🔍 Exemples de nuits :")
    for i, record in enumerate(sleep_records[:5], 1):
        print(f"\n   Nuit {i} ({record['sleep_date']}):")
        print(f"      Total        : {record['total_hours']:.2f}h")
        print(f"      Profond      : {record['deep_sleep_hours']:.2f}h ({record['deep_sleep_hours']/record['total_hours']*100:.1f}%)")
        print(f"      REM          : {record['rem_sleep_hours']:.2f}h ({record['rem_sleep_hours']/record['total_hours']*100:.1f}%)")
        print(f"      Léger        : {record['light_sleep_hours']:.2f}h ({record['light_sleep_hours']/record['total_hours']*100:.1f}%)")
        print(f"      Réveils      : {record['awakenings']}")
        print(f"      Score        : {record['quality_score']}/100")
    
    # Statistiques
    avg_total = sum(r['total_hours'] for r in sleep_records) / len(sleep_records)
    avg_quality = sum(r['quality_score'] for r in sleep_records) / len(sleep_records)
    avg_awakenings = sum(r['awakenings'] for r in sleep_records) / len(sleep_records)
    
    print(f"\n Statistiques (7 jours) :")
    print(f"   Sommeil moyen    : {avg_total:.2f}h")
    print(f"   Qualité moyenne  : {avg_quality:.1f}/100")
    print(f"   Réveils moyens   : {avg_awakenings:.1f}")
    
    print("\n" + "=" * 60)
    print(" Test réussi !")