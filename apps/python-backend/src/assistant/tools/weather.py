"""Weather tool for getting current weather conditions."""

from langchain_core.tools import tool


@tool
def get_weather(location: str) -> str:
    """Get the current weather for a location.

    Args:
        location: The city or location to get weather for (e.g., "Toronto", "Mississauga")

    Returns:
        Current weather conditions including temperature and description.
    """
    # Mock implementation - replace with real API call (e.g., OpenWeatherMap)
    weather_data = {
        "toronto": {"temp": -5, "condition": "Partly cloudy", "humidity": 65},
        "mississauga": {"temp": -6, "condition": "Light snow", "humidity": 70},
        "hamilton": {"temp": -4, "condition": "Cloudy", "humidity": 68},
        "brampton": {"temp": -5, "condition": "Overcast", "humidity": 67},
        "markham": {"temp": -5, "condition": "Clear", "humidity": 60},
    }

    location_lower = location.lower().strip()
    data = weather_data.get(location_lower, {"temp": -5, "condition": "Unknown", "humidity": 65})

    return (
        f"Weather in {location.title()}: "
        f"{data['temp']}°C, {data['condition']}, "
        f"Humidity: {data['humidity']}%"
    )
