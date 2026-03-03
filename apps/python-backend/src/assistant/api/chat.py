"""Chat API endpoints."""

import logging
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException

from ..agent import invoke_agent
from ..schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    x_user_id: Annotated[str | None, Header()] = None,
) -> ChatResponse:
    """Process a chat message and return the assistant's response.

    The thread_id can be provided in the request body, or it will be
    constructed from the X-User-Id header if provided.
    """
    try:
        # Use user ID from header if available, otherwise use request thread_id
        thread_id = request.thread_id
        if x_user_id:
            thread_id = f"{x_user_id}-{request.thread_id}"

        logger.info(f"Processing chat request for thread: {thread_id}")

        result = invoke_agent(
            message=request.message,
            thread_id=thread_id,
        )

        return ChatResponse(
            response=result["response"],
            thread_id=result["thread_id"],
        )

    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}",
        )
