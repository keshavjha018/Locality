import os
import glob
from pypdf import PdfReader
from sqlalchemy.orm import Session
from database import DocumentTracker, SessionLocal

def extract_text_from_txt(filepath: str) -> str:
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        print(f"Error reading txt {filepath}: {e}")
        return ""

def extract_text_from_pdf(filepath: str) -> str:
    try:
        reader = PdfReader(filepath)
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return text
    except Exception as e:
        print(f"Error reading pdf {filepath}: {e}")
        return ""

def process_file(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    if ext in [".txt", ".md", ".csv", ".json"]:
        return extract_text_from_txt(filepath)
    elif ext == ".pdf":
        return extract_text_from_pdf(filepath)
    return ""

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks
