"""
Détecteur d'anomalies de santé
Analyse les données existantes et génère des alertes
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

# Imports locaux
sys.path.append(str(Path(__file__).resolve().parents[2]))
from config.database import get_connection
from config.settings import settings


def detect_all_anomalies():
    """
    Détecte toutes les anomalies pour tous les utilisateurs
    
    Returns:
        list: Liste des anomalies détectées
    """
    print("\n DÉTECTION DES ANOMALIES")
    print("=" * 60)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Récupère tous les users
    cursor.execute("SELECT user_id FROM users")
    user_ids = [row[0] for row in cursor.fetchall()]
    
    print(f" Analyse de {len(user_ids)} utilisateurs...")
    
    all_anomalies = []
    
    for user_id in user_ids:
        anomalies = detect_user_anomalies(user_id, cursor)
        all_anomalies.extend(anomalies)
    
    cursor.close()
    conn.close()
    
    print(f"\n  {len(all_anomalies)} anomalies détectées")
    
    return all_anomalies


def detect_user_anomalies(user_id, cursor):
    """
    Détecte les anomalies pour un utilisateur
    
    Args:
        user_id (int): ID utilisateur
        cursor: Curseur MySQL
        
    Returns:
        list: Anomalies de cet utilisateur
    """
    anomalies = []
    
    # 1. Détection : Fréquence cardiaque au repos élevée
    anomalies.extend(detect_high_resting_hr(user_id, cursor))
    
    # 2. Détection : Fréquence cardiaque au repos basse
    anomalies.extend(detect_low_resting_hr(user_id, cursor))
    
    # 3. Détection : Sommeil insuffisant
    anomalies.extend(detect_insufficient_sleep(user_id, cursor))
    
    # 4. Détection : Sommeil excessif
    anomalies.extend(detect_excessive_sleep(user_id, cursor))
    
    # 5. Détection : Activité physique trop faible
    anomalies.extend(detect_low_activity(user_id, cursor))
    
    return anomalies


def detect_high_resting_hr(user_id, cursor):
    """
    Détecte une fréquence cardiaque au repos élevée
    Seuil : > 100 BPM pendant 2 jours consécutifs
    """
    anomalies = []
    
    # Récupère les FC au repos par jour
    query = """
    SELECT DATE(timestamp) as day, AVG(bpm) as avg_bpm
    FROM heart_rate
    WHERE user_id = %s AND context = 'resting'
    GROUP BY DATE(timestamp)
    ORDER BY day
    """
    
    cursor.execute(query, (user_id,))
    results = cursor.fetchall()
    
    consecutive_days = 0
    first_day = None
    
    for row in results:
        day, avg_bpm = row
        
        if avg_bpm > settings.HIGH_HR_THRESHOLD:
            if consecutive_days == 0:
                first_day = day
            consecutive_days += 1
            
            # Si 2 jours consécutifs
            if consecutive_days >= 2:
                anomaly = {
                    'user_id': user_id,
                    'anomaly_type': 'high_resting_hr',
                    'severity': 'high',
                    'value': round(avg_bpm, 1),
                    'threshold': settings.HIGH_HR_THRESHOLD,
                    'description': f"Fréquence cardiaque au repos élevée ({avg_bpm:.1f} BPM). Moyenne normale : 60-80 BPM. Consultez un médecin si cela persiste.",
                    'detected_at': datetime.now()
                }
                anomalies.append(anomaly)
                consecutive_days = 0  # Reset pour ne pas dupliquer
        else:
            consecutive_days = 0
    
    return anomalies


def detect_low_resting_hr(user_id, cursor):
    """
    Détecte une fréquence cardiaque au repos basse
    Seuil : < 50 BPM pendant 2 jours consécutifs
    """
    anomalies = []
    
    query = """
    SELECT DATE(timestamp) as day, AVG(bpm) as avg_bpm
    FROM heart_rate
    WHERE user_id = %s AND context = 'resting'
    GROUP BY DATE(timestamp)
    ORDER BY day
    """
    
    cursor.execute(query, (user_id,))
    results = cursor.fetchall()
    
    consecutive_days = 0
    
    for row in results:
        day, avg_bpm = row
        
        if avg_bpm < 50:
            consecutive_days += 1
            
            if consecutive_days >= 2:
                anomaly = {
                    'user_id': user_id,
                    'anomaly_type': 'low_resting_hr',
                    'severity': 'medium',
                    'value': round(avg_bpm, 1),
                    'threshold': 50,
                    'description': f"Fréquence cardiaque au repos basse ({avg_bpm:.1f} BPM). Peut indiquer une bradycardie. Consultez un médecin.",
                    'detected_at': datetime.now()
                }
                anomalies.append(anomaly)
                consecutive_days = 0
        else:
            consecutive_days = 0
    
    return anomalies


def detect_insufficient_sleep(user_id, cursor):
    """
    Détecte un sommeil insuffisant
    Seuil : < 6h pendant 3 jours consécutifs
    """
    anomalies = []
    
    query = """
    SELECT sleep_date, total_hours
    FROM sleep_records
    WHERE user_id = %s
    ORDER BY sleep_date
    """
    
    cursor.execute(query, (user_id,))
    results = cursor.fetchall()
    
    consecutive_days = 0
    
    for row in results:
        sleep_date, total_hours = row
        
        if total_hours < settings.LOW_SLEEP_THRESHOLD:
            consecutive_days += 1
            
            if consecutive_days >= 3:
                anomaly = {
                    'user_id': user_id,
                    'anomaly_type': 'insufficient_sleep',
                    'severity': 'medium',
                    'value': round(total_hours, 1),
                    'threshold': settings.LOW_SLEEP_THRESHOLD,
                    'description': f"Sommeil insuffisant ({total_hours:.1f}h). Recommandé : 7-9h. Le manque de sommeil affecte la santé physique et mentale.",
                    'detected_at': datetime.now()
                }
                anomalies.append(anomaly)
                consecutive_days = 0
        else:
            consecutive_days = 0
    
    return anomalies


def detect_excessive_sleep(user_id, cursor):
    """
    Détecte un sommeil excessif
    Seuil : > 10h pendant 3 jours consécutifs
    """
    anomalies = []
    
    query = """
    SELECT sleep_date, total_hours
    FROM sleep_records
    WHERE user_id = %s
    ORDER BY sleep_date
    """
    
    cursor.execute(query, (user_id,))
    results = cursor.fetchall()
    
    consecutive_days = 0
    
    for row in results:
        sleep_date, total_hours = row
        
        if total_hours > 10:
            consecutive_days += 1
            
            if consecutive_days >= 3:
                anomaly = {
                    'user_id': user_id,
                    'anomaly_type': 'excessive_sleep',
                    'severity': 'low',
                    'value': round(total_hours, 1),
                    'threshold': 10.0,
                    'description': f"Sommeil excessif ({total_hours:.1f}h). Un excès de sommeil peut indiquer de la fatigue, dépression ou autres problèmes de santé.",
                    'detected_at': datetime.now()
                }
                anomalies.append(anomaly)
                consecutive_days = 0
        else:
            consecutive_days = 0
    
    return anomalies


def detect_low_activity(user_id, cursor):
    """
    Détecte une activité physique trop faible
    Seuil : < 2000 pas/jour pendant 5 jours consécutifs
    """
    anomalies = []
    
    query = """
    SELECT DATE(timestamp) as day, COALESCE(SUM(steps), 0) as total_steps
    FROM activities
    WHERE user_id = %s
    GROUP BY DATE(timestamp)
    ORDER BY day
    """
    
    cursor.execute(query, (user_id,))
    results = cursor.fetchall()
    
    # Crée un dict des jours avec activité
    activity_days = {row[0]: row[1] for row in results}
    
    # Vérifie aussi les jours SANS activité
    query_dates = """
    SELECT DISTINCT DATE(timestamp) as day
    FROM sleep_records
    WHERE user_id = %s
    ORDER BY day
    """
    cursor.execute(query_dates, (user_id,))
    all_days = [row[0] for row in cursor.fetchall()]
    
    consecutive_days = 0
    
    for day in all_days:
        total_steps = activity_days.get(day, 0)
        
        if total_steps < settings.LOW_ACTIVITY_THRESHOLD:
            consecutive_days += 1
            
            if consecutive_days >= 5:
                anomaly = {
                    'user_id': user_id,
                    'anomaly_type': 'low_activity',
                    'severity': 'low',
                    'value': total_steps,
                    'threshold': settings.LOW_ACTIVITY_THRESHOLD,
                    'description': f"Activité physique faible ({total_steps} pas). Objectif recommandé : 10,000 pas/jour. Augmentez progressivement votre activité.",
                    'detected_at': datetime.now()
                }
                anomalies.append(anomaly)
                consecutive_days = 0
        else:
            consecutive_days = 0
    
    return anomalies


def insert_anomalies(anomalies):
    """
    Insère les anomalies dans MySQL
    
    Args:
        anomalies (list): Liste d'anomalies
        
    Returns:
        int: Nombre d'anomalies insérées
    """
    if not anomalies:
        print("     Aucune anomalie à insérer")
        return 0
    
    conn = get_connection()
    cursor = conn.cursor()
    
    insert_query = """
    INSERT INTO anomalies 
    (user_id, anomaly_type, severity, value, threshold, description, detected_at, resolved, resolved_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    batch_data = [
        (
            anomaly['user_id'], anomaly['anomaly_type'], anomaly['severity'],
            anomaly['value'], anomaly['threshold'], anomaly['description'],
            anomaly['detected_at'], False, None
        )
        for anomaly in anomalies
    ]
    
    cursor.executemany(insert_query, batch_data)
    
    conn.commit()
    count = cursor.rowcount
    cursor.close()
    conn.close()
    
    print(f"    {count} anomalies insérées")
    
    return count


def display_anomaly_stats(anomalies):
    """
    Affiche des statistiques sur les anomalies
    """
    print("\n STATISTIQUES DES ANOMALIES")
    print("=" * 60)
    
    # Par type
    by_type = defaultdict(int)
    for a in anomalies:
        by_type[a['anomaly_type']] += 1
    
    print("\ Par type :")
    for atype, count in sorted(by_type.items(), key=lambda x: x[1], reverse=True):
        print(f"   {atype:25} : {count}")
    
    # Par sévérité
    by_severity = defaultdict(int)
    for a in anomalies:
        by_severity[a['severity']] += 1
    
    print("\n Par sévérité :")
    severity_order = ['critical', 'high', 'medium', 'low']
    for severity in severity_order:
        if severity in by_severity:
            print(f"   {severity:10} : {by_severity[severity]}")
    
    print("=" * 60)


# Exécution principale
if __name__ == "__main__":
    try:
        # Détecte les anomalies
        anomalies = detect_all_anomalies()
        
        # Affiche les stats
        if anomalies:
            display_anomaly_stats(anomalies)
            
            # Demande confirmation
            response = input("\n💾 Insérer ces anomalies dans MySQL ? (o/N) : ")
            if response.lower() == 'o':
                insert_anomalies(anomalies)
                print("\n Anomalies insérées avec succès !")
            else:
                print("\n Insertion annulée")
        else:
            print("\n Aucune anomalie détectée (tous les utilisateurs sont en bonne santé !)")
        
    except Exception as e:
        print(f"\n ERREUR : {e}")
        import traceback
        traceback.print_exc()