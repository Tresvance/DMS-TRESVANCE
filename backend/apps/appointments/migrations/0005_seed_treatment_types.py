# Generated manually
from django.db import migrations

def seed_treatment_types(apps, schema_editor):
    TreatmentType = apps.get_model('appointments', 'TreatmentType')
    
    defaults = [
        {'name': 'Initial consultation', 'duration_minutes': 45, 'color_code': '#3B82F6'},
        {'name': 'Routine check-up & cleaning', 'duration_minutes': 30, 'color_code': '#10B981'},
        {'name': 'Root canal treatment', 'duration_minutes': 60, 'color_code': '#EF4444'},
        {'name': 'Tooth extraction', 'duration_minutes': 45, 'color_code': '#F59E0B'},
        {'name': 'Orthodontic consultation', 'duration_minutes': 30, 'color_code': '#8B5CF6'},
        {'name': 'Cosmetic procedures', 'duration_minutes': 60, 'color_code': '#EC4899'},
        {'name': 'Emergency appointment', 'duration_minutes': 30, 'color_code': '#DC2626'},
        {'name': 'Follow-up visit', 'duration_minutes': 15, 'color_code': '#6B7280'},
    ]
    
    for item in defaults:
        TreatmentType.objects.get_or_create(
            name=item['name'],
            defaults={
                'duration_minutes': item['duration_minutes'],
                'color_code': item['color_code'],
                'buffer_minutes': 5
            }
        )

def reverse_seed(apps, schema_editor):
    TreatmentType = apps.get_model('appointments', 'TreatmentType')
    TreatmentType.objects.filter(name__in=[
        'Initial consultation', 'Routine check-up & cleaning', 'Root canal treatment',
        'Tooth extraction', 'Orthodontic consultation', 'Cosmetic procedures',
        'Emergency appointment', 'Follow-up visit'
    ]).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0004_appointment_arrival_time_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_treatment_types, reverse_seed),
    ]
