"""
Générateur d'utilisateurs fictifs
"""

import random
from faker import Faker
from datetime import datetime
import sys
from pathlib import Path

# Imports locaux
sys.path.append(str(Path(__file__).resolve().parents[2]))
from config.database import get_connection
from scripts.generation.gen_config import ACTIVITY_PROFILES, SLEEP_PROFILES

# Faker en français
fake = Faker('fr_FR')


def generate_users(num_users):
    """
    Génère des utilisateurs fictifs avec profils
    
    Args:
        num_users (int): Nombre d'utilisateurs
        
    Returns:
        list: Liste de dictionnaires utilisateurs
    """
    users = []
    
    # Calcule les probabilités cumulatives pour les profils
    activity_probs = []
    cumulative = 0
    for profile_name, profile_data in ACTIVITY_PROFILES.items():
        cumulative += profile_data['probability']
        activity_probs.append((cumulative, profile_name))
    
    sleep_probs = []
    cumulative = 0
    for profile_name, profile_data in SLEEP_PROFILES.items():
        cumulative += profile_data['probability']
        sleep_probs.append((cumulative, profile_name))
    
    for i in range(num_users):
        # Genre aléatoire
        gender = random.choice(['M', 'F', 'Other'])
        
        # Nom et prénom selon le genre
        if gender == 'M':
            first_name = fake.first_name_male()
            last_name = fake.last_name()
        elif gender == 'F':
            first_name = fake.first_name_female()
            last_name = fake.last_name()
        else:
            first_name = fake.first_name()
            last_name = fake.last_name()
        
        # Username unique
        username = f"{first_name.lower()}.{last_name.lower()}{i}"
        
        # Email unique
        email = f"{username}@{fake.free_email_domain()}"
        
        # Mot de passe hashé (simulé)
        password_hash = fake.sha256()
        
        # Âge (distribution réaliste : plus de gens entre 25-35 ans)
        age = int(random.triangular(18, 70, 30))
        
        # Poids selon le genre
        if gender == 'M':
            weight_kg = round(random.uniform(60, 95), 1)
        elif gender == 'F':
            weight_kg = round(random.uniform(50, 80), 1)
        else:
            weight_kg = round(random.uniform(55, 85), 1)
        
        # Taille selon le genre
        if gender == 'M':
            height_cm = round(random.uniform(165, 190), 1)
        elif gender == 'F':
            height_cm = round(random.uniform(155, 175), 1)
        else:
            height_cm = round(random.uniform(160, 180), 1)
        
        # Assigne un profil d'activité (probabiliste)
        rand = random.random()
        activity_profile = 'moderate'  # Par défaut
        for prob, profile_name in activity_probs:
            if rand <= prob:
                activity_profile = profile_name
                break
        
        # Assigne un profil de sommeil (probabiliste)
        rand = random.random()
        sleep_profile = 'good'  # Par défaut
        for prob, profile_name in sleep_probs:
            if rand <= prob:
                sleep_profile = profile_name
                break
        
        user = {
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'first_name': first_name,
            'last_name': last_name,
            'age': age,
            'gender': gender,
            'weight_kg': weight_kg,
            'height_cm': height_cm,
            'activity_profile': activity_profile,  # Pas dans la BDD, juste pour la génération
            'sleep_profile': sleep_profile,        # Pas dans la BDD, juste pour la génération
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        users.append(user)
    
    return users


def insert_users(users):
    """
    Insère les utilisateurs dans MySQL (ou TiDB) avec batching
    """
    conn = get_connection()
    cursor = conn.cursor()
    user_ids = []
    
    insert_query = """
    INSERT INTO users 
    (username, email, password_hash, first_name, last_name, age, gender, weight_kg, height_cm, created_at, updated_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    # Pour le Cloud, le batching est vital à cause de la latence
    batch_data = [
        (
            user['username'], user['email'], user['password_hash'],
            user['first_name'], user['last_name'], user['age'],
            user['gender'], user['weight_kg'], user['height_cm'],
            user['created_at'], user['updated_at']
        )
        for user in users
    ]
    
    cursor.executemany(insert_query, batch_data)
    
    # Récupération des IDs pour la suite
    cursor.execute("SELECT user_id FROM users ORDER BY user_id DESC LIMIT %s", (len(users),))
    user_ids = [row[0] for row in cursor.fetchall()]
    user_ids.reverse()
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return user_ids


# Test du module
if __name__ == "__main__":
    print("Test générateur d'utilisateurs")
    print("=" * 60)
    
    # Génère 5 users de test
    test_users = generate_users(5)
    
    for i, user in enumerate(test_users, 1):
        print(f"\nUser {i}:")
        print(f"   Username        : {user['username']}")
        print(f"   Email           : {user['email']}")
        print(f"   Nom             : {user['first_name']} {user['last_name']}")
        print(f"   Âge             : {user['age']} ans")
        print(f"   Genre           : {user['gender']}")
        print(f"   Poids           : {user['weight_kg']} kg")
        print(f"   Taille          : {user['height_cm']} cm")
        print(f"   Profil activité : {user['activity_profile']}")
        print(f"   Profil sommeil  : {user['sleep_profile']}")
    
    print("\n" + "=" * 60)
    print("Test réussi !")