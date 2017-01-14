from datetime import date
import copy
import json
import csv

from django.test import LiveServerTestCase

from rest_framework import serializers
from rest_framework.test import APITestCase

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium import webdriver

from api.models import *
from api.exceptions import *

USERS = [
    {
        'email': 'test@test.com',
        'password': 'test',
    },
    {
        'email': 'anothertest@test.com',
        'password': 'test2',
    },
    {
        'email': 'someone@else.tv',
        'password': '1234'
    }]

CSV_TEMPLATES_DIR = 'app/provider2/csv-templates/'


class SimpleTest(APITestCase):

    def test_basic_signup(self):
        """
        Testing signup endpoint
        """
        user_cred = {
            'email': USERS[0]['email'],
        }
        data = dict(user_cred.items() + {
            'first_name': "test_name",
            'last_name': "test_last_name"
        }.items())

        """ CREATE """
        wrong_data = copy.copy(data)
        wrong_data['email'] = 'wrong_email'
        resp = self.client.post('/api/user', wrong_data)
        self.assertEqual(resp.status_code, 400)

        return

        # TODO: Fake the email service.  User creation sends email,
        # which fails in the test environment.

        resp = self.client.post('/api/user', data)
        self.assertEqual(resp.status_code, 201)

        user_id = resp.data['id']
        user = User.objects.get(id=user_id)

        self.assertSequenceEqual(
            [user.email, user.first_name, user.last_name],
            [data['email'], data['first_name'], data['last_name']]
        )

        """ LOGIN """
        # move method to next test
        resp = self.client.post('/api/login', user_cred)
        self.assertEqual(resp.status_code, 403)

        # TODO: Test login with correct temporary password, which was mailed.

    def test_provider_creation(self):
        notf = Notification.objects.create()

        class ProviderSerializer(serializers.ModelSerializer):

            class Meta:
                model = Provider
                fields = (
                    'name', 'summary', 'details',
                    'business_street', 'business_city', 'business_state',
                    'business_zip', 'discount_unit', 'notification',
                    'visible', 'provider_visible')

        provider = {
            'name': 'test',
            'summary': 'summary',
            'details': 'details',
            'business_street': 'street',
            'business_city': 'city',
            'business_state': 'WS',
            'business_zip': '12345',
            'discount_unit': '%',
            'notification':  notf.id,
            'visible': True,
            'provider_visible': True
        }

        serializer = ProviderSerializer(data=provider)
        serializer.is_valid()
        serializer.save()

        notf = Notification.objects.create()
        provider2 = {
            'name': 'test',
            'summary': 'summary',
            'details': 'details',
            'business_street': 'street',
            'business_city': 'city',
            'business_state': 'WS',
            'business_zip': '12345',
            'discount_unit': '%',
            'notification':  notf.id,
            'visible': True,
            'provider_visible': True
        }

        serializer = ProviderSerializer(data=provider2)
        self.assertRaises(IntegrityAPIError, serializer.is_valid)

        notf = Notification.objects.create()
        provider3 = {
            'name': 'test',
            'summary': 'summary',
            'details': 'details',
            'business_street': 'street',
            'business_city': 'city',
            'business_state': 'CA',
            'business_zip': '12345',
            'discount_unit': '%',
            'notification':  notf.id,
            'visible': True,
            'provider_visible': True
        }

        serializer = ProviderSerializer(data=provider3)
        serializer.is_valid()
        serializer.save()

    def test_school_search(self):
        School.objects.create(
            name='school name',
            street='street',
            city='city',
            state='WA',
            zip='zip',
            phone='phone',
            details='details',
            lat=11.1234567,
            lng=11.1234567)
        data = {
            'lat': 11.1234567,
            'lng': 11.1234567,
        }
        resp = self.client.get('/api/school', data)
        self.assertEqual(len(resp.data), 1)

        # strict retrieval
        data = {
            'name': 'school name',
            'lat': 11.1234567,
            'lng': 11.1234567,
        }
        resp = self.client.get('/api/school', data)
        self.assertEqual(len(resp.data), 1)

        # not strict retrieval
        data = {
            'name': 'school name',
            'lat': 11.1234,
            'lng': 11.1235,
        }
        resp = self.client.get('/api/school', data)
        self.assertEqual(len(resp.data), 1)

        data = {
            'name': 'school name',
            'lat': 11.124,
            'lng': 11.125,
        }
        resp = self.client.get('/api/school', data)
        self.assertEqual(len(resp.data), 0)

    def test_school_serializer(self):
        class SchoolSerializer(serializers.ModelSerializer):

            class Meta:
                model = School
                fields = (
                    'name', 'visible',
                    'lat', 'lng', 'street', 'city', 'state',
                    'zip', 'phone', 'details', 'country')

        school = {
            'name': 'school name',
            'street': 'street',
            'city': 'city',
            'state': 'WA',
            'zip': 'zip',
            'phone': 'phone',
            'details': 'details',
            'lat': 11.1234567,
            'lng': 11.1234567}

        schools = School.objects.all()
        self.assertEqual(len(schools), 0)
        serializer = SchoolSerializer(data=school)
        self.assertIs(serializer.is_valid(), True)
        serializer.save()
        schools = School.objects.all()
        self.assertEqual(len(schools), 1)

        serializer = SchoolSerializer(data=school)
        self.assertIs(serializer.is_valid(), False)

        school['name'] = 'another school name'
        serializer = SchoolSerializer(data=school)
        self.assertIs(serializer.is_valid(), True)
        serializer.save()
        schools = School.objects.all()
        self.assertEqual(len(schools), 2)

    def test_school_permissions(self):
        class SchoolSerializer(serializers.ModelSerializer):

            class Meta:
                model = School
                fields = (
                    'name', 'visible',
                    'lat', 'lng', 'street', 'city', 'state',
                    'zip', 'phone', 'details', 'country')
        school = {
            'name': 'school name',
            'street': 'street',
            'city': 'city',
            'state': 'WA',
            'zip': 'zip',
            'phone': 'phone',
            'details': 'details',
            'lat': 11.1234567,
            'lng': 11.1234567}

        schools = School.objects.all()
        self.assertEqual(len(schools), 0)
        serializer = SchoolSerializer(data=school)
        self.assertIs(serializer.is_valid(), True)
        serializer.save()
        schools = School.objects.order_by('-id')
        school = schools[0]

        resp = self.client.get('/api/school/%s' % school.id)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        # unauthenticated user should not know about authorized users
        self.assertEqual(data.has_key('authorized_users'), False)

        resp = self.client.get('/api/school')
        self.assertEqual(resp.status_code, 200)

        self.login_user()

        resp = self.client.get('/api/school/%s' % school.id)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        # unauthorized user should not know about authorized users
        self.assertEqual(data.has_key('authorized_users'), False)

        resp = self.client.get('/api/school')
        self.assertEqual(resp.status_code, 200)

        SchoolAuthorizedUser.objects.create(school=school, email=USERS[0]['email'])
        resp = self.client.get('/api/school/%s' % school.id)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        # authorized user should know about authorized users
        self.assertEqual(len(data['authorized_users']), 1)

    def test_pd_calendar_filtring(self):
        providers = Provider.objects.all()
        self.assertEqual(len(providers), 0)

        notf = Notification.objects.create()
        provider = {
            'name': 'test',
            'summary': 'summary',
            'details': 'details',
            'business_street': 'street',
            'business_city': 'city',
            'business_state': 'WS',
            'business_zip': '12345',
            'discount_unit': '%',
            'notification':  notf,
            'visible': True,
            'provider_visible': True
        }
        Provider.objects.create(**provider)

        resp = self.client.get('/api/provider_directory')
        self.assertEqual(len(resp.data), 1)

        calendar = Calendar.objects.create()
        row = {
            'start_date': date(2015, 1, 1),
            'end_date': date(2015, 2, 1),
            'days_of_week': 1
        }
        calendar.rows.create(**row)
        data = {
            'calendar': 1
        }
        resp = self.client.get('/api/provider_directory', data)
        self.assertEqual(len(resp.data), 0)

    def create_provider(self):
        notf = Notification.objects.create()
        provider = {
            'name': 'test',
            'summary': 'summary',
            'details': 'details',
            'business_street': 'street',
            'business_city': 'city',
            'business_state': 'WS',
            'business_zip': '12345',
            'discount_unit': '%',
            'notification':  notf,
            'visible': True,
            'provider_visible': True
        }
        provider = Provider.objects.create(**provider)
        provider.authorized_users.create(email=USERS[0]['email'])

    def login_user(self, num=0):
        user = User.objects.create_user(USERS[num]['email'], USERS[num]['password'])
        logined = self.client.login(username=USERS[num]['email'], password=USERS[num]['password'])
        self.assertEqual(logined, True)
        return user

    def test_program_creation(self):
        providers = Provider.objects.all()
        self.assertEqual(len(providers), 0)

        self.create_provider()

        providers = Provider.objects.all()
        self.assertEqual(len(providers), 1)
        id = providers[0].id

        self.login_user()

        data = [{
            "program_code": "test",
            "name": "test",
            "summary": "summary",
            "min_age": 0,
            "max_age": 0,
            "min_grade": 0,
            "max_grade": 0,
            "price": "0",
            "incr_price": "0",
            "categories": None,
            "special_need": True,
            "details": "",
            "inactive": False,
            "overnight": True
        }]
        data = json.dumps(data)
        programs = Provider.objects.get(id=id).programs.all()
        self.assertEqual(len(programs), 0)

        resp = self.client.patch(
            '/api/provider/%s/program' % id,
            content_type='application/json',
            data=data)
        self.assertEqual(resp.status_code, 200)

        programs = Provider.objects.get(id=id).programs.all()
        self.assertEqual(len(programs), 1)

    def test_program_update(self):
        providers = Provider.objects.all()
        self.assertEqual(len(providers), 0)

        self.create_provider()
        self.login_user()

        providers = Provider.objects.all()
        self.assertEqual(len(providers), 1)
        provider_id = providers[0].id

        data = {
            "provider_id": provider_id,
            "program_code": "test",
            "name": "test",
            "summary": "summary",
            "min_age": 0,
            "max_age": 0,
            "min_grade": 0,
            "max_grade": 0,
            "price": "0",
            "incr_price": "0",
            "special_need": True,
            "details": "",
            "inactive": False,
            "overnight": True
        }

        programs = Program.objects.all()
        self.assertEqual(len(programs), 0)

        Program.objects.create(**data)
        programs = Program.objects.all()
        self.assertEqual(len(programs), 1)
        program = programs[0]
        program_id = program.id

        data = [{
            "id": program_id,
            "program_code": "test",
            "min_age": 11
        }]
        data = json.dumps(data)
        self.assertEqual(program.min_age, 0)

        resp = self.client.patch(
            '/api/provider/%s/program' % provider_id,
            content_type='application/json',
            data=data)
        self.assertEqual(resp.status_code, 200)

        programs = Program.objects.all()
        program = programs[0]
        self.assertEqual(program.min_age, 11)

        categories = program.categories.all()
        self.assertEqual(len(categories), 0)

        data = [{
            "id": program_id,
            "program_code": "test",
            "categories": [{
                "id": 2,
                "name": "Board games"
            }]
        }]
        data = json.dumps(data)
        resp = self.client.patch(
            '/api/provider/%s/program' % provider_id,
            content_type='application/json',
            data=data)
        self.assertEqual(resp.status_code, 400)

        data = {
            "id": 2,
            "name": "Board games"
        }
        Category.objects.create(**data)
        data = {
            "id": 3,
            "name": "Video games"
        }
        Category.objects.create(**data)
        categories = program.categories.all()
        self.assertEqual(len(categories), 0)

        data = [{
            "id": program_id,
            "program_code": "test",
            "categories": [{
                "id": 2,
                "name": "Board games"
            }]
        }]
        data = json.dumps(data)
        resp = self.client.patch(
            '/api/provider/%s/program' % provider_id,
            content_type='application/json',
            data=data)
        self.assertEqual(resp.status_code, 200)
        categories = program.categories.all()
        self.assertEqual(len(categories), 1)

        self.assertEqual(program.name, 'test')
        data = "id,program_code,name,summary,min_age,max_age,min_grade,max_grade,price,incr_price,categories,special_need,details,inactive,overnight\r\n %s,test,name2,test,,,,,,,,,,1," % program_id
        # inactive and summery fields are required for csv PATCH method
        # which is not consisted with json content_type
        resp = self.client.patch(
            '/api/provider/%s/program' % provider_id,
            content_type='text/csv',
            data=data)

        programs = Program.objects.all()
        program = programs[0]
        self.assertEqual(program.name, 'name2')
        categories = program.categories.all()
        self.assertEqual(len(categories), 1)

        self.assertEqual(categories[0].id, 2)
        data = "id,program_code,name,summary,min_age,max_age,min_grade,max_grade,price,incr_price,categories,special_need,details,inactive,overnight\r\n %s,test,name2,test,,,,,,,3,,,1," % program_id
        resp = self.client.patch(
            '/api/provider/%s/program' % provider_id,
            content_type='text/csv',
            data=data)
        categories = program.categories.all()
        self.assertEqual(categories[0].id, 3)

    def test_program_download(self):
        providers = Provider.objects.all()
        self.assertEqual(len(providers), 0)

        self.create_provider()
        self.login_user()

        providers = Provider.objects.all()
        self.assertEqual(len(providers), 1)
        provider_id = providers[0].id

        data = {
            "provider_id": provider_id,
            "program_code": "test",
            "name": "test",
            "summary": "summary",
            "min_age": 0,
            "max_age": 0,
            "min_grade": 0,
            "max_grade": 0,
            "price": "0",
            "incr_price": "0",
            "special_need": True,
            "details": "",
            "inactive": False,
            "overnight": True
        }

        programs = Program.objects.all()
        self.assertEqual(len(programs), 0)

        Program.objects.create(**data)
        programs = Program.objects.all()
        self.assertEqual(len(programs), 1)

        program = programs[0]
        category = program.categories.create(name="test")
        category_id = category.id
        categories = program.categories.all()
        self.assertEqual(len(categories), 1)

        resp = self.client.get(
            '/api/provider/%s/program?format=csv' % provider_id,
            content_type='text/csv')
        csv = resp.content
        headers, program, end_line = csv.split('\r\n')
        category = program.split(',')[10]
        self.assertIsNot(category, '')

    def test_waitlist(self):
        self.create_provider()
        user = self.login_user()

        providers = Provider.objects.all()
        self.assertEqual(len(providers), 1)
        provider_id = providers[0].id

        data = {
            "provider_id": provider_id,
            "program_code": "test",
            "name": "test",
            "summary": "summary",
            "min_age": 0,
            "max_age": 0,
            "min_grade": 0,
            "max_grade": 0,
            "price": "0",
            "incr_price": "0",
            "special_need": True,
            "details": "",
            "inactive": False,
            "overnight": True
        }

        Program.objects.create(**data)
        session_start = date(2015,1,1)
        program = Program.objects.all()[0]
        session = program.sessions.create(
            provider=providers[0],
            seats_quota=1,
            start_date=session_start,
            days_of_week=1,
            start_time="10:00",
            end_time="17:00",
            cancelled=False,
            price=0)

        user = self.login_user(1)
        child1 = user.children.all().create(
            first_name="test",
            last_name="test",
            birth_date_estimated=False,
            special_needs=False,
            dietary_restrictions=False,
            allergy=False,
            physical_restrictions=False)
        schedule_item1 = child1.schedule_items.all().create(
            unenrolled=False,
            child=child1,
            session=session,
            vacation=False,
            cancelled_by_parent=False)
        self.assertEqual(schedule_item1.has_available_seat(), True)

        # TODO: make a proper request here
        session.seats_sold += 1
        session.save()

        user = self.login_user(2)
        child2 = user.children.all().create(
            first_name="test2",
            last_name="test2",
            birth_date_estimated=False,
            special_needs=False,
            dietary_restrictions=False,
            allergy=False,
            physical_restrictions=False)
        schedule_item2 = child2.schedule_items.all().create(
            unenrolled=False,
            child=child2,
            session=session,
            vacation=False,
            cancelled_by_parent=False)
        self.assertEqual(schedule_item2.has_available_seat(), False)


    def test_roster_and_attendance(self):
        providers = Provider.objects.all()
        self.assertEqual(len(providers), 0)

        self.create_provider()
        user = self.login_user()

        providers = Provider.objects.all()
        self.assertEqual(len(providers), 1)
        provider_id = providers[0].id

        data = {
            "provider_id": provider_id,
            "program_code": "test",
            "name": "test",
            "summary": "summary",
            "min_age": 0,
            "max_age": 0,
            "min_grade": 0,
            "max_grade": 0,
            "price": "0",
            "incr_price": "0",
            "special_need": True,
            "details": "",
            "inactive": False,
            "overnight": True
        }

        programs = Program.objects.all()
        self.assertEqual(len(programs), 0)

        Program.objects.create(**data)
        programs = Program.objects.all()
        self.assertEqual(len(programs), 1)

        session_start = date(2015,1,1)
        program = programs[0]
        session = program.sessions.create(
            provider=providers[0],
            seats_quota=5,
            start_date=session_start,
            days_of_week=1,
            start_time="10:00",
            end_time="17:00",
            cancelled=False)

        child = user.children.all().create(
            first_name="test",
            last_name="test",
            birth_date_estimated=False,
            special_needs=False,
            dietary_restrictions=False,
            allergy=False,
            physical_restrictions=False)

        purchase = Purchase.objects.create(
            session=session,
            captured=True,
            user=user,
            incr_seats=1,
            live=True)

        schedule_item = child.schedule_items.all().create(
            paid=True,
            unenrolled=False,
            child=child,
            session=session,
            purchase=purchase,
            vacation=False,
            cancelled_by_parent=False)

        resp = self.client.get('/api/provider/%s/roster.csv' % provider_id, content_type='text/csv')
        csv = resp.content

        headers, roster, end_line = csv.split('\r\n')
        self.assertIsNot(roster, None)

        resp = self.client.get('/api/attendance/%d/%s' % (
                    session.pk, session_start.strftime('%Y-%m-%d')))
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        resp = self.client.post('/api/attendance/%d/%s' % (
                    session.pk, session_start.strftime('%Y-%m-%d')),
                json.dumps(data),
                content_type='application/json')
        self.assertEqual(resp.status_code, 201)

        # instructor roster
        instructor = self.login_user(1)
        assignment = InstructorAssignment.objects.create(
                session=session,
                class_date=session_start,
                instructor_email=instructor.email)

        resp = self.client.get('/api/instructor-assignments')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0].has_key('children'), True)
        self.assertEqual(len(data[0]['children']), 1)

        resp = self.client.get('/api/attendance/%d/%s' % (
                    session.pk, session_start.strftime('%Y-%m-%d')))
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        resp = self.client.post('/api/attendance/%d/%s' % (
                    session.pk, session_start.strftime('%Y-%m-%d')),
                json.dumps(data),
                content_type='application/json')
        self.assertEqual(resp.status_code, 201)

        # someone else
        user = self.login_user(2)
        resp = self.client.get('/api/instructor-assignments')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertEqual(len(data), 0)

        resp = self.client.get('/api/attendance/%d/%s' % (
                    session.pk, session_start.strftime('%Y-%m-%d')))
        self.assertEqual(resp.status_code, 403)
        resp = self.client.post('/api/attendance/%d/%s' % (
                    session.pk, session_start.strftime('%Y-%m-%d')),
                json.dumps({}),
                content_type='application/json')
        self.assertEqual(resp.status_code, 403)


    def test_csv_upload(self):
        providers = Provider.objects.all()
        self.assertEqual(len(providers), 0)

        self.create_provider()
        self.login_user()

        providers = Provider.objects.all()
        self.assertEqual(len(providers), 1)
        provider = providers[0]
        provider_id = provider.id

        data = ""
        with open(CSV_TEMPLATES_DIR + 'location.csv', 'rb') as csvfile:
            data = csvfile.read()

        resp = self.client.patch(
            '/api/provider/%s/location' % provider_id,
            content_type='text/csv',
            data=data)
        self.assertEqual(resp.status_code, 200)

        locations = Location.objects.all()
        self.assertEqual(len(locations), 2)

        data = ""
        with open(CSV_TEMPLATES_DIR + 'program.csv', 'rb') as csvfile:
            data = csvfile.read()

        resp = self.client.patch(
            '/api/provider/%s/program' % provider_id,
            content_type='text/csv',
            data=data)
        self.assertEqual(resp.status_code, 200)

        programs = Program.objects.all()
        self.assertEqual(len(programs), 2)

        data = ""
        with open(CSV_TEMPLATES_DIR + 'session.csv', 'rb') as csvfile:
            data = csvfile.read()

        resp = self.client.patch(
            '/api/provider/%s/session' % provider_id,
            content_type='text/csv',
            data=data)
        self.assertEqual(resp.status_code, 200)

        sessions = Session.objects.all()
        self.assertEqual(len(sessions), 4)

        session = sessions[0]
        self.assertEqual(session.period, 1)

        session = sessions[1]
        self.assertEqual(session.period, 0)

    def test_provider_directory_social_tags(self):
        providers = Provider.objects.all()
        self.assertEqual(len(providers), 0)

        self.create_provider()
        user = self.login_user()

        providers = Provider.objects.all()
        self.assertEqual(len(providers), 1)
        provider = providers[0]
        provider_id = provider.id

        data = {
            "provider_id": provider_id,
            "program_code": "test",
            "name": "test",
            "summary": "summary",
            "min_age": 0,
            "max_age": 0,
            "min_grade": 0,
            "max_grade": 0,
            "price": "0",
            "incr_price": "0",
            "special_need": True,
            "details": "",
            "inactive": False,
            "overnight": True
        }

        programs = Program.objects.all()
        self.assertEqual(len(programs), 0)

        Program.objects.create(**data)
        programs = Program.objects.all()
        self.assertEqual(len(programs), 1)
        program = Program.objects.all()[0]

        resp = self.client.get(
            '/providerDirectory/US/%s/%s/%s-%s' % (
                provider.business_state, provider.business_city,
                provider.name, provider.md5sum
            )
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.context['meta']['title'], provider.name)
        self.assertEqual(resp.context['meta']['description'], provider.summary)






"""
# We don't need e2e tests at the moment
# Commenting to improve perfomance
class LiveTest(LiveServerTestCase):
    #fixtures = ['user-data.json']

    def setUp(self):
        self.live_test_server_url = 'http://127.0.0.1:9000/app'
        chrome_path = 'node_modules/protractor/selenium/chromedriver'
        self.browser = webdriver.Chrome(chrome_path)

        User.objects.create_superuser(
            first_name='admin',
            password='admin',
            email='admin@example.com'
            )
        super(LiveTest, self).setUp()

    def tearDown(self):
        self.browser.quit()
        super(LiveTest, self).tearDown()

    def test_login(self):
        driver = self.browser
        driver.maximize_window()
        notification = Notification.objects.create()
        provider = Provider.objects.create(
            name='test',
            summary='summary',
            details='details',
            business_street='street',
            business_city='city',
            business_state='WS',
            business_zip='12345',
            discount_unit='%',
            notification=notification
            )
        AuthorizedUser.objects.create(
            provider=provider,
            email='admin@example.com'
            )
        Location.objects.create(
            provider=provider,
            street='street',
            city='Bellevue',
            state='WA',
            location_shorthand='location',
            name='name'
            )
        Program.objects.create(
            provider=provider,
            program_code='test_code',
            name='name',
            summary='summary'
            )
        driver.get('%s%s' % (self.live_test_server_url, '#/provider/'))
        #LOGGING IN
        element = WebDriverWait(driver, 2).until(
            EC.element_to_be_clickable((By.XPATH, '//*[@id="navbar"]/div/div/div[1]/a[2]'))
        )

        #TODO: in master we have different paths, FIX
        driver.find_element_by_xpath('//*[@id="navbar"]/div/div/div[1]/a[2]').click()
        driver.find_element_by_xpath('/html/body/div[5]/div/div/div[1]/form/div[2]/div[1]/input').clear()
        driver.find_element_by_xpath('/html/body/div[5]/div/div/div[1]/form/div[2]/div[1]/input').send_keys('admin@example.com')
        driver.find_element_by_xpath('/html/body/div[5]/div/div/div[1]/form/div[2]/div[2]/input').clear()
        driver.find_element_by_xpath('/html/body/div[5]/div/div/div[1]/form/div[2]/div[2]/input').send_keys('admin')
        driver.find_element_by_xpath('/html/body/div[5]/div/div/div[1]/form/div[2]/button').click()
        element = WebDriverWait(driver, 2).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '.dropdown-toggle'))
        )
        driver.find_element_by_xpath('/html/body/div[2]/div/accordion/div/div[5]/div[1]/h4/a/div/b').click()
        element = WebDriverWait(driver, 2).until(
            EC.element_to_be_clickable((By.XPATH, '//*[@id="sections-search-results"]/fieldset/div/form/div[1]/div[1]/button'))
        )
        driver.find_element_by_xpath('//*[@id="sections-search-results"]/fieldset/div/form/div[1]/div[1]/button').click()
        Select(driver.find_element_by_xpath("//table[@id='sessionsTable']/tbody/tr/td[3]/select")).select_by_visible_text("name")
        Select(driver.find_element_by_xpath("//table[@id='sessionsTable']/tbody/tr/td[6]/select")).select_by_visible_text("location")
        driver.find_element_by_xpath("//table[@id='sessionsTable']/tbody/tr/td[7]").click()
        driver.find_element_by_xpath("(//input[@type='text'])[24]").clear()
        driver.find_element_by_xpath("(//input[@type='text'])[24]").send_keys("11")
        driver.find_element_by_xpath("//table[@id='sessionsTable']/tbody/tr/td[10]").click()
        driver.find_element_by_xpath("(//button[@type='button'])[16]").click()
        driver.find_element_by_xpath("//table[@id='sessionsTable']/tbody/tr/td[13]").click()
        driver.find_element_by_xpath("(//input[@type='text'])[28]").clear()
        driver.find_element_by_xpath("(//input[@type='text'])[28]").send_keys("11")
        driver.find_element_by_xpath("//table[@id='sessionsTable']/tbody/tr/td[14]").click()
        driver.find_element_by_xpath("(//input[@type='text'])[29]").clear()
        driver.find_element_by_xpath("(//input[@type='text'])[29]").send_keys("12")
        driver.find_element_by_xpath("(//button[@type='button'])[6]").click()
        driver.find_element_by_xpath("(//button[@type='button'])[10]").click()
        driver.find_element_by_xpath("//table[@id='sessionsTable']/tbody/tr/td[16]").click()
        driver.find_element_by_xpath("(//input[@type='text'])[30]").clear()
        driver.find_element_by_xpath("(//input[@type='text'])[30]").send_keys("11")
        element = WebDriverWait(driver, 2).until(
            EC.element_to_be_clickable((By.XPATH, '//*[@id="sections-search-results"]/fieldset/div/form/div[1]/div[1]'))
        )
        driver.find_element_by_xpath('//*[@id="sections-search-results"]/fieldset/div/form/div[1]/div[1]').click()
        driver.find_element_by_xpath('//*[@id="sections-search-results"]/fieldset/div/form/div[1]/div[1]/save-revert-buttons/button[1]').click()
        import time
        time.sleep(2)
        session = Session.objects.get(id=1)
        self.assertEqual(session.seats_quota, 11)
"""
