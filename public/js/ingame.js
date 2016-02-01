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

var lobby_id = parseInt(window.location.pathname.split( '/' )[2]);

var panorama;
var map;

var marker_array = new Array();

var markers = {};

var player_count = 0;

var new_message_count = 0;

/*
	Rome targets:
	41.898961	12.473089	-	Fiumi Fountain
	41.8981484	12.473024	-	Pantheon









*/

function initialize() {
	//Get our username from previous page
	var username = localStorage.getItem("username");
	//Set up socket connection, stating where we are from and our username
	var socket = io.connect(window.location.origin,{query:'page=3&lobby_id='+lobby_id+'&username='+username}); //page=2 means show we're in a lobby

	//Currently a static start location, will be automatic in future
  	var google_start_loc = new google.maps.LatLng(56.0454131, 12.6935801);

  	var my_colour = { fill : "rgba(50,0,0,0.3)", stroke : "rgba(50,0,0,0.5)", name : "grey"};

  	var bounds = {north: 41.902, south: 41.896, east: 12.480,west: 12.469};

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
      		streetViewControl: false,
    		zoom: 14
  	});

  	var my_marker = new google.maps.Marker({
		position: google_start_loc,
		map: map,
	    icon: {
	      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
	      	scale: 4,
	      	rotation: 34+180,
		    strokeColor: my_colour.stroke,
		    fillColor: my_colour.fill,
		    fillOpacity:1
	    }
	});

  	//Setup the streetview
  	panorama = new google.maps.StreetViewPanorama(
      	document.getElementById("street_view_container"), {
        	position: google_start_loc,
        	pov: {
          		heading: 34,
          		pitch: 0
        	}
    });



	panorama.addListener('pov_changed', function() {
		my_marker.setIcon({
		    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
		    scale: 4,
		    rotation: panorama.pov.heading+180,
		    strokeColor: my_colour.stroke,
		    fillColor: my_colour.fill,
		    fillOpacity:100
		});
	});

  	
  	//Let people know when we have changed location
	panorama.addListener('position_changed', function() {
		var current_loc = panorama.getPosition();
		map.setCenter(current_loc);
		my_marker.setPosition(current_loc);
  		socket.emit('update_my_position', { username : username, loc : current_loc, lobby_id : lobby_id});
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
			    		"<td>"+ current_objective + "</td>" +
			       	"</tr>";

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
}
google.maps.event.addDomListener(window, "load", initialize);