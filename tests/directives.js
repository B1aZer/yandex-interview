'use strict';

describe('Unit: KidsProfile Directives', function kidsProfileDirective() {

  var $compile;
  var $rootScope;
  var $timeout;
  var $httpBackend;
  var $scope;

  function noFunc() {
  }

  function loadKidDir(scope) {
    var element = angular.element('<span edit-kid data-kid="kid">' +
      '</span>');
    var compiledElement = $compile(element)(scope);
    scope.$digest();
    return compiledElement;
  }

  beforeEach(module('easyCamp.KidsProfile'));
  beforeEach(module('kidsprofile/views/directives/editview.html'));
  beforeEach(module('kidsprofile/views/directives/editkidparents.html'));
  beforeEach(module('kidsprofile/views/directives/editemergency.html'));
  beforeEach(module('kidsprofile/views/directives/editmedical.html'));
  beforeEach(module('kidsprofile/views/directives/editpickup.html'));
  beforeEach(module('kidsprofile/views/directives/custom_questions.html'));
  beforeEach(module('kidsprofile/views/directives/school_custom_questions.html'));
  beforeEach(module('kidsprofile/views/directives/waiver_form.html'));
  beforeEach(module('kidsprofile/views/directives/school_waiver_form.html'));
  beforeEach(module('kidsprofile/views/directives/editkidbasic.html'));
  beforeEach(module(function provideModule($provide) {
    $provide.factory('googlePlacesApi', function geocoderF() {
      return {
      };
    });
    $provide.factory('Geocoder', function geocoderF() {
      return {
      };
    });
    $provide.factory('VotingUtils', function votingUtilsF() {
      return {
      };
    });
    $provide.factory('toastr', function toastrF() {
      return {
        success: noFunc
      };
    });
    $provide.factory('Raven', function RavenF() {
      return {
      };
    });
    $provide.factory('Cart', function RavenF() {
      return {
      };
    });
  }));

  beforeEach(inject(function injectF(_$compile_, _$rootScope_, _$timeout_, _$httpBackend_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $timeout = _$timeout_;
    $httpBackend = _$httpBackend_;
    $scope = $rootScope.$new();
  }));

  it('should render kids directive', renderKidsDir);
  function renderKidsDir() {
    var el;
    $httpBackend.expect('GET', '/api/login').respond(200, '');
    $httpBackend.expect('GET', '/api/categories').respond(200, '');
    el = loadKidDir($scope);
    expect(el.find('ng-form').length).toBeGreaterThan(0);
  }

  it('should check oldData on basic info', checkDataOnBasic);
  function checkDataOnBasic() {
    var el;
    var scope;
    var data = {
      first_name: 'test'
    };
    $scope.kid = angular.copy(data);
    $httpBackend.expect('GET', '/api/login').respond(200, '');
    $httpBackend.expect('GET', '/api/categories').respond(200, '');
    el = loadKidDir($scope);
    scope = el.find('[edit-kid-basic]').scope();
    expect(scope.oldData).toEqual(data);
    $scope.kid.first_name = 'test2';
    $scope.$digest();
    expect(scope.oldData).toEqual(data);
    scope.revertOldData();
    data._tabSavedState = { 0: true };
    expect($scope.kid).toEqual(data);
  }

  it('should check oldData on contacts', checkDataOnContacts);
  function checkDataOnContacts() {
    var el;
    var scope;
    var data = {
      contacts: [
        {
          first_name: 'pickup',
          pickup: true
        },
        {
          first_name: 'test',
          emergency: true
        }
      ]
    };
    $scope.kid = angular.copy(data);
    $httpBackend.expect('GET', '/api/login').respond(200, '');
    $httpBackend.expect('GET', '/api/categories').respond(200, '');
    el = loadKidDir($scope);
    scope = el.find('[edit-kid-contacts]').scope();
    expect(scope.oldData).toEqual(data);
    $scope.kid.contacts[0].first_name = 'test2';
    $scope.kid.contacts[1].first_name = 'test2';
    $scope.$digest();
    expect(scope.oldData).toEqual(data);
    scope.revertOldData();
    $scope.kid.contacts.sort();
    expect($scope.kid.contacts[0].first_name).toEqual('test2');
    expect($scope.kid.contacts[1]).toEqual(data.contacts[1]);
  }

  it('should check extend kid on basic info', checkExtendKidBasic);
  function checkExtendKidBasic() {
    var el;
    var scope;
    var data = {
      first_name: 'test',
      contacts: [
        {
          first_name: 'pickup',
          pickup: true
        },
        {
          first_name: 'test',
          emergency: true
        }
      ]
    };
    $scope.kid = {};
    $httpBackend.expect('GET', '/api/login').respond(200, '');
    $httpBackend.expect('GET', '/api/categories').respond(200, '');
    el = loadKidDir($scope);
    scope = el.find('[edit-kid-basic]').scope();
    expect(scope.kid).toEqual({});
    scope.extendKid(data);
    expect(scope.kid).toEqual({ first_name: 'test' });
  }

  it('should check extend kid on contacts', checkExtendKidContacts);
  function checkExtendKidContacts() {
    var el;
    var scope;
    var contacts = [
      {
        first_name: 'pickup',
        pickup: true
      },
      {
        first_name: 'test',
        emergency: true
      }
    ];
    var data = {
      first_name: 'test'
    };
    data.contacts = angular.copy(contacts);
    $scope.kid = { contacts: [] };
    $httpBackend.expect('GET', '/api/login').respond(200, '');
    $httpBackend.expect('GET', '/api/categories').respond(200, '');
    el = loadKidDir($scope);
    scope = el.find('[edit-kid-contacts]').scope();
    scope.extendKid(data);
    expect(scope.kid.contacts).toEqual([contacts[1]]);
  }

});
