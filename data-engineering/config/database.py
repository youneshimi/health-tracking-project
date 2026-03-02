"""
Gestion de la connexion MySQL (Version Locale)
"""

import pymysql
from .settings import settings

def get_connection():
    """Crée et retourne une connexion MySQL standard"""
    connection = pymysql.connect(
        host=settings.DB_HOST,
        port=int(settings.DB_PORT),
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        charset='utf8mb4'
    )
    return connection

def test_connection():
    """Teste la connexion MySQL"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f" Connexion MySQL réussie !")
        print(f" Version : {version[0]}")
        
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"\n Tables ({len(tables)}) :")
        for table in tables:
            print(f"   - {table[0]}")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f" Erreur : {e}")
        return False

if __name__ == "__main__":
    print(" Test connexion MySQL")
    print("=" * 60)
    test_connection()