$(document).ready(function(){
	$("body").on('click', '.toggle_target', function(){
		if($(this).data("toggle") == "show"){
			$($(this).data('target')).hide();
			$(this).addClass($(this).data('addclass'));
			$(this).html($(this).data('showtext'));
			$(this).data("toggle", "hide");
			//hide
		}else{
			$($(this).data('target')).show();
			$(this).removeClass($(this).data('addclass'));
			$(this).html($(this).data('hidetext'));
			$(this).data("toggle", "show");
			//show
		}
	});

	$("#toggle_chat").click(function(){
		if($(this).data("toggle") == "show"){
			new_message_count = 0;
		}
	});

});

//Assume user is always on this page if they're in a lobby
var lobby_id = parseInt(window.location.pathname.split( '/' )[2]);
var location_id = parseInt(window.location.pathname.split( '/' )[3]);

var panorama;
var map;

var marker_array = new Array();
var markers = {};

var player_count = 0;
var start_angle = 34;
var last_angle = start_angle;

var targets = [];
var current_objective = 1;//TEMP
var total_objective_count = 0;

var new_message_count = 0;
var last_loc = 0;

var game_won = false;

var minimap_styles = [{
    featureType: "all",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
}];

var panorama_styles = [{
    featureType: "all",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
}];

var locations = [
	new google.maps.LatLng(52.9529907,-1.1864428),//Nottingham England
	new google.maps.LatLng(40.7585818,-73.9850715),//New York, America
	new google.maps.LatLng(48.4761604,-81.330506),//Timmins, Canda
	new google.maps.LatLng(41.2374173,-80.81994),//Warren, America
	new google.maps.LatLng(43.6404659,-79.3902088),//Torronto, Canda
	new google.maps.LatLng(55.6756195,12.5683829)//Copenhagen, Denmark
];

function initialize() {
	//Get our username from previous page
	var username = localStorage.getItem("username");
	var area_height = 0.004;
	var area_width = 0.005;
	var size = 0;
	//Set up socket connection, stating where we are from and our username
	var socket = io.connect(window.location.origin,{query:'page=3&lobby_id='+lobby_id+'&username='+username}); //page=2 means show we're in a lobby

	//Currently a static start location, will be automatic in future
  	var google_start_loc = locations[location_id];

  	var my_colour = { fill : "rgba(50,0,0,0.3)", stroke : "rgba(50,0,0,0.5)", name : "grey"};

  	var bounds = {
  		north: google_start_loc.lat() + area_height,
  		south: google_start_loc.lat() - area_height,
  		east: google_start_loc.lng() + area_width,
  		west: google_start_loc.lng() - area_width
  	};

  	var rectangle = new google.maps.Rectangle({
	    bounds: bounds,
	    fillColor: "rgba(63, 191, 63, 0.45)",
	    strokeColor: "rgba(63, 191, 63, 0.73)",
	    strokeWeight: 2,
	    clickable: false
	});

  	//Let the server know we are ready
  	socket.emit('joined_game', { lobby_id : lobby_id, username : username, loc : google_start_loc});

  	//Setup the minimap
  	map = new google.maps.Map(
  		document.getElementById("mini_map_container"), {
    		center: google_start_loc,
    		zoom: 14,
      		streetViewControl: false,
			zoomControl: false,
			mapTypeControl: false,
			scaleControl: false,
			rotateControl: false,
			liteMode: true
  	});
	map.setOptions({styles: minimap_styles});

	var request = {
	    location: google_start_loc,
	    radius: measure(google_start_loc.lat(),google_start_loc.lng(), google_start_loc.lat() + area_height, google_start_loc.lng())
	};

	size = measure(google_start_loc.lat() - area_height,google_start_loc.lng(), google_start_loc.lat() + area_height, google_start_loc.lng());
	service = new google.maps.places.PlacesService(map);
	service.nearbySearch(request, function(results, status) {
		for(var x = 0; x < results.length; x++){
			if(inside_bounds(results[x].geometry.location, bounds)){
				targets.push({lat_long : results[x].geometry.location, name : results[x].name});
			  	new google.maps.Marker({
					position: results[x].geometry.location,
					map: map,
					title: results[x].name
				});
			}
		}
		targets = shuffle(targets); //Randomise the order of the array so people have random objectives
		$(".objective_box > div > h4 > span").text(targets[current_objective].name);
	});

  	var my_marker = new google.maps.Marker({
		position: google_start_loc,
		map: map,
	    icon: {
	      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
	      	scale: 4,
	      	rotation: start_angle+180,
		    strokeColor: my_colour.stroke,
		    fillColor: my_colour.fill,
		    fillOpacity:1,
			liteMode: true
	    }
	});

  	//Setup the streetview
  	panorama = new google.maps.StreetViewPanorama(
      	document.getElementById("street_view_container"), {
        	position: google_start_loc,
        	pov: {
          		heading: start_angle,
          		pitch: 0
        	},
        	addressControl: false,
      		visible: true,
      		enableCloseButton: false,
      		panControl: false,
      		streetNamesEnabled: false

    });

	panorama.setOptions({styles: panorama_styles});

	panorama.addListener('pov_changed', function() {
		var current_loc = panorama.getPosition();
		my_marker.setIcon({
		    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
		    scale: 4,
		    rotation: panorama.pov.heading+180,
		    strokeColor: my_colour.stroke,
		    fillColor: my_colour.fill,
		    fillOpacity:100
		});
		if(panorama.pov.heading >= last_angle+30 || panorama.pov.heading <= last_angle-30){
			last_angle = panorama.pov.heading;
			socket.emit('update_my_angle', { username : username, angle : panorama.pov.heading, lobby_id : lobby_id, colour : my_colour});
		}
		var correct_heading = angleFromCoordinate(current_loc.lat(), current_loc.lng(), targets[current_objective].lat_long.lat(), targets[current_objective].lat_long.lng());
		if((measure(targets[current_objective].lat_long.lat(), targets[current_objective].lat_long.lng(), current_loc.lat(), current_loc.lng()) < 100 && Math.abs(correct_heading-panorama.pov.heading) < 50) ||
			(measure(targets[current_objective].lat_long.lat(), targets[current_objective].lat_long.lng(), current_loc.lat(), current_loc.lng()) < 70 && Math.abs(correct_heading-panorama.pov.heading) < 90)){
				//user has found their objective!
				if(current_objective < total_objective_count){
					if(current_objective == total_objective_count){
						//The Game is won!
						
					}
					current_objective++;
					$("#found_objective").show().delay(5000).fadeOut(3000);
					$(".objective_box > div > h4 > span").text(targets[current_objective].name);
					$("#current_objective_count").text(current_objective);
					$("#row_" + socket.id + " > td:nth-child(2)").text(current_objective);
			  		var percentage = 100 - ((measure(targets[current_objective].lat_long.lat(), targets[current_objective].lat_long.lng(), current_loc.lat(), current_loc.lng())) / size*100);
			  		percentage = percentage < 0 ? 0 : percentage;
			  		percentage = percentage > 100 ? 100 : percentage;
			  		$("#closeometer input").val(percentage);
			  		socket.emit('player_scored', { username : username, lobby_id : lobby_id, current_objective : current_objective, socket_id : socket.id });
				}else{
					if(!game_won){
						game_won = true;
						$(".objective_box > div > h4 > span").text("No more objectives, you won!");
				  		socket.emit('player_won', { username : username, lobby_id : lobby_id, socket_id : socket.id });
					}
				}
		}
	});

	socket.on('player_has_scored', function(result){
		$("#row_" + result.socket_id + " > td:nth-child(2)").text(result.current_objective);
	});

	socket.on('player_has_won', function(result){
		$("#found_objective p").text(result.username + " has won the game! You'll be returned to the lobby in a few seconds")
		$("#found_objective").show().delay(7000).fadeOut(3000);
		window.setTimeout(function(){
			window.location.href = '../lobby/' + lobby_id;
		},8000);
	});

  	
  	//Let people know when we have changed location
	panorama.addListener('position_changed', function() {
		//var bounds = {north: 41.902, south: 41.896, east: 12.480,west: 12.469};
		var current_loc = panorama.getPosition();
		map.setCenter(current_loc);
		my_marker.setPosition(current_loc);
  		socket.emit('update_my_position', { username : username, loc : current_loc, lobby_id : lobby_id, colour : my_colour});

  		if(!inside_bounds(current_loc, bounds)){
  			$("#back_to_start").show();
  		}else{
  			$("#back_to_start").hide();
  		}
  		var percentage = 100 - ((measure(targets[current_objective].lat_long.lat(), targets[current_objective].lat_long.lng(), current_loc.lat(), current_loc.lng())) / size*100);
  		percentage = percentage < 0 ? 0 : percentage;
  		percentage = percentage > 100 ? 100 : percentage;
  		$("#closeometer input").val(percentage);
	});

  	//Bind this panorama to the minimap
  	map.setStreetView(panorama);
  	rectangle.setMap(map);

  	socket.on('get_starting_data', function(result){
  		my_colour = result.colour;
  		my_marker.setIcon({
		    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
		    scale: 4,
		    rotation: panorama.pov.heading+180,
		    strokeColor: my_colour.stroke,
		    fillColor: my_colour.fill,
		    fillOpacity:100
		});
		player_count = result.lobby.players.length;
		$("#player_count").text(player_count);

		$.each(result.lobby.players, function( index, value ) {
			var html = "<tr id=\"row_" + value.socket_id + "\">" +
			    		"<td><span style=\"color:" + value.colour.fill +";\">&#9660;</span>"+ value.username + "</td>" +
			    		"<td>" + value.current_objective + "</td>" +
			       	"</tr>";
			$("#players_current_objectives").html($("#players_current_objectives").html() + html);

			if(value.socket_id == socket.id){
				$("#current_objective_count").text(value.current_objective);
				$("#total_objective_count").text(result.lobby.objectives);
				total_objective_count = result.lobby.objectives;
			}
		});
  	});

	socket.on('update_player', function(result){
		update_player(result);
	});

	socket.on('player_left', function(result){
		$("#player_count").text(--player_count);

		$("#players_current_objectives #row_" + result.socket_id).remove();

		markers[result.socket_id]['panorama'].setMap(null);
		markers[result.socket_id]['map'].setMap(null);

		delete markers[result.socket_id];
	});

	socket.on('get_other_players', function(result){
		$.each(result, function( index, value ) {
			update_player(value);
		});
	});

	socket.on('player_has_joined', function(result){
		var players_name = result.username;
		var colour = result.colour;
		var socket_id = result.socket_id;
		var current_objective = result.current_objective;
		$("#player_count").text(++player_count);
		var html = "<tr id=\"row_" + socket_id + "\" >" +
			    		"<td><span style=\"color:" + colour.fill +";\">&#9660;</span>"+ players_name + "</td>" +
			    		"<td>"+ current_objective + "</td>" +			       	"</tr>";
		$("#players_current_objectives").html($("#players_current_objectives").html() + html);
  		var lat_lng = result.loc;
		if(!markers[socket_id]) {
			markers[socket_id] = {};
			markers[socket_id]['panorama'] = new google.maps.Marker({
		      	position: lat_lng,
		      	map: panorama,
			    icon: {
			      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
			      	scale: 13,
			      	rotation: 0,
			      	strokeColor: colour.stroke,
				    fillColor:  colour.fill,
				    fillOpacity:1
			    },
		      	title: socket_id
		  	});
			markers[socket_id]['map'] = new google.maps.Marker({
		      	position: lat_lng,
		      	map: map,
			    icon: {
			      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
			      	scale: 4,
			      	rotation: 0,
			      	strokeColor: colour.stroke,
				    fillColor:  colour.fill,
				    fillOpacity:1
			    },
		      	title: socket_id
		  	});
		}
	});

  	//Add new message to the chat box
  	//Also shows a little notification on the toggle chat button
  	socket.on('ingame_message_s', function(result){
  		var output = "<span class=\"message\"><span class=\"name\">" + result.username + "</span>: <span class=\"content\">" + result.input + "</span></span></span><br>"
  		$(".game_chat .output").html($(".game_chat .output").html() + output);
  		if($("#toggle_chat").data('toggle') === "hide"){
  			new_message_count++;
  			$("#toggle_chat").html("Show Chat - " + new_message_count + " New <span class=\"glyphicon glyphicon-exclamation-sign\" aria-hidden=\"true\"></span>");
  		}
  	});

  	//Allow users to press enter to submit message
  	$("#chat_input").keyup(function(event){
	    if(event.keyCode == 13) $("#send_message").click();
	});

  	//Send message by clicking the button
  	$("#send_message").click(function(e){
  		//Get chat message
  		var input = $("#chat_input").val();
  		if(input == null || input == "") return;
    	
    	//Clear old chat message and focus back onto the input box
    	$("#chat_input").val('').focus();
    	
    	socket.emit('ingame_message_c', { input : input, username : username, lobby_id : lobby_id});
  	});

	socket.on('update_player_angle', function(result){
		var socket_id = result.socket_id;
		var colour = result.colour;
  		var angle = result.angle;
		//If no marker yet, set one up
		markers[socket_id]['map'].setIcon({
			      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
			      	scale: 4,
			      	rotation: angle+180,
			      	strokeColor: colour.stroke,
				    fillColor: colour.fill,
				    fillOpacity:1
		});
		
	});

	function update_player(result){
		var socket_id = result.socket_id;
		var colour = result.colour;
		var players_name = result.username;
  		var lat_lng = result.loc;
		//If no marker yet, set one up
		if(!markers[socket_id]) {
			markers[socket_id] = {};
			markers[socket_id]['panorama'] = new google.maps.Marker({
		      	position: lat_lng,
		      	map: panorama,
			    icon: {
			      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
			      	scale: 13,
			      	rotation: 0,
			      	strokeColor: colour.stroke,
				    fillColor: colour.fill,
				    fillOpacity:1
			    },
		      	title: socket_id
		  	});
			markers[socket_id]['map'] = new google.maps.Marker({
		      	position: lat_lng,
		      	map: map,
			    icon: {
			      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
			      	scale: 4,
			      	rotation: 0,
			      	strokeColor: colour.stroke,
				    fillColor: colour.fill,
				    fillOpacity:1
			    },
		      	title: socket_id
		  	});
		} else { //else update the current markers we have
			markers[socket_id]['panorama'].setPosition(lat_lng);
			markers[socket_id]['map'].setPosition(lat_lng);
		}
	}

	$("#back_to_start_button").click(function(){
		panorama.setPosition(google_start_loc);
		map.setCenter(google_start_loc);
		my_marker.setPosition(google_start_loc);
  		socket.emit('update_my_position', { username : username, loc : google_start_loc, lobby_id : lobby_id, colour : my_colour});
	});
}
google.maps.event.addDomListener(window, "load", initialize);


//http://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters
function measure(lat1, lon1, lat2, lon2){  // generally used geo measurement function
    var R = 6378.137; // Radius of earth in KM
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d * 1000; // meters
}

function inside_bounds(lat_long, bounds){
  	if(lat_long.lat() > bounds.north || lat_long.lat() < bounds.south || lat_long.lng() > bounds.east || lat_long.lng() < bounds.west)
		return false;
	else
		return true;
}

//http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

//Adapted it from an answer in ?java?
//http://stackoverflow.com/questions/3932502/calcute-angle-between-two-latitude-longitude-points
function angleFromCoordinate(lat1, long1, lat2, long2) {

    var dLon = (long2 - long1);

    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1)
            * Math.cos(lat2) * Math.cos(dLon);

    var brng = Math.atan2(y, x);

    brng = brng * (180/Math.PI); // convert to degrees
    brng = (brng + 360) % 360;
    brng = 360 - brng;

    return brng;
}