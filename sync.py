import os
import sys

base_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
os.environ["SENTENCE_TRANSFORMERS_HOME"] = os.path.join(base_dir, "models_cache")
import chromadb
from chromadb.utils import embedding_functions
from database import SessionLocal, DocumentTracker
from ingestion import process_file, chunk_text

# Use sentence-transformers for embeddings (avoids broken ONNX runtime on Windows)
ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Initialize ChromaDB locally
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="locality_docs",
    embedding_function=ef
)

def sync_directory(directory_path: str):
    session = SessionLocal()
    
    # 1. Scan directory for valid files
    valid_exts = [".txt", ".md", ".pdf", ".csv", ".json"]
    current_files = {}
    for root, _, files in os.walk(directory_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in valid_exts:
                full_path = os.path.abspath(os.path.join(root, file))
                current_files[full_path] = os.path.getmtime(full_path)
    
    # 2. Get existing tracked files
    tracked_docs = session.query(DocumentTracker).all()
    tracked_dict = {doc.path: doc for doc in tracked_docs}
    
    # 3. Handle Deletions (files in DB but not on disk)
    for path, doc in tracked_dict.items():
        if path not in current_files:
            print(f"File removed: {path}")
            # delete from chromadb
            chunk_ids = doc.chroma_ids.split(",")
            if chunk_ids and chunk_ids[0]:
                try:
                    collection.delete(ids=chunk_ids)
                except Exception as e:
                    print(f"Error deleting from chroma: {e}")
            # delete from sqlite
            session.delete(doc)
    session.commit()
    
    # 4. Handle Additions and Modifications
    for path, mtime in current_files.items():
        doc = tracked_dict.get(path)
        # If new or modified
        if not doc or doc.last_modified < mtime:
            print(f"Processing: {path}")
            text = process_file(path)
            if not text.strip():
                continue
                
            chunks = chunk_text(text)
            if not chunks:
                continue
            
            # If it's a modification, delete old chunks first
            if doc:
                old_chunk_ids = doc.chroma_ids.split(",")
                if old_chunk_ids and old_chunk_ids[0]:
                    try:
                        collection.delete(ids=old_chunk_ids)
                    except Exception:
                        pass
                session.delete(doc)
                session.commit()
            
            # Add to ChromaDB
            new_chunk_ids = [f"{path}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [{"source": path, "chunk": i} for i in range(len(chunks))]
            
            # Add documents. ChromaDB's default embedding function runs locally.
            collection.add(
                documents=chunks,
                metadatas=metadatas,
                ids=new_chunk_ids
            )
            
            # Add to SQLite
            new_doc = DocumentTracker(
                path=path,
                last_modified=mtime,
                chroma_ids=",".join(new_chunk_ids)
            )
            session.add(new_doc)
            session.commit()
            
    print("Sync complete.")
    session.close()

if __name__ == "__main__":
    # Test sync
    if not os.path.exists("./my_docs"):
        os.makedirs("./my_docs")
    sync_directory(os.path.abspath("./my_docs"))
