import os
import pdfplumber
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings 

load_dotenv()

DB_DIR = "./chroma_db"
os.makedirs(DB_DIR, exist_ok=True)


embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def extract_text_from_pdf(pdf_path: str) -> str:
    extracted_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                extracted_text += f"\n[Page {page_num + 1}]\n" + text
    return extracted_text

def process_and_store_document(file_path: str, collection_name: str = "course_material") -> int:
    raw_text = extract_text_from_pdf(file_path)
    
    if not raw_text.strip():
        raise ValueError("Failed to extract text from the PDF, or the PDF is an image-based scan.")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = text_splitter.split_text(raw_text)
    docs = [Document(page_content=chunk, metadata={"source": os.path.basename(file_path)}) for chunk in chunks]

    vector_store = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=DB_DIR
    )
    
    vector_store.add_documents(docs)
    return len(docs)

def get_relevant_context(query: str, collection_name: str = "course_material", top_k: int = 3) -> str:
    vector_store = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=DB_DIR
    )
    
    results = vector_store.similarity_search(query, k=top_k)
    context = "\n\n---\n\n".join([doc.page_content for doc in results])
    return context