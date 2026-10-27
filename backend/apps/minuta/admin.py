from django.contrib import admin

from .models import Minuta


@admin.register(Minuta)
class MinutaAdmin(admin.ModelAdmin):
    list_display = ('fecha', 'generada_por', 'created_at')
    list_filter = ('fecha',)
    readonly_fields = ('generada_por', 'created_at', 'updated_at')
