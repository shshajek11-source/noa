import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('aion2.db')
        cursor = conn.cursor()
        
        print("Adding character_image_url...")
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN character_image_url VARCHAR(256)")
            print("Success.")
        except Exception as e:
            print(f"Skipped (maybe exists): {e}")

        print("Adding equipment_data...")
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN equipment_data JSON")
            print("Success.")
        except Exception as e:
            print(f"Skipped (maybe exists): {e}")

        conn.commit()
        conn.close()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
