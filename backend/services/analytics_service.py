"""
Analytics Service
=================
Provides a unified `get_metrics(mode)` function that returns hospital metrics
in the same shape as `dashboard_service.get_live_metrics()` regardless of
whether the caller wants historical (past) or uploaded (current) data.

All other services (forecast, bottleneck, recommendations, etc.) can call
`get_metrics()` with the active mode to stay mode-aware.
"""
from typing import Literal

DataMode = Literal["past", "current"]


def get_metrics(mode: DataMode = "past") -> dict:
    """
    Return hospital metrics for the given data mode.
    Falls back to historical data if uploaded data is unavailable.
    """
    if mode == "current":
        from services.data_ingestion_service import get_current_dataset_metrics
        metrics = get_current_dataset_metrics()
        if metrics is not None:
            return metrics
        # Fall through to historical if no upload exists

    from services.dashboard_service import get_live_metrics
    return get_live_metrics()


def is_current_data_available() -> bool:
    from services.data_ingestion_service import has_uploaded_dataset
    return has_uploaded_dataset()
