from rest_framework import serializers
from .models import AssetCategory, Asset, AssetMaintenance, AssetAssignmentHistory
from django.contrib.auth.models import User

class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email')

class AssetCategorySerializer(serializers.ModelSerializer):
    assets_count = serializers.IntegerField(source='assets.count', read_only=True)
    
    class Meta:
        model = AssetCategory
        fields = '__all__'

class AssetMaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetMaintenance
        fields = '__all__'

class AssetAssignmentHistorySerializer(serializers.ModelSerializer):
    user_detail = UserSimpleSerializer(source='user', read_only=True)
    
    class Meta:
        model = AssetAssignmentHistory
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    assigned_to_detail = UserSimpleSerializer(source='assigned_to', read_only=True)
    maintenance_history = AssetMaintenanceSerializer(source='maintenances', many=True, read_only=True)
    assignment_history = AssetAssignmentHistorySerializer(source='assignment_history', many=True, read_only=True)
    
    class Meta:
        model = Asset
        fields = '__all__'
