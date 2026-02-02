"""Updates API routes for parsing user progress updates."""

import logging
from datetime import datetime, timezone
from typing import Dict, List
from fastapi import APIRouter, HTTPException

from ...schemas.goals import (
    UpdateParseRequest,
    UpdateParseResponse,
    ParsedActivity,
    ExtractActivityRequest,
    ExtractActivitiesResponse,
    ExtractedActivityItem,
    ConversationalUpdateRequest,
    ConversationalUpdateResponse,
    ChatMessage,
    VALID_ACTIVITY_TYPES,
    ProposedFollowUp,
    FollowUpConfirmationResult,
)
from ...agent.llm import create_llm
from ...experts import parse_llm_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/updates", tags=["updates"])

# In-memory chat history storage (TODO: move to Redis later)
# Key: session_id, Value: list of ChatMessage dicts
chat_sessions: Dict[str, List[dict]] = {}

# In-memory pending follow-ups storage (TODO: move to Redis later)
# Key: session_id, Value: dict with proposals, activities, and state
pending_follow_ups: Dict[str, dict] = {}


async def analyze_for_follow_ups(
    activities: List[ExtractedActivityItem],
) -> tuple[List[ProposedFollowUp], str]:
    """Analyze extracted activities for potential follow-ups.

    Returns a tuple of (proposed_follow_ups, analysis_summary).
    Only certain activity types warrant follow-ups.
    """
    logger.info(f"[FOLLOW-UP] analyze_for_follow_ups called with {len(activities)} activities")
    for i, act in enumerate(activities):
        logger.info(f"[FOLLOW-UP]   Activity {i}: type={act.activity_type}, summary={act.summary[:50]}...")

    if not activities:
        logger.info("[FOLLOW-UP] No activities provided, returning empty")
        return [], ""

    llm = create_llm()

    # Build activities text for the prompt
    activities_text = "\n".join([
        f"{i}. [{act.activity_type}] {act.summary} (x{act.quantity})"
        for i, act in enumerate(activities)
    ])

    prompt = f"""Analyze these activities for potential follow-up reminders:

{activities_text}

WHEN TO SUGGEST FOLLOW-UPS:

**PROJECT INDICATORS** (High Priority - always suggest follow-ups):
- Starting or planning a large project (keywords: "2.0", "new version", "redesign", "migration", "architecture", "roadmap")
- Multi-phase or multi-week initiatives
- Cross-team or cross-functional work
- Strategic initiatives with stakeholders

**ACTIVITY-SPECIFIC CRITERIA**:
- experiments: Check results, document learnings, plan next steps, share findings
- mentoring: Check mentee progress, schedule next session, follow up on action items
- presentations: Gather audience feedback, share materials, follow up on questions
- product_demos: Follow up on customer interest, gather feedback, track outcomes
- research_learning: Apply learnings to work, share knowledge with team
- general_task: Only if it's part of a larger initiative or has dependencies

**VALUE-MAXIMIZING FOLLOW-UPS**:
- Activities that could benefit from documentation or knowledge sharing
- Work that has downstream dependencies or stakeholders
- Tasks that set up future work (architectural decisions, POCs, research)
- Anything with explicit or implied deadlines

**SMART FOLLOW-UP EXAMPLES**:
- "Started research on Vesta 2.0" → "Review initial findings and define MVP scope" (7 days)
- "Discussed architecture with team" → "Document architecture decisions" (3 days)
- "Completed POC for new feature" → "Schedule stakeholder demo" (5 days)
- "Learning new framework" → "Apply learnings to current project" (7 days)

IMPORTANT RULES:
- Large projects/initiatives SHOULD get follow-ups even if activity seems minor
- Look for implied scope (version numbers, "phase 1", "initial", "exploring")
- Consider the VALUE of following up, not just the activity type
- Maximum 3 follow-ups per update
- Skip truly routine tasks (daily standups, regular meetings without outcomes)

Respond in this exact JSON format:
{{
    "proposed_follow_ups": [
        {{
            "activity_index": <0-based index>,
            "title": "<short, actionable reminder title>",
            "summary": "<1-2 sentences explaining why this follow-up is valuable>",
            "suggested_days": <number of days until follow-up, or null if no specific timing>
        }}
    ],
    "analysis_summary": "<brief 1 sentence explaining your recommendations>"
}}

If no activities warrant follow-ups, return empty proposed_follow_ups array.

Respond ONLY with valid JSON."""

    try:
        response = await llm.ainvoke([
            {"role": "system", "content": "You identify valuable follow-up opportunities from activities. Focus on project-scale work, initiatives with stakeholders, and tasks that would benefit from documentation or follow-through. Be proactive about suggesting follow-ups for large projects even if the current update seems minor."},
            {"role": "user", "content": prompt}
        ])

        logger.info(f"[FOLLOW-UP] LLM response content: {response.content[:500]}...")
        result = parse_llm_json(response.content)
        logger.info(f"[FOLLOW-UP] Parsed result: proposed_follow_ups count = {len(result.get('proposed_follow_ups', []))}")

        follow_ups = []
        for fu in result.get("proposed_follow_ups", []):
            # Validate activity_index is in range
            activity_idx = fu.get("activity_index", -1)
            logger.info(f"[FOLLOW-UP] Processing proposal: activity_index={activity_idx}, title={fu.get('title')}")
            if 0 <= activity_idx < len(activities):
                follow_ups.append(ProposedFollowUp(
                    activity_index=fu["activity_index"],
                    activity_type=activities[activity_idx].activity_type,
                    title=fu.get("title", "Follow-up reminder"),
                    summary=fu.get("summary", ""),
                    suggested_days=fu.get("suggested_days"),
                ))
                logger.info(f"[FOLLOW-UP] Added proposal: {fu.get('title')}")
            else:
                logger.warning(f"[FOLLOW-UP] Skipping proposal - activity_index {activity_idx} out of range (max={len(activities)-1})")

        logger.info(f"[FOLLOW-UP] Returning {len(follow_ups)} proposals, summary: {result.get('analysis_summary', '')[:100]}")
        return follow_ups, result.get("analysis_summary", "")

    except Exception as e:
        logger.error(f"[FOLLOW-UP] Error analyzing for follow-ups: {e}", exc_info=True)
        return [], ""


async def detect_followup_response(
    user_message: str,
    session_id: str,
) -> tuple[bool, List[int], List[int]]:
    """Detect if user's message is responding to follow-up proposals.

    Returns (is_confirmation_response, approved_indices, dismissed_indices).
    """
    logger.info(f"[FOLLOW-UP] detect_followup_response called for session={session_id}, message={user_message[:50]}...")
    pending = pending_follow_ups.get(session_id, {})
    logger.info(f"[FOLLOW-UP] Pending state: awaiting_confirmation={pending.get('awaiting_confirmation')}, proposals_count={len(pending.get('proposals', []))}")
    if not pending.get("awaiting_confirmation") or not pending.get("proposals"):
        logger.info("[FOLLOW-UP] Not awaiting confirmation or no proposals, returning False")
        return False, [], []

    llm = create_llm()
    proposals = pending["proposals"]

    proposals_text = "\n".join([
        f"{i}. {p['title']}: {p['summary']}"
        for i, p in enumerate(proposals)
    ])

    prompt = f"""The user was asked if they want to save these follow-up reminders:
{proposals_text}

User's response: "{user_message}"

Interpret the user's intent. Return JSON:
{{
    "is_confirmation_response": true/false,
    "approved_indices": [<indices of follow-ups user wants to save>],
    "dismissed_indices": [<indices of follow-ups user wants to skip>]
}}

Rules:
- "yes", "save them", "sure", "sounds good", "yes please" → approve ALL indices
- "no", "skip", "not now", "nope", "no thanks" → dismiss ALL indices
- "save the first one", "just 1 and 3", "only the experiment one" → selective approval
- If message is about something completely different (new update, unrelated question) → is_confirmation_response: false

Respond ONLY with valid JSON."""

    try:
        response = await llm.ainvoke([
            {"role": "system", "content": "You interpret user responses to follow-up proposals."},
            {"role": "user", "content": prompt}
        ])

        logger.info(f"[FOLLOW-UP] detect_followup LLM response: {response.content[:300]}...")
        result = parse_llm_json(response.content)
        logger.info(f"[FOLLOW-UP] Parsed result: is_confirmation={result.get('is_confirmation_response')}, approved={result.get('approved_indices')}, dismissed={result.get('dismissed_indices')}")

        if not result.get("is_confirmation_response"):
            logger.info("[FOLLOW-UP] Not a confirmation response, returning False")
            return False, [], []

        approved = result.get("approved_indices", [])
        dismissed = result.get("dismissed_indices", [])

        # Validate indices are in range
        max_idx = len(proposals) - 1
        approved = [i for i in approved if 0 <= i <= max_idx]
        dismissed = [i for i in dismissed if 0 <= i <= max_idx]

        logger.info(f"[FOLLOW-UP] Final result: approved={approved}, dismissed={dismissed}")
        return True, approved, dismissed

    except Exception as e:
        logger.error(f"[FOLLOW-UP] Error detecting follow-up response: {e}", exc_info=True)
        return False, [], []


@router.post("/parse", response_model=UpdateParseResponse)
async def parse_update(request: UpdateParseRequest) -> UpdateParseResponse:
    """Parse a free-form user update into structured activities.

    The AI will analyze the update text and extract:
    - Individual activities (progress, obstacles, milestones, reflections)
    - Overall sentiment
    - Momentum score
    """
    logger.info(f"Received update parse request for goal: {request.goal_id}")

    try:
        llm = create_llm()

        parse_prompt = f"""You are analyzing a user's progress update for their goal. Extract structured information from their free-form text.

User's Update:
"{request.raw_text}"

Your task:
1. Identify individual activities mentioned (progress made, obstacles encountered, milestones reached, reflections)
2. For each activity, note if there's a quantifiable metric
3. Determine the overall sentiment (positive, neutral, or negative)
4. Assign a momentum score from 1-10 (how much forward progress is indicated)
5. Write a brief summary

Respond in this exact JSON format:
{{
    "activities": [
        {{
            "activity_type": "progress|obstacle|milestone|reflection",
            "description": "<what they did or encountered>",
            "metric": {{"value": <number or null>, "unit": "<unit or null>"}}
        }}
    ],
    "sentiment": "positive|neutral|negative",
    "momentum_score": <1-10>,
    "summary": "<brief 1-2 sentence summary>"
}}

Activity types:
- progress: Forward movement, work completed, steps taken
- obstacle: Challenges, blockers, difficulties encountered
- milestone: Significant achievements, checkpoints reached
- reflection: Thoughts, learnings, realizations

Respond ONLY with valid JSON."""

        response = await llm.ainvoke([
            {"role": "system", "content": "You parse user updates into structured data. Always respond with valid JSON."},
            {"role": "user", "content": parse_prompt},
        ])

        result = parse_llm_json(response.content)

        # Convert activities to ParsedActivity objects
        activities = []
        for act in result.get("activities", []):
            activities.append(ParsedActivity(
                activity_type=act.get("activity_type", "progress"),
                description=act.get("description", ""),
                metric=act.get("metric") if act.get("metric", {}).get("value") else None,
            ))

        return UpdateParseResponse(
            goal_id=request.goal_id,
            activities=activities,
            sentiment=result.get("sentiment", "neutral"),
            momentum_score=max(1, min(10, int(result.get("momentum_score", 5)))),
            summary=result.get("summary", "Update received."),
        )

    except ValueError as e:
        logger.error(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Error during update parsing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to parse update")


@router.post("/extract-activities", response_model=ExtractActivitiesResponse)
async def extract_activities(request: ExtractActivityRequest) -> ExtractActivitiesResponse:
    """Extract structured activities from free-form update text.

    The AI will analyze the update text and extract activities into 7 categories:
    - experiments: Research experiments, A/B tests, prototypes
    - product_demos: Product demonstrations, showcases
    - mentoring: Mentoring sessions, coaching, knowledge transfer
    - presentations: Talks, presentations, workshops given
    - volunteering: Volunteer activities, community work
    - general_task: General work tasks, administrative work, meetings
    - research_learning: Learning activities, courses, reading, skill development
    """
    logger.info("Received extract-activities request")

    try:
        llm = create_llm()

        # Get current date in user's timezone for default
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        extract_prompt = f"""You are analyzing a user's daily activity update. Extract structured activities from their free-form text.

User's Update:
"{request.raw_text}"

Today's date: {today}
User timezone: {request.user_timezone}

Your task:
1. Identify activities that fall into these 7 categories:
   - experiments: Research experiments, A/B tests, prototypes, technical explorations
   - product_demos: Product demonstrations, showcases, client demos
   - mentoring: Mentoring sessions, coaching, helping colleagues, knowledge transfer
   - presentations: Talks, presentations, workshops, training sessions given
   - volunteering: Volunteer activities, community work, charitable efforts
   - general_task: General work tasks, administrative work, meetings, planning, coordination
   - research_learning: Learning activities, courses, reading, research, skill development, studying

2. For each activity:
   - Infer quantity from context (e.g., "2 experiments" = 2, "a mentoring session" = 1)
   - Default to 1 if quantity is unclear
   - Use today's date unless explicitly mentioned otherwise
   - Write a brief summary

Respond in this exact JSON format:
{{
    "activities": [
        {{
            "activity_type": "experiments|product_demos|mentoring|presentations|volunteering|general_task|research_learning",
            "quantity": <number>,
            "summary": "<brief description>",
            "activity_date": "<YYYY-MM-DD>"
        }}
    ],
    "raw_summary": "<1-2 sentence summary of what the user did>"
}}

If no relevant activities are found, return an empty activities array with just a raw_summary.

Respond ONLY with valid JSON."""

        response = await llm.ainvoke([
            {"role": "system", "content": "You extract structured activity data from user updates. Always respond with valid JSON."},
            {"role": "user", "content": extract_prompt},
        ])

        result = parse_llm_json(response.content)

        # Convert activities to ExtractedActivityItem objects
        activities = []
        for act in result.get("activities", []):
            activity_type = act.get("activity_type", "").lower()
            # Validate activity type
            if activity_type not in VALID_ACTIVITY_TYPES:
                logger.warning(f"Invalid activity type '{activity_type}' - skipping")
                continue

            activities.append(ExtractedActivityItem(
                activity_type=activity_type,
                quantity=float(act.get("quantity", 1)),
                summary=act.get("summary", ""),
                activity_date=act.get("activity_date", today),
            ))

        return ExtractActivitiesResponse(
            activities=activities,
            raw_summary=result.get("raw_summary", "Update received."),
        )

    except ValueError as e:
        logger.error(f"JSON parsing error in extract-activities: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Error during activity extraction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to extract activities")


@router.post("/chat", response_model=ConversationalUpdateResponse)
async def conversational_update(request: ConversationalUpdateRequest) -> ConversationalUpdateResponse:
    """Handle conversational update extraction with clarification questions.

    This endpoint maintains chat history and will ask clarifying questions
    if the user's update is vague or lacks specificity. It also handles
    follow-up proposal and confirmation flows.
    """
    logger.info(f"Received conversational update for session: {request.session_id}")

    try:
        llm = create_llm()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Get or initialize chat history for this session
        if request.session_id not in chat_sessions:
            chat_sessions[request.session_id] = []

        chat_history = chat_sessions[request.session_id]

        # Check if user is responding to follow-up proposals
        is_followup_response, approved_indices, dismissed_indices = await detect_followup_response(
            request.user_message,
            request.session_id,
        )

        if is_followup_response:
            logger.info(f"[FOLLOW-UP] Processing follow-up confirmation: approved={approved_indices}, dismissed={dismissed_indices}")
            # Handle follow-up confirmation
            pending = pending_follow_ups.get(request.session_id, {})
            proposals = pending.get("proposals", [])
            activities_data = pending.get("activities", [])
            logger.info(f"[FOLLOW-UP] Retrieved pending data: {len(proposals)} proposals, {len(activities_data)} activities")

            # Add user message to history
            chat_history.append({"role": "user", "content": request.user_message})

            # Build confirmation message
            if approved_indices:
                approved_titles = [proposals[i]["title"] for i in approved_indices if i < len(proposals)]
                if len(approved_indices) == len(proposals):
                    confirmation_msg = f"I've saved {len(approved_indices)} follow-up reminder(s). You'll see them in your pending follow-ups sidebar."
                else:
                    confirmation_msg = f"I've saved these follow-up reminders: {', '.join(approved_titles)}. You can find them in your pending follow-ups sidebar."
            else:
                confirmation_msg = "No problem! I've skipped the follow-up reminders. Your activities are still saved."

            chat_history.append({"role": "assistant", "content": confirmation_msg})

            # Clear pending state
            if request.session_id in pending_follow_ups:
                del pending_follow_ups[request.session_id]

            # Reconstruct activities from stored data
            activities = [
                ExtractedActivityItem(**act) for act in activities_data
            ]

            # Reconstruct proposals from stored data (needed by Next.js to save to DB)
            stored_proposals = [
                ProposedFollowUp(**p) for p in proposals
            ]

            # Convert chat history to ChatMessage objects
            chat_messages = [
                ChatMessage(role=msg["role"], content=msg["content"])
                for msg in chat_history
            ]

            logger.info(f"[FOLLOW-UP] Returning confirmation response with {len(activities)} activities, {len(stored_proposals)} proposals, approved_indices={approved_indices}")
            return ConversationalUpdateResponse(
                session_id=request.session_id,
                assistant_message=confirmation_msg,
                needs_clarification=False,
                activities=activities,
                raw_summary=pending.get("raw_summary", ""),
                chat_history=chat_messages,
                proposed_follow_ups=stored_proposals,  # Include proposals so Next.js can save them
                follow_up_analysis_summary="",
                awaiting_followup_confirmation=False,
                followup_confirmation_result=FollowUpConfirmationResult(
                    approved_indices=approved_indices,
                    dismissed_indices=dismissed_indices,
                    session_id=request.session_id,
                ),
            )

        # Normal flow - add user message to history
        chat_history.append({"role": "user", "content": request.user_message})

        # Build the system prompt
        system_prompt = """You are a friendly assistant helping users log their daily activities.

ACTIVITY CATEGORIES:
- experiments: Research experiments, A/B tests, prototypes, technical explorations
- product_demos: Product demonstrations, showcases, client demos
- mentoring: Mentoring sessions, coaching, helping colleagues
- presentations: Talks, presentations, workshops, training sessions
- volunteering: Volunteer activities, community work
- general_task: General work tasks, meetings, planning, coordination
- research_learning: Learning activities, courses, reading, skill development

IMPORTANT - EXTRACT ALL ACTIVITIES:
- A single message may contain MULTIPLE distinct activities
- Extract EACH activity separately (don't combine them)
- Example: "I mentored 2 people and ran an experiment" → 2 separate entries

"SAVE AS IS" OVERRIDE:
If user says "save as is", "done", "submit", "that's all", "no", "nope" → Extract immediately without asking more.

YOUR RESPONSE APPROACH (Three Levels):

LEVEL 1 - VERY VAGUE (e.g., "busy day", "did stuff", "worked on things"):
- Ask for details, clarification, learnings, specifics
- Example: "What activities did you work on? Any experiments, mentoring, presentations? What did you learn or accomplish?"

LEVEL 2 - MODERATELY COMPLETE (describes activities but no learnings, e.g., "worked on system prompt and experimented with gradients"):
- Lead with encouragement, THEN ask ONE soft question
- Example: "Nice work! Anything else you'd like to share about that?"
- If user declines → Extract immediately

LEVEL 3 - COMPLETE WITH DETAILS/LEARNINGS (e.g., "experimented with gradients - learned CSS @property enables angle animation"):
- Do NOT ask any questions
- Extract immediately and confirm
- Example response: "Thanks for sharing! I've extracted 2 activities and saved them."

RESPONSE FORMAT:
- For Level 1-2 follow-ups: 1-2 sentences max, always end with a question
- For Level 3 or after user confirms: Respond ONLY with JSON:
{
    "ready_to_extract": true,
    "activities": [
        {"activity_type": "...", "quantity": N, "summary": "...", "activity_date": "YYYY-MM-DD"}
    ],
    "raw_summary": "Thanks for sharing! I've extracted N activities and saved them."
}

Remember: Be encouraging, not pushy. One question max. Respect user's choice to save."""

        # Build messages for LLM
        messages = [{"role": "system", "content": system_prompt}]

        # Add context about today's date
        messages.append({
            "role": "system",
            "content": f"Today's date is {today}. User timezone: {request.user_timezone}"
        })

        # Add chat history
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Get LLM response
        response = await llm.ainvoke(messages)
        assistant_content = response.content.strip()

        # Add assistant response to history
        chat_history.append({"role": "assistant", "content": assistant_content})

        # Check if response is JSON (ready to extract)
        activities: List[ExtractedActivityItem] = []
        raw_summary = ""
        needs_clarification = True
        proposed_follow_ups: List[ProposedFollowUp] = []
        follow_up_analysis_summary = ""
        awaiting_followup_confirmation = False

        try:
            # Try to parse as JSON
            result = parse_llm_json(assistant_content)
            if result.get("ready_to_extract"):
                needs_clarification = False
                raw_summary = result.get("raw_summary", "Activities logged successfully!")

                for act in result.get("activities", []):
                    activity_type = act.get("activity_type", "").lower()
                    if activity_type in VALID_ACTIVITY_TYPES:
                        activities.append(ExtractedActivityItem(
                            activity_type=activity_type,
                            quantity=float(act.get("quantity", 1)),
                            summary=act.get("summary", ""),
                            activity_date=act.get("activity_date", today),
                        ))

                # Analyze activities for follow-ups
                if activities:
                    logger.info(f"[FOLLOW-UP] Calling analyze_for_follow_ups with {len(activities)} activities")
                    proposed_follow_ups, follow_up_analysis_summary = await analyze_for_follow_ups(activities)
                    logger.info(f"[FOLLOW-UP] analyze_for_follow_ups returned {len(proposed_follow_ups)} proposals")

                    if proposed_follow_ups:
                        # Store pending follow-ups for confirmation
                        pending_follow_ups[request.session_id] = {
                            "proposals": [fu.model_dump() for fu in proposed_follow_ups],
                            "activities": [act.model_dump() for act in activities],
                            "raw_summary": raw_summary,
                            "awaiting_confirmation": True,
                        }
                        logger.info(f"[FOLLOW-UP] Stored pending follow-ups for session {request.session_id}: {len(proposed_follow_ups)} proposals")
                        awaiting_followup_confirmation = True

                        # Build follow-up proposal message
                        follow_up_lines = []
                        for fu in proposed_follow_ups:
                            days_text = f" (in ~{fu.suggested_days} days)" if fu.suggested_days else ""
                            follow_up_lines.append(f"• **{fu.title}**{days_text}: {fu.summary}")

                        follow_up_message = (
                            f"{raw_summary}\n\n"
                            f"I noticed some activities that might benefit from follow-up:\n\n"
                            + "\n".join(follow_up_lines) +
                            "\n\nWould you like me to save these as reminders?"
                        )

                        # Update assistant content and add to history
                        assistant_content = follow_up_message
                        chat_history[-1]["content"] = assistant_content
                    else:
                        # No follow-ups proposed, use the raw_summary
                        assistant_content = raw_summary
                else:
                    # No activities, use the raw_summary
                    assistant_content = raw_summary
        except (ValueError, KeyError):
            # Not JSON, so it's a clarification question - that's fine
            pass

        # Convert chat history to ChatMessage objects
        chat_messages = [
            ChatMessage(role=msg["role"], content=msg["content"])
            for msg in chat_history
        ]

        logger.info(f"[FOLLOW-UP] Final response: needs_clarification={needs_clarification}, activities={len(activities)}, proposed_follow_ups={len(proposed_follow_ups)}, awaiting_confirmation={awaiting_followup_confirmation}")
        return ConversationalUpdateResponse(
            session_id=request.session_id,
            assistant_message=assistant_content,
            needs_clarification=needs_clarification,
            activities=activities,
            raw_summary=raw_summary,
            chat_history=chat_messages,
            proposed_follow_ups=proposed_follow_ups,
            follow_up_analysis_summary=follow_up_analysis_summary,
            awaiting_followup_confirmation=awaiting_followup_confirmation,
            followup_confirmation_result=None,
        )

    except Exception as e:
        logger.error(f"Error in conversational update: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process update")


@router.delete("/chat/{session_id}")
async def clear_chat_session(session_id: str):
    """Clear chat history and pending follow-ups for a session."""
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    if session_id in pending_follow_ups:
        del pending_follow_ups[session_id]
    return {"success": True}
