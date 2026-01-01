from app.database import engine, Base
from sqlalchemy import text

def add_columns():
    with engine.connect() as conn:
        try:
            # Check if columns exist (simple approach for SQLite/Postgres hybrid)
            # For SQLite, we just try to add and ignore error if exists? 
            # Or assume they don't exist since we just added to model.
            
            print("Adding character_image_url column...")
            try:
                conn.execute(text("ALTER TABLE characters ADD COLUMN character_image_url VARCHAR(256)"))
            except Exception as e:
                print(f"Skipping character_image_url (might exist): {e}")

            print("Adding equipment_data column...")
            try:
                # SQLite doesn't strictly enforce JSON type, TEXT is fine. Postgres uses JSONB/JSON.
                # SQLAlchemy JSON type maps to appropriate backend type.
                # In raw SQL, we just say JSON for Postgres or TEXT for SQLite.
                # Assuming SQLite for local dev based on context, or Postgres.
                # Let's try generous type.
                if "sqlite" in str(engine.url):
                    conn.execute(text("ALTER TABLE characters ADD COLUMN equipment_data JSON"))
                else:
                    conn.execute(text("ALTER TABLE characters ADD COLUMN equipment_data JSONB"))
            except Exception as e:
                print(f"Skipping equipment_data (might exist): {e}")
                
            conn.commit()
            print("Migration completed.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    add_columns()
