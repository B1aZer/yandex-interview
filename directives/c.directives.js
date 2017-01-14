angular.module('easyCamp.directives', [
  'lodash', 'CommonServices', 'mgcrea.ngStrap.popover', 'mgcrea.ngStrap.tooltip'])

/**
 * @description
 * Confirm check on page reload/url change
 *
 * @param {function} confirmCheck Function to check if confirmMessage should be shown
 * @param {function} confirmReloadCheck Function to check if confirmReloadMessage should be shown
 * @param {string} confirmMessage Message shown on url change
 * @param {string} confirmReloadMessage Message shown on reload
 *
 * @example
 *
 * <div confirm-on-exit
 *  confirm-check="formsDirty"
 *  confirm-message=""
 *  confirm-reload-check="formsDirty"
 *  confirm-reload-message=""></div>
 *
 */
.directive('confirmOnExit', [function() {
  return {
    scope: {
      confirmCheck: '=?',
      confirmMessage: '@',
      confirmReloadCheck: '=?',
      confirmReloadMessage: '@'
    },
    link: function(scope) {
      var message = scope.confirmMessage || "You have unsaved content, are you sure you want to leave the page?";
      var messageReload = scope.confirmReloadMessage || "You have unsaved content.";

      //console.log('scope.confirmCheck', scope.confirmCheck);
      //console.log('scope.confirmReloadCheck', scope.confirmReloadCheck);
      //console.log('message', message);
      //console.log('messageReload', messageReload);

      function reloadPrompt(event) {
        //console.log('reloadPrompt called', scope.confirmReloadCheck);
        if (scope.confirmReloadCheck()) {
          event.returnValue = messageReload;
          return messageReload;
        }
      }
      if (typeof scope.confirmReloadCheck === 'function') {
        window.onbeforeunload = reloadPrompt;
      }

      if (typeof scope.confirmCheck === 'function') {
        var locationChangeStartUnbind = scope.$on(
          '$locationChangeStart',
          function(event) {
            if (scope.confirmCheck()) {
              if (!confirm(message)) {
                event.preventDefault();
              }
            }
          }
        );
      }

      scope.$on('$destroy', function() {
        if (typeof scope.confirmCheck === 'function') {
          locationChangeStartUnbind();
        }
      });
    }
  };
}])

/**
 * @description
 *
 * Shows map of provided locations, centered on markers.
 *
 * @param {Array} locations Array of locations
 * @param {string} [height] Height of the element
 *
 * @example
 *
 * <div gmaps-show-locations
 *   class="mb20"
 *   data-locations="[]">
 * </div>
 *
 */
.directive('gmapsShowLocations', ['$window', function($window) {
  return {
    scope: {
      'locations': '=',
      'height': '@?'
    },
    link: function(scope, element) {

      var map;
      var markerBounds = new google.maps.LatLngBounds();
      var marker;
      var infowindow = new google.maps.InfoWindow();

      function setMap() {
        element.height(scope.height || 500);
        map = new google.maps.Map(element[0], {
          zoom: 10,
          scrollwheel: false,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        google.maps.event.addListenerOnce(map, 'bounds_changed', function(event) {
          var zoom = this.getZoom();
          if (zoom > 14) {
            this.setZoom(14);
          }
        });
      }

      function setBounds() {
        map && map.fitBounds(markerBounds);
      }

      function refresh() {
        map && google.maps.event.trigger(map, 'resize');
      }

      var setMarkers = function(locations) {
        angular.forEach(locations, function(location) {
          var point = new google.maps.LatLng(location.lat, location.lng);
          marker = new google.maps.Marker({
            position: point,
            map: map
          });
          google.maps.event.addListener(marker, 'click', (function(marker) {
            return function() {
              infowindow.setContent(location.name);
              infowindow.open(map, marker);
            }
          })(marker));
          markerBounds.extend(point);
        });
      };

      var unwatch = scope.$watch('locations', function(newVal, oldVal) {
        if (newVal && newVal.length) {
          setMap();
          refresh();
          setMarkers(newVal);
          setBounds();
          unwatch();
        }
      });

      $window.onresize = function() {
        refresh();
      };
    }
  };
}])
