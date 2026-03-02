"""
Script principal de génération de données
Orchestre la génération complète
"""

import sys
from pathlib import Path
from tqdm import tqdm
from datetime import datetime

# Imports locaux
sys.path.append(str(Path(__file__).resolve().parents[2]))
from config.database import get_connection, test_connection
from config.settings import settings
from scripts.generation.user_generator import generate_users, insert_users
from scripts.generation.activity_generator import generate_activities_for_user, insert_activities
from scripts.generation.sleep_generator import generate_sleep_for_user, insert_sleep_records
from scripts.generation.heart_rate_generator import generate_heart_rate_for_user, insert_heart_rate
from scripts.generation.anomaly_detector import detect_all_anomalies, insert_anomalies

def clear_database():
    """
    Vide toutes les tables pour repartir à zéro
    """
    print("\n  Nettoyage de la base de données...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Désactive les contraintes de clés étrangères temporairement
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    
    # Vide les tables (ordre important à cause des FK)
    tables = ['heart_rate', 'anomalies', 'sleep_records', 'activities', 'users']
    
    for table in tables:
        cursor.execute(f"DELETE FROM {table}")
        print(f"    Table {table} vidée")
    
    # Réactive les contraintes
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("    Base de données nettoyée")


def generate_all_data():
    """
    Génère toutes les données
    """
    print("\n" + "=" * 70)
    print(" GÉNÉRATION DE DONNÉES - HEALTH TRACKING PLATFORM")
    print("=" * 70)
    
    start_time = datetime.now()
    
    # Test connexion
    print("\n🔌 Test de connexion MySQL...")
    if not test_connection():
        print(" Impossible de se connecter à MySQL. Arrêt.")
        return
    
    # Nettoyage
    response = input("\n  Voulez-vous nettoyer la base de données ? (o/N) : ")
    if response.lower() == 'o':
        clear_database()
    
    # ÉTAPE 1 : Générer les utilisateurs
    print(f"\n ÉTAPE 1/4 : Génération de {settings.NUM_USERS} utilisateurs...")
    users = generate_users(settings.NUM_USERS)
    print(f"    {len(users)} utilisateurs générés")
    
    print("    Insertion dans MySQL...")
    user_ids = insert_users(users)
    print(f"    {len(user_ids)} utilisateurs insérés")
    
    # Crée un mapping user_id -> user_data
    user_data_map = {}
    for i, user in enumerate(users):
        user_id = user_ids[i]
        user_data_map[user_id] = {
            'weight_kg': user['weight_kg'],
            'activity_profile': user['activity_profile'],
            'sleep_profile': user['sleep_profile']
        }
    
    # ÉTAPE 2-4 : Générer les données pour chaque utilisateur
    print(f"\n ÉTAPES 2-4 : Génération des données sur {settings.NUM_DAYS} jours...")
    print("   (Activités, Sommeil, Fréquence cardiaque)")
    
    total_activities = 0
    total_sleep = 0
    total_hr = 0
    
    # Barre de progression
    with tqdm(total=len(user_ids), desc="   Progression", unit="user") as pbar:
        for user_id in user_ids:
            user_data = user_data_map[user_id]
            
            # Génère et insère les activités
            activities = generate_activities_for_user(user_id, user_data, settings.NUM_DAYS)
            if activities:
                insert_activities(activities)
                total_activities += len(activities)
            
            # Génère et insère le sommeil
            sleep_records = generate_sleep_for_user(user_id, user_data, settings.NUM_DAYS)
            if sleep_records:
                insert_sleep_records(sleep_records)
                total_sleep += len(sleep_records)
            
            # Génère et insère la fréquence cardiaque
            hr_measurements = generate_heart_rate_for_user(user_id, settings.NUM_DAYS, activities)
            if hr_measurements:
                insert_heart_rate(hr_measurements)
                total_hr += len(hr_measurements)
            
            pbar.update(1)
    
    # ÉTAPE 5 : Détection des anomalies
    print("\n  ETAPE 5/5 : Détection des anomalies...")
    anomalies = detect_all_anomalies()
    
    if anomalies:
        total_anomalies = insert_anomalies(anomalies)
    else:
        total_anomalies = 0
        print("    Aucune anomalie détectée")
    
    # Statistiques finales
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print("\n" + "=" * 70)
    print(" STATISTIQUES FINALES")
    print("=" * 70)
    print(f" Utilisateurs      : {len(user_ids):,}")
    print(f" Activités         : {total_activities:,}")
    print(f" Sommeil           : {total_sleep:,}")
    print(f" Fréquence card.   : {total_hr:,}")
    print(f" Anomalies         : {total_anomalies:,}")
    print(f" TOTAL             : {len(user_ids) + total_activities + total_sleep + total_hr + total_anomalies:,} enregistrements")
    print("=" * 70)
    print(f"  Temps d'exécution : {duration:.2f} secondes")
    print(f" Vitesse           : {(len(user_ids) + total_activities + total_sleep + total_hr) / duration:.0f} enregistrements/sec")
    print("=" * 70)
    print(" GÉNÉRATION TERMINÉE AVEC SUCCÈS !")
    print("=" * 70)
    
    # Vérification finale
    print("\n Vérification dans MySQL...")
    verify_data()


def verify_data():
    """
    Vérifie que les données sont bien dans MySQL
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    tables = ['users', 'activities', 'sleep_records', 'heart_rate', 'anomalies']
    
    print("\n Comptage des enregistrements :")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"   {table:20} : {count:,} enregistrements")
    
    cursor.close()
    conn.close()


if __name__ == "__main__":
    try:
        generate_all_data()
    except KeyboardInterrupt:
        print("\n\n  Génération interrompue par l'utilisateur")
    except Exception as e:
        print(f"\n\n ERREUR : {e}")
        import traceback
        traceback.print_exc()