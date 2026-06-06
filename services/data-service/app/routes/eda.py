from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.eda import EdaRecordResponse, EdaCountResponse
from app.db import queries

router = APIRouter(prefix="/internal/eda", tags=["EDA Statistics"])

@router.get("/rows", response_model=EdaRecordResponse)
def get_eda_rows(
    limit: int = Query(1000, ge=1, le=5000, description="Max rows of EDA data to return")
):
    """
    Fetch raw water quality records for global EDA display.
    """
    try:
        data = queries.get_eda_rows(limit)
        return {"data": data}
    except queries.DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/count", response_model=EdaCountResponse)
def get_eda_count():
    """
    Get the total row count of the clean water quality dataset.
    """
    try:
        count = queries.get_eda_row_count()
        return {"count": count}
    except queries.DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
