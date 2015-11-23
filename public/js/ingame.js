$(document).ready(function(){
	$(".toggle_target").click(function(){
		if($(this).data("toggle") == "show"){
			$($(this).data('target')).hide();
			$(this).addClass($(this).data('addclass'));
			$(this).text($(this).data('showtext'));
			$(this).data("toggle", "hide");
			//hide
		}else{
			$($(this).data('target')).show();
			$(this).removeClass($(this).data('addclass'));
			$(this).text($(this).data('hidetext'));
			$(this).data("toggle", "show");
			//show
		}
	});

});

var lobby_id = parseInt(window.location.pathname.split( '/' )[2]);

var panorama;
var map;

var marker_array = new Array();

function initialize() {
var socket = io.connect(window.location.origin,{query:'page=3&lobby_id='+lobby_id+'&username='+username}); //page=2 means show we're in a lobby
var username = localStorage.getItem("username");

  	var start_loc = {lat: 52.952995, lng: -1.186652};
  	socket.emit('joined_game', { lobby_id : lobby_id, username : username, loc : start_loc});

  	map = new google.maps.Map(document.getElementById('mini_map_container'), {
    	center: start_loc,
    	zoom: 14
  	});
  	panorama = new google.maps.StreetViewPanorama(
      	document.getElementById('street_view_container'), {
        	position: start_loc,
        	pov: {
          		heading: 34,
          		pitch: 0
        	}
      	});
		panorama.addListener('position_changed', function() {
			var lat = panorama.getPosition().lat();
			var lng = panorama.getPosition().lng();
  			socket.emit('update_my_position', { username : username, lat : lat, lng : lng, lobby_id : lobby_id});
		});
  	map.setStreetView(panorama);

	socket.on('update_player', function(result){
		var players_name = result.username;
		var lat = result.lat;
		var lng = result.lng;
  		var lat_lng = {lat: lat, lng: lng};
		var result = $.grep(marker_array, function(e){ return e.title == players_name; });
		console.log("UPDATE for " + players_name + " You are " + username);
		if(result.length == 0){
			marker_array[marker_array.length] = new google.maps.Marker({
		      	position: lat_lng,
		      	map: panorama,
		      	icon: 'http://www.fapcia.com/images/map_pin_1.png',
		      	title: players_name
		  	});
			marker.push({username : players_name, loc : lat_long})
		} else if (result.length == 1) {
			result[0].setPosition(lat_lng);
		}
	});
}