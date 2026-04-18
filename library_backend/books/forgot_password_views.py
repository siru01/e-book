import random
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.core.cache import cache
from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()
OTP_TTL = 600  # 10 minutes


def _otp_cache_key(email):
    return f"shelf:pwd_reset:{email.lower().strip()}"


def _generate_otp():
    return str(random.randint(100000, 999999))


# POST /api/auth/forgot-password/
@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password_request(request):
    email = request.data.get("email", "").lower().strip()
    if not email:
        return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()
    if user:
        otp = _generate_otp()
        cache.set(_otp_cache_key(email), otp, timeout=OTP_TTL)
        html_content = render_to_string('emails/password_reset_email.html', {
            'otp': otp,
            'name': user.full_name or 'there'
        })
        send_mail(
            subject="SHELF — Your Password Reset Code",
            message=(
                f"Hi {user.full_name or 'there'},\n\n"
                f"Your password reset code is:\n\n"
                f"  {otp}\n\n"
                f"This code expires in 10 minutes.\n"
                f"If you didn't request this, you can safely ignore this email.\n\n"
                f"— SHELF"
            ),
            from_email=None,  # uses EMAIL_HOST_USER from settings
            recipient_list=[email],
            html_message=html_content,
            fail_silently=False,
        )

    # Always 200 — never reveal whether email exists
    return Response({"detail": "If this email is registered, a reset code has been sent."})


# POST /api/auth/reset-password/
@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    email            = request.data.get("email", "").lower().strip()
    otp              = request.data.get("otp", "").strip()
    new_password     = request.data.get("new_password", "")
    confirm_password = request.data.get("confirm_password", "")

    if not all([email, otp, new_password, confirm_password]):
        return Response({"detail": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({"detail": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

    cached_otp = cache.get(_otp_cache_key(email))
    if not cached_otp or cached_otp != otp:
        return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()
    if not user:
        return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

    user.password = make_password(new_password)
    user.save(update_fields=["password"])
    cache.delete(_otp_cache_key(email))

    return Response({"detail": "Password updated successfully."})