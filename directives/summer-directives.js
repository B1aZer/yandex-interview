'use strict';

angular.module('easyCamp.summer-directives', [
  'ngTagsInput', 'easyCamp.summer-services', 'easyCamp.UnloggedUserData',
  'mgcrea.ngStrap.tooltip', 'mgcrea.ngStrap.popover', 'mgcrea.ngStrap.helpers.dateParser',
  'mgcrea.ngStrap.timepicker', 'easyCamp.UtilsService', 'easyCamp.ReferralSession'])

.directive('mapFilter', mapFilter)

.directive('showInPopup', showInPopup)

;

/**
 * mapFilter
 *
 * @description
 * This directive consumes MapWrapper Class
 * and passess angular event to Class API
 *
 * https://trello.com/c/baVeaE6J/
 *
 * Basic algo for the feature:
 *
 *  Get current input geo data from geolocationFactory.
 *  Set this location as the center of the map.
 *  Calculate map bounds based on miles value from (1).
 *    calculate bounds coordinates for each corner of the rectangle based on current center and radius. We can set bounds by providing only SW and NE points. SW can be calculated by creating an imaginary rectangle with sides as current radius. Diagonal of that rectangle would point to SW from NE corner of imaginary rectangle (or center of map). But there might be a better way. I believe we also can set bounds (by bounds literal) by N,E,S,W points, which might be easier to calculate.
 *  Set bounds.
 *  Set listeners whenever center changes (by dragging, zooming):
 *    [drag] get center coordinates (can be obtained from gmaps api) -> set name/coordinates to input.
 *    [zoom] get bounds -> set miles to input. Find out radius (http://stackoverflow.com/questions/3525670/radius-of-viewable-region-in-google-maps-v3).
 *    run search.
 *  Set listeners for filter results -> (on change)
 *    get whole set of locations for programs
 *    set markers for each location
 *  Set click event listener for each marker -> (on click)
 *    set current coordinates to input with mile = 1
 *    run search
 *
 * @example
 *
 *    <div map-filter
 *        location="search.filters.locationAutoComplete"
 *        miles="search.queryClasses.params.miles"
 *        programs="search.results.programs"
 *        on-change="search.filters.form.$setDirty(); search.filtersUpdated();">
 *
 */
mapFilter.inject = ['$window', '$timeout', 'MapWrapper', 'geolocationFactory', 'Geocoder'];
function mapFilter($window, $timeout, MapWrapper, geolocationFactory, Geocoder) {
  return {
    scope: {
      'tabActive': '=',
      'location': '=',
      'miles': '=',
      'programs': '=',
      'onChange': '&?'
    },
    link: function linkF(scope, element) {
      var mapAPI = new MapWrapper(element);
      var zoomOnClickMiles = 0.1;
      var defaultMiles = 15;

      // keep track of current values
      var inputMiles;
      var inputCoords;

      var unwatchLocation;
      var unwatchMiles;
      var unwatchPrograms;
      var unwatchStartOn;

      init();
      unwatchLocation = scope.$watch('location', watchLocation);
      unwatchMiles = scope.$watch('miles', watchMiles);
      unwatchPrograms = scope.$watch('programs', watchPrograms);
      unwatchStartOn = scope.$watch('tabActive', watchTabChanged);
      scope.$on('$destroy', watchDestroy);

      function init() {
        mapAPI.setDragWatcher(updateInputWith);
        mapAPI.setZoomWatcher(updateMilesWith);
        mapAPI.setClickWatcher(updateInputAndMiles);
        mapAPI.setResetZoomClickWatcher(setMilesToDefault);
      }

      function watchDestroy() {
        unwatchLocation();
        unwatchMiles();
        unwatchPrograms();
        unwatchStartOn();
      }

      /**
       * watchLocation
       *
       * @param {Object} val
       * @requires inputCoords
       */
      function watchLocation(val) {
        var newCoords;
        if (!val) return;
        newCoords = getCoordsFrom(val);
        if (newCoords.lat && newCoords.lng) {
          // don't set center if on map
          if (!scope.tabActive) {
            mapAPI.setMapCenter(newCoords);
          }
          inputCoords = angular.copy(newCoords);
          fireInputChanged('coords');
        }
      }

      /**
       * watchMiles
       *
       * @param {number} val
       * @requires inputMiles
       */
      function watchMiles(val) {
        var newVal;
        // 0 is not a valid number
        if (!val) return;
        newVal = convertMiles(val);
        if (!isNaN(parseFloat(newVal)) && isFinite(newVal)) {
          inputMiles = newVal;
          fireInputChanged('miles');
        }
      }

      /**
       * watchPrograms
       *
       * @param {array} programs
       * side-eff: runs multiple times
       */
      function watchPrograms(programs) {
        var locations = [];
        if (!programs) return;
        mapAPI.clearMarkers();
        locations = parseLocations(programs);
        if (locations.length) {
          mapAPI.setMapLocations(locations);
        }
      }

      /**
       * watchTabChanged
       *
       * @param {boolean} val
       *
       * Check if directive has to be refreshed.
       * Gmaps wont work properly in tab without refresh.
       */
      function watchTabChanged(val) {
        if (!val) return;
        $timeout(function waitForDigest() {
          mapAPI.refresh();
          setDefalutAddress();
        }, 0);
      }

      // UTILS

      /**
       * setDefalutAddress
       *
       * @requires mapAPI
       */
      function setDefalutAddress() {
        var coords = mapAPI.getMapCoordinates();
        updateInputWith(coords);
      }

      /**
       * fireInputChanged
       *
       * Race condition.
       *
       * We need to set map radius only
       * when location is set
       *
       * @param {string} name
       */
      function fireInputChanged(name) {
        if (name === 'coords') {
          if (inputMiles) {
            mapAPI.setMapRadius(inputMiles);
          }
        } else if (name === 'miles') {
          if (inputCoords) {
            mapAPI.setMapRadius(inputMiles);
          }
        }
      }

      /**
       * convertMiles
       *
       * Sets default miles
       *
       * @param {string} val
       * @returns {number|Nan}
       */
      function convertMiles(val) {
        var miles = parseFloat(val, 10);
        return miles;
      }

      /**
       * getCoordsFrom
       *
       * @param {Object} inputData
       * @returns {Object}
       */
      function getCoordsFrom(inputData) {
        var coords = {
          lat: null,
          lng: null
        };
        if (inputData) {
          if (inputData.geometry) {
            if (inputData.geometry.location) {
              coords.lat = inputData.geometry.location.lat();
              coords.lng = inputData.geometry.location.lng();
            }
          }
        }
        return coords;
      }

      /**
       * parseLocations
       *
       * @param {array} programs
       * @returns {array}
       */
      function parseLocations(programs) {
        var i;
        var ii;
        var len = programs.length;
        var program;
        var session;
        var sessionsLen;
        var locationsById = {};
        var locations = [];
        var location;
        for (i = 0; i < len; i++) {
          program = programs[i];
          sessionsLen = program.sessions.length;
          for (ii = 0; ii < sessionsLen; ii++) {
            session = program.sessions[ii];
            if (session.location) {
              location = angular.copy(session.location);
              location.provider_name = program.provider_name;
              locationsById[session.location_id] = location;
            }
          }
        }
        Object.keys(locationsById).forEach(function forEachKey(key) {
          locations.push(locationsById[key]);
        });
        return locations;
      }

      /**
       * updateInputWith
       *
       * @param {Object} coords
       * @requires scope.location
       */
      function updateInputWith(coords) {
        var oldLat = null;
        var oldLng = null;
        if (!coords) return;
        if (scope.location) {
          if (scope.location.geometry) {
            if (scope.location.geometry.location) {
              oldLat = scope.location.geometry.location.lat();
              oldLng = scope.location.geometry.location.lng();
            }
          }
        }
        // coords are the same
        if (!(oldLat !== coords.lat || oldLng !== coords.lng)) return;
        Geocoder.getAddressForCoordinates(coords).then(function addressResolved(res) {
          coords.address = res;
          scope.location = geolocationFactory.getLocationFormatted(coords);
          scope.location.from_gmap = true;
          fireMapChanged();
        }, function addressDeclined() {
          // location was not found
        });
      }

      /**
       * updateMilesWith
       *
       * @param {number} miles
       */
      function updateMilesWith(miles) {
        scope.miles = miles;
        scope.location.from_gmap = true;
        fireMapChanged();
      }

      /**
       * updateInputAndMiles
       *
       * @param {Object} location
       */
      function updateInputAndMiles(location) {
        var coords;
        var miles;
        if (!location) return;
        coords = {
          lat: location.lat,
          lng: location.lng
        };
        miles = zoomOnClickMiles;
        mapAPI.setMapCenter(coords);
        updateInputWith(coords);
        updateMilesWith(miles);
      }

      function setMilesToDefault() {
        updateMilesWith(defaultMiles);
      }

      /**
       * fireMapChanged
       *
       * @requires scope.onChange
       *
       */
      function fireMapChanged() {
        if (scope.onChange) {
          $timeout(function runAfterDelay() {
            scope.onChange();
          }, 100);
        }
      }

    }
  };
}

showInPopup.$inject = ['$window'];
function showInPopup($window) {
  return {
    restrict: 'AE',
    link: function linkF(scope, element, attrs) {

      element.on('click', keypressCallback);
      scope.$on('$destroy', removeListeners);

      function keypressCallback(event) {
        event.preventDefault();
        var url = attrs.href;
        // center the popup window
        var halfWidth = screen.width/2;
        var halfHeight = screen.height/2;
        var left = halfWidth - halfWidth/2;
        var top = halfHeight - halfHeight/2;
        var popup = $window.open(
          url, '', 'top=' + top + ',left=' + left +
          ',width=' + halfWidth + ',height=' + halfHeight
        );
      }

      function removeListeners() {
        element.off('click', keypressCallback);
      }

    }
  };
}
