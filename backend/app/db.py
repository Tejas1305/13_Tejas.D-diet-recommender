import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# The engine, SQLAlchemy's connection to Postgres.
DATABASE_URL = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://", 1)
engine = create_engine(DATABASE_URL)

# session maker each request gets its own short-lived session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Given a request, yield a database session to be used in the request and close it after the request is done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()