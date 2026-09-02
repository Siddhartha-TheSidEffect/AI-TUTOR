from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import os
from rag import process_and_store_document, get_relevant_context

from llm_engine import generate_adaptive_lesson
from video_engine import generate_avatar_video # Naya import

app = FastAPI(title="AI Teacher Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "success", "message": "Prompt Pirates AI Backend is Live!"}

@app.post("/upload_material")
async def upload_material(file: UploadFile = File(...)):
    upload_dir = "temp_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = f"{upload_dir}/{file.filename}"
    
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
    
    # NAYA STEP: PDF upload hote hi Saumya ka code usko padhkar AI Memory (ChromaDB) mein daal dega
    try:
        chunks_count = process_and_store_document(file_location)
        return {"status": "success", "filename": file.filename, "message": f"File indexed! Created {chunks_count} AI memory chunks."}
    except Exception as e:
        return {"status": "error", "message": f"Failed to process PDF: {str(e)}"}

@app.post("/ask_teacher")
async def ask_teacher(student_query: str = Form(...), level: str = Form("Beginner"), time: str = Form("5 mins")):
    
    # 1. AI Memory Se PDF ka Data Nikalo
    try:
        rag_data = get_relevant_context(student_query)
    except Exception as e:
        print(f"RAG Error: {e}")
        rag_data = "" 
        
    # 2. Text Generation: Variable ka naam ai_generated_json fix kar diya aur rag_data pass kar diya
    ai_generated_json = generate_adaptive_lesson(level, time, student_query, "", rag_data)
    
    # 3. Video Generation (D-ID)
    video_text = ai_generated_json.get("feedback_message", "Hello! Let's start our lesson.")
    real_video_url = generate_avatar_video(video_text)
    
    if not real_video_url:
        real_video_url = "https://www.w3schools.com/html/mov_bbb.mp4"
    
    # 4. Final Response UI ko bhej do
    return {
        "status": "success", 
        "ai_response": ai_generated_json, 
        "video_url": real_video_url       
    }