var map;
var weatherMarkers;
var issMarkers;
var meetupMarkers;
var openWeatherMapKey;
var meetupAPIKey;
var mapLat;
var mapLng;

var xhr = new XMLHttpRequest();

function initMap() {
    issMarkers = [];
    weatherMarkers = [];
    meetupMarkers = [];
    sportsMarkers = [];
    mapLat = 45.5;
    mapLng = -73.5;
    openWeatherMapKey = "cba4c964d18bf550a71964dce032cb6f";
    meetupAPIKey = "7b6a1d355d341833e5812227975c49";
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 4,
      center: new google.maps.LatLng(45.5,-73.5),
      mapTypeId: 'roadmap'
    });
    google.maps.event.addListener(map, 'idle', refreshMapMarkers);
    google.maps.event.addListener(map, 'click', refreshMapMeetupMarkers);
    
    $('#filterWeather').change(function() {
        clearMarkers(weatherMarkers);
        if($(this).is(":checked")) {
            getWeather();
        }   
    });
    $('#filterIss').change(function() {
        clearMarkers(issMarkers);
        if($(this).is(":checked")) {
            getIss();
        }   
    });
    $('#filterMeetup').change(function() {
        clearMarkers(meetupMarkers);
        if($(this).is(":checked")) {
            getMeetup();
        }
    });
    $('#filterSports').change(function() {
        clearMarkers(sportsMarkers);
        if($(this).is(":checked")) {
            getSports();
        }
    });
    
    refreshMapMarkers();
}

/* **********************************
        Generic Methods
********************************** */
var clearMarkers = function(markersArray){
    for(i=0; i<markersArray.length; i++){
        markersArray[i].setMap(null);
    }
}

var refreshMapMarkers = function(){
    if($('#filterWeather').is(":checked")) {
        clearMarkers(weatherMarkers);
        getWeather();
    } 
    if($('#filterIss').is(":checked")) {
        clearMarkers(issMarkers);
        getIss();
    }
    // You dont want to constantly refresh SportsRadar there's a cap on API requests for trial version.
    // if($('#filterSports').is(":checked")) {
    //     clearMarkers(sportsMarkers);
    //     getSports();
    // }
}

var refreshMapMeetupMarkers = function(event) {
    console.log(event.latLng.lat().toFixed(2) + ", " + event.latLng.lng().toFixed(2));
    mapLat = event.latLng.lat().toFixed(2);
    mapLng = event.latLng.lng().toFixed(2);

    if($('#filterMeetup').is(":checked")) {
        clearMarkers(meetupMarkers);
        getMeetup();
    }
}

var addMarker = function(feature, infowindow, markers) {
    feature.map = map;
    var marker = new google.maps.Marker(feature);
    markers.push(marker);
    marker.addListener('click', function() {
        infowindow.open(map, marker);
    });
}

/* **********************************
        Ajax methods
********************************** */
var getWeather = function() {
    if(map.getBounds()!=undefined){
        var bounds = map.getBounds();
        var NorthEast = bounds.getNorthEast();
        var SouthWest = bounds.getSouthWest();
        var openMapsAPIString = "http://api.openweathermap.org/data/2.5/box/city?bbox="
                            + SouthWest.lng() + "," 
                            + NorthEast.lat() + "," 
                            + NorthEast.lng() + "," 
                            + SouthWest.lat() + ","
                            + map.getZoom() + "&cluster=yes&format=json"+ "&APPID=" + openWeatherMapKey;
        $.ajax({
            dataType: 'json',
            url:openMapsAPIString,  
            success:function(data) {
                for (var i = 0; i < data.list.length; i++) {
                    addWeatherMarker(data.list[i]);
                }
            }
        });
    }
};

var getIss = function() {
    var issAPIString = "https://api.wheretheiss.at/v1/satellites/25544";
    $.ajax({
        dataType: 'json',
        url:issAPIString,  
        success:function(data) {
            addIssMarker(data);  
        }
    });
};

var getMeetup = function() {
    // Finds Meetups within radius of 15km from the lat lng given
    // If no Meetups are found, sometimes the Meetup API by default returns Meetups in Montreal
    var meetupAPIString = "http://api.meetup.com/find/groups?lon=" + mapLng + "&lat="+ mapLat +"&radius=15&key=" + meetupAPIKey;
    $.ajax({
        dataType: 'jsonp',
        url:meetupAPIString,
        success:function(data) {
            if (data['data'].length !== 0) {
                for (var i = 0; i < data['data'].length; i++) {
                    addMeetupMarker(data['data'][i]);
                }
            } else {
                alert("No meetup groups found near Lat: " + mapLat + ", Long: " + mapLng);
            }
        }
    });
};

var getSports = function() {
    // Long and Lat are hardcoded to Montreal with a radius of 15km
    var sportsRoute = "/sports";
    if(xhr) {    
    xhr.open('GET', sportsRoute, true);
    xhr.onreadystatechange = function () {
        if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {

            var games_json = JSON.parse(xhr.responseText)
            var games = games_json.games
            for (var game in games) {
                if (games.hasOwnProperty(game)) {
            
                    console.log(games[game])
                    addSportsMarkers(games[game]);
                }
            }
        }
    }
    xhr.send(); 
  }
};


/* **********************************
        Marker methods
********************************** */

var addIssMarker = function(issItem) {
    var image = {
        url: 'icons/satellite.png',
        size: new google.maps.Size(25, 25),
        origin: new google.maps.Point(0, 0),
        scaledSize: new google.maps.Size(25, 25)
    };
    var feature = {
        position: new google.maps.LatLng(issItem.latitude, issItem.longitude), 
        icon: image,
    };
    var windowContent = "<strong>International Space Station</strong>"
        + "<br />Units: "+issItem.units
        + "<br />Velocity: "+issItem.velocity
        + "<br />Altitude: "+issItem.altitude
        + "<br />Day Number: "+issItem.daynum
        + "<br />Latitude: "+issItem.latitude
        + "<br />Longitude: "+issItem.longitude
        + "<br />Solar Latitude: "+issItem.solar_lat
        + "<br />Solar Longitude: "+issItem.solar_lon
    var infowindow = new google.maps.InfoWindow({
        content: windowContent
    });
    addMarker(feature, infowindow, issMarkers);
};

var addWeatherMarker = function(weatherItem) {
    var iconUrl = "http://openweathermap.org/img/w/" + weatherItem.weather[0].icon  + ".png";
    var feature = {
        position: new google.maps.LatLng(weatherItem.coord.Lat, weatherItem.coord.Lon), 
        icon: iconUrl,
    };    
    var windowContent = "<br /><strong>" + weatherItem.name + "</strong>"
        + "<br /> <img src=" + iconUrl + ">"
        + "<br />" + weatherItem.main.temp + "&deg;C"
        + "<br />" + weatherItem.weather[0].main
        + "<br />Wind: " + weatherItem.wind.deg 
        + "&deg; @ " + weatherItem.wind.speed + " km/h"
    var infowindow = new google.maps.InfoWindow({
        content: windowContent
    });
    addMarker(feature, infowindow, weatherMarkers);
};

var addMeetupMarker = function(meetupItem) {
    var iconUrl = '../icons/meetup.png';

    if (meetupItem.hasOwnProperty('group_photo'))
        iconUrl = meetupItem['group_photo']['highres_link'];

    var feature = {
        position: new google.maps.LatLng(meetupItem['lat'], meetupItem['lon']),
		icon:'../icons/meet.png'
    };

    var windowContent = "<br /><strong>" + meetupItem['name'] + "</strong>"
        + "<br /> <img src=" + iconUrl + " style=\"width: 150px\">"
        + "<br />Organizer: " + meetupItem['organizer']['name']
        + "<br />Members: " + meetupItem['members']
        + "<br />Category: " + meetupItem['category']['name']
    var infowindow = new google.maps.InfoWindow({
        content: windowContent
    });
    addMarker(feature, infowindow, meetupMarkers);
};

var addSportsMarkers = function(sportItem) {
    var iconUrl = '../icons/MLB.ico';
    var feature = {
        position: new google.maps.LatLng(parseFloat(sportItem.lat), parseFloat(sportItem.lng)), 
        icon: iconUrl,
    };    
    var windowContent = "<br /> <img src=" + iconUrl + ">"
        + "<br /><strong>" + sportItem.away_market + " </strong>"
        + "<strong>" + sportItem.away + "</strong>"
        + "<br />&nbsp;&nbsp;&nbsp;" + '@'
        + "<br /><strong>" + sportItem.home_market + " </strong>"
        + "<strong>" + sportItem.home + "</strong>"
            + "<br /><br /><strong>" + sportItem.away_alias + ": </strong>"
            + "<strong>" + sportItem.away_score + " ~ </strong>"
            + "<strong>" + sportItem.home_alias + ": </strong>"
            + "<strong>" + sportItem.home_score + "</strong>"
        + "<br /><br />Time: " + sportItem.time
    var infowindow = new google.maps.InfoWindow({
        content: windowContent
    });
    addMarker(feature, infowindow, sportsMarkers);
};

