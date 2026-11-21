import json
import os
from typing import Any, Dict, List

from google import genai
from google.genai import types

MODEL_NAME = "gemini-4-hydrogen"


class BigOJudgeError(RuntimeError):
    """Raised when Gemini API cannot evaluate a submission."""


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise BigOJudgeError("GEMINI_API_KEY environment variable is not configured.")
    return genai.Client(api_key=api_key)


def parse_big_o_rank(notation: str) -> int:
    """Strictly orders Big-O classes from O(1) (best) to O(n!) (worst)."""
    norm = (
        (notation or "")
        .lower()
        .replace(" ", "")
        .removeprefix("o(")
        .removesuffix(")")
        .replace("*", "")
    )
    if norm in {"1", "constant", "k", "c"}:
        return 10
    if "logn" == norm or "logv" == norm:
        return 20
    if norm in {"n", "v+e", "n+m", "n+k"}:
        return 30
    if "nlogn" in norm or "(v+e)logv" in norm or "elogv" in norm:
        return 40
    if "n^2" in norm or "n²" in norm or "v^2" in norm or "ve" in norm:
        return 50
    if "n^3" in norm or "n³" in norm:
        return 60
    if "2^n" in norm:
        return 70
    if "n!" in norm:
        return 80
    return 90


# (a) Pre-Match Topic Quick Notes Generator
def generate_quick_notes(problem_meta: Dict[str, Any]) -> Dict[str, Any]:
    client = _get_client()
    prompt = (
        f"Generate a 10-second Pre-Match Briefing Quick Notes card for Tech-Leveling.\n"
        f"Problem: {problem_meta['problem_title']} ({problem_meta['tier']})\n"
        f"Topic: {problem_meta['problem_topic']}\n"
        f"Target Complexity: Time {problem_meta['target_time_complexity']}, "
        f"Space {problem_meta['target_space_complexity']}\n"
        "Return strict JSON with keys: topicTitle, corePattern, targetComplexity, "
        "keyConcepts (3 items), mentalChecklist (3 items), watchOut.\n"
        "NEVER include source code or direct solution implementations."
    )

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are an algorithmic esports coach. Provide crisp, conceptual "
                "pre-match notes without any code snippets."
            ),
            response_mime_type="application/json",
        ),
    )
    return json.loads(response.text)


# (b) Strict Big-O Code Judge
def evaluate_big_o_submission(
    problem_meta: Dict[str, Any], language: str, code: str
) -> Dict[str, Any]:
    if not code.strip():
        return {
            "isCorrect": False,
            "timeComplexity": "O(n!)",
            "spaceComplexity": "O(n!)",
            "correctnessSummary": "Empty submission rejected.",
            "complexityReasoning": "No implementation submitted.",
            "edgeCaseNotes": "Write a complete solution before submitting.",
            "detectedIssues": ["Empty code body"],
        }

    client = _get_client()
    prompt = (
        f"Evaluate this {language.upper()} competitive programming submission.\n"
        f"Problem: {problem_meta['problem_title']} — Topic: {problem_meta['problem_topic']}\n"
        f"Optimal Target: Time {problem_meta['target_time_complexity']}, "
        f"Space {problem_meta['target_space_complexity']}\n"
        f"--- CODE ---\n{code}\n--- END CODE ---\n"
        "Return strict JSON with keys: isCorrect (bool), timeComplexity (string), "
        "spaceComplexity (string), correctnessSummary (string), complexityReasoning (string), "
        "edgeCaseNotes (string), detectedIssues (list of strings). "
        "Do NOT return corrected code."
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are a strict Big-O algorithmic judge. Mark isCorrect=True ONLY if "
                    "the code accurately solves the problem. Speed is never judged by you—only "
                    "functional correctness and worst-case O(Time) and O(Space)."
                ),
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)
    except Exception as exc:
        raise BigOJudgeError(f"Gemini Big-O evaluation failed: {exc}") from exc


# (c) Interactive AI Mentor Chatbot (STRICTLY NO DIRECT CODE SOLUTIONS)
def generate_mentor_response(
    problem_meta: Dict[str, Any],
    language: str,
    user_code: str,
    evaluation: Dict[str, Any] | None,
    history: List[Dict[str, str]],
    user_question: str,
) -> Dict[str, Any]:
    client = _get_client()
    formatted_history = "\n".join(
        f"{msg['role'].upper()}: {msg['content']}" for msg in history[-8:]
    )
    prompt = (
        f"Problem: {problem_meta['problem_title']} ({problem_meta['problem_topic']})\n"
        f"Target Complexity: {problem_meta['target_time_complexity']} Time / "
        f"{problem_meta['target_space_complexity']} Space\n"
        f"Language: {language.upper()}\n"
        f"Student Code:\n{user_code or '(none)'}\n"
        f"Judge Evaluation: {json.dumps(evaluation or {})}\n"
        f"History:\n{formatted_history}\n"
        f"Student Question: {user_question}\n"
        "Return strict JSON with keys: reply, conceptNudge, pitfallAlert."
    )

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are the Tech-Leveling Socratic AI Mentor. CRITICAL RULE: NEVER give "
                "the direct code solution, full function, or copy-pasteable implementation. "
                "Always guide with a Concept Nudge (algorithmic intuition) and a Pitfall Alert "
                "(language-specific memory, overflow, or edge-case traps)."
            ),
            response_mime_type="application/json",
        ),
    )
    return json.loads(response.text)
