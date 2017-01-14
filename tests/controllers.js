'use strict';

describe('Unit: EditKidDetailsController Controller', function EditKidBasicController() {

  var scope;
  var ctrl;
  var $httpBackend;
  function noFunc() {
  }

  beforeEach(module('easyCamp.KidsProfile'));

  beforeEach(module(function beforeEach($provide) {
    // TODO: check we need this
    $provide.factory('Raven', function RavenF() {
      return {
        setUserContext: noFunc
      };
    });
    $provide.factory('Cart', function RavenF() {
      return {
        update: noFunc
      };
    });
    $provide.factory('toastr', function RavenF() {
      return {};
    });
    $provide.constant('FORM_NAMES', function FORM_NAMES() {
      return [];
    });
  }));

  beforeEach(inject(function inject(_$controller_, _$rootScope_, _$httpBackend_) {
    $httpBackend = _$httpBackend_;
    scope = _$rootScope_.$new();

    ctrl = _$controller_('EditKidDetailsController', {
      $scope: scope
    });

  }));

  it('should save/update/keep in memory kid', function shouldCallSave() {
    var backKid = {
      id: 1
    };
    scope.kid = {};
    $httpBackend.expect('GET', '/api/login').respond(200, '');
    $httpBackend.flush();
    ctrl.saveKid();
    $httpBackend.expect('POST', '/api/child').respond(200, backKid);
    $httpBackend.flush();
    expect(scope.kid.id).toBe(1);
    scope.disableBackend = true;
    ctrl.saveKid();
    $httpBackend.verifyNoOutstandingExpectation();
    scope.disableBackend = false;
    ctrl.saveKid();
    $httpBackend.expect('PATCH', '/api/child/1').respond(200, backKid);
    $httpBackend.flush();
  });

  it('should test tab completion', function shouldTestTabCompletion() {
    var completed;
    scope.kid = {};
    completed = scope.completeTab();
    expect(completed).toBe(false);
  });

  it('should test tab basic completion for adult kid', shouldTestTabAbultBasicCompletion);
  function shouldTestTabAbultBasicCompletion() {
    var completed;
    scope.kid = {
      first_name: 'First',
      last_name: 'Last',
      street: 'Street',
      city: 'City',
      state: 'WA',
      zip: '1',
      phone: '1',
      is_adult: true
    };
    completed = scope.completeTab(0);
    expect(completed).toBe(true);
  }

  it('should test tab basic completion for underage kid', shouldTestTabBasicCompletion);
  function shouldTestTabBasicCompletion() {
    var completed;
    var additionalFields;
    scope.kid = {
      first_name: 'First',
      last_name: 'Last',
      street: 'Street',
      city: 'City',
      state: 'WA',
      zip: '1',
      phone: '1'
    };
    additionalFields = {
      birth_date: '1/1/1998',
      gender: 'M',
      high_school_graduation_year: '1/1/2016'
    };
    completed = scope.completeTab(0);
    expect(completed).toBe(false);
    angular.extend(scope.kid, additionalFields);
    completed = scope.completeTab(0);
    expect(completed).toBe(true);
  }

  it('should test contacts completion', shouldTestContactsCompletion);
  function shouldTestContactsCompletion() {
    var completed;
    scope.kid = {
      contacts: []
    };
    completed = scope.completeTab(2);
    expect(completed).toBe(false);
    scope.kid.contacts = [{}];
    completed = scope.completeTab(2);
    expect(completed).toBe(false);
    scope.kid.contacts = [{ emergency: true, trash: false }];
    completed = scope.completeTab(2);
    expect(completed).toBe(true);
  }

  it('should test pickups completion strict/non-strict', shouldTestPickupsCompletion);
  function shouldTestPickupsCompletion() {
    var completed;
    scope.kid = {
      contacts: []
    };
    scope.currentTab = 4;
    completed = scope.completeTab(4);
    expect(completed).toBe(true);
    completed = scope.notEmptyTab(scope.kid);
    expect(completed).toBe(false);
    scope.kid.contacts = [{}];
    completed = scope.completeTab(4);
    expect(completed).toBe(true);
    completed = scope.notEmptyTab(scope.kid);
    expect(completed).toBe(false);
    scope.kid.contacts = [{ pickup: true, trash: false }];
    completed = scope.completeTab(4);
    expect(completed).toBe(true);
    completed = scope.notEmptyTab(scope.kid);
    expect(completed).toBe(true);
  }

  it('should test tab change', shouldTestTabChange);
  function shouldTestTabChange() {
    scope.currentTab = 0;
    scope.kid = {
      id: 1
    };
    scope.$emit('kidsprofile:kidSaved', { kid_id: 1 });
    expect(scope.currentTab).toBe(1);
  }

});

describe('Unit: EditKidBasicController Controller', function EditKidBasicController() {

  var scope;
  var editKidscope;
  var $httpBackend;
  var $rootScope;
  var VotingUtils;
  function noFunc() {
  }

  beforeEach(module('easyCamp.KidsProfile'));

  beforeEach(module(function beforeEach($provide) {
    $provide.factory('Raven', function RavenF() {
      return {};
    });
    $provide.factory('toastr', function toastrF() {
      return {
        success: noFunc
      };
    });
    $provide.factory('Cart', function CartF() {
      return {
        update: noFunc
      };
    });
    $provide.factory('Geocoder', function GeoCoderF() {
      return {
        getCoordinatesForAddress: function tempPromise() {
          return {
            then: function thenCallb(f) {
              f({});
            }
          };
        }
      };
    });
  }));

  beforeEach(inject(function inject(_$rootScope_, $controller, _$httpBackend_) {
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    editKidscope = $rootScope.$new();

    scope = editKidscope.$new();

    $controller('EditKidBasicController', {
      $scope: scope,
      VotingUtils: VotingUtils
    });

  }));

  it('should update birth_date_estimated kid on birth_date chage', function shouldUpdateBirth() {
    // Find out where that came from
    $httpBackend.expect('GET', '/api/categories').respond(200, '');
    $httpBackend.expect('GET', '/api/login').respond(200, '');
    scope.kid = {};
    scope.saveKid = noFunc;
    scope.kidBasicForm = { $setPristine: noFunc };
    scope.$digest();
    scope.kid.birth_date = Date();
    scope.$digest();
    scope.saveKidAndgoToNextTab();
    expect(scope.kid.birth_date_estimated).toBe(false);
  });

});

describe('Unit: CustomQuestionsKidsController Controller', function CustomQuestionsKidsController() {

  var scope;
  var $httpBackend;
  var $rootScope;
  var ctrl;
  var questions = [
    {
      provider: {
        id: 1,
        name: 'test'
      },
      answers: [
        {
          child: 1,
          id: 1,
          text: 'answer'
        }
      ]
    }
  ];
  function noFunc() {
  }

  beforeEach(module('easyCamp.KidsProfile'));

  beforeEach(module(function beforeEach($provide) {
    $provide.factory('Raven', function RavenF() {
      return {};
    });
    $provide.factory('toastr', function toastrF() {
      return {
        success: noFunc
      };
    });
    $provide.factory('Cart', function CartF() {
      return {
        update: noFunc
      };
    });
    $provide.factory('CustomQuestionsService', function GeoCoderF() {
      return {
        query: function query() {
          return {
            $promise: {
              then: function then(callback) {
                callback(questions);
              }
            }
          };
        }
      };
    });
  }));

  beforeEach(inject(function inject(_$rootScope_, $controller, _$httpBackend_) {
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    scope = $rootScope.$new();

    scope.kid = {
      id: 1,
      custom_questions: questions
    };

    scope.saveKid = noFunc;

    ctrl = $controller('CustomQuestionsKidsController', {
      $scope: scope
    });

  }));

  it('should check questions save, retrieval', function shouldUpdateBirth() {
    // Find out where that came from
    $httpBackend.expect('GET', '/api/categories').respond(200, '');
    $httpBackend.expect('GET', '/api/login').respond(200, '');
    ctrl.save();
    expect(scope.kid.answered_provider_questions).toEqual([{ id: 1, child: 1, text: 'answer' }]);
    expect(ctrl.questionsByProvider).toEqual({ 1: questions });
    expect(ctrl.providerNamesById).toEqual({1: 'test'});
  });

});
