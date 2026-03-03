"""Chat-related Pydantic schemas."""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request schema for chat endpoint."""

    message: str = Field(..., min_length=1, description="The user's message")
    thread_id: str = Field(
        default="default",
        description="Conversation thread ID for maintaining context",
    )


class ChatResponse(BaseModel):
    """Response schema for chat endpoint."""

    response: str = Field(..., description="The assistant's response")
    thread_id: str = Field(..., description="The conversation thread ID")


class HealthResponse(BaseModel):
    """Response schema for health check endpoint."""

    status: str = Field(default="ok", description="Health status")
    version: str = Field(default="0.1.0", description="API version")
