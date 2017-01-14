(function kidsProfileMainDirectives() {
  'use strict';

  angular.module('easyCamp.KidsProfile')
    .directive('editKid', editKidDirective)
    .directive('editKidBasic', editKidBasicDirective)
    .directive('editKidContacts', editKidContactsDirective)
    .directive('editKidMedicalInfo', editKidMedicalInfoDirective)
    .directive('editKidParents', editKidParentsDirective)
    .directive('editKidPickupContacts', editKidPickupContactsDirective)
    .directive('customQuestionsKids', customQuestionsKids)
    .directive('waiversKids', waiversKids)
    .directive('schoolCustomQuestionsKids', schoolCustomQuestionsKids)
    .directive('schoolWaiversKids', schoolWaiversKids)
    .directive('formatDate', ['$filter', formatDateDirective])
    .directive('setLocationName', ['VotingUtils', setLocationNameDirective])
    .directive('gradeInput', gradeInputDirective)
    .constant('FORM_NAMES', FORM_NAMES());

  function FORM_NAMES() {
    return [
      'kidBasicForm',
      'kidParentsForm',
      'kidContactsForm',
      'kidMedicalInfoForm',
      'kidContactPickupForm',
      'customQuestionsForm',
      'providerWaiversForm',
      'schoolCustomQuestionsForm',
      'schoolWaiversForm'
    ];
  }

  function editKidDirective() {
    return {
      restrict: 'A',
      scope: {
        kid: '=',
        // required for same as select
        kids: '=?',
        // required for same as select
        kidPickupContacts: '=?',
        disableBackend: '=?',
        disableCustomQuestions: '=?'
      },
      templateUrl: 'kidsprofile/views/directives/editview.html',
      controller: 'EditKidDetailsController'
    };
  }

  function editKidBasicDirective() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/editkidbasic.html',
      link: linkSharedFn,
      controller: 'EditKidBasicController',
      require: '^editKid'
    };
  }

  function editKidContactsDirective() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/editemergency.html',
      link: linkSharedFn,
      controller: 'EditKidContactsController',
      require: '^editKid'
    };
  }

  function editKidMedicalInfoDirective() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/editmedical.html',
      link: linkSharedFn,
      controller: 'EditKidMedicalInfoController',
      require: '^editKid'
    };
  }

  function editKidParentsDirective() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/editkidparents.html',
      link: linkSharedFn,
      controller: 'EditKidParentsController',
      require: '^editKid'
    };
  }

  function editKidPickupContactsDirective() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/editpickup.html',
      link: linkSharedFn,
      controller: 'EditKidPickupContactsController',
      require: '^editKid'
    };
  }

  function customQuestionsKids() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/custom_questions.html',
      link: linkSharedFn,
      controller: 'CustomQuestionsKidsController',
      bindToController: true,
      controllerAs: 'vm',
      require: '^editKid'
    };
  }

  function waiversKids() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/waiver_form.html',
      link: linkSharedFn,
      controller: 'WaiversKidsController',
      bindToController: true,
      controllerAs: 'vm',
      require: '^editKid'
    };
  }

  function schoolCustomQuestionsKids() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/school_custom_questions.html',
      link: linkSharedFn,
      controller: 'SchoolCustomQuestionsKidsController',
      bindToController: true,
      controllerAs: 'vm',
      require: '^editKid'
    };
  }

  function schoolWaiversKids() {
    return {
      restrict: 'A',
      scope: true,
      templateUrl: 'kidsprofile/views/directives/school_waiver_form.html',
      link: linkSharedFn,
      controller: 'SchoolWaiversKidsController',
      bindToController: true,
      controllerAs: 'vm',
      require: '^editKid'
    };
  }

  function formatDateDirective($filter) {
    /* Directive that formats Date object to string,
     * required by backend.
     */
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function linkFn(scope, elem, attrs, ctrl) {
        if (!ctrl) return;
        ctrl.$parsers.push(function parser(value) {
          if (angular.isDate(value)) {
            return $filter('date')(value, 'yyyy-MM-dd');
          }
          return value;
        });
      }
    };
  }

  function setLocationNameDirective(VotingUtils) {
    return {
      require: '?ngModel',
      link: function linkFn(scope) {
        function cleanSchool(resp) {
          var school;
          if (resp.length) {
            school = resp[0];
            scope.school.id = school.id;
          } else {
            scope.school.id = undefined;
          }
        }

        function errCallback() {
          scope.school.id = undefined;
        }

        scope.$on('g-places-autocomplete:select', function onSelect(e, place) {
          e.stopPropagation();
          VotingUtils.findSchool(place, cleanSchool, errCallback);
          VotingUtils.appendGeoData(place, scope.school);
        });
      }
    };
  }

  function gradeInputDirective() {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function linkFn(scope, elem, attrs, ngModel) {
        var min = parseInt(attrs.min, 10) || -2;
        var max = parseInt(attrs.max, 10) || 12;

        function gradeMinMaxValidation(modelValue) {
          return modelValue >= min && modelValue <= max;
        }
        ngModel.$validators.gradeMinMaxValidation = gradeMinMaxValidation;

        function parseGrades(value) {
          if (/^pre-?school$/i.test(value)) {
            return '-2';
          }
          if (/^pre-?kindergarten$/i.test(value)) {
            return '-1';
          }
          if (/^kindergarten$/i.test(value)) {
            return '0';
          }
          return value;
        }
        ngModel.$parsers.unshift(parseGrades);

        function formatGrades(value) {
          if (value === '0' || value === 0) {
            return 'Kindergarten';
          }
          if (value === '-1' || value === -1) {
            return 'Pre-Kindergarten';
          }
          if (value === '-2' || value === -2) {
            return 'Pre-School';
          }
          return value;
        }
        ngModel.$formatters.unshift(formatGrades);
      }
    };
  }

  function linkSharedFn(scope, el, attrs, ctrl) {
    var thisTab = parseInt(attrs.tabNum, 10);
    var formNames = FORM_NAMES();
    var thisForm = scope.forms[formNames[thisTab]];
    var unwatchSavedEvent;
    var unwatchReplacedEvent;
    var unwatchForm;
    copyOldData();

    scope.saveKid = ctrl.saveKid;

    scope.copyOldData = copyOldData;
    scope.revertOldData = revertOldData;
    scope.setDirty = setDirty;
    scope.setPristine = setPristine;
    scope.scrollToElement = scrollToElement;
    scope.extendKid = extendKid;
    scope.getFieldsFrom = getFieldsFrom;

    unwatchSavedEvent = scope.$on('kidsprofile:kidSaved', copyOldData);
    unwatchReplacedEvent = scope.$on('kidsprofile:kidReplaced', copyOldData);
    unwatchForm = scope.$watch('forms.' + formNames[thisTab] + '.$dirty', watchThisFormDirtyState);
    scope.$on('$destroy', detroyOnDirective);

    function watchThisFormDirtyState(dirty) {
      if (dirty) {
        ctrl.setTabSavedState(thisTab);
      }
    }
    function getFieldsFrom(kid, omitFields) {
      return ctrl.getFieldsForTab(kid, thisTab, omitFields);
    }
    function copyOldData() {
      scope.oldData = ctrl.getFieldsForTab(scope.kid, thisTab);
    }
    function extendKid(kid) {
      if (thisTab === 2 || thisTab === 4) {
        updateContacts(kid, thisTab);
      } else {
        angular.extend(scope.kid, ctrl.getFieldsForTab(kid, thisTab));
      }
    }
    function revertOldData() {
      var fieldsObj = ctrl.getFieldsForTab(scope.kid, thisTab);
      var oldContacts;
      var filteredOldContacts;
      angular.forEach(fieldsObj, function fieldsObjIterate(val, i) {
        if (thisTab === 2) {
          oldContacts = angular.copy(scope.kid[i]);
          filteredOldContacts = oldContacts.filter(pickupOnly);
          scope.kid[i] = filteredOldContacts.concat(scope.oldData[i].filter(emergencyOnly));
        } else if (thisTab === 4) {
          oldContacts = angular.copy(scope.kid[i]);
          filteredOldContacts = oldContacts.filter(emergencyOnly);
          scope.kid[i] = filteredOldContacts.concat(scope.oldData[i].filter(pickupOnly));
        } else {
          scope.kid[i] = angular.copy(scope.oldData[i]);
        }
      });
      setPristine();
      ctrl.setTabSavedState(thisTab, true);
    }
    function setDirty() {
      thisForm.$setDirty();
    }
    function setPristine() {
      thisForm.$setPristine();
    }
    function detroyOnDirective() {
      unwatchReplacedEvent();
      unwatchSavedEvent();
      unwatchForm();
    }
    function scrollToElement() {
      angular.element(document).scrollToElementAnimated(el, 70);
    }
    function updateContacts(kid, tab) {
      var contacts = scope.kid.contacts;
      var newContacts = kid.contacts;
      var filterOut;
      var filterIn;
      if (tab === 2) {
        filterOut = pickupOnly;
        filterIn = emergencyOnly;
      } else if (tab === 4) {
        filterOut = emergencyOnly;
        filterIn = pickupOnly;
      } else {
        return;
      }
      if (contacts && newContacts && newContacts.length) {
        scope.kid.contacts = scope.kid.contacts.filter(filterOut);
        scope.kid.contacts = scope.kid.contacts.concat(
          kid.contacts.filter(filterIn)
        );
      }
    }
    function pickupOnly(contact) {
      return contact.pickup;
    }
    function emergencyOnly(contact) {
      return contact.emergency;
    }
  }

}());
