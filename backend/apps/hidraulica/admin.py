from django.contrib import admin

from .models import RegistroHidraulico


@admin.register(RegistroHidraulico)
class RegistroHidraulicoAdmin(admin.ModelAdmin):
    list_display = ('punto_medicion', 'estado', 'fecha_hora', 'validado', 'created_by')
    list_filter = ('punto_medicion', 'estado', 'validado')
    date_hierarchy = 'fecha_hora'
