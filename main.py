import os

# Store all downloaded AI models inside the project directory
import sys
# If running inside PyArmor or PyInstaller, __file__ might point to a temp dir.
# sys._MEIPASS is used by PyInstaller, but for PyArmor we want the physical root.
base_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
os.environ["HF_HOME"] = os.path.join(base_dir, "models_cache")

from fastapi import FastAPI, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import shutil
import os
from sync import sync_directory, collection

app = FastAPI(title="Locality API")

STORAGE_DIR = os.path.abspath("./storage")
os.makedirs(STORAGE_DIR, exist_ok=True)


# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import threading

# Lazy-loaded LLM pipeline to save startup time
query_pipeline = None
model_status = "not_loaded"  # not_loaded | downloading | ready | error
llm_lock = threading.Lock()

def get_llm():
    global query_pipeline, model_status
    with llm_lock:
        if query_pipeline is None:
            model_status = "downloading"
            print("Loading local LLM (Qwen2.5-0.5B-Instruct)... this may take a moment.")
            try:
                from transformers import pipeline
                query_pipeline = pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct", device=-1)
                model_status = "ready"
                print("LLM loaded!")
            except Exception as e:
                model_status = "error"
                print(f"LLM load error: {e}")
                raise
    return query_pipeline

@app.on_event("startup")
def load_llm_on_startup():
    threading.Thread(target=get_llm, daemon=True).start()

class SyncRequest(BaseModel):
    directory: str

class QueryRequest(BaseModel):
    query: str

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Locality Server is running."}

@app.get("/api/model-status")
def get_model_status():
    return {"status": model_status}

@app.post("/api/sync")
def trigger_sync(background_tasks: BackgroundTasks):
    background_tasks.add_task(sync_directory, STORAGE_DIR)
    return {"status": "sync_started", "directory": STORAGE_DIR}

@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    file_location = os.path.join(STORAGE_DIR, file.filename)
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    
    # Automatically trigger sync after upload
    background_tasks.add_task(sync_directory, STORAGE_DIR)
    return {"status": "success", "filename": file.filename, "message": "File uploaded and syncing."}

@app.get("/api/documents")
def list_documents():
    files = []
    if os.path.exists(STORAGE_DIR):
        files = [f for f in os.listdir(STORAGE_DIR) if os.path.isfile(os.path.join(STORAGE_DIR, f))]
    return {"documents": files}

@app.delete("/api/documents/{filename}")
def delete_document(filename: str, background_tasks: BackgroundTasks):
    file_location = os.path.join(STORAGE_DIR, filename)
    if os.path.exists(file_location):
        try:
            os.remove(file_location)
            # Trigger sync to remove it from ChromaDB and tracker DB
            background_tasks.add_task(sync_directory, STORAGE_DIR)
            return {"status": "success", "message": f"Deleted {filename} and triggering sync"}
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")
    
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="File not found")

@app.post("/api/query")
def query_rag(req: QueryRequest):
    # 1. Retrieve context from ChromaDB
    results = collection.query(query_texts=[req.query], n_results=3)
    
    contexts = []
    sources = []
    if results and results["documents"] and results["documents"][0]:
        contexts = results["documents"][0]
        sources = results.get("metadatas", [[]])[0]
        
    context_str = "\n\n".join(contexts)
    
    prompt = (
        f"Context information is below.\n"
        f"---------------------\n"
        f"{context_str}\n"
        f"---------------------\n"
        f"Given the context information, answer the question: {req.query}"
    )
    
    if not contexts:
        prompt = req.query
        
    # 2. Generate answer using local LLM
    try:
        llm = get_llm()
        messages = [
            {"role": "system", "content": "You are Locality, a privacy-first AI assistant. Use the provided context to answer the user's question accurately. If the context does not contain the answer, say you don't know based on the provided documents."},
            {"role": "user", "content": prompt}
        ]
        
        response = llm(messages, max_new_tokens=300, temperature=0.3)
        answer = response[0]["generated_text"][-1]["content"]
        
        # Deduplicate sources
        unique_sources = list({s.get("source", "Unknown") for s in sources if s})
        
        return {"answer": answer, "sources": list(unique_sources)} # Changed from source_files to unique_sources
    except Exception as e:
        return {"answer": f"Error generating response: {str(e)}", "sources": []}

# --- Serve React Frontend ---
# Mount the dist folder to serve static assets (JS, CSS, images)
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    # Catch-all route to serve the React index.html for any non-API route
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Ignore API routes
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API route not found")
        
        # Serve specific files if requested directly (like vite.svg, etc)
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Fallback to index.html for React Router
        return FileResponse(os.path.join(frontend_dist, "index.html"))
