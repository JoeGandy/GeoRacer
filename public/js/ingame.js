$(document).ready(function(){
	$(".toggle_target").click(function(){
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
  	var start_loc = {lat: 41.8978996, lng: 12.4733917};
  	var bounds = {north: 41.902, south: 41.896, east: 12.480,west: 12.469};

  	var rectangle = new google.maps.Rectangle({
	    bounds: bounds,
	    fillColor: "rgba(63, 191, 63, 0.45)",
	    strokeColor: "rgba(63, 191, 63, 0.73)",
	    strokeWeight: 2,
	    clickable: false
	});


  	//Let the server know we are ready
  	socket.emit('joined_game', { lobby_id : lobby_id, username : username, loc : start_loc});

  	//Setup the minimap
  	map = new google.maps.Map(document.getElementById('mini_map_container'), {
    	center: start_loc,
      	streetViewControl: false,
    	zoom: 15
  	});

  	var my_marker = new google.maps.Marker({
		position: start_loc,
		map: map,
	    icon: {
	      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
	      	scale: 4,
	      	rotation: 34+180,
	      	strokeColor: "rgba(63, 191, 63, 0.73)",
		    fillColor: "rgba(63, 191, 63, 0.73)",
		    fillOpacity:1
	    }
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



	panorama.addListener('pov_changed', function() {
		my_marker.setIcon({
		    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
		    scale: 4,
		    rotation: panorama.pov.heading+180,
		    strokeColor: "rgba(63, 191, 63, 0.73)",
		    fillColor: "rgba(63, 191, 63, 0.73)",
		    fillOpacity:100
		});
	});

  	
  	//Let people know when we have changed location
	panorama.addListener('position_changed', function() {
		var lat = panorama.getPosition().lat();
		var lng = panorama.getPosition().lng();
		map.setCenter({lat: lat, lng: lng});
		my_marker.setPosition({lat: lat, lng: lng});
  		socket.emit('update_my_position', { username : username, lat : lat, lng : lng, lobby_id : lobby_id});
	});

  	//Bind this panorama to the minimap
  	map.setStreetView(panorama);
  	rectangle.setMap(map);

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
			    icon: {
			      	path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
			      	scale: 4,
			      	rotation: 0,
			      	strokeColor: "rgba(25, 25, 25, 0.73)",
				    fillColor: "rgba(25, 25, 25, 0.73)",
				    fillOpacity:1
			    },
		      	title: players_name
		  	});
		} else if (result.length > 0) { //else update the current markers we have
			result[0].setPosition(lat_lng);
			result[1].setPosition(lat_lng);
		}
	});

  	//Add new message to the chat box
  	//Also shows a little notification on the toggle chat button
  	socket.on('ingame_message_s', function(result){
  		console.log(result);
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
}