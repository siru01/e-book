from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrLibrarianOrReadOnly(BasePermission):

    def has_permission(self, request, view):

        # Allow GET, HEAD, OPTIONS for any authenticated user
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated

        # Only ADMIN or LIBRARIAN can modify
        return (
            request.user.is_authenticated and
            request.user.role in ['ADMIN', 'LIBRARIAN']
        )
