import logging
import smtplib
from email.message import EmailMessage
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from supabase import create_client
from app.core.config import settings

logger = logging.getLogger("api-service.auth")
router = APIRouter(prefix="/auth", tags=["Auth"])

TEMPORARY_RESET_PASSWORD = "12345678"


class ForgotPasswordRequest(BaseModel):
    email: str


class ForgotPasswordResponse(BaseModel):
    message: str


def _get_admin_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Konfigurasi reset password belum lengkap di server.",
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _extract_users(response):
    if isinstance(response, list):
        return response
    users = getattr(response, "users", None)
    if users is not None:
        return users
    data = getattr(response, "data", None)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("users", [])
    if isinstance(response, dict):
        return response.get("users", response.get("data", []))
    return []


def _get_field(item, key: str, default=None):
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def _send_temporary_password_email(email: str):
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Password berhasil di-reset, tetapi email belum dapat dikirim karena SMTP belum dikonfigurasi "
                "di api-service production."
            ),
        )

    message = EmailMessage()
    message["Subject"] = "Reset Password Sementara SATRIA"
    message["From"] = settings.SMTP_FROM
    message["To"] = email
    message.set_content(
        "\n".join(
            [
                "Halo,",
                "",
                "Permintaan Forgot Password akun SATRIA kamu sudah diproses.",
                "",
                f"Password sementara: {TEMPORARY_RESET_PASSWORD}",
                "",
                "Silakan login menggunakan password sementara tersebut.",
                "Setelah berhasil login, segera ubah password melalui menu Profile > Security & Privacy.",
                "",
                "Jika kamu tidak meminta reset password ini, segera hubungi administrator SATRIA.",
                "",
                "SATRIA Water Quality EWS",
            ]
        )
    )

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USER or settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Temporary password email failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password berhasil di-reset, tetapi email notifikasi gagal dikirim: {exc}",
        )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Temporary local reset flow for SATRIA.
    Valid registered emails are reset to the temporary password 12345678.
    """
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format email tidak valid.",
        )

    admin_client = _get_admin_client()

    try:
        matched_user = None
        for page in range(1, 11):
            response = admin_client.auth.admin.list_users(page=page, per_page=1000)
            users = _extract_users(response)
            if not users:
                break

            for user in users:
                user_email = (_get_field(user, "email", "") or "").lower()
                if user_email == email:
                    matched_user = user
                    break

            if matched_user:
                break

        if not matched_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email tidak ditemukan. Pastikan email sudah terdaftar.",
            )

        user_id = _get_field(matched_user, "id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User ditemukan, tetapi ID Supabase tidak terbaca.",
            )
        admin_client.auth.admin.update_user_by_id(user_id, {"password": TEMPORARY_RESET_PASSWORD})
        _send_temporary_password_email(email)
        return {
            "message": "Password berhasil di-reset. Password sementara 12345678 sudah dikirim ke email kamu."
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Temporary password reset failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reset password gagal diproses: {exc}",
        )
