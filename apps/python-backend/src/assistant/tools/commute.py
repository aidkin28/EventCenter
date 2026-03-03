"""Commute time tool for estimating travel times."""

from langchain_core.tools import tool


@tool
def get_commute_time(origin: str, destination: str, mode: str = "driving") -> str:
    """Get estimated commute time between two locations.

    Args:
        origin: Starting location (e.g., "Mississauga", "Union Station")
        destination: Ending location (e.g., "Downtown Toronto", "Scarborough")
        mode: Transportation mode - "driving", "transit", or "walking"

    Returns:
        Estimated travel time and distance.
    """
    # Mock implementation - replace with real API call (e.g., Google Maps Directions API)
    commute_data = {
        ("mississauga", "downtown toronto"): {
            "driving": {"time": "35-55 min", "distance": "28 km"},
            "transit": {"time": "55-75 min", "distance": "30 km"},
            "walking": {"time": "5h 30min", "distance": "28 km"},
        },
        ("brampton", "downtown toronto"): {
            "driving": {"time": "40-65 min", "distance": "35 km"},
            "transit": {"time": "65-90 min", "distance": "38 km"},
            "walking": {"time": "7h", "distance": "35 km"},
        },
        ("markham", "downtown toronto"): {
            "driving": {"time": "30-50 min", "distance": "25 km"},
            "transit": {"time": "45-65 min", "distance": "27 km"},
            "walking": {"time": "5h", "distance": "25 km"},
        },
    }

    origin_lower = origin.lower().strip()
    dest_lower = destination.lower().strip()
    mode_lower = mode.lower().strip()

    # Try to find matching route
    route_key = (origin_lower, dest_lower)
    if route_key in commute_data:
        data = commute_data[route_key].get(
            mode_lower, {"time": "Unknown", "distance": "Unknown"}
        )
    else:
        # Default response for unknown routes
        data = {"time": "30-60 min", "distance": "25 km"}

    return (
        f"Commute from {origin.title()} to {destination.title()} by {mode}: "
        f"Estimated time: {data['time']}, Distance: {data['distance']}"
    )
