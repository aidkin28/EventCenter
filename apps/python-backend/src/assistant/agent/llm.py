"""Azure OpenAI LLM configuration."""

from langchain_openai import AzureChatOpenAI

from ..config import settings


def create_llm() -> AzureChatOpenAI:
    """Create and configure Azure OpenAI chat model."""
    return AzureChatOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_deployment=settings.azure_openai_deployment,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        temperature=0.7,
    )
