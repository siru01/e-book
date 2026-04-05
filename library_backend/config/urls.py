# config/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from users.serializers import CustomTokenObtainPairSerializer
from users.views import RegisterView

# Create custom token view
custom_token_view = TokenObtainPairView.as_view(serializer_class=CustomTokenObtainPairSerializer)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/token/', custom_token_view, name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('transactions.urls')),
    path('api/', include('books.urls')),
    path('api/transactions/', include('transactions.urls')),
]