from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.template.loader import render_to_string
from datetime import timedelta
from .models import OTPVerification, User
from .serializers import RegisterSerializer, SendOTPSerializer


class SendOTPView(generics.GenericAPIView):
    serializer_class = SendOTPSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Check if already registered
        if User.objects.filter(email=email).exists():
            return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record, created = OTPVerification.objects.get_or_create(email=email, purpose='REGISTER')

        # Check blocking
        if otp_record.blocked_until and timezone.now() < otp_record.blocked_until:
            return Response({'error': 'This email is blocked. Please try again after 24 hours.'}, status=status.HTTP_403_FORBIDDEN)

        # Generate OTP
        otp_code = get_random_string(length=6, allowed_chars='0123456789')
        otp_record.otp = otp_code
        otp_record.attempts = 0
        otp_record.blocked_until = None
        otp_record.save()

        # Send Email
        try:
            html_content = render_to_string('emails/otp_email.html', {
                'otp': otp_code,
                'email': email
            })
            send_mail(
                subject='Your Registration OTP for Library',
                message=f'Your One-Time Password is: {otp_code}\n\nThis code is required to complete your registration.',
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                html_message=html_content,
                fail_silently=False,
            )
        except Exception as e:
            return Response({'error': 'Failed to send email. Please check your email configuration.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'OTP sent successfully.'}, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny] 

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = request.data.get('email')
        otp = request.data.get('otp')

        try:
            otp_record = OTPVerification.objects.get(email=email, purpose='REGISTER')
        except OTPVerification.DoesNotExist:
            return Response({'error': 'You must request an OTP first.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if blocked
        if otp_record.blocked_until and timezone.now() < otp_record.blocked_until:
            return Response({'error': 'This email is blocked. Please try again after 24 hours.'}, status=status.HTTP_403_FORBIDDEN)

        # Verify OTP
        if otp_record.otp != otp:
            otp_record.attempts += 1
            if otp_record.attempts >= 3:
                otp_record.blocked_until = timezone.now() + timedelta(hours=24)
                otp_record.otp = "" # clear otp so it cannot be guessed later
                otp_record.save()
                return Response({'error': 'Maximum attempts reached. This email is blocked for 24 hours.'}, status=status.HTTP_403_FORBIDDEN)
            otp_record.save()
            return Response({'error': 'Incorrect OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        # OTP is correct, save user
        user = serializer.save()
        
        # Clean up OTP record
        otp_record.delete()

        # Generate JWT tokens for auto-login
        refresh = RefreshToken.for_user(user)
        
        # Add custom claims to token (matches your login token)
        refresh['role'] = user.role
        refresh['email'] = user.email
        refresh['full_name'] = user.full_name

        return Response({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'phone': user.phone,
                'role': user.role,
            },
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)