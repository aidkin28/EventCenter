"""Expert Council LangGraph - Orchestrates 11 expert reviews in parallel batches."""

import asyncio
import logging
from datetime import datetime
from typing import TypedDict, Annotated, Optional
from operator import add

from langgraph.graph import StateGraph, START, END
from langchain_openai import AzureChatOpenAI

from ..agent.llm import create_llm
from ..experts import EXPERT_DEFINITIONS, ExpertResult, GoalContext, run_expert
from ..schemas.goals import GoalReviewRequest, GoalReviewResponse, ExpertFeedback

logger = logging.getLogger(__name__)

# Expert batches for parallel execution
EXPERT_BATCHES = [
    ["strategist", "motivator", "obstacle_analyst", "progress_tracker"],
    ["skill_advisor", "time_optimizer", "wellness_guide", "accountability"],
    ["resource_planner", "milestone_designer", "success_definer"],
]


class CouncilState(TypedDict):
    """State for the Expert Council graph."""
    goal_id: str
    title: str
    description: str
    target_date: Optional[str]
    llm: Optional[AzureChatOpenAI]  # Shared LLM instance
    expert_results: Annotated[list[ExpertResult], add]
    overall_score: Optional[float]
    summary: Optional[str]


async def orchestrator_node(state: CouncilState) -> dict:
    """Validates input and creates shared LLM instance."""
    logger.info(f"Orchestrator: Starting review for goal '{state['title']}'")

    if not state.get("title") or not state.get("description"):
        raise ValueError("Goal must have both title and description")

    return {"llm": create_llm()}


def create_batch_node(expert_ids: list[str]):
    """Factory function to create a batch node that runs experts in parallel."""

    async def batch_node(state: CouncilState) -> dict:
        llm = state["llm"]
        goal = GoalContext(
            goal_id=state["goal_id"],
            title=state["title"],
            description=state["description"],
            target_date=state.get("target_date"),
        )

        logger.info(f"Running experts in parallel: {expert_ids}")
        tasks = [run_expert(eid, goal, llm) for eid in expert_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_results = []
        for result, expert_id in zip(results, expert_ids):
            if isinstance(result, Exception):
                logger.error(f"Expert {expert_id} failed: {result}")
                valid_results.append(ExpertResult(
                    expert_id=expert_id,
                    expert_name=EXPERT_DEFINITIONS[expert_id]["name"],
                    score=5,
                    feedback="Unable to complete analysis. Please try again.",
                    suggestions=[]
                ))
            else:
                valid_results.append(result)

        return {"expert_results": valid_results}

    return batch_node


async def synthesizer_node(state: CouncilState) -> dict:
    """Combines all expert feedback into a summary."""
    logger.info("Synthesizer: Combining expert feedback")

    results = state.get("expert_results", [])
    if not results:
        return {"overall_score": 5.0, "summary": "No expert feedback available."}

    scores = [r.score for r in results]
    overall_score = sum(scores) / len(scores)

    expert_summaries = "\n".join(
        f"- {r.expert_name}: Score {r.score}/10 - {r.feedback[:200]}..."
        for r in results
    )

    synthesis_prompt = f"""Based on the following expert reviews of a goal, provide a brief, actionable summary.

Goal: {state['title']}
Description: {state['description']}

Expert Reviews:
{expert_summaries}

Overall Score: {overall_score:.1f}/10

Provide a 2-3 paragraph synthesis that:
1. Highlights the key strengths identified by experts
2. Points out the main areas for improvement
3. Gives 2-3 prioritized action items

Be concise and actionable. Focus on what matters most."""

    response = await state["llm"].ainvoke([
        {"role": "system", "content": "You synthesize expert council feedback into actionable summaries."},
        {"role": "user", "content": synthesis_prompt},
    ])

    return {"overall_score": round(overall_score, 1), "summary": response.content}


def create_expert_council_graph():
    """Create the Expert Council StateGraph."""
    graph = StateGraph(CouncilState)

    graph.add_node("orchestrator", orchestrator_node)
    for i, batch in enumerate(EXPERT_BATCHES):
        graph.add_node(f"batch_{i}", create_batch_node(batch))
    graph.add_node("synthesizer", synthesizer_node)

    graph.add_edge(START, "orchestrator")
    graph.add_edge("orchestrator", "batch_0")
    for i in range(len(EXPERT_BATCHES) - 1):
        graph.add_edge(f"batch_{i}", f"batch_{i + 1}")
    graph.add_edge(f"batch_{len(EXPERT_BATCHES) - 1}", "synthesizer")
    graph.add_edge("synthesizer", END)

    return graph.compile()


async def run_expert_council(request: GoalReviewRequest) -> GoalReviewResponse:
    """Run the Expert Council graph on a goal."""
    graph = create_expert_council_graph()

    result = await graph.ainvoke({
        "goal_id": request.goal_id,
        "title": request.title,
        "description": request.description,
        "target_date": request.target_date,
        "llm": None,
        "expert_results": [],
        "overall_score": None,
        "summary": None,
    })

    return GoalReviewResponse(
        goal_id=request.goal_id,
        overall_score=result.get("overall_score", 5.0),
        summary=result.get("summary", ""),
        experts=[
            ExpertFeedback(
                expert_type=r.expert_id,
                expert_name=r.expert_name,
                score=r.score,
                feedback=r.feedback,
                suggestions=r.suggestions,
            )
            for r in result.get("expert_results", [])
        ],
        reviewed_at=datetime.utcnow(),
    )
