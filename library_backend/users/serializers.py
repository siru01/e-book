# users/serializers.py
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, UserSession
from rest_framework_simplejwt.tokens import RefreshToken


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    otp = serializers.CharField(required=True, write_only=True, max_length=6)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'phone', 'role', 'password', 'otp']

    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        # Handle optional phone field
        if 'phone' not in validated_data or validated_data['phone'] is None:
            validated_data['phone'] = ''
        password = validated_data.pop('password')
        otp = validated_data.pop('otp', None)
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        token['full_name'] = user.full_name
        return token

    def validate(self, attrs):
        # Validate with email instead of username
        data = super().validate(attrs)
        
        # --- SINGLE DEVICE LOGIC ---
        refresh = RefreshToken(data['refresh'])
        jti = refresh['jti']
        
        # 1. Deactivate all previous sessions for this user
        UserSession.objects.filter(user=self.user, is_active=True).update(is_active=False)
        
        # 2. Create the new session record
        request = self.context.get('request')
        device_info = "Unknown Device"
        ip_address = None
        
        if request:
            device_info = request.META.get('HTTP_USER_AGENT', 'Unknown Device')
            # Handle potential proxy headers for IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')

        UserSession.objects.create(
            user=self.user,
            jti=jti,
            device_info=device_info,
            ip_address=ip_address,
            is_active=True
        )
        
        return data