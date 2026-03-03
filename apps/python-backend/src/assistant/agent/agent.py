"""LangGraph agent setup using create_react_agent."""

from typing import Any

from langgraph.prebuilt import create_react_agent
from langgraph.graph.state import CompiledStateGraph

from .llm import create_llm
from .memory import get_memory_saver
from .callbacks import LoggingCallbackHandler
from ..tools import get_weather, get_commute_time, get_go_train_schedule

SYSTEM_PROMPT = """You are a helpful commuter assistant for the Greater Toronto Area (GTA).

You can help users with:
- Current weather conditions in GTA cities
- Commute time estimates between locations
- GO Train schedules and departure times

Be concise and helpful. When providing information, focus on what's most relevant to the user's needs.
If you're unsure about something, say so rather than making up information.
"""

# Singleton agent instance
_agent: CompiledStateGraph | None = None


def create_assistant_agent() -> CompiledStateGraph:
    """Create a new assistant agent with all tools configured."""
    llm = create_llm()
    checkpointer = get_memory_saver()

    tools = [get_weather, get_commute_time, get_go_train_schedule]

    agent = create_react_agent(
        model=llm,
        tools=tools,
        checkpointer=checkpointer,
        prompt=SYSTEM_PROMPT,
    )

    return agent


def get_agent() -> CompiledStateGraph:
    """Get or create the singleton agent instance."""
    global _agent
    if _agent is None:
        _agent = create_assistant_agent()
    return _agent


def invoke_agent(message: str, thread_id: str) -> dict[str, Any]:
    """Invoke the agent with a user message.

    Args:
        message: The user's message to process
        thread_id: Unique identifier for the conversation thread

    Returns:
        Dictionary with response text and thread_id
    """
    agent = get_agent()

    config = {
        "configurable": {"thread_id": thread_id},
        "callbacks": [LoggingCallbackHandler()],
    }

    result = agent.invoke(
        {"messages": [("user", message)]},
        config=config,
    )

    # Extract the last message content
    last_message = result["messages"][-1]
    response_content = (
        last_message.content
        if hasattr(last_message, "content")
        else str(last_message)
    )

    return {
        "response": response_content,
        "thread_id": thread_id,
    }
