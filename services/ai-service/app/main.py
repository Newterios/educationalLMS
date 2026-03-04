import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="EDULMS AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextAnalysisRequest(BaseModel):
    text: str
    language: Optional[str] = "en"


class SuggestionRequest(BaseModel):
    user_id: str
    context: Optional[str] = ""


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/analyze-text")
async def analyze_text(req: TextAnalysisRequest):
    word_count = len(req.text.split())
    char_count = len(req.text)
    return {
        "word_count": word_count,
        "char_count": char_count,
        "language": req.language,
        "analysis": "AI text analysis placeholder - integrate NLP models in Phase 4",
    }


@app.post("/suggest")
async def suggest(req: SuggestionRequest):
    return {
        "user_id": req.user_id,
        "suggestions": [
            {"type": "course", "message_en": "Complete your pending assignments",
             "message_ru": "Завершите ваши задания", "message_kk": "Тапсырмаларыңызды аяқтаңыз"},
            {"type": "study", "message_en": "Review lecture materials for Week 3",
             "message_ru": "Просмотрите материалы лекций за Неделю 3",
             "message_kk": "3-апта лекция материалдарын қараңыз"},
        ],
        "note": "AI suggestions placeholder - integrate ML models in Phase 4",
    }


@app.post("/check-plagiarism")
async def check_plagiarism(req: TextAnalysisRequest):
    return {
        "plagiarism_score": 0.0,
        "is_plagiarized": False,
        "note": "Plagiarism detection placeholder - integrate in Phase 4",
    }


@app.post("/generate-quiz")
async def generate_quiz(req: TextAnalysisRequest):
    return {
        "questions": [
            {
                "type": "mcq",
                "text_en": "Sample generated question based on the provided text",
                "text_ru": "Пример сгенерированного вопроса на основе предоставленного текста",
                "text_kk": "Берілген мәтін негізінде жасалған сұрақ үлгісі",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": 0,
            }
        ],
        "note": "Quiz generation placeholder - integrate LLM in Phase 4",
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8009"))
    uvicorn.run(app, host="0.0.0.0", port=port)
