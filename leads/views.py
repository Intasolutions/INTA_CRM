from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    Lead, LeadStage, CustomField, Activity, Reminder, Campaign, 
    LeadDocument, LeadAuditLog, Workflow, WorkflowLog, CallRecord
)
from .models_integrations import IntegrationSetting
from .serializers import (
    LeadSerializer, LeadStageSerializer, ActivitySerializer, 
    ReminderSerializer, UserSerializer, CustomFieldSerializer, CampaignSerializer,
    LeadDocumentSerializer, IntegrationSettingSerializer, LeadAuditLogSerializer,
    WorkflowSerializer, WorkflowLogSerializer, CallRecordSerializer
)
from .utils_automation import process_workflows, summarize_lead_activities
from django.contrib.auth.models import User
from django.db.models import Q, Sum, Count, F

class LeadViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None).role if hasattr(user, 'profile') else 'agent'
        
        # Super Admins and Managers see everything, Agents only their own + campaign work
        if role in ['admin', 'manager']:
            queryset = Lead.objects.all()
        else:
            # Agent sees leads assigned to them OR leads in campaigns they belong to
            queryset = Lead.objects.filter(
                Q(assigned_to=user) | Q(campaign__assigned_users=user)
            ).distinct()
        
        # Apply filters if provided
        campaign_id = self.request.query_params.get('campaign')
        stage_id = self.request.query_params.get('stage')
        search_query = self.request.query_params.get('search')
        
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        if stage_id:
            queryset = queryset.filter(stage_id=stage_id)
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(company__icontains=search_query) |
                Q(phone__icontains=search_query)
            )
            
        return queryset.order_by('-created_at')

    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Local pagination for Leads
    from rest_framework.pagination import PageNumberPagination
    class LeadPagination(PageNumberPagination):
        page_size = 10
    pagination_class = LeadPagination

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination'):
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        lead = serializer.save()
        LeadAuditLog.objects.create(
            lead=lead,
            user=self.request.user if self.request.user.is_authenticated else None,
            action="Lead Created",
            new_value=f"Lead {lead.name} created"
        )
        # Trigger Workflows
        process_workflows(lead, trigger_type='lead_created', user=self.request.user)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_stage = old_instance.stage
        old_deal_value = old_instance.deal_value
        
        new_instance = serializer.save()
        new_stage = new_instance.stage
        new_deal_value = new_instance.deal_value
        
        # Log Stage Change
        if old_stage != new_stage:
            Activity.objects.create(
                lead=new_instance,
                user=self.request.user if self.request.user.is_authenticated else None,
                activity_type='task',
                note=f"Lead moved from {old_stage.name if old_stage else 'New Lead'} to {new_stage.name if new_stage else 'New Lead'}."
            )
            LeadAuditLog.objects.create(
                lead=new_instance,
                user=self.request.user if self.request.user.is_authenticated else None,
                action="Stage Changed",
                old_value=old_stage.name if old_stage else "None",
                new_value=new_stage.name if new_stage else "None"
            )
            # Trigger Workflows
            process_workflows(new_instance, trigger_type='stage_change', trigger_value=str(new_stage.id) if new_stage else None, user=self.request.user)

        # Log Deal Value Change
        if old_deal_value != new_deal_value:
            LeadAuditLog.objects.create(
                lead=new_instance,
                user=self.request.user if self.request.user.is_authenticated else None,
                action="Deal Value Updated",
                old_value=str(old_deal_value),
                new_value=str(new_deal_value)
            )

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        leads_data = request.data.get('leads', [])
        strategy = request.data.get('strategy', 'skip')
        
        results = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': []}
        
        # Get default stage if not provided
        default_stage = LeadStage.objects.order_by('order').first()
        
        for data in leads_data:
            email = data.get('email')
            existing_lead = Lead.objects.filter(email=email).first() if email else None
            
            # Ensure stage is present or use default
            if not data.get('stage') and default_stage:
                data['stage'] = default_stage.id
                
            if existing_lead:
                if strategy == 'skip':
                    results['skipped'] += 1
                    continue
                elif strategy == 'overwrite':
                    serializer = self.get_serializer(existing_lead, data=data, partial=True)
                else:
                    results['skipped'] += 1
                    continue
            else:
                serializer = self.get_serializer(data=data)
            
            if serializer.is_valid():
                serializer.save()
                if existing_lead:
                    results['updated'] += 1
                else:
                    results['created'] += 1
            else:
                results['errors'].append({'data': data, 'errors': serializer.errors})
        
        return Response(results)
    
    @action(detail=False, methods=['get'])
    def pipeline_stats(self, request):
        from django.db.models import Sum, Count, F
        user = self.request.user
        role = getattr(user, 'profile', None).role if hasattr(user, 'profile') else 'agent'
        
        # Breakdown by Stage
        stages = LeadStage.objects.all()
        stage_breakdown = []
        total_forecasted = 0
        
        # Base filter for stats
        if role in ['admin', 'manager']:
            base_leads = Lead.objects.all()
        else:
            base_leads = Lead.objects.filter(
                Q(assigned_to=user) | Q(campaign__assigned_users=user)
            ).distinct()
            
        for stage in stages:
            leads = base_leads.filter(stage=stage)
            count = leads.count()
            value = leads.aggregate(total=Sum('deal_value'))['total'] or 0
            forecasted = (value * stage.probability) / 100
            total_forecasted += forecasted
            
            stage_breakdown.append({
                'stage': stage.name,
                'count': count,
                'value': value,
                'forecasted': forecasted,
                'probability': stage.probability,
                'color': stage.color
            })
            
        # Breakdown by Source
        sources = base_leads.values('lead_source').annotate(count=Count('id'), value=Sum('deal_value'))
        
        return Response({
            'stage_breakdown': stage_breakdown,
            'source_breakdown': sources,
            'total_forecasted_revenue': total_forecasted,
            'won_leads_count': base_leads.filter(stage__name='Closed Won').count()
        })

    @action(detail=True, methods=['get'])
    def audit_logs(self, request, pk=None):
        lead = self.get_object()
        logs = lead.audit_logs.all()
        serializer = LeadAuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="leads_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Name', 'Email', 'Phone', 'Company', 'Source', 'Stage', 'Deal Value', 'Created At'])
        
        leads = self.get_queryset()
        for lead in leads:
            writer.writerow([
                lead.name, lead.email, lead.phone, lead.company, 
                lead.lead_source, lead.stage.name if lead.stage else 'N/A',
                lead.deal_value, lead.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])
            
        return response

class LeadStageViewSet(viewsets.ModelViewSet):
    queryset = LeadStage.objects.all()
    serializer_class = LeadStageSerializer
    permission_classes = [permissions.IsAuthenticated]

class ActivityViewSet(viewsets.ModelViewSet):
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow filtering by lead if provided
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return Activity.objects.filter(lead_id=lead_id).order_by('-timestamp')
        return Activity.objects.filter(user=self.request.user).order_by('-timestamp')

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination'):
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        activity = serializer.save(user=self.request.user)
        
        # Auto-update lead contact tracking
        if activity.activity_type in ['call', 'email', 'meeting']:
            lead = activity.lead
            from django.utils import timezone
            lead.last_contacted_at = timezone.now()
            lead.last_contacted_by = self.request.user
            lead.save()
        
        # Update AI summary whenever a new activity is added
        summarize_lead_activities(activity.lead)

class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow filtering by lead
        lead_id = self.request.query_params.get('lead')
        queryset = Reminder.objects.filter(user=self.request.user).order_by('scheduled_at')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        return queryset

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination'):
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class CustomFieldViewSet(viewsets.ModelViewSet):
    queryset = CustomField.objects.all()
    serializer_class = CustomFieldSerializer
    permission_classes = [permissions.IsAuthenticated]

class CampaignViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'profile', None).role if hasattr(user, 'profile') else 'agent'
        
        if role in ['admin', 'manager']:
            return Campaign.objects.all()
        return Campaign.objects.filter(assigned_users=user).distinct()

    serializer_class = CampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

class LeadDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = LeadDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return LeadDocument.objects.filter(lead_id=lead_id).order_by('-uploaded_at')
        return LeadDocument.objects.all().order_by('-uploaded_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class IntegrationViewSet(viewsets.ModelViewSet):
    queryset = IntegrationSetting.objects.all()
    serializer_class = IntegrationSettingSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'provider'

    @action(detail=True, methods=['post'])
    def toggle(self, request, provider=None):
        integration, created = IntegrationSetting.objects.get_or_create(provider=provider)
        
        # If config_data is provided, we are "connecting"
        config_data = request.data.get('config_data')
        if config_data:
            integration.config_data = config_data
            integration.is_connected = True
        else:
            # Simple toggle for disconnect or quick toggle
            integration.is_connected = not integration.is_connected
            
        integration.save()
        return Response({'status': 'success', 'connected': integration.is_connected})

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]

class WorkflowLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkflowLog.objects.all()
    serializer_class = WorkflowLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return WorkflowLog.objects.filter(lead_id=lead_id).order_by('-timestamp')
        return WorkflowLog.objects.all().order_by('-timestamp')

class CallRecordViewSet(viewsets.ModelViewSet):
    serializer_class = CallRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return CallRecord.objects.filter(lead_id=lead_id).order_by('-timestamp')
        return CallRecord.objects.filter(user=self.request.user).order_by('-timestamp')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
