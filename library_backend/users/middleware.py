from django.http import JsonResponse
from rest_framework_simplejwt.tokens import AccessToken
from .models import UserSession

class SessionIntegrityMiddleware:
    """
    Middleware to verify that the JWT's JTI matches an active session in the database.
    This ensures that remote logouts take effect instantly.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if auth_header and auth_header.startswith('Bearer '):
            token_str = auth_header.split(' ')[1]
            try:
                # We use AccessToken to decode the JTI without fully validating the user yet
                # SimpleJWT's Authentication class will do the formal validation later.
                token = AccessToken(token_str)
                jti = token.get('jti')
                user_id = token.get('user_id')
                
                if jti and user_id:
                    # Verify the JTI is still marked as active in our UserSession table
                    is_active = UserSession.objects.filter(
                        user_id=user_id, 
                        jti=jti, 
                        is_active=True
                    ).exists()
                    
                    if not is_active:
                        return JsonResponse({
                            "detail": "This session has been signed out from another device.",
                            "code": "session_terminated"
                        }, status=401)
            except Exception:
                # If token is invalid/expired, let DRF's authentication handle it
                pass

        response = self.get_response(request)
        return response
