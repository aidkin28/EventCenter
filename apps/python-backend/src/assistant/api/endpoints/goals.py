"""Goals API routes for expert council review and AI revision."""

import logging
from fastapi import APIRouter, HTTPException

from ...schemas.goals import (
    GoalReviewRequest,
    GoalReviewResponse,
    GoalRevisionRequest,
    GoalRevisionResponse,
)
from ...graphs.expert_council import run_expert_council
from ...agent.llm import create_llm
from ...experts import parse_llm_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("/review", response_model=GoalReviewResponse)
async def review_goal(request: GoalReviewRequest) -> GoalReviewResponse:
    """Submit a goal to the Expert Council for review."""
    logger.info(f"Received review request for goal: {request.goal_id}")

    try:
        response = await run_expert_council(request)
        logger.info(f"Review completed for goal {request.goal_id}, score: {response.overall_score}")
        return response
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during goal review: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to complete goal review")


@router.post("/revise", response_model=GoalRevisionResponse)
async def revise_goal(request: GoalRevisionRequest) -> GoalRevisionResponse:
    """Get AI-powered suggestions to improve goal clarity and specificity."""
    logger.info(f"Received revision request for goal: {request.title}")

    try:
        llm = create_llm()

        revision_prompt = f"""You are a goal optimization expert. Analyze this goal and provide an improved version.

Original Goal:
Title: {request.title}
Description: {request.description}

Your task:
1. Improve the title to be more specific and action-oriented
2. Rewrite the description to be clearer, more specific, and measurable
3. List the specific improvements you made
4. Rate the specificity of the revised goal (1-10)

Respond in this exact JSON format:
{{
    "revised_title": "<improved title>",
    "revised_description": "<improved description>",
    "improvements": ["<improvement 1>", "<improvement 2>", ...],
    "specificity_score": <1-10>
}}

Focus on making the goal SMART: Specific, Measurable, Achievable, Relevant, Time-bound.
Respond ONLY with valid JSON."""

        response = await llm.ainvoke([
            {"role": "system", "content": "You are a goal optimization expert. Always respond with valid JSON."},
            {"role": "user", "content": revision_prompt},
        ])

        result = parse_llm_json(response.content)

        return GoalRevisionResponse(
            original_title=request.title,
            original_description=request.description,
            revised_title=result.get("revised_title", request.title),
            revised_description=result.get("revised_description", request.description),
            improvements=result.get("improvements", []),
            specificity_score=max(1, min(10, int(result.get("specificity_score", 5)))),
        )

    except ValueError as e:
        logger.error(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Error during goal revision: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to complete goal revision")
