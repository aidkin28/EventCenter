"""Callback handlers for agent execution logging."""

import logging
from typing import Any
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import BaseMessage
from langchain_core.outputs import LLMResult

logger = logging.getLogger(__name__)


class LoggingCallbackHandler(BaseCallbackHandler):
    """Callback handler that logs agent execution details."""

    def on_llm_start(
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Log when LLM starts processing."""
        logger.info(f"[LLM Start] Run ID: {run_id}")

    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Log when LLM finishes processing."""
        logger.info(f"[LLM End] Run ID: {run_id}")

    def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Log when a tool starts execution."""
        tool_name = serialized.get("name", "unknown")
        logger.info(f"[Tool Start] {tool_name}: {input_str[:100]}...")

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Log when a tool finishes execution."""
        logger.info(f"[Tool End] Output: {output[:100]}...")

    def on_chat_model_start(
        self,
        serialized: dict[str, Any],
        messages: list[list[BaseMessage]],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Log when chat model starts."""
        logger.debug(f"[Chat Model Start] Messages: {len(messages[0]) if messages else 0}")
