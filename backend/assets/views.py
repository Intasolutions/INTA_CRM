from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AssetCategory, Asset, AssetMaintenance, AssetAssignmentHistory
from .serializers import (
    AssetCategorySerializer, AssetSerializer, 
    AssetMaintenanceSerializer, AssetAssignmentHistorySerializer
)
from django.utils import timezone

class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class AssetMaintenanceViewSet(viewsets.ModelViewSet):
    queryset = AssetMaintenance.objects.all()
    serializer_class = AssetMaintenanceSerializer
    permission_classes = [permissions.IsAuthenticated]

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().order_by('-created_at')
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        asset = self.get_object()
        user_id = request.data.get('user_id')
        notes = request.data.get('notes', '')
        
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update asset status
        asset.assigned_to_id = user_id
        asset.status = 'assigned'
        asset.save()
        
        # Create history record
        AssetAssignmentHistory.objects.create(
            asset=asset,
            user_id=user_id,
            notes=notes
        )
        
        return Response(self.get_serializer(asset).data)

    @action(detail=True, methods=['post'])
    def return_asset(self, request, pk=None):
        asset = self.get_object()
        notes = request.data.get('notes', '')
        
        # Find the active history record
        history = AssetAssignmentHistory.objects.filter(
            asset=asset, 
            returned_at__isnull=True
        ).first()
        
        if history:
            history.returned_at = timezone.now()
            if notes:
                history.notes = (history.notes or '') + f"\nReturn Notes: {notes}"
            history.save()
        
        # Update asset status
        asset.assigned_to = None
        asset.status = 'available'
        asset.save()
        
        return Response(self.get_serializer(asset).data)
