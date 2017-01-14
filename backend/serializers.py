from api.models import (
    CustomQuestion,
    AnsweredCustomQuestion,
    CustomSchoolQuestion,
    AnsweredCustomSchoolQuestion
)
from api.serializers.providers import  ProviderSimpleSerializer
from api.serializers.schools import  PublicSchoolSerializer

from django.utils import timezone
from rest_framework import serializers


class CustomQuestionAnswerSerializer(serializers.ModelSerializer):

    class Meta:
        model = AnsweredCustomQuestion


class CustomQuestionSerializer(serializers.ModelSerializer):
    provider = ProviderSimpleSerializer(read_only=True)
    answers = CustomQuestionAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = CustomQuestion


class CustomQuestionSchoolAnswerSerializer(serializers.ModelSerializer):

    class Meta:
        model = AnsweredCustomSchoolQuestion


class CustomQuestionSchoolSerializer(serializers.ModelSerializer):
    school = PublicSchoolSerializer(read_only=True)
    answers = CustomQuestionSchoolAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = CustomSchoolQuestion


class CustomQuestionSchoolGeneralSerializer(serializers.ModelSerializer):
    answers = CustomQuestionSchoolAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = CustomSchoolQuestion
        exclude = ('answers',)
