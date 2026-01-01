
import sys
import os

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database import engine
from app.models import Base

def init_db():
    print("Creating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
