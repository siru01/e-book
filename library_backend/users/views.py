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


class RequestEmailChangeView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        new_email = request.data.get('new_email', '').lower().strip()
        current_email = request.user.email
        
        if not new_email:
            return Response({'error': 'New email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if new_email == current_email:
            return Response({'error': 'New email must be different from current email.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already taken
        if User.objects.filter(email=new_email).exists():
            return Response({'error': 'This email is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Handle NEW email OTP
        new_otp_record, _ = OTPVerification.objects.get_or_create(email=new_email, purpose='EMAIL_CHANGE')
        if new_otp_record.blocked_until and timezone.now() < new_otp_record.blocked_until:
            return Response({'error': 'Too many attempts on new email. Please try again later.'}, status=status.HTTP_403_FORBIDDEN)
        
        new_otp_code = get_random_string(length=6, allowed_chars='0123456789')
        new_otp_record.otp = new_otp_code
        new_otp_record.attempts = 0
        new_otp_record.save()

        # 2. Handle OLD email OTP
        old_otp_record, _ = OTPVerification.objects.get_or_create(email=current_email, purpose='EMAIL_CHANGE')
        if old_otp_record.blocked_until and timezone.now() < old_otp_record.blocked_until:
            return Response({'error': 'Too many attempts on current email. Please try again later.'}, status=status.HTTP_403_FORBIDDEN)
        
        old_otp_code = get_random_string(length=6, allowed_chars='0123456789')
        old_otp_record.otp = old_otp_code
        old_otp_record.attempts = 0
        old_otp_record.save()

        # Send Emails
        try:
            # Email to NEW address
            html_new = render_to_string('emails/email_change_otp.html', {
                'otp': new_otp_code,
                'email': new_email,
                'name': request.user.full_name or 'there',
                'is_new': True
            })
            send_mail(
                subject='Verify your NEW SHELF email address',
                message=f'Your new email verification code is: {new_otp_code}',
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[new_email],
                html_message=html_new,
                fail_silently=False,
            )

            # Email to OLD address
            html_old = render_to_string('emails/email_change_otp.html', {
                'otp': old_otp_code,
                'email': current_email,
                'name': request.user.full_name or 'there',
                'is_old': True
            })
            send_mail(
                subject='Security Alert: Request to change your SHELF email',
                message=f'Your current email verification code is: {old_otp_code}',
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[current_email],
                html_message=html_old,
                fail_silently=False,
            )
        except Exception as e:
            return Response({'error': f'Failed to send verification emails.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'Verification codes sent to both your current and new email addresses.'})


class ConfirmEmailChangeView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        new_email = request.data.get('new_email', '').lower().strip()
        current_email = request.user.email
        old_otp = request.data.get('old_otp', '').strip()
        new_otp = request.data.get('new_otp', '').strip()
        
        if not new_email or not old_otp or not new_otp:
            return Response({'error': 'New email and both verification codes are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            old_otp_record = OTPVerification.objects.get(email=current_email, purpose='EMAIL_CHANGE')
            new_otp_record = OTPVerification.objects.get(email=new_email, purpose='EMAIL_CHANGE')
        except OTPVerification.DoesNotExist:
            return Response({'error': 'Invalid request session. Please request new codes.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OLD OTP
        if old_otp_record.otp != old_otp:
            old_otp_record.attempts += 1
            old_otp_record.save()
            return Response({'error': 'Incorrect code for your CURRENT email.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify NEW OTP
        if new_otp_record.otp != new_otp:
            new_otp_record.attempts += 1
            new_otp_record.save()
            return Response({'error': 'Incorrect code for your NEW email.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update User Email
        user = request.user
        user.email = new_email
        user.save()
        
        # Cleanup
        old_otp_record.delete()
        new_otp_record.delete()
        
        return Response({'message': 'Email updated successfully. Please log in again.'})