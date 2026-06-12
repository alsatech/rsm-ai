from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import CustomTokenObtainPairSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — regresa access, refresh, nombre y rol."""

    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """GET /api/v1/auth/me/ — datos del usuario autenticado."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)
