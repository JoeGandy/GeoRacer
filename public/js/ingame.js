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
	//Get our username from previous page
	var username = localStorage.getItem("username");
	//Set up socket connection, stating where we are from and our username
	var socket = io.connect(window.location.origin,{query:'page=3&lobby_id='+lobby_id+'&username='+username}); //page=2 means show we're in a lobby

	//Currently a static start location, will be automatic in future
  	var start_loc = {lat: 40.7206374, lng: -74.000835};

  	//Let the server know we are ready
  	socket.emit('joined_game', { lobby_id : lobby_id, username : username, loc : start_loc});

  	//Setup the minimap
  	map = new google.maps.Map(document.getElementById('mini_map_container'), {
    	center: start_loc,
    	zoom: 15
  	});

  	//Setup the streetview
  	panorama = new google.maps.StreetViewPanorama(
      	document.getElementById('street_view_container'), {
        	position: start_loc,
        	pov: {
          		heading: 34,
          		pitch: 0
        	}
    });
  	
  	//Let people know when we have changed location
	panorama.addListener('position_changed', function() {
		var lat = panorama.getPosition().lat();
		var lng = panorama.getPosition().lng();
		map.setCenter({lat: lat, lng: lng});
  		socket.emit('update_my_position', { username : username, lat : lat, lng : lng, lobby_id : lobby_id});
	});

  	//Bind this panorama to the minimap
  	map.setStreetView(panorama);

	socket.on('update_player', function(result){
		var players_name = result.username;
  		var lat_lng = {lat: result.lat, lng: result.lng};
		var result = $.grep(marker_array, function(e){ return e.title == players_name; });
		//If no marker yet, set one up
		if(result.length == 0){
			marker_array[marker_array.length] = new google.maps.Marker({
		      	position: lat_lng,
		      	map: panorama,
		      	icon: 'http://www.fapcia.com/images/map_pin_1.png',
		      	title: players_name
		  	});
			marker_array[marker_array.length] = new google.maps.Marker({
		      	position: lat_lng,
		      	map: map,
		      	icon: 'http://www.fapcia.com/images/map_pin_1.png',
		      	title: players_name
		  	});
		} else if (result.length > 0) { //else update the current markers we have
			result[0].setPosition(lat_lng);
			result[1].setPosition(lat_lng);
		}
	});
}