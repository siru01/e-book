from django.urls import path
from .views import RegisterView, SendOTPView, RequestEmailChangeView, ConfirmEmailChangeView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('request-email-change/', RequestEmailChangeView.as_view(), name='request-email-change'),
    path('confirm-email-change/', ConfirmEmailChangeView.as_view(), name='confirm-email-change'),
]
