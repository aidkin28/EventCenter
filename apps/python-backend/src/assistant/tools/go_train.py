"""GO Train schedule tool for Greater Toronto Area transit."""

from langchain_core.tools import tool


@tool
def get_go_train_schedule(station: str, direction: str = "union") -> str:
    """Get upcoming GO Train departures from a station.

    Args:
        station: GO Train station name (e.g., "Port Credit", "Clarkson", "Oakville")
        direction: Direction of travel - "union" (towards Union Station) or "west" (away from Union)

    Returns:
        Next 3 scheduled departures with estimated arrival times.
    """
    # Mock implementation - replace with real GO Transit API
    schedules = {
        "port credit": {
            "union": [
                {"depart": "7:15 AM", "arrive": "7:45 AM", "status": "On Time"},
                {"depart": "7:45 AM", "arrive": "8:15 AM", "status": "On Time"},
                {"depart": "8:15 AM", "arrive": "8:45 AM", "status": "5 min delay"},
            ],
            "west": [
                {"depart": "5:30 PM", "arrive": "6:00 PM", "status": "On Time"},
                {"depart": "6:00 PM", "arrive": "6:30 PM", "status": "On Time"},
                {"depart": "6:30 PM", "arrive": "7:00 PM", "status": "On Time"},
            ],
        },
        "clarkson": {
            "union": [
                {"depart": "7:05 AM", "arrive": "7:45 AM", "status": "On Time"},
                {"depart": "7:35 AM", "arrive": "8:15 AM", "status": "On Time"},
                {"depart": "8:05 AM", "arrive": "8:45 AM", "status": "On Time"},
            ],
            "west": [
                {"depart": "5:40 PM", "arrive": "6:15 PM", "status": "On Time"},
                {"depart": "6:10 PM", "arrive": "6:45 PM", "status": "On Time"},
                {"depart": "6:40 PM", "arrive": "7:15 PM", "status": "On Time"},
            ],
        },
        "oakville": {
            "union": [
                {"depart": "6:50 AM", "arrive": "7:45 AM", "status": "On Time"},
                {"depart": "7:20 AM", "arrive": "8:15 AM", "status": "3 min delay"},
                {"depart": "7:50 AM", "arrive": "8:45 AM", "status": "On Time"},
            ],
            "west": [
                {"depart": "5:50 PM", "arrive": "6:35 PM", "status": "On Time"},
                {"depart": "6:20 PM", "arrive": "7:05 PM", "status": "On Time"},
                {"depart": "6:50 PM", "arrive": "7:35 PM", "status": "On Time"},
            ],
        },
    }

    station_lower = station.lower().strip()
    direction_lower = direction.lower().strip()

    if station_lower not in schedules:
        return f"Station '{station}' not found. Available stations: Port Credit, Clarkson, Oakville"

    trains = schedules[station_lower].get(direction_lower, [])
    if not trains:
        return f"No schedules found for direction '{direction}'. Use 'union' or 'west'."

    direction_name = "Union Station" if direction_lower == "union" else "Westbound"
    result = f"GO Train Schedule from {station.title()} towards {direction_name}:\n"

    for i, train in enumerate(trains, 1):
        result += f"{i}. Departs: {train['depart']} -> Arrives: {train['arrive']} ({train['status']})\n"

    return result.strip()
