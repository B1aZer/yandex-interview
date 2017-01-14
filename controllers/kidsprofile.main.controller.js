(function kidsProfileMainController() {
  'use strict';

  angular.module('easyCamp.KidsProfile', [
    'CommonServices', 'lodash', 'ngResource', 'easyCamp.filters',
    'easyCamp.summer-services', 'easyCamp.UtilsService'
  ]).controller('EditKidsController', EditKidsController);

  EditKidsController.$inject = [
    '$scope', 'Child', 'ContactsForChild', '$modal',
    'SharedData', 'kidsProfileComplete', 'PageTitle', 'MetaInfo',
    'toastr', 'Raven', 'Cart'];

  function EditKidsController($scope, Child, ContactsForChild, $modal,
      SharedData, kidsProfileComplete, PageTitle, MetaInfo,
      toastr, Raven, Cart) {

    var modalInstance;
    var watchSharedDataUpdated;
    var checkoutData = $scope.checkoutData = SharedData.getValue('checkout_data');
    if (!checkoutData) {
      PageTitle.setTitle('Students Profile | ' + PageTitle.base());
      MetaInfo.setMetaDescription('Please enter your students profile on this ' +
        'page. This will serve as a single registration form used to register ' +
        'with all Quick Pay summer camp or after-school providers. So, you ' +
        'no longer need to deal with endless registration forms.');
    }
    $scope.kids = [];
    $scope.processing = true;
    $scope.createKid = createKid;
    $scope.kidUnSaved = kidUnSaved;
    $scope.kidInvalid = kidInvalid;
    $scope.getContacts = getContacts;
    $scope.getContacts();
    // modal
    $scope.deleteKid = deleteKid;
    $scope.modalYes = modalYes;
    $scope.modalNo = modalNo;

    watchSharedDataUpdated = $scope.$watch('checkoutData', sharedDataUpdated, true);
    $scope.$on('$destroy', watchSharedDataUpdated);

    Child.query(
      function success(kids) {
        $scope.processing = false;
        updateFrontFields(kids);
        // This controller is also used on payment page for updating
        // students profiles during payment process, so we need to check if
        // we want to update only some kids and we should update kids data in
        // SharedData service that is used to share data between controllers.
        if (checkoutData) {
          $scope.kids = updatedCheckoutData(kids, checkoutData);
        } else {
          $scope.kids = kids;
        }
      },
      function failure() {
        $scope.processing = false;
      }
    );

    function getContacts() {
      $scope.kidPickupContacts = ContactsForChild.query(function kidPickupContactsQuery() {
        // we need this so that child selects would know about the change
        // unfortunately angular select requires to manually set default
        // options on resource objects
      });
    }

    function updateFrontFields(kids) {
      var i;
      var kid;
      var kidsLength = kids.length;
      for (i = kidsLength - 1; i >= 0; i--) {
        kid = kids[i];
        if (kid.provider) {
          kids.splice(i, 1);
        } else {
          kid._is_completed = kidsProfileComplete(kid);
        }
      }
    }

    function buildMap(kids) {
      var i;
      var id2kid = {};
      for (i = 0; i < kids.length; i++) {
        if (kids[i].birth_date) {
          kids[i].age = Child.getAge(kids[i]);
        }
        id2kid[kids[i].id] = kids[i];
      }
      return id2kid;
    }

    /**
     * sharedDataUpdated
     *
     * @callback $watch ~checkoutData
     * @fires ~sharedDataUpdated
     */
    function sharedDataUpdated() {
      $scope.kids = updatedCheckoutData($scope.kids, $scope.checkoutData);
      $scope.$broadcast('sharedDataUpdated');
    }

    /**
     * updatedCheckoutData
     *
     * side-eff: modifies SharedData
     *
     * @param {Array} kids
     * @param {Object} [someData]
     * @returns {Array}
     *
     */
    function updatedCheckoutData(kids, someData) {
      var i;
      var id2kid;
      var kid;
      var kidsToProcess = [];
      var providerIds;
      var schoolIds;
      if (!kids) return kidsToProcess;
      if (!someData) return kids;
      id2kid = buildMap(kids);
      // update payForKids with the latest kid information
      for (i = 0; i < someData.payForKids.length; i++) {
        kid = id2kid[someData.payForKids[i].id];
        if (kid) {
          // update payForKids with provider_ids, required for complete check
          if (kid) {
            providerIds = createProviderIdsFor(kid, someData);
            if (providerIds) {
              kid.provider_ids = providerIds;
            }
          }
          // update payForKids with school_ids, required for complete check
          if (kid) {
            schoolIds = createSchoolIdsFor(kid, someData);
            if (schoolIds) {
              kid.school_ids = schoolIds;
            }
          }
          kidsToProcess.push(kid);
        }
      }
      SharedData.setValue('checkout_pay_for_kids', kidsToProcess);
      return kidsToProcess;
    }

    /**
     * createProviderIdsFor
     *
     * @param {Object} kid
     * @param {Object} [checkoutDataItem]
     * @returns {Array|null}
     */
    function createProviderIdsFor(kid, checkoutDataItem) {
      var purchases;
      var purchase;
      var i;
      var ii;
      var child;
      var providerIds = [];
      if (checkoutDataItem) {
        if (checkoutDataItem.purchasesToPayOn) {
          if (checkoutDataItem.purchasesToPayOn.crickets) {
            purchases = checkoutDataItem.purchasesToPayOn.crickets;
            for (i in purchases) {
              if (purchases.hasOwnProperty(i)) {
                purchase = purchases[i];
                // purchase is selected
                if (purchase.selected) {
                  if (purchase.children) {
                    for (ii = 0; ii < purchase.children.length; ii++) {
                      child = purchase.children[ii];
                      if (child.id === kid.id) {
                        if (providerIds.indexOf(purchase.provider.id) === -1) {
                          providerIds.push(purchase.provider.id);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        return null;
      }
      return providerIds;
    }

    /**
     * createSchoolIdsFor
     *
     * @param {Object} kid
     * @param {Object} [checkoutDataItem]
     * @returns {Array|null}
     */
    function createSchoolIdsFor(kid, checkoutDataItem) {
      var purchases;
      var purchase;
      var i;
      var ii;
      var child;
      var schoolIds = [];
      if (checkoutDataItem) {
        if (checkoutDataItem.purchasesToPayOn) {
          if (checkoutDataItem.purchasesToPayOn.crickets) {
            purchases = checkoutDataItem.purchasesToPayOn.crickets;
            for (i in purchases) {
              if (purchases.hasOwnProperty(i)) {
                purchase = purchases[i];
                // purchase is selected
                if (purchase.selected) {
                  if (purchase.children) {
                    for (ii = 0; ii < purchase.children.length; ii++) {
                      child = purchase.children[ii];
                      if (child.id === kid.id) {
                        if (purchase.session) {
                          if (purchase.session.school_id) {
                            if (schoolIds.indexOf(purchase.session.school_id) === -1) {
                              schoolIds.push(purchase.session.school_id);
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        return null;
      }
      return schoolIds;
    }

    function createKid() {
      var newKid = Child.createNew();
      $scope.kids.unshift(newKid);
    }

    function kidUnSaved(tabState) {
      var saved = false;
      angular.forEach(tabState, function forEachCallback(value, key) {
        if (value === false) {
          saved = true;
        }
      });
      return saved;
    }

    function kidInvalid(kid) {
      return !kidsProfileComplete(kid);
    }

    function deleteKid(event, kid) {
      event.preventDefault();
      event.stopPropagation();
      $scope.kidForDeletion = kid;
      modalInstance = $modal.open({
        templateUrl: 'deleteKidConfirmModal.html',
        scope: $scope
      });
    }

    function modalYes() {
      var index;
      if (!$scope.kidForDeletion) {
        return;
      }
      $scope.kidForDeletion.trash = true;
      if (!$scope.kidForDeletion.id) {
        index = $scope.kids.indexOf($scope.kidForDeletion);
        $scope.kids.splice(index, 1);
        $scope.kidForDeletion = null;
      } else {
        $scope.kidForDeletion.$update(
          null,
          function success() {
            delete $scope.kidForDeletion;
            toastr.success('Student deleted.');
            // update cart when student is deleted
            Cart.update();
          },
          function failure(httpResponse) {
            $scope.kidForDeletion = null;
            toastr.error(
              'Something went wrong while trying to delete child. ' +
              'Please reload the page and try again.');
            Raven.captureException(
              new Error('$scope.kidForDeletion.$update() failure'),
              {
                extra: {
                  httpResponse: httpResponse
                }
              }
            );
          }
        );
      }
      modalInstance.dismiss('cancel');
    }
    function modalNo() {
      modalInstance.dismiss('cancel');
    }
  }
}());
