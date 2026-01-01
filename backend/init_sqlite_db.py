
import sys
import os

# Set DATABASE_URL to sqlite for local initialization
os.environ["DATABASE_URL"] = "sqlite:///aion2.db"

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.models import Base, engine

def init_db():
    print(f"Initializing database with URL: {os.environ['DATABASE_URL']}")
    print("Creating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
