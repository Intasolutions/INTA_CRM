from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    Lead, LeadStage, CustomField, Activity, Reminder, Campaign, 
    LeadDocument, LeadAuditLog, Workflow, WorkflowLog, CallRecord, InternalTask
)
from .models_integrations import IntegrationSetting
from .serializers import (
    LeadSerializer, LeadStageSerializer, ActivitySerializer, 
    ReminderSerializer, UserSerializer, CustomFieldSerializer, CampaignSerializer,
    LeadDocumentSerializer, IntegrationSettingSerializer, LeadAuditLogSerializer,
    WorkflowSerializer, WorkflowLogSerializer, CallRecordSerializer, InternalTaskSerializer
)
from .utils_automation import process_workflows, summarize_lead_activities
from django.contrib.auth.models import User
from django.db.models import Q, Sum, Count, F
from django.utils import timezone

class LeadViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
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
        try:
            leads_data = request.data.get('leads', [])
            strategy = request.data.get('strategy', 'skip')
            
            # Reset SQLite auto-increment counter to avoid UNIQUE constraint collisions on ID
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT MAX(id) FROM leads_lead")
                max_id = cursor.fetchone()[0] or 0
                cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='leads_lead'")
                cursor.execute(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('leads_lead', {max_id})")
            
            # Simple log without emojis to be safe on Windows consoles
            print(f"BULK IMPORT: Received {len(leads_data)} leads. Strategy: {strategy}")
            
            results = {'created': 0, 'updated': 0, 'skipped': 0, 'error_count': 0, 'errors': []}
            
            # Get default stage if not provided
            default_stage = LeadStage.objects.order_by('order').first()
            
            for data in leads_data:
                # IMPORTANT: Remove any 'id' field to prevent UNIQUE constraint collisions
                data.pop('id', None)
                
                email = data.get('email')
                phone = data.get('phone')
                # Treat common filler values as None to prevent false duplicate matches
                if email and str(email).lower().strip() in ['', 'na', 'n/a', 'none', 'null']:
                    email = None
                    data['email'] = None # Clean the data for saving
                
                # Try to find existing lead by email OR phone
                existing_lead = None
                if email:
                    existing_lead = Lead.objects.filter(email=email).first()
                if not existing_lead and phone:
                    existing_lead = Lead.objects.filter(phone=phone).first()
                    
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
                
                try:
                    if serializer.is_valid():
                        serializer.save()
                        if existing_lead:
                            results['updated'] += 1
                        else:
                            results['created'] += 1
                    else:
                        results['error_count'] += 1
                        results['errors'].append({'data': data, 'errors': serializer.errors})
                except Exception as save_error:
                    print(f"FAILED TO SAVE LEAD DATA: {data}")
                    # Log the error but CONTINUE to the next lead
                    results['error_count'] += 1
                    results['errors'].append({'data': data, 'error': str(save_error)})
            
            return Response(results)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            # Include the data dict in the response if possible
            last_data = locals().get('data', 'No data available')
            print(f"BULK IMPORT CRASHED: {str(e)}")
            print(f"Last data item: {last_data}")
            print(error_trace)
            return Response({
                'error': str(e),
                'traceback': error_trace,
                'failing_data': last_data,
                'created': results['created'], 'updated': results['updated'], 
                'skipped': results['skipped'], 'error_count': results['error_count'], 
                'errors': [str(e)]
            }, status=500)
    
    @action(detail=False, methods=['get'])
    def pipeline_stats(self, request):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
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
        sources = list(base_leads.values('lead_source').annotate(count=Count('id'), value=Sum('deal_value')))
        
        # Ensure 'Closed Won' count is case insensitive or defaults to 0 safely
        won_leads = base_leads.filter(Q(stage__name__iexact='Closed Won') | Q(stage__name__iexact='Won'))
        
        return Response({
            'stage_breakdown': stage_breakdown,
            'source_breakdown': sources,
            'total_forecasted_revenue': float(total_forecasted),
            'won_leads_count': won_leads.count()
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
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
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

class InternalTaskViewSet(viewsets.ModelViewSet):
    serializer_class = InternalTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
        # Super Admins and Managers see everything, Agents only their assigned tasks
        if role in ['admin', 'manager']:
            queryset = InternalTask.objects.all()
        else:
            queryset = InternalTask.objects.filter(
                Q(assigned_to=user) | Q(created_by=user)
            ).distinct()
            
        # Filtering
        status = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        category = self.request.query_params.get('category')
        
        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset.order_by('-due_date')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def daily_briefing(self, request):
        now = timezone.now()
        # Basic timezone heuristic for greeting (if profile has no TZ, use server time)
        hour = now.hour
        if 5 <= hour < 12:
            greeting = "Good morning"
        elif 12 <= hour < 17:
            greeting = "Good afternoon"
        elif 17 <= hour < 22:
            greeting = "Good evening"
        else:
            greeting = "Good night"

        # Get pending/ongoing tasks assigned to user
        tasks = InternalTask.objects.filter(
            assigned_to=request.user, 
            status__in=['pending', 'ongoing']
        ).order_by('-priority', 'due_date')
        
        task_count = tasks.count()
        if task_count == 0:
            return Response({
                'briefing': f"{greeting}, {request.user.username}! You have a clear schedule. This is a great opportunity to focus on long-term goals or clear your inbox.",
                'task_count': 0
            })
            
        # Prioritize critical/high tasks
        urgent_tasks = tasks.filter(priority__in=['critical', 'high'])
        main_task = urgent_tasks.first() or tasks.first()
        
        time_diff = main_task.due_date - now
        due_text = "due soon"
        if time_diff.days < 0:
            due_text = "overdue"
        elif time_diff.seconds < 3600 * 3:
            due_text = "due in less than 3 hours"
            
        briefing = f"{greeting}, {request.user.username}. You have {task_count} tasks assigned to you. "
        briefing += f"I recommend starting with **'{main_task.title}'** as it's a {main_task.priority} priority task and is {due_text}. "
        
        # Check for bottlenecks
        overdue_count = tasks.filter(due_date__lt=now).count()
        if overdue_count > 0:
            briefing += f"You have {overdue_count} overdue task(s) that should be addressed immediately to stay on track."
        else:
            briefing += "Your current timeline looks manageable if you tackle the top item first."
            
        return Response({
            'briefing': briefing,
            'task_count': task_count,
            'main_task_id': main_task.id
        })
