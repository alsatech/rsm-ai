from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/hidraulica/', include('apps.hidraulica.urls')),
    path('api/v1/pendientes/', include('apps.pendientes.urls')),
    path('api/v1/ganado/', include('apps.ganado.urls')),
    path('api/v1/flota/', include('apps.flota.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
