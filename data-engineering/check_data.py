import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def check_data():
    try:
        conn = pymysql.connect(
            host='localhost',
            port=4005,
            user='root',
            password='',
            database='health_db'
        )
        
        with conn.cursor() as cursor:
            tables = ['users', 'activities', 'heart_rate', 'sleep_records', 'anomalies']
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"Table {table}: {count} lignes")
                
    except Exception as e:
        print(f"Erreur : {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_data()
