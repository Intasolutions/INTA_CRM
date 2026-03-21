from rest_framework import serializers
from .models import AssetCategory, Asset, AssetMaintenance, AssetAssignmentHistory
from django.contrib.auth.models import User

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = '__all__'

class AssetAssignmentHistorySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='assigned_to.username', read_only=True)
    
    class Meta:
        model = AssetAssignmentHistory
        fields = '__all__'

class AssetMaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetMaintenance
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    assigned_to_detail = serializers.SerializerMethodField()
    maintenance_records = AssetMaintenanceSerializer(many=True, read_only=True, source='maintenance_history')
    assignment_history = AssetAssignmentHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Asset
        fields = '__all__'

    def get_assigned_to_detail(self, obj):
        if obj.assigned_to:
            return {
                'id': obj.assigned_to.id,
                'username': obj.assigned_to.username,
                'email': obj.assigned_to.email
            }
        return None
