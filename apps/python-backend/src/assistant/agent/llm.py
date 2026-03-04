"""Azure OpenAI LLM configuration."""

from langchain_openai import AzureChatOpenAI

from ..config import settings


def create_llm() -> AzureChatOpenAI:
    """Create full-capability Azure OpenAI model — agentic workflows, complex reasoning."""
    return AzureChatOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_deployment=settings.azure_openai_deployment,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        temperature=0.7,
    )


def create_llm_mini() -> AzureChatOpenAI:
    """Create lighter/faster Azure OpenAI model — classification, simple extraction, tool calls."""
    return AzureChatOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_deployment=settings.azure_openai_deployment_mini,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        temperature=0.7,
    )
