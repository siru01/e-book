# users/serializers.py
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


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
        return data