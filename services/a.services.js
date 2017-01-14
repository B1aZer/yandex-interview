'use strict';

angular.module('easyCamp.summer-services', [
  'ngResource', 'easyCamp.Auth', 'easyCamp.KidsProfile', 'easyCamp.filters',
  'easyCamp.services', 'easyCamp.UnloggedUserData', 'easyCamp.ReferralSession'])

.factory('MapWrapper', MapWrapper)

;

MapWrapper.inject =  ['_'];
function MapWrapper(_) {

  // TODO: remove listeners

  var defaultLat = 47.6101497;
  var defaultLng = -122.2015159;
  var defaultRadius = 15 * 1609.0;
  var defaultZoom = 10;

  /**
   * mapAPI
   *
   * @param {Object} element
   * @constructor
   */
  function mapAPI(element) {

    var ResetZoomControlDiv;

    this.map = new google.maps.Map(element[0], {
      scrollwheel: false,
      zoom: defaultZoom,
      center: new google.maps.LatLng(defaultLat, defaultLng),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER
      }
    });
    this.infowindow = new google.maps.InfoWindow();
    this.clickCallback = function Noope() {};
    this.markers = [];
    this.circles = [];

    // Custom element
    ResetZoomControlDiv = document.createElement('div');
    this.resetControl = resetZoomControl(ResetZoomControlDiv);


    ResetZoomControlDiv.index = 1;
    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(ResetZoomControlDiv);
  }

  mapAPI.prototype.refresh = refresh;
  mapAPI.prototype.clearMarkers = clearMarkers;
  mapAPI.prototype.setMapCenter = setMapCenter;
  mapAPI.prototype.setDragWatcher = setDragWatcher;
  mapAPI.prototype.setZoomWatcher = setZoomWatcher;
  mapAPI.prototype.setMapLocations = setMapLocations;
  mapAPI.prototype.setMapRadius = setMapRadius;
  mapAPI.prototype.setClickWatcher = setClickWatcher;
  mapAPI.prototype.setResetZoomClickWatcher = setResetZoomClickWatcher;
  mapAPI.prototype.getMapCoordinates = getMapCoordinates;

  /**
   * clearCircles
   *
   * @private
   *
   */
  function clearCircles() {
    var thisClearCircles = _.bind(clearObject, this, 'circles');
    thisClearCircles();
  }

  /**
   * clearObject
   *
   * @private
   * @param {string} objName
   * @requires this[objName]
   */
  function clearObject(objName) {
    var i;
    var objLen = this[objName].length;
    var objMap;
    for (i = 0; i < objLen; i++) {
      objMap = this[objName][i];
      objMap.setMap(null);
    }
    this[objName] = [];
  }

  /**
   * zoomToCircle
   *
   * @private
   *
   */
  function zoomToCircle() {
    var zoom = radiusToZoom(_.bind(getCircleRadius, this)() / 1609.0);
    this.map.setZoom(zoom);
  }


  /**
   * setMapCentreToCircle
   *
   * @requires this.map
   * @requires this.circles
   *
   */
  function setMapCentreToCircle() {
    var circ;
    if (this.circles.length) {
      circ = this.circles[0];
      this.map.setCenter(circ.getCenter());
    }
  }

  /**
   * getCircleRadius
   *
   * @returns {number}
   * @requires this.circles
   *
   */
  function getCircleRadius() {
    if (this.circles.length) {
      return this.circles[0].getRadius();
    }
    return defaultRadius;
  }

  /**
   * refresh
   *
   * @requires this.map
   *
   */
  function refresh() {
    google.maps.event.trigger(this.map, 'resize');
    _.bind(setMapCentreToCircle, this)();
    _.bind(zoomToCircle, this)();
  }

  /**
   * clearMarkers
   *
   */
  function clearMarkers() {
    var thisClearMarkers = _.bind(clearObject, this, 'markers');
    thisClearMarkers();
  }

  /**
   * setMapCenter
   *
   * map method
   *
   * @param {Object} coords
   * @requires this.map
   */
  function setMapCenter(coords) {
    if (!coords) return;
    if (coords.lat && coords.lng) {
      this.map.setCenter(new google.maps.LatLng(coords.lat, coords.lng));
    }
  }

  /**
   * setDragWatcher
   *
   * @param {function} callback
   * @requires this.map
   */
  function setDragWatcher(callback) {
    var onDragEndCallb = _.bind(onDragEnd, this, callback);
    google.maps.event.addListener(this.map, 'dragend', onDragEndCallb);
  }

  /**
   * onDragEnd
   *
   * @param {function} callback
   * @requires this.getMapCoordinates
   */
  function onDragEnd(callback) {
    var coords = this.getMapCoordinates();
    if (coords.lat === defaultLat && coords.lng === defaultLng) return;
    callback(coords);
  }

  /**
   * getMapCoordinates
   *
   * @returns {Object}
   * @requires this.map
   */
  function getMapCoordinates() {
    var coords = {
      lat: this.map.getCenter().lat(),
      lng: this.map.getCenter().lng()
    };
    return coords;
  }

  /**
   * setZoomWatcher
   *
   * @param {function} callback
   * @requires this.map
   */
  function setZoomWatcher(callback) {
    var onThisZoomChanged = _.bind(onZoomChanged, this, callback);
    google.maps.event.addListener(this.map, 'zoom_changed', onThisZoomChanged);
  }

  /**
   * onZoomChanged
   *
   * @param {function} callback
   * @requires this.map
   *
   * TODO: calculate radius more precisely
   *
   * By amc prop:
   *
   * We could calcualte radius for the circle to fill whole window.
   * We know the rectandle size so we could hardcode radius for each zoom.
   */
  function onZoomChanged(callback) {
    var meters;
    var miles;
    var circRadius = _.bind(getCircleRadius, this)();
    var zoomOfCirc = radiusToZoom(circRadius / 1609.0);
    var zoomLevel = this.map.getZoom();
    if (zoomOfCirc === zoomLevel) return;
    if (zoomLevel > zoomOfCirc) {
      meters = circRadius / 2;
    } else if (zoomLevel < zoomOfCirc) {
      meters = circRadius * 2;
    }
    miles = meters / 1609.0;
    callback(miles);
  }

  /**
   * setMapLocations
   *
   * @param {array} locations
   * @requires this.map
   * @requires this.infowindow
   * @requires this.markers
   * side-eff: function within cycle
   */
  function setMapLocations(locations) {
    var point;
    var marker;
    var self = this;
    var onThisMarkerClick;
    locations.forEach(function forEachLocation(location) {
      point = new google.maps.LatLng(location.lat, location.lng);
      marker = new google.maps.Marker({
        position: point,
        map: self.map
      });
      onThisMarkerClick = _.bind(onMarkerClick, self, location, marker);
      google.maps.event.addListener(marker, 'click', onThisMarkerClick);
      self.markers.push(marker);
    });
    function onMarkerClick(thisLocation, thisMarker) {
      this.infowindow.setContent(thisLocation.provider_name);
      this.infowindow.open(this.map, thisMarker);
      this.clickCallback(thisLocation);
    }
  }

  /**
   * setMapRadius
   *
   * @param {number} miles
   * @requires this.map
   */
  function setMapRadius(miles) {
    var circ;
    var radius;
    var center;
    if (miles < 0) {
      miles = 0;
    }
    radius = miles * 1609.0;
    center = this.map.getCenter();
    _.bind(clearCircles, this)();
    circ = new google.maps.Circle({
      center: center,
      map: this.map,
      radius: radius,
      strokeColor: '#004de8',
      strokeOpacity: 0.62,
      strokeWeight: 1,
      draggable: false,
      visible: false
    });
    this.circles.push(circ);
    _.bind(zoomToCircle, this)();
  }

  /**
   * radiusToZoom
   *
   * http://jeffjason.com/2011/12/google-maps-radius-to-zoom/
   *
   * @param {number} radius
   * @returns {number}
   */
  function radiusToZoom(radius) {
    if (!radius || isNaN(radius)) {
      return defaultZoom;
    }
    return Math.round(14 - (Math.log(radius) / Math.LN2));
  }

  /**
   * setClickWatcher
   *
   * @param {function} callback
   */
  function setClickWatcher(callback) {
    this.clickCallback = callback;
  }

  /**
   * setResetZoomClickWatcher
   *
   * @param {function} callback
   */
  function setResetZoomClickWatcher(callback) {
    this.resetControl.addEventListener('click', callback);
  }

 /**
   * Custom Control for map
   *
   * @param {Object} controlDiv
   */
  function resetZoomControl(controlDiv) {
    var controlUI;
    var controlText;

    // Set CSS for the control border.
    controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '3px';
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginBottom = '22px';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to reset zoom';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '16px';
    controlText.style.lineHeight = '38px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = 'Reset Zoom';
    controlUI.appendChild(controlText);

    return controlUI;

  }

  return mapAPI;

}
