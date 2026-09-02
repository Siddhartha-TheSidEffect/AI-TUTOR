import json
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

def generate_adaptive_lesson(student_level: str, time_available: str, user_query: str, student_input: str = "", rag_context: str = ""):
    
    system_prompt = f"""
    You are an ultra-adaptive, empathetic AI Master Teacher. Output MUST be strictly raw JSON.

    CONTEXT:
    - Level: {student_level}
    - Time Available: {time_available}
    - Topic: {user_query}
    - Student Input/Answer: {student_input}
    - Knowledge Base (RAG): {rag_context}

    INSTRUCTIONS:
    1. Adapt content density: 5 mins = 3 points + 1 simple analogy. 20 mins = Detailed deep dive.
    2. Beginner = No jargon, easy examples. Advanced = Deep technical mechanics.
    3. Misconception Handling: If student answer is incorrect, NEVER scold. Provide a fresh intuitive example to clear the exact confusion.
    4. Generate 1 to 3 conceptual MCQs based on time remaining.
    5. If the user query is just a greeting (like "hello", "hi"), return a welcome message in the "feedback_message" and leave the lesson_body empty.

    OUTPUT JSON FORMAT ONLY:
    {{
      "phase": "LESSON / FEEDBACK",
      "feedback_message": "Warm encouraging text",
      "lesson_body": "Main content",
      "analogy": "Real world analogy",
      "misconception_detected": false,
      "mcqs": [
        {{
          "question": "...",
          "options": ["A", "B", "C", "D"],
          "answer": "A",
          "explanation": "..."
        }}
      ]
    }}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-3.1-pro-preview',
            contents=system_prompt,
        )
        
        # Pro-Tip Hack: Gemini kabhi-kabhi markdown text bhej deta hai, usko clean karna zaroori hai
        clean_json_str = response.text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(clean_json_str) # Yeh string ko perfect Python Dictionary bana dega
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Error aane par bhi API crash na ho, isliye fallback JSON bhej rahe hain
        return {
            "phase": "ERROR",
            "feedback_message": "Sorry, I am taking a quick break. Let's try again in a minute!",
            "lesson_body": "",
            "analogy": "",
            "misconception_detected": False,
            "mcqs": []
        }