from api.models import CustomQuestion, ScheduleItem,\
    CustomSchoolQuestion
from api.serializers import CustomQuestionSerializer,\
    ValidationError, CustomQuestionSchoolGeneralSerializer

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, mixins
from rest_framework.decorators import list_route
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from datetime import timedelta
from itertools import chain
import json
import copy


class CustomData(object):
    def __init__(self, params):
        self.provider_ids = self.get_provider_ids(params)
        self.child_id = params.get('child_id', None)
    def get_provider_ids(self, params):
        provider_ids = params.get('provider_ids', None)
        if provider_ids:
            try:
                provider_ids = json.loads(provider_ids)
            except:
                raise ValidationError('Wrong provider_ids parameter.')
        return provider_ids


class CustomQuestionsViewSet(
        mixins.DestroyModelMixin,
        viewsets.GenericViewSet):
    queryset = CustomQuestion.objects.all()
    serializer_class = CustomQuestionSerializer
    permission_classes = (IsAuthenticated,)


class CustomQuestionsSchoolViewSet(viewsets.ModelViewSet):
    queryset = CustomSchoolQuestion.objects.all()
    serializer_class = CustomQuestionSchoolGeneralSerializer
    permission_classes = (IsAuthenticated,)
