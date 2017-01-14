(function editKidsDirectiveControllers() {
  'use strict';

  angular.module('easyCamp.KidsProfile')
    .controller('EditKidDetailsController', EditKidDetailsController)
    .controller('EditKidBasicController', EditKidBasicController)
    .controller('EditKidContactsController', EditKidContactsController)
    .controller('EditKidMedicalInfoController', EditKidMedicalInfoController)
    .controller('EditKidParentsController', EditKidParentsController)
    .controller('EditKidPickupContactsController', EditKidPickupContactsController)
    .controller('CustomQuestionsKidsController', CustomQuestionsKidsController)
    .controller('WaiversKidsController', WaiversKidsController)
    .controller('SchoolCustomQuestionsKidsController', SchoolCustomQuestionsKidsController)
    .controller('SchoolWaiversKidsController', SchoolWaiversKidsController);

  EditKidDetailsController.$inject = [
    '$scope', 'kidsProfileComplete', 'ChildHelpers', 'FORM_NAMES'
  ];
  function EditKidDetailsController(
      $scope, kidsProfileComplete, ChildHelpers, formNames) {
    var vm = this;
    var unwatchSavedEvent;

    $scope.currentTab = 0;
    $scope.tabs = [
      { num: 0, name: 'Student Information' },
      { num: 1, name: 'Parents/Guardians' },
      { num: 2, name: 'Emergency Contacts' },
      { num: 3, name: 'Medical Information' },
      { num: 4, name: 'Pickup Contacts' }
    ];
    if (!$scope.disableCustomQuestions) {
      $scope.tabs.push(
        { num: 5, name: 'Provider Questions' },
        { num: 6, name: 'Provider Waivers' },
        { num: 7, name: 'Schools Questions' },
        { num: 8, name: 'Schools Waivers' }
      );
    }
    $scope.forms = {};

    // EXPORT
    vm.saveKid = saveKid;
    vm.setTabSavedState = setTabSavedState;
    vm.getFieldsForTab = ChildHelpers.pickTabFields;

    // Template controls //
    $scope.goToTab = goToTab;
    $scope.basicCompleted = basicCompleted;
    $scope.notThisAndNewKid = notThisAndNewKid;
    $scope.notEmptyTab = notEmptyTab;
    $scope.completeTab = completeTab;

    unwatchSavedEvent = $scope.$on('kidsprofile:kidSaved', onKidSaved);

    $scope.$on('$destroy', unwatchSavedEvent);

    function cleanUpErrors() {
      $scope.errorsDataUpdate = {};
      $scope.errorsDataCreate = {};
    }

    function preKidSave(kid) {
      var process = true;
      var i;
      var formName;
      var formLength = formNames.length;
      cleanUpErrors();
      if ($scope.disableBackend) {
        process = false;
        kid._tabSavedState[$scope.currentTab] = true;
        for (i = 0; i < formLength; i++) {
          formName = formNames[i];
          if ($scope.forms[formName]) {
            $scope.forms[formName].$setPristine();
          }
        }
        goToNextTab();
      }
      return process;
    }

    function saveKid(callback, errorCallback) {
      ChildHelpers.saveKid($scope.kid, $scope.currentTab, callback, errorCallback, preKidSave);
    }

    function goToNextTab() {
      if ($scope.currentTab + 1 < $scope.tabs.length) {
        $scope.currentTab += 1;
      }
    }

    function goToTab(num) {
      $scope.currentTab = num;
    }

    function setTabSavedState(tab, val) {
      var state = false;
      if (val) {
        state = val;
      }
      if (angular.isDefined($scope.kid._tabSavedState)) {
        $scope.kid._tabSavedState[tab] = state;
      } else {
        $scope.kid._tabSavedState = {};
        $scope.kid._tabSavedState[tab] = state;
      }
    }

    function notThisAndNewKid(kid) {
      if (kid._state === '_new' || kid.trash === true) {
        return false;
      }
      return !angular.equals(kid, $scope.kid);
    }

    // strict version used in contacts panels
    function notEmptyTab(kid) {
      return kidsProfileComplete(kid, $scope.currentTab, true);
    }

    // non strict version used in main template
    function completeTab(tab) {
      return kidsProfileComplete($scope.kid, tab);
    }

    function basicCompleted() {
      return kidsProfileComplete($scope.kid, 0);
    }

    function onKidSaved(e, obj) {
      if (obj && obj.kid_id === $scope.kid.id) {
        setTabSavedState(obj.tab, true);
        goToNextTab();
      }
    }
  }

  EditKidBasicController.$inject = [
    '$scope', 'Geocoder', 'VotingUtils', 'toastr', 'TagsSources', 'ChildHelpers'
  ];
  function EditKidBasicController(
      $scope, Geocoder, VotingUtils, toastr, TagsSources, ChildHelpers) {
    var unwatchSelectChange;
    var unwatchGrade;
    var unwatchHighSchool;
    var unwatchBirthDate;
    var unwatchGPlace;

    // Although we need to flatten the interests array created
    // by ngTagsInput before sending it to the backend (see
    // flattenInterests()), we don't need to unflatten the array
    // received from the backend, because ngTagsInput will do that
    // itself.
    $scope.loadInterests = TagsSources.interests;
    $scope.shirtSizes = ['XS', 'S', 'M', 'L', 'XL'];
    $scope.gradeOptions = [
      { label: 'Pre-School', value: -2 },
      { label: 'Pre-Kindergarten', value: -1 },
      { label: 'Kindergarten', value: 0 },
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
      { label: '4', value: 4 },
      { label: '5', value: 5 },
      { label: '6', value: 6 },
      { label: '7', value: 7 },
      { label: '8', value: 8 },
      { label: '9', value: 9 },
      { label: '10', value: 10 },
      { label: '11', value: 11 },
      { label: '12', value: 12 }
    ];
    $scope.currentDate = new Date();
    $scope.revertData = revertData;
    $scope.saveKidAndgoToNextTab = saveKidAndgoToNextTab;

    unwatchSelectChange = $scope.$watch('kidSameAsSelect', kidSameAsSelectWatch);
    unwatchGrade = $scope.$watch('kid_grade', kidGradeWatch);
    unwatchHighSchool = $scope.$watch(
      'kid.high_school_graduation_year', highSchoolGraduationYearWatch);
    unwatchBirthDate = $scope.$watch('kid.birth_date', birthDateWatch);
    unwatchGPlace = $scope.$on('g-places-autocomplete:select', gPlacesAutocompleteWatch);

    $scope.$on('$destroy', unwatchWatchers);

    function unwatchWatchers() {
      unwatchSelectChange();
      unwatchGrade();
      unwatchHighSchool();
      unwatchBirthDate();
      unwatchGPlace();
    }

    function revertData() {
      $scope.revertOldData();
    }

    function kidSameAsSelectWatch(newVal) {
      if (angular.isDefined(newVal)) {
        angular.extend(
          $scope.kid,
          ChildHelpers.pickFields(newVal, [
            'street', 'city', 'state', 'zip', 'country', 'phone'
          ])
        );
        $scope.setDirty();
      }
    }

    function kidGradeWatch(newVal) {
      var thisYear = $scope.currentDate.getFullYear();
      if (angular.isDefined(newVal)) {
        newVal = parseInt(newVal);
        if (!angular.isNumber(newVal) || isNaN(newVal)) {
          return;
        }
        $scope.kid.high_school_graduation_year = thisYear + (12 - newVal + 1);
      }
    }

    function highSchoolGraduationYearWatch(newVal) {
      var thisYear = $scope.currentDate.getFullYear();
      if (angular.isDefined(newVal)) {
        newVal = parseInt(newVal);
        if (!angular.isNumber(newVal) || isNaN(newVal)) {
          return;
        }
        $scope.kid_grade = 12 - (newVal - thisYear) + 1;
      }
    }

    function birthDateWatch(newVal, oldVal) {
      if (newVal && newVal !== oldVal) {
        $scope.kid.birth_date_estimated = false;
      }
    }

    function gPlacesAutocompleteWatch(e, place) {
      e.stopPropagation();
      VotingUtils.findSchool(place, cleanSchool, errCallback);
      if (!$scope.kid.current_school) {
        $scope.kid.current_school = {};
      }
      VotingUtils.appendGeoData(place, $scope.kid.current_school);
    }

    function constructAddress(kid) {
      var address = '';
      if (!kid) {
        return address;
      }
      address += kid.street;
      address += ', ';
      address += kid.city;
      address += ', ';
      address += kid.state;
      address += ' ';
      address += kid.country;
      return address;
    }

    function cleanSchool(resp) {
      var school;
      if (resp.length) {
        school = resp[0];
        $scope.kid.current_school.id = school.id;
      } else {
        $scope.kid.current_school.id = undefined;
      }
    }

    function errCallback() {
      $scope.kid.current_school.id = undefined;
    }

    function saveKidAndgoToNextTab() {
      var address = constructAddress($scope.kid);
      Geocoder.getCoordinatesForAddress(address).then(
        function GeoCoderSuccResp(coordinates) {
          $scope.kid.lat = coordinates.lat;
          $scope.kid.lng = coordinates.lng;
          saveTab();
        },
        function GeoCoderErrResp() {
          $scope.kid.lat = null;
          $scope.kid.lng = null;
          saveTab();
        }
      );
    }

    function saveTab() {
      $scope.errorsKidData = {};
      $scope.saveKid(
        function saveKidSuccResp() {
          $scope.setPristine();
          $scope.copyOldData();
          toastr.success('Student information saved.');
          $scope.scrollToElement();
        },
        function saveKidErrResp(res) {
          $scope.errorsKidData = res.data;
        }
      );
    }
  }

  EditKidContactsController.$inject = ['$scope', '_', 'toastr', 'ChildHelpers'];
  function EditKidContactsController($scope, _, toastr, ChildHelpers) {
    var contactRef;
    var unwatchSelectChange;
    var unwatchPickupChange;

    $scope.contactsFields = [
      'first_name', 'last_name', 'email', 'phone1', 'phone2', 'relationship',
      'trash'
    ];

    $scope.addNewContact = addNewContact;
    $scope.editContact = editContact;
    $scope.saveChanges = saveChanges;
    $scope.cancelChanges = cancelChanges;
    $scope.deleteContact = deleteContact;
    $scope.revertContacts = revertContacts;
    $scope.removeCurrentKidContacts = removeCurrentKidContacts;
    $scope.saveKidAndgoToNextTab = saveKidAndgoToNextTab;

    unwatchPickupChange = $scope.$watch('kidSameAsSelect', onKidSameAsSelectChange);
    unwatchSelectChange = $scope.$watch('contactPickupSelect', onContactPickupSelectChange);

    $scope.$on('$destroy', unwatchWatchers);

    function unwatchWatchers() {
      unwatchSelectChange();
      unwatchPickupChange();
    }

    function addNewContact() {
      $scope.activeContact = {
        trash: false,
        phone2: '',
        relationship: '',
        emergency: true,
        new: true
      };
    }

    function editContact(contact) {
      $scope.activeContact = angular.copy(contact);
      contactRef = contact;
    }

    function deleteContact(contact) {
      contact.trash = true;
      $scope.setDirty();
    }

    function saveChanges() {
      if (contactRef) {
        angular.extend(contactRef, $scope.activeContact);
        contactRef = undefined;
      } else {
        $scope.kid.contacts.unshift($scope.activeContact);
      }
      $scope.setDirty();
      cancelChanges();
    }

    function cancelChanges() {
      $scope.activeContact = undefined;
      $scope.contactPickupSelect = null;
    }

    function onKidSameAsSelectChange(kid) {
      if (kid) {
        $scope.extendKid(kid);
        $scope.setDirty();
      }
    }

    function onContactPickupSelectChange(newVal) {
      var newContact;
      if (!newVal) return;
      newContact = angular.copy(newVal);
      delete newContact.id;
      newContact.new = true;
      newContact.emergency = true;
      newContact.pickup = false;
      $scope.activeContact = newContact;
    }

    function removeCurrentKidContacts(contact) {
      if (ChildHelpers.angularIn(
          contact,
          _.filter($scope.kid.contacts, { emergency: true }),
          $scope.contactsFields) > -1) {
        return false;
      }
      return true;
    }

    function revertContacts() {
      $scope.revertOldData();
      $scope.contactPickupSelect = null;
      $scope.kidSameAsSelect = null;
    }

    function saveKidAndgoToNextTab() {
      $scope.errorsKidData = {};
      $scope.saveKid(
        function success(kid) {
          $scope.setPristine();
          toastr.success('Emergency contacts saved.');
          $scope.kid.contacts = angular.copy(kid.contacts);
          $scope.copyOldData();
          $scope.scrollToElement();
        },
        function failure(res) {
          $scope.errorsKidData = res.data;
        }
      );
    }
  }

  EditKidMedicalInfoController.$inject = ['$scope', 'toastr'];
  function EditKidMedicalInfoController($scope, toastr) {
    var unwatchSelectChange;
    var discardFields = [
      'special_needs', 'dietary_restrictions', 'allergy',
      'physical_restrictions', 'note'
    ];

    $scope.revertData = revertData;
    $scope.saveKidAndgoToNextTab = saveKidAndgoToNextTab;

    unwatchSelectChange = $scope.$watch('kidSameAsSelect', kidSameAsSelectWatch);

    $scope.$on('$destroy', unwatchSelectChange);

    function revertData() {
      $scope.revertOldData();
    }

    function kidSameAsSelectWatch(kid) {
      if (kid) {
        angular.extend($scope.kid, $scope.getFieldsFrom(kid, discardFields));
        $scope.setDirty();
      }
    }

    function saveKidAndgoToNextTab() {
      $scope.errorsKidData = {};
      $scope.saveKid(function saveKidCallback() {
        $scope.setPristine();
        $scope.copyOldData();
        toastr.success('Medical information saved.');
        $scope.scrollToElement();
      }, function saveKidErrCallback(res) {
        $scope.errorsKidData = res.data;
      });
    }

  }

  EditKidParentsController.$inject = ['$scope', 'toastr', '_'];
  function EditKidParentsController($scope, toastr, _) {
    var unwatchSelectChange;
    var parentRef;

    $scope.activeParent = null;
    $scope.revertData = revertData;
    $scope.addNewParent = addNewParent;
    $scope.editParent = editParent;
    $scope.deleteThisParent = deleteThisParent;
    $scope.saveChanges = saveChanges;
    $scope.cancelChanges = cancelChanges;
    $scope.saveKidAndgoToNextTab = saveKidAndgoToNextTab;

    unwatchSelectChange = $scope.$watch('kidSameAsSelect', onKidSameAsSelectChange);

    $scope.$on('$destroy', unwatchSelectChange);

    function editParent(parent) {
      $scope.activeParent = angular.copy(parent);
      parentRef = parent;
    }

    function saveChanges() {
      if (parentRef) {
        angular.extend(parentRef, $scope.activeParent);
        parentRef = undefined;
      } else {
        $scope.kid.parents.unshift($scope.activeParent);
      }
      cancelChanges();
    }

    function cancelChanges() {
      $scope.activeParent = undefined;
    }

    function revertData() {
      $scope.revertOldData();
    }

    function onKidSameAsSelectChange(kid) {
      if (kid) {
        $scope.extendKid(kid);
        $scope.setDirty();
      }
    }

    function saveKidAndgoToNextTab() {
      $scope.errorsKidData = {};
      $scope.saveKid(
        function success(kid) {
          $scope.kid.parents = kid.parents;
          $scope.setPristine();
          $scope.copyOldData();
          toastr.success('Parents and guardians saved.');
          $scope.scrollToElement();
        },
        function failure(res) {
          $scope.errorsKidData = res.data;
        }
      );
    }

    function addNewParent() {
      var currentUser = $scope.currentUser || {};
      var newParent = {
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        email: currentUser.email,
        zip: $scope.kid.zip,
        country: $scope.kid.country,
        street: $scope.kid.street,
        city: $scope.kid.city,
        state: $scope.kid.state,
        phone1: $scope.kid.phone
      };
      // prefill parent
      if ($scope.kid.parents && $scope.kid.parents.length > 0) {
        currentUser = $scope.kid.parents[0];
        newParent = {
          // phone1: currentUser.phone1,
          // phone2: currentUser.phone2,
          zip: $scope.kid.zip,
          country: $scope.kid.country,
          street: $scope.kid.street,
          city: $scope.kid.city,
          state: $scope.kid.state
        };
      }
      $scope.activeParent = newParent;
      $scope.setDirty();
    }

    function deleteThisParent(parent) {
      var parentIndex;
      parentIndex = _.indexOf($scope.kid.parents, parent);
      $scope.kid.parents.splice(parentIndex, 1);
      if (parent.id) {
        $scope.setDirty();
      }
    }

  }

  EditKidPickupContactsController.$inject = [
    '$scope', '_', 'toastr', 'ChildHelpers'
  ];
  function EditKidPickupContactsController($scope, _, toastr, ChildHelpers) {
    $scope.contactsFields = [
      'first_name', 'last_name', 'email', 'phone1', 'phone2', 'relationship',
      'trash'];
    var contactRef;
    var unwatchSelectChange;
    var unwatchPickupChange;

    $scope.addNewContact = addNewContact;
    $scope.editContact = editContact;
    $scope.saveChanges = saveChanges;
    $scope.cancelChanges = cancelChanges;
    $scope.deleteContact = deleteContact;
    $scope.revertContacts = revertContacts;
    $scope.removeCurrentKidContacts = removeCurrentKidContacts;
    $scope.saveKidAndgoToNextTab = saveKidAndgoToNextTab;

    unwatchSelectChange = $scope.$watch('kidSameAsSelect', onKidSameAsSelectChange);
    unwatchPickupChange = $scope.$watch('contactPickupSelect', onContactPickupSelectChange);

    $scope.$on('$destroy', unwatchWatchers);

    function unwatchWatchers() {
      unwatchSelectChange();
      unwatchPickupChange();
    }

    function addNewContact() {
      $scope.activeContact = {
        trash: false,
        phone2: '',
        relationship: '',
        pickup: true,
        new: true
      };
    }

    function editContact(contact) {
      $scope.activeContact = angular.copy(contact);
      contactRef = contact;
    }

    function saveChanges() {
      if (contactRef) {
        angular.extend(contactRef, $scope.activeContact);
        contactRef = undefined;
      } else {
        $scope.kid.contacts.unshift($scope.activeContact);
      }
      $scope.setDirty();
      $scope.activeContact = undefined;
    }

    function cancelChanges() {
      $scope.activeContact = undefined;
      $scope.contactPickupSelect = null;
    }

    function deleteContact(contact) {
      contact.trash = true;
      $scope.setDirty();
    }

    function onContactPickupSelectChange(newVal) {
      var newContact;
      if (!newVal) return;
      newContact = angular.copy(newVal);
      delete newContact.id;
      newContact.new = true;
      newContact.pickup = true;
      newContact.emergency = false;
      $scope.activeContact = newContact;
    }

    function revertContacts() {
      $scope.revertOldData();
      $scope.contactPickupSelect = null;
      $scope.kidSameAsSelect = null;
    }

    function saveKidAndgoToNextTab() {
      $scope.errorsKidData = {};
      $scope.saveKid(
        function success(kid) {
          toastr.success('Pickup contacts saved.');
          $scope.setPristine();
          $scope.kid.contacts = angular.copy(kid.contacts);
          $scope.copyOldData();
          $scope.scrollToElement();
        },
        function failure(res) {
          $scope.errorsKidData = res.data;
        }
      );
    }

    function removeCurrentKidContacts(contact) {
      if (ChildHelpers.angularIn(
            contact,
            _.filter($scope.kid.contacts, { pickup: true }),
            $scope.contactsFields) > -1) {
        return false;
      }
      return true;
    }

    function onKidSameAsSelectChange(kid) {
      if (kid) {
        $scope.extendKid(kid);
        $scope.setDirty();
      }
    }
  }

  CustomQuestionsKidsController.$inject = ['$scope', 'toastr', 'Raven', '_'];

  /**
   * We explicitly define a 'question_answered' flag on Child that kidsProfileComplete
   * would work on and retrieve questions with answers for each provider. If there is
   * no answer yet, we create an object as template for future answer.
   *
   * We can't simply retrieve all questions as there is no relation between questions and Children.
   *
   * Answers are saved on child, similar to other controllers.
   */
  function CustomQuestionsKidsController($scope, toastr, Raven, _) {
    var vm = this;
    var kid = $scope.kid || {};
    var filterThisChild = _.partialRight(filterByChild, kid);
    var filterTheseProvidersOut;
    var removeSharedWatcher;
    vm.save = save;
    vm.processing = false;

    init();
    removeSharedWatcher = $scope.$on('sharedDataUpdated', init);
    $scope.$on('$destroy', removeSharedWatcher);

    function init() {
      vm.questions = kid.custom_questions || [];
      vm.questionsByProvider = {};
      vm.providerNamesById = {};
      if (kid.provider_ids) {
        filterTheseProvidersOut = _.partialRight(filterProviderOut, kid.provider_ids);
        vm.questions = _.filter(vm.questions, _.unary(filterTheseProvidersOut));
      }
      constructByProviders(vm.questions, writeData);
    }

    function save() {
      if (!kid.id) return;
      vm.processing = true;
      kid.answered_provider_questions = filterAnswers(vm.questions);
      $scope.saveKid(
        function saveKidSuccResp(kidData) {
          vm.processing = false;
          toastr.success('Answers saved.');
          kid.answered_provider_questions = kidData.answered_provider_questions;
          $scope.setPristine();
        },
        function saveKidErrResp(httpResponse) {
          vm.processing = false;
          $scope.errorsKidData = httpResponse.data;
          toastr.error(
            'Something went wrong while trying to save answers. ' +
            'Please reload the page and try again.');
          Raven.captureException(
            new Error('Kid answer save failure'),
            {
              extra: {
                httpResponse: httpResponse
              }
            }
          );
        }
      );
    }

    function filterAnswers(questions) {
      var answers = [];
      var i;
      var ii;
      var question;
      var answer;
      var lenii;
      var len = questions.length;
      for (i = 0; i < len; i++) {
        question = questions[i];
        if (question.answers && question.answers.length) {
          lenii = question.answers.length;
          for (ii = 0; ii < lenii; ii++) {
            answer = question.answers[ii];
            if (answer.text) {
              answers.push(answer);
            }
          }
        }
      }
      return answers;
    }

    function writeData(item) {
      var newAnswer;
      var providerId = item.provider.id;
      vm.questionsByProvider[providerId] = vm.questionsByProvider[providerId] || [];
      vm.providerNamesById[providerId] = item.provider.name;
      item.answers = item.answers.filter(_.unary(filterThisChild));
      if (!item.answers.length) {
        newAnswer = {
          question: item.id,
          child: kid.id,
          text: ''
        };
        item.answers.push(newAnswer);
      }
      vm.questionsByProvider[providerId].push(item);
    }

  }

  WaiversKidsController.$inject = ['$scope', 'toastr', 'Raven', '_'];
  function WaiversKidsController($scope, toastr, Raven, _) {
    var vm = this;
    var kid = $scope.kid || {};
    var writeThisKidData = _.partialRight(writeData, kid);
    var removeSharedWatcher;
    var filterTheseProvidersOut;
    vm.save = save;
    vm.processing = false;

    init();
    removeSharedWatcher = $scope.$on('sharedDataUpdated', init);
    $scope.$on('$destroy', removeSharedWatcher);

    function init() {
      vm.waivers = kid.waivers || [];
      vm.waiversByProvider = {};
      vm.providerNamesById = {};
      if (kid.provider_ids) {
        filterTheseProvidersOut = _.partialRight(markProviderOut, kid.provider_ids);
        vm.waivers = _.map(vm.waivers, filterTheseProvidersOut);
      }
      constructByProviders(vm.waivers, writeThisKidData);
    }

    function save() {
      if (!kid.id) return;
      vm.processing = true;
      kid.signed_waivers = filterWaivers(vm.waivers, kid);
      $scope.saveKid(
        function saveKidSuccResp(kidData) {
          vm.processing = false;
          toastr.success('Waivers saved.');
          //kid.waivers_signed = kidData.waivers_signed;
          kid.waivers = kidData.waivers;
          init();
          $scope.setPristine();
        },
        function saveKidErrResp(httpResponse) {
          vm.processing = false;
          $scope.errorsKidData = httpResponse.data;
          toastr.error(
            'Something went wrong while trying to save waivers. ' +
            'Please reload the page and try again.');
          Raven.captureException(
            new Error('Kid waiver save failure'),
            {
              extra: {
                httpResponse: httpResponse
              }
            }
          );
        }
      );
    }

    /**
     * filterWaivers
     *
     * @param {Array} items
     * @returns {Array}
     */
    function filterWaivers(items, kid) {
      var waivers = [];
      var i;
      var ii;
      var item;
      var signed;
      var lenii;
      var len = items.length;
      for (i = 0; i < len; i++) {
        item = items[i];
        if (item.checked && item.signed && item.signed.length) {
          lenii = item.signed.length;
          for (ii = 0; ii < lenii; ii++) {
            signed = item.signed[ii];
            if (signed.child_id === kid.id) {
              waivers.push(signed);
            }
          }
          signed = item.signed[0];
          waivers.push(signed);
        }
      }
      return waivers;
    }


    /**
     * writeData
     *
     * @param {Object} item
     * @param {Object} kidObj
     */
    function writeData(item, kidObj) {
      var newWaiver;
      var signFound;
      var providerId = item.provider.id;
      vm.waiversByProvider[providerId] = vm.waiversByProvider[providerId] || [];
      vm.providerNamesById[providerId] = item.provider.name;
      if (!item.signed.length) {
        newWaiver = {
          waiver: item.id,
          child: kidObj.id
        };
        item.signed.push(newWaiver);
      } else {
        signFound = _.find(item.signed, { child: kidObj.id });
        if (signFound) {
          item.checked = true;
        }
      }
      vm.waiversByProvider[providerId].push(item);
    }

  }

  SchoolCustomQuestionsKidsController.$inject = ['$scope', 'toastr', 'Raven', '_'];
  function SchoolCustomQuestionsKidsController($scope, toastr, Raven, _) {
    var vm = this;
    var kid = $scope.kid || {};
    var filterThisChild = _.partialRight(filterByChild, kid);
    var filterTheseSchoolsOut;
    var removeSharedWatcher;
    vm.save = save;
    vm.processing = false;

    init();
    removeSharedWatcher = $scope.$on('sharedDataUpdated', init);
    $scope.$on('$destroy', removeSharedWatcher);

    function init() {
      vm.questions = kid.school_custom_questions || [];
      vm.questionsByProvider = {};
      vm.providerNamesById = {};
      if (kid.school_ids) {
        filterTheseSchoolsOut = _.partialRight(filterSchoolOut, kid.school_ids);
        vm.questions = _.filter(vm.questions, _.unary(filterTheseSchoolsOut));
      }
      constructBySchools(vm.questions, writeData);
    }

    function save() {
      if (!kid.id) return;
      vm.processing = true;
      kid.answered_school_questions = filterAnswers(vm.questions);
      $scope.saveKid(
        function saveKidSuccResp(kidData) {
          vm.processing = false;
          toastr.success('Answers saved.');
          kid.answered_school_questions = kidData.answered_school_questions;
          $scope.setPristine();
        },
        function saveKidErrResp(httpResponse) {
          vm.processing = false;
          $scope.errorsKidData = httpResponse.data;
          toastr.error(
            'Something went wrong while trying to save answers. ' +
            'Please reload the page and try again.');
          Raven.captureException(
            new Error('Kid school answer save failure'),
            {
              extra: {
                httpResponse: httpResponse
              }
            }
          );
        }
      );
    }

    function filterAnswers(questions) {
      var answers = [];
      var i;
      var ii;
      var question;
      var answer;
      var lenii;
      var len = questions.length;
      for (i = 0; i < len; i++) {
        question = questions[i];
        if (question.answers && question.answers.length) {
          lenii = question.answers.length;
          for (ii = 0; ii < lenii; ii++) {
            answer = question.answers[ii];
            if (answer.text) {
              answers.push(answer);
            }
          }
        }
      }
      return answers;
    }

    function writeData(item) {
      var newAnswer;
      var providerId = item.school.id;
      vm.questionsByProvider[providerId] = vm.questionsByProvider[providerId] || [];
      vm.providerNamesById[providerId] = item.school.name;
      item.answers = item.answers.filter(_.unary(filterThisChild));
      if (!item.answers.length) {
        newAnswer = {
          question: item.id,
          child: kid.id,
          text: ''
        };
        item.answers.push(newAnswer);
      }
      vm.questionsByProvider[providerId].push(item);
    }

  }

  SchoolWaiversKidsController.$inject = ['$scope', 'toastr', 'Raven', '_'];
  function SchoolWaiversKidsController($scope, toastr, Raven, _) {
    var vm = this;
    var kid = $scope.kid || {};
    var writeThisKidData = _.partialRight(writeData, kid);
    var removeSharedWatcher;
    var filterTheseSchoolsOut;
    vm.save = save;
    vm.processing = false;

    init();
    removeSharedWatcher = $scope.$on('sharedDataUpdated', init);
    $scope.$on('$destroy', removeSharedWatcher);

    function init() {
      vm.waivers = kid.school_waivers || [];
      vm.waiversByProvider = {};
      vm.providerNamesById = {};
      if (kid.school_ids) {
        filterTheseSchoolsOut = _.partialRight(markSchoolOut, kid.school_ids);
        vm.waivers = _.map(vm.waivers, filterTheseSchoolsOut);
      }
      constructBySchools(vm.waivers, writeThisKidData);
    }

    function save() {
      if (!kid.id) return;
      vm.processing = true;
      kid.signed_school_waivers = filterWaivers(vm.waivers, kid);
      $scope.saveKid(
        function saveKidSuccResp(kidData) {
          vm.processing = false;
          toastr.success('Waivers saved.');
          kid.school_waivers = kidData.school_waivers;
          init();
          $scope.setPristine();
        },
        function saveKidErrResp(httpResponse) {
          vm.processing = false;
          $scope.errorsKidData = httpResponse.data;
          toastr.error(
            'Something went wrong while trying to save waivers. ' +
            'Please reload the page and try again.');
          Raven.captureException(
            new Error('Kid school waiver save failure'),
            {
              extra: {
                httpResponse: httpResponse
              }
            }
          );
        }
      );
    }

    function filterWaivers(items, kid) {
      var waivers = [];
      var i;
      var ii;
      var item;
      var signed;
      var lenii;
      var len = items.length;
      for (i = 0; i < len; i++) {
        item = items[i];
        if (item.checked && item.signed && item.signed.length) {
          lenii = item.signed.length;
          for (ii = 0; ii < lenii; ii++) {
            signed = item.signed[ii];
            if (signed.child_id === kid.id) {
              waivers.push(signed);
            }
          }
          signed = item.signed[0];
          waivers.push(signed);
        }
      }
      return waivers;
    }


    function writeData(item, kidObj) {
      var newWaiver;
      var signFound;
      var providerId = item.school.id;
      vm.waiversByProvider[providerId] = vm.waiversByProvider[providerId] || [];
      vm.providerNamesById[providerId] = item.school.name;
      if (!item.signed.length) {
        newWaiver = {
          waiver: item.id,
          child: kidObj.id
        };
        item.signed.push(newWaiver);
      } else {
        signFound = _.find(item.signed, { child: kidObj.id });
        if (signFound) {
          item.checked = true;
        }
      }
      vm.waiversByProvider[providerId].push(item);
    }

  }

  // Common methods

  /**
   * markProviderOut
   *
   * @param {Object} item
   * @param {number} index
   * @param {Array} coll
   * @param {Array} providerIds
   * @returns {Object}
   */
  function markProviderOut(item, index, coll, providerIds) {
    var i;
    var provider;
    item.hidden = true;
    for (i = 0; i < providerIds.length; i++) {
      provider = providerIds[i];
      if (item.provider.id === provider) {
        item.hidden = false;
      }
    }
    return item;
  }

  /**
   * filterProviderOut
   *
   * @param {Object} item
   * @param {Array} providerIds
   * @returns {Boolean}
   */
  function filterProviderOut(item, providerIds) {
    var i;
    var provider;
    for (i = 0; i < providerIds.length; i++) {
      provider = providerIds[i];
      if (item.provider.id === provider) {
        return true;
      }
    }
    return false;
  }

  /**
   * markSchoolOut
   *
   * @param {Object} item
   * @param {number} index
   * @param {Array} coll
   * @param {Array} providerIds
   * @returns {Object}
   */
  function markSchoolOut(item, index, coll, schoolIds) {
    var i;
    var school;
    item.hidden = true;
    for (i = 0; i < schoolIds.length; i++) {
      school = schoolIds[i];
      if (item.school.id === school) {
        item.hidden = false;
      }
    }
    return item;
  }

  /**
   * filterSchoolOut
   *
   * @param {Object} item
   * @param {Array} providerIds
   * @returns {Boolean}
   */
  function filterSchoolOut(item, schoolIds) {
    var i;
    var school;
    for (i = 0; i < schoolIds.length; i++) {
      school = schoolIds[i];
      if (item.school.id === school) {
        return true;
      }
    }
    return false;
  }

  function constructByProviders(items, writeData) {
    var i;
    var len;
    var item;
    len = items.length;
    for (i = 0; i < len; i++) {
      item = items[i];
      if (!item.provider) continue;
      writeData(item);
    }
  }

  function constructBySchools(items, writeDataF) {
    var i;
    var len;
    var item;
    len = items.length;
    for (i = 0; i < len; i++) {
      item = items[i];
      if (!item.school) continue;
      writeDataF(item);
    }
  }

  function filterByChild(el, kidItem) {
    if (!kidItem.id) return false;
    if (el && el.child) {
      if (el.child === kidItem.id) {
        return true;
      }
    }
    return false;
  }

}());
