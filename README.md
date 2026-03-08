# Locality 🧠
### Privacy-First Local RAG Intelligence Engine

Locality is a high-performance desktop application that transforms a collection of documents into a searchable, interactive private brain. Unlike traditional AI tools, Locality sits directly on your hardware. It processes, indexes, and reasons through text without a single byte of sensitive information ever leaving your machine.

---

## 🏗️ Architecture

The system is built on Three Core Pillars:

### 1. The Sentinel (Data Ingestion)
Handles PDF, Markdown, CSV, and TXT parsing efficiently, breaking them down into clean semantic chunks.
It uses a highly robust local SQLite database combined with the native file `mtime` to detect instantly if a file was added, changed, or deleted, avoiding redundant processing.

### 2. The Vault (Local Vector Database)
A high-speed mathematical index stored on your disk using **ChromaDB**. Every sentence from your files is converted into a vector, allowing the system to find relevant information in milliseconds based on intent rather than just keywords.

### 3. The Core (LLM Engine)
Uses the incredibly fast **Qwen 2.5 0.5B Instruct** model natively in Python via Hugging Face `transformers` on the CPU, making it universally compatible across different devices.

### System Architecture

```mermaid
graph TB
    subgraph Frontend["🖥️ React + Vite Frontend"]
        UI["Chat Interface"]
        Upload["Upload Zone"]
        DocList["Document List"]
    end

    subgraph Backend["⚙️ FastAPI Backend"]
        API["API Router"]
        Sentinel["The Sentinel\n(Ingestion Engine)"]
        Core["The Core\n(LLM Engine)"]
    end

    subgraph Storage["💾 Local Storage"]
        FS["locality_storage/\n(Raw Files)"]
        Vault["The Vault\n(ChromaDB Vectors)"]
        Tracker["SQLite Tracker\n(File State)"]
        Models["models_cache/\n(Qwen 2.5 + Embeddings)"]
    end

    Upload -- "POST /api/upload" --> API
    UI -- "POST /api/query" --> API
    DocList -- "GET /api/documents" --> API

    API --> Sentinel
    API --> Core

    Sentinel --> FS
    Sentinel --> Tracker
    Sentinel -- "Chunk & Embed" --> Vault

    Core -- "Retrieve Context" --> Vault
    Core -- "Generate Answer" --> Models
```

### Query Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React UI
    participant BE as FastAPI
    participant V as ChromaDB
    participant LLM as Qwen 2.5

    U->>FE: Types a question
    FE->>BE: POST /api/query
    BE->>V: Semantic search (top 3 chunks)
    V-->>BE: Relevant document chunks
    BE->>LLM: Context + Question → Prompt
    LLM-->>BE: Generated answer
    BE-->>FE: Answer + Source filenames
    FE-->>U: Displays answer with citations
```

### Upload & Sync Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React UI
    participant BE as FastAPI
    participant FS as locality_storage
    participant DB as SQLite Tracker
    participant V as ChromaDB

    U->>FE: Drops a PDF file
    FE->>BE: POST /api/upload (multipart)
    BE->>FS: Save copy of file
    BE->>DB: Check file mtime
    alt New or Modified
        BE->>BE: Extract text & chunk
        BE->>V: Store vector embeddings
        BE->>DB: Update tracker record
    end
    BE-->>FE: Success + trigger doc list refresh
    FE->>BE: GET /api/documents
    BE-->>FE: Updated file list
    FE-->>U: Shows file in Knowledge Base
```

---

## ✨ Features
- **UI**: React + Vite frontend.
- **Dynamic File Management**: Sleek drag-and-drop upload zone that automatically copies your documents to an internal `locality_storage` directory and syncs them instantly.
- **Fast Offline AI**: Pre-downloads the LLM and Embedding models completely so that subsequent usages require absolutely **zero internet access**.
- **Real-Time Source Citation:** The AI tells you exactly which document it used to generate the answer.

---

## GUI

![Locality Loading Screen](assets/loading_screen.png)

![Locality Chat Interface](assets/chat_preview.png)

---

## �🚀 How to Run

1. Open the project folder `d:\projects\locality` (or your installation path).
2. Double-click the `start.bat` file.
   - This automatically boots up the FastAPI backend and launching the Vite UI server, opening `http://localhost:5173` in your default browser.
3. **Important First-Run Note:** 
   The *very first time* you start the system, Python will securely download Qwen 2.5 and ONNX Embedding models to your machine's `~/.cache/huggingface/hub` storage. **It saves these locally permanently.** You will *never* have to redownload them again unless you wipe the cache or swap models. It works entirely offline after the initial pull.
4. **Knowledge Base Upload:**
   In the left panel of the UI, click the **Upload Zone** or drag & drop a PDF, Markdown, CSV, or Text file into the box.
5. The app will automatically save a local copy to `locality_storage` and trigger the sync engine.
6. You'll see your tracked documents appear in the **Knowledge Base** list instantly.
7. Start chatting with your data!

---

## 🛠️ Technology Stack
- **Backend:** Python + FastAPI
- **Frontend:** React + Vite (TypeScript, Vanilla CSS)
- **Vector Database:** ChromaDB
- **AI Inference Engine:** Hugging Face `transformers` (PyTorch)
- **Database/Sync State:** SQLite + SQLAlchemy
- **Document Parsing:** PyPDF 
