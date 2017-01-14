'use strict';

angular.module('easyCamp.KidsProfile')

.factory('kidsProfileComplete', kidsProfileComplete);

kidsProfileComplete.$inject = ['_'];
function kidsProfileComplete(_) {
  var requiredFieldsByTab = {
    0: [
      'first_name',
      'last_name',
      'birth_date',
      'gender',
      'street',
      'city',
      'state',
      'zip',
      'phone',
      'high_school_graduation_year'
    ],
    1: [
      'parents'
    ],
    2: [
      'emergencyContacts'
    ],
    3: [],
    4: [
      //'pickupContacts'
    ],
    5: ['questions_answered'],
    6: ['waivers_signed'],
    7: ['school_questions_answered'],
    8: ['school_waivers_signed']
  };

  var requiredAdultFieldsByTab = {
    0: [
      'first_name',
      'last_name',
      'street',
      'city',
      'state',
      'zip',
      'phone'
    ],
    1: [],
    2: [],
    3: [],
    4: [],
    5: ['questions_answered'],
    6: ['waivers_signed'],
    7: ['school_questions_answered'],
    8: ['school_waivers_signed']
  };

  function isCompleted(name, value) {
    if (angular.isString(value)) {
      return value.length > 0;
    } else if (angular.isArray(value)) {
      return value.length > 0;
    } else if (angular.isNumber(value)) {
      return value > 0;
    } else if (typeof value === 'boolean') {
      return value;
    }
    return false;
  }

  function isKidComplete(kid, tab, strict) {
    var fieldsToCheck = [];
    var i;
    var name;
    var value;
    var len;
    var questions;
    var waivers;
    var answers;
    var schoolQuestions;
    var schoolAnswers;
    var schoolWaivers;
    var filterTheseProvidersOut;
    var filterTheseProvidersOutForWaivers;
    var filterSignedByChild;
    var filterTheseSchoolsOut;
    var filterTheseSchoolsOutForWaivers;
    var filterSignedByChildForSchool;

    if (tab >= 0) {
      if (strict && tab === 4) {
        fieldsToCheck = ['pickupContacts'];
      } else {
        if (!kid.is_adult) {
          fieldsToCheck = requiredFieldsByTab[tab];
        } else {
          fieldsToCheck = requiredAdultFieldsByTab[tab];
        }
      }
    } else {
      fieldsToCheck = [];
      if (!kid.is_adult) {
        for (i in requiredFieldsByTab) {
          if (requiredFieldsByTab.hasOwnProperty(i)) {
            fieldsToCheck = _.union(fieldsToCheck, requiredFieldsByTab[i]);
          }
        }
      } else {
        for (i in requiredAdultFieldsByTab) {
          if (requiredAdultFieldsByTab.hasOwnProperty(i)) {
            fieldsToCheck = _.union(fieldsToCheck, requiredAdultFieldsByTab[i]);
          }
        }
      }
    }

    len = fieldsToCheck.length;
    for (i = 0; i < len; i++) {
      name = fieldsToCheck[i];
      if (name === 'pickupContacts') {
        value = _.filter(kid.contacts, { pickup: true, trash: false });
      } else if (name === 'emergencyContacts') {
        value = _.filter(kid.contacts, { emergency: true, trash: false });
      } else if (name === 'questions_answered') {
        questions = _.filter(kid.custom_questions, { required: true });
        answers = _.filter(kid.answered_provider_questions, filterAnswered);
        if (kid.provider_ids) {
          filterTheseProvidersOut = _.partialRight(filterProviderOut, kid.provider_ids);
          questions = _.filter(questions, _.unary(filterTheseProvidersOut));
          answers = _.filter(answers, _.unary(filterTheseProvidersOut));
        }
        value = (answers.length - questions.length) >= 0;
      } else if (name === 'waivers_signed') {
        filterSignedByChild = _.partialRight(filterSigned, kid);
        waivers = _.filter(kid.waivers, _.unary(filterSignedByChild));
        if (kid.provider_ids) {
          filterTheseProvidersOutForWaivers = _.partialRight(filterProviderOut, kid.provider_ids);
          waivers = _.filter(waivers, _.unary(filterTheseProvidersOutForWaivers));
        }
        value = waivers.length <= 0;
      } else if (name === 'school_questions_answered') {
        schoolQuestions = _.filter(kid.school_custom_questions, { required: true });
        schoolAnswers = _.filter(kid.answered_school_questions, filterAnswered);
        if (kid.school_ids) {
          filterTheseSchoolsOut = _.partialRight(filterSchoolOut, kid.school_ids);
          schoolQuestions = _.filter(schoolQuestions, _.unary(filterTheseSchoolsOut));
          schoolAnswers = _.filter(schoolAnswers, _.unary(filterTheseSchoolsOut));
        }
        value = (schoolAnswers.length - schoolQuestions.length) >= 0;
      } else if (name === 'school_waivers_signed') {
        filterSignedByChildForSchool = _.partialRight(filterSigned, kid);
        schoolWaivers = _.filter(kid.school_waivers, _.unary(filterSignedByChildForSchool));
        if (kid.school_ids) {
          filterTheseSchoolsOutForWaivers = _.partialRight(filterSchoolOut, kid.school_ids);
          schoolWaivers = _.filter(schoolWaivers, _.unary(filterTheseSchoolsOutForWaivers));
        }
        value = schoolWaivers.length <= 0;
      } else {
        value = kid[name];
      }
      if (!isCompleted(name, value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * filterSigned
   *
   * @param {Object} item
   * @param {Object} child
   * @returns {Boolean}
   */
  function filterSigned(item, child) {
    var i;
    var signedLength;
    var signed;
    if (!child) {
      return true;
    }
    if (item.signed) {
      signedLength = item.signed.length;
      for (i = 0; i < signedLength; i++) {
        signed = item.signed[i];
        // if item saved
        if (signed.id) {
          if (signed.child === child.id) {
            return false;
          }
        }
      }
    }
    return true;
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
   * filterSchoolOut
   *
   * @param {Object} item
   * @param {Array} schoolIds
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

  function filterAnswered(item) {
    return item.required && item.text;
  }

  function areKidsComplete(kids, tab, strict) {
    var len;
    var i;

    if (!kids) {
      return undefined;
    }

    if (angular.isArray(kids)) {
      len = kids.length;
      for (i = 0; i < len; i++) {
        if (!isKidComplete(kids[i], tab, strict)) {
          return false;
        }
      }
      return true;
    }
    return isKidComplete(kids, tab, strict);
  }

  return areKidsComplete;
}
