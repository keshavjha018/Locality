import os
from sqlalchemy import Column, String, Float, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class DocumentTracker(Base):
    __tablename__ = "document_tracker"
    
    # Absolute path to the file
    path = Column(String, primary_key=True)
    
    # Last modification timestamp
    last_modified = Column(Float, nullable=False)
    
    # Comma-separated list of ChromaDB chunk IDs associated with this file
    chroma_ids = Column(String, nullable=False)

# Create an SQLite database in the current directory
engine = create_engine("sqlite:///locality_tracker.db")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
