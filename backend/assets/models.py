from django.db import models
from django.contrib.auth.models import User

class AssetCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, default='Package', help_text='Lucide icon name')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Asset(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('assigned', 'Assigned'),
        ('maintenance', 'Under Maintenance'),
        ('lost', 'Lost'),
        ('retired', 'Retired'),
    ]

    category = models.ForeignKey(AssetCategory, on_delete=models.CASCADE, related_name='assets')
    name = models.CharField(max_length=255)
    serial_number = models.CharField(max_length=100, unique=True)
    model_number = models.CharField(max_length=100, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_assets')
    
    purchase_date = models.DateField(blank=True, null=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    warranty_expiry = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True, help_text='Office location, room, etc.')
    
    notes = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='assets/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.serial_number})"

class AssetMaintenance(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenances')
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    performed_by = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Maintenance for {self.asset.name} on {self.start_date}"

class AssetAssignmentHistory(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignment_history')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    returned_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-assigned_at']
        verbose_name_plural = "Asset Assignment Histories"
