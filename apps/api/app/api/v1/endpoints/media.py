from pathlib import Path
from uuid import uuid4

import boto3
from botocore.client import Config
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from prisma import Json

from app.core.authz import get_current_user
from app.core.config import get_settings
from app.core.db import db
from app.core.responses import ok

router = APIRouter()
MAX_UPLOAD_BYTES = 1_048_576
ALLOWED_CANDIDATE_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_PROFILE_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


class SignedUploadIn(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int
    visibility: str = "PRIVATE"
    company_id: str | None = None
    purpose: str | None = None
    document_type: str | None = None


async def _presign(payload: SignedUploadIn, user: dict[str, str]) -> dict:
    settings = get_settings()
    if not settings.r2_endpoint or not settings.r2_access_key_id or not settings.r2_secret_access_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="R2 not configured")
    if payload.size_bytes > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Maximum allowed size is 1 MB.",
        )
    if payload.purpose == "candidate_document":
        suffix = Path(payload.filename).suffix.lower()
        mime = payload.mime_type.lower()
        if suffix not in ALLOWED_CANDIDATE_EXTENSIONS or (mime != "application/pdf" and not mime.startswith("image/")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate documents must be PDF or image files only.",
            )
    if payload.purpose == "candidate_profile_photo":
        suffix = Path(payload.filename).suffix.lower()
        mime = payload.mime_type.lower()
        if suffix not in ALLOWED_PROFILE_IMAGE_EXTENSIONS or not mime.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile photo must be an image file only.",
            )

    object_key = f"uploads/{user['id']}/{uuid4()}-{payload.filename}"
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.r2_bucket, "Key": object_key, "ContentType": payload.mime_type},
        ExpiresIn=900,
    )
    data: dict[str, object] = {
        "objectKey": object_key,
        "bucket": settings.r2_bucket,
        "mimeType": payload.mime_type,
        "sizeBytes": payload.size_bytes,
        "ownerUser": {"connect": {"id": user["id"]}},
        "visibility": "PRIVATE" if payload.purpose == "candidate_document" else payload.visibility,
        "metadata": Json(
            {
                "filename": payload.filename,
                "purpose": payload.purpose,
                "document_type": payload.document_type,
            }
        ),
    }
    if payload.company_id:
        data["company"] = {"connect": {"id": payload.company_id}}
    asset = await db.mediaasset.create(data=data)
    return ok(
        {
            "upload_url": url,
            "method": "PUT",
            "headers": {"Content-Type": payload.mime_type},
            "asset": asset.model_dump(mode="json"),
            "public_url": f"{settings.r2_public_url}/{object_key}" if settings.r2_public_url else None,
        }
    )


def _r2_client():
    settings = get_settings()
    if not settings.r2_endpoint or not settings.r2_access_key_id or not settings.r2_secret_access_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="R2 not configured")
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


@router.post("/signed-upload")
async def signed_upload(payload: SignedUploadIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    return await _presign(payload, user)


@router.post("/presign")
async def presign(payload: SignedUploadIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    return await _presign(payload, user)


@router.get("/{asset_id}/signed-url")
async def signed_get_url(
    asset_id: str,
    download: bool = Query(default=False),
    user: dict[str, str] = Depends(get_current_user),
) -> dict:
    asset = await db.mediaasset.find_unique(where={"id": asset_id})
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found")
    if asset.ownerUserId != user["id"] and asset.visibility == "PRIVATE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Media asset access denied")
    s3 = _r2_client()
    params = {"Bucket": asset.bucket or get_settings().r2_bucket, "Key": asset.objectKey}
    if download:
        filename = None
        if isinstance(asset.metadata, dict):
            filename = asset.metadata.get("filename")
        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
    url = s3.generate_presigned_url("get_object", Params=params, ExpiresIn=600)
    return ok({"url": url, "expires_in": 600, "asset_id": asset.id})
