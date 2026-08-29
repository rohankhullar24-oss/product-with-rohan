import time
from typing import Dict, List, Any

class InspectionMemoryManager:
    """
    Manages Session Memory across 45-minute car evaluations.
    Connects non-contiguous statements (e.g., Min 3 tyre flag vs Min 35 uneven wear).
    """
    def __init__(self, car_id: str):
        self.car_id = car_id
        self.start_time = time.time()
        self.logged_defects: List[Dict[str, Any]] = []
        self.checklist_state: Dict[str, str] = {
            "engine": "Pending",
            "bodywork": "Pending",
            "undercarriage": "Pending",
            "tyres": "Pending",
            "brakes": "Pending",
            "electronics": "Pending"
        }

    def log_observation(self, turn_minute: int, component: str, description: str, severity: str = "Unconfirmed"):
        entry = {
            "timestamp_min": turn_minute,
            "component": component,
            "description": description,
            "severity": severity
        }
        self.logged_defects.append(entry)
        print(f"[MEMORY LOGGED] Min {turn_minute}: {component} -> {description}")

    def update_previous_observation(self, component: str, updated_description: str, final_severity: str):
        for defect in reversed(self.logged_defects):
            if defect["component"] == component:
                defect["description"] += f" | Update: {updated_description}"
                defect["severity"] = final_severity
                print(f"[MEMORY UPDATED] Min {defect['timestamp_min']} {component} updated to {final_severity}")
                return True
        return False

    def get_context_summary() -> str:
        summary = "Active Session Defects:\n"
        for d in self.logged_defects:
            summary += f"- Min {d['timestamp_min']} [{d['component']}]: {d['description']} ({d['severity']})\n"
        return summary