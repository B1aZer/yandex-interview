(function KidsProfileMainServices() {
  'use strict';

  angular.module('easyCamp.KidsProfile')
    .factory('Child', Child)
    .factory('CustomQuestionsService', CustomQuestionsService)
    .factory('ContactsForChild', ContactsForChild)
    .factory('ChildHelpers', ChildHelpers)
    .constant('TAB_FIELDS', TAB_FIELDS());

  ChildHelpers.$inject = [
    '_', 'TAB_FIELDS', 'Child', 'Cart', 'toastr', 'Raven',
    '$rootScope', 'kidsProfileComplete'];

  function TAB_FIELDS() {
    return {
      0: [
        'is_adult',
        'first_name',
        'last_name',
        'nick_name',
        'birth_date',
        'birth_date_estimated',
        'gender',
        'street',
        'gender',
        'city',
        'state',
        'zip',
        'country',
        'phone',
        'current_school',
        'high_school_graduation_year',
        't_shirt_size',
        'interests',
        'permission_for_photo',
        'lat',
        'lng',
        'teacher_name',
        'need_financial_aid',
        'preregistered_for_financial_aid',
        'general_note'
      ],
      1: [
        'parents'
      ],
      2: [
        'contacts'
      ],
      3: [
        'special_needs',
        'dietary_restrictions',
        'allergy',
        'physical_restrictions',
        'note',
        'doctor_name',
        'doctor_phone',
        'medication',
        'insurance_provider',
        'insurance_policy_number',
        'insurance_policy_holder_name'
      ],
      4: [
        'contacts'
      ],
      5: [
        'answered_provider_questions'
      ],
      6: [
        'signed_waivers'
      ],
      7: [
        'answered_school_questions'
      ],
      8: [
        'signed_school_waivers'
      ]
    };
  }

  function ChildHelpers(
      _, tabFields, ChildFactory, Cart, toastr, Raven,
      $rootScope, kidsProfileComplete) {

    function pickFields(kid, name, omitFields) {
      var pickedKid;
      if (omitFields) {
        _.forEach(omitFields, function omitFieldsIter(field) {
          var index = name.indexOf(field);
          if (index >= 0) {
            name.splice(index, 1);
          }
        });
      }
      pickedKid = angular.copy(kid);
      pickedKid = _.pick(pickedKid, name);
      return pickedKid;
    }

    /* check if object in array using angular equals and picked attributes */
    function angularIn(item, array, pick) {
      var i;
      function removeAttrs(obj) {
        if (pick && pick.length) {
          return _.pick(obj, pick);
        }
        return obj;
      }
      for (i = 0; i < array.length; i++) {
        if (angular.equals(removeAttrs(item), removeAttrs(array[i]))) {
          return i;
        }
      }
      return -1;
    }

    function flattenAttribute(kids, attr) {
      var i;
      var kid;
      var flat;
      var j;

      for (i = 0; i < kids.length; ++i) {
        kid = kids[i];
        if (kid[attr]) {
          flat = [];
          for (j = 0; j < kid[attr].length; ++j) {
            flat.push(kid[attr][j].text);
          }
          kid[attr] = flat;
        }
      }
    }

    function pickTabFields(kid, tab, omitFields) {
      return pickFields(kid, tabFields[tab], omitFields);
    }

    function saveKid(kid, tab, callback, errorCallback, preprocess) {
      var kidId;
      var saveUpdateKid;
      var created;
      var process;
      var kidObject;

      if (_.isFunction(preprocess)) {
        process = preprocess(kid);
        if (!process) return;
      }

      // done in Child resource
      // flattenAttribute([kid], 'interests');
      if (kid.current_school && !kid.current_school.name) {
        kid.current_school = null;
      }

      kidId = kid.id;
      created = false;
      if (kidId) {
        saveUpdateKid = ChildFactory.update;
      } else {
        saveUpdateKid = ChildFactory.create;
        created = true;
      }
      kidObject = pickTabFields(kid, tab);
      saveUpdateKid(
        { childId: kidId },
        kidObject,
        function success(result) {
          var isCompleted;

          kid.id = result.id;
          delete kid._state;
          // update cart when student is updated (name could have changed)
          if (!created) {
            Cart.update();
          }
          if (callback) {
            callback(result);
          }
          isCompleted = kidsProfileComplete(kid);
          if (!kid._is_completed && isCompleted) {
            toastr.success('Student profile is now complete.');
          }
          kid._is_completed = isCompleted;
          $rootScope.$broadcast(
            'kidsprofile:kidSaved', { kid_id: result.id, created: created, tab: tab });
        },
        function failure(httpResponse) {
          Raven.captureException(
            new Error('Kidsprofile saveUpdateKid failure'),
            {
              extra: {
                httpResponse: httpResponse
              }
            }
          );
          if (errorCallback) {
            errorCallback(httpResponse);
          }
        }
      );
    }

    return {
      pickFields: pickFields,
      angularIn: angularIn,
      flattenAttribute: flattenAttribute,
      pickTabFields: pickTabFields,
      saveKid: saveKid
    };

  }

  ContactsForChild.$inject = ['$resource'];
  function ContactsForChild($resource) {
    return $resource('/api/contacts_for_child/:id', { id: '@id' }, {
      update: { method: 'PATCH' }
    });
  }

  CustomQuestionsService.$inject = ['$resource'];
  function CustomQuestionsService($resource) {
    return $resource('/api/custom_questions/:id', null, {
      answer: {
        url: '/api/custom_questions/answers',
        method: 'PATCH',
        isArray: true
      }
    });
  }

  Child.$inject = ['$resource', '_', 'Raven', '$filter', 'CachedCurrentUserChild'];
  function Child($resource, _, Raven, $filter, CachedCurrentUserChild) {
    var resource;

    function flattenInterests(data) {
      var i;
      // ng-tags-input forces its model to be an array of objects like {text: 'some value'}
      // and it changes model even if we flatten it in controller
      // so we need to flatten array of objects to array of strings in create and update
      var interests = [];
      if (data.interests && data.interests.length) {
        for (i = 0; i < data.interests.length; i++) {
          if (data.interests[i].hasOwnProperty('text')
              && data.interests[i].text !== null && data.interests[i].text !== '') {
            interests.push(data.interests[i].text);
          } else if (typeof data.interests[i] === 'string') {
            interests.push(data.interests[i]);
          }
        }
        data.interests = interests;
      }
      return data;
    }

    resource = $resource('/api/child/:childId', { childId: '@id' }, {
      create: {
        method: 'POST',
        transformRequest: function transformRequest(data) {
          CachedCurrentUserChild.invalidate();
          return angular.toJson(flattenInterests(data));
        }
      },
      update: {
        method: 'PATCH',
        transformRequest: function transformRequest(data) {
          CachedCurrentUserChild.invalidate();
          return angular.toJson(flattenInterests(data));
        }
      },
      create_bulk: {
        method: 'POST',
        isArray: true,
        transformRequest: function transformRequest(data) {
          var kids;
          var i;
          CachedCurrentUserChild.invalidate();
          kids = [];
          for (i = 0; i < data.length; i++) {
            kids.push(flattenInterests(data[i]));
          }
          return angular.toJson(kids);
        }
      },
      update_bulk: {
        method: 'PUT',
        isArray: true,
        transformRequest: function transformRequest(data) {
          var kids;
          var i;
          CachedCurrentUserChild.invalidate();
          kids = [];
          for (i = 0; i < data.length; i++) {
            kids.push(flattenInterests(data[i]));
          }
          return angular.toJson(kids);
        }
      }
    });

    resource.getAge = function getAge(child) {
      var today;
      var dateParts;
      var birthDate;
      var age;

      if (!child.birth_date) return -1;
      today = new Date();
      dateParts = child.birth_date.split('-');
      birthDate = new Date(dateParts[0], parseInt(dateParts[1]) - 1, dateParts[2]);
      age = today.getFullYear() - birthDate.getFullYear();
      if (today.getMonth() > birthDate.getMonth()) {
        return age;
      }
      if (today.getMonth() < birthDate.getMonth()) {
        return age - 1;
      }
      // this is birth month
      if (today.getDate() >= birthDate.getDate()) {
        return age;
      }
      return age - 1;
    };

    resource.setAge = function setAge(child) {
      if (child.birth_date) {
        child.age = resource.getAge(child);
      } else {
        child.age = null;
      }
    };

    resource.prototype.getAge = function getAge() {
      return resource.getAge(this);
    };

    resource.setBirthDate = function setBirthDate(child) {
      var date;

      if (child.age) {
        if (child.birth_date && resource.getAge(child) == child.age) return;
        if (child.birth_date && child.birth_date_estimated === false) {
          Raven.captureException(
            new Error(
              "setBirthDate: age doesn't correspond with non-estimated birth-date " +
              "(this shouldn't happen)"
            ),
            {
              extra: {
                child_id: child.id,
                birth_date: child.birth_date,
                birth_date_estimated: child.birth_date_estimated
              }
            }
          );
          return;
        }
        // birth_date is null OR
        // birth_date is not null && birth_date doesn't agree with age  OR
        // birth_date is not null && birth_date_estimated == true
        date = new Date();
        date.setFullYear(date.getFullYear() - child.age);
        date.setDate(date.getDate() - 183);
        child.birth_date = $filter('date')(date, 'yyyy-MM-dd');
        child.birth_date_estimated = true;
      }
    };

    resource.prototype.$save = function save(success, error) {
      if (!this.id) {
        return this.$create(success, error);
      }
      return this.$update(success, error);
    };

    resource.getNextUnnamedChildLabel = function getNextUnnamedChildLabel(children) {
      var i;
      var len;
      var child;
      var num;
      var maxNum = 0;

      children = children || [];
      len = children.length;

      for (i = 0; i < len; i++) {
        child = children[i];
        if (_.endsWith(child.first_name, ' (unnamed)')) {
          num = parseInt(child.first_name.replace('Student ', '').replace(' (unnamed)', ''));
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
      return 'Student ' + (maxNum + 1) + ' (unnamed)';
    };

    // this should be in sync with Child.get_display_name() on backend
    resource.getChildDisplayName = function getChildDisplayName(child, emptyText, agePrefix) {
      var age;

      if (!agePrefix) {
        agePrefix = 'Student age ';
      }
      if (!emptyText) {
        emptyText = 'Student';
      }

      if (!child) {
        return '';
      }
      if (child.nick_name) {
        return child.nick_name;
      }
      if (child.first_name) {
        return child.first_name;
      }
      if (child.age) {
        return agePrefix + child.age;
      }
      age = resource.getAge(child);
      if (age > -1) {
        return agePrefix + age;
      }
      return emptyText || 'Student';
    };

    resource.createNew = function createNew() {
      return new resource({
        permission_for_photo: true,
        trash: false,
        contacts: [],
        parents: [],
        _state: 'new',
        _tabState: {
          0: true,
          1: false,
          2: false,
          3: false,
          4: false,
          5: false,
          6: false,
          7: false,
          8: false
        },
        _tabSavedState: {
          0: true,
          1: true,
          2: true,
          3: true,
          4: true,
          5: true,
          7: true,
          8: true
        }
      });
    };

    return resource;
  }

}());
