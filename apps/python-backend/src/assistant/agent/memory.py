"""Memory management for conversation persistence."""

from langgraph.checkpoint.memory import MemorySaver

# Singleton memory saver instance
# For production, replace with PostgresSaver or RedisSaver
_memory_saver: MemorySaver | None = None


def get_memory_saver() -> MemorySaver:
    """Get or create the singleton memory saver instance."""
    global _memory_saver
    if _memory_saver is None:
        _memory_saver = MemorySaver()
    return _memory_saver
