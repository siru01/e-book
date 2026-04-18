from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.conf import settings

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.is_active = True
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password):
        user = self.create_user(email, password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.is_verified = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('STUDENT', 'Student'),
        ('LIBRARIAN', 'Librarian'),
        ('ADMIN', 'Admin'),
    )

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


class OTPVerification(models.Model):
    PURPOSE_CHOICES = (
        ('REGISTER', 'Registration'),
        ('LOGOUT_OTHER', 'Logout from other device'),
    )
    email = models.EmailField() # Not unique here, combined in unique_together
    otp = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='REGISTER')
    created_at = models.DateTimeField(auto_now_add=True)
    attempts = models.IntegerField(default=0)
    blocked_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('email', 'purpose')

    def __str__(self):
        return f"OTP for {self.email} ({self.purpose})"


class UserSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='active_sessions')
    jti = models.CharField(max_length=255, unique=True, db_index=True)
    device_info = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.device_info}"
