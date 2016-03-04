var express = require('express'), app = express();
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
var path = require('path');
var jade = require('jade'); 
var http = require('http').Server(app);
var io = require('socket.io')(http);


var settings = {
    min_players:1,
    max_players:2
};

function lobby(type){
    this.id = Math.random().toString(36).substring(7); //unused at the moment
    this.type = type;   //O == private, 1 == public
    this.open = 1;      //1 == open, 0 == not open
    this.state = 1;     //0 == ingame, 1 == lobby
    this.players = [];  //Players/sockets in the lobby
    this.objectives = 5;
}

function player(socket_id, username){
    this.socket_id = socket_id;
    this.username = username;
    this.in_game = 0;
    this.loc = null;
    this.colour = {};
    this.current_objective = 1;
}

var find_private = 0, find_public = 1, inlobby = 2, ingame = 3;
var Players = new Array([],[],[],[]);

var Public_Lobbies = new Array(new lobby(1), new lobby(1), new lobby(1), new lobby(1), new lobby(1), new lobby(1));
var Private_Lobbies = new Array(new lobby(2), new lobby(2), new lobby(2), new lobby(2), new lobby(2), new lobby(2));


app.get('/', function(req, res){
    res.render('index.html');
});


app.get('/lobby/:lobby_id', function(req, res) {
    //res.send("lobby_id is set to " + req.params.lobby_id);
    res.render('lobby', {lobby_id : req.params.lobby_id});
});


app.get('/ingame/:game_id', function(req, res) {
    //res.send("lobby_id is set to " + req.params.lobby_id);
    res.render('ingame', {lobby_id : req.params.lobby_id});
});

app.get('/find_public_game', function(req, res){
    res.render('find_public_game');
});

app.get('/find_private_game', function(req, res){
    res.render('find_private_game');
});

app.get('/about', function(req, res){
    res.render('about');
});


/*Colours*/

var colours = [
    { fill : "rgba(150,0,0,0.5)", stroke : "rgba(150,0,0,0.7)", name : "red"},
    { fill : "rgba(0,150,0,0.5)", stroke : "rgba(0,150,0,0.7)", name : "green"},
    { fill : "rgba(0,0,150,0.5)", stroke : "rgba(0,0,150,0.7)", name : "blue"},
    { fill : "rgba(150,150,0,0.5)", stroke : "rgba(150,150,0,0.7)", name : "yellow"},
    { fill : "rgba(150,0,150,0.5)", stroke : "rgba(150,0,150,0.7)", name : "pink"},
    { fill : "rgba(150,150,150,0.5)", stroke : "rgba(150,150,150,0.7)", name : "white"},
    { fill : "rgba(0,0,0,0.5)", stroke : "rgba(0,0,0,0.7)", name : "black"},
    { fill : "rgba(0,150,150,0.5)", stroke : "rgba(0,150,150,0.7)", name : "cyan"}
];

var colour_distribution = 0;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket){
    //Page =  0/Find Private Game     1/Find public game    2/lobby    3/Ingame
    var active_page = parseInt(socket.handshake.query.page);
    switch(active_page){
        case find_private: //Find Private Game
            Players[find_private].push(socket.id);

            //Before we find a lobby we need to verify all users are here with a ping request of some kind

            //Find a private lobby here
        break;
        case find_public: //Find Public Game
            //socket.id

            //Before we find a lobby we need to verify all users are here with a ping request of some kind

            //Ensure that there is space for this person in a lobby
            console.log("FIND GAME: Finding space in a open lobby");
            var lobby_id = -1;
            for(var x = (Public_Lobbies.length - 1); x >= 0; x--){
                if(Public_Lobbies[x].players.length < settings.max_players){
                    lobby_id = x;
                }
            }

            if(lobby_id == -1){
                console.log("FIND GAME: Could not find a free lobby, please try again later");
                break;
            }

            
            console.log("FINDGAME: Adding user to the free lobby");
            
            Public_Lobbies[lobby_id].open = 0;

            io.to(socket.id).emit('join_lobby', { id:lobby_id });

            //Find a public lobby here
        break;
        case inlobby: //InLobby
            //Get data from initial connect
            var username = socket.handshake.query.username;
            var lobby_id = socket.handshake.query.lobby_id;

            console.log("IN LOBBY: Now " + username + " has joined, let everyone know");
            //Emit to other players that someone has joined
            Public_Lobbies[lobby_id].players.forEach(function(player, index){
                //tell this player of other users that are present
                io.to(socket.id).emit('player_joined', { username : player.username});
                //tell other players that this user has joined
                io.to(player.socket_id).emit('player_joined', { username : username});
                io.to(player.socket_id).emit('lobby_message_s', { username : username, input : " >> has joined the lobby << "});
            });

            console.log("IN LOBBY: Creating the player in storage");
            Public_Lobbies[lobby_id].players.push(new player(socket.id, username));
            
            Players[inlobby].push(socket.id);

            //In Game code here
        break;
        case ingame: //InGame

            //In Game code here
        break;
        default: //Unkown Origin
            console.log("Unkown location");

        break;
    }

    socket.on('disconnect', function(){
        for(var x = Public_Lobbies.length -1; x > -1; x--){
            if(Public_Lobbies[x].state == 1){
                Public_Lobbies[x].players.forEach(function(e, index){
                    if(e.socket_id == socket.id){
                        if (index > -1) {
                            var  username = Public_Lobbies[x].players[Public_Lobbies[x].players.indexOf(e)].username;
                            Public_Lobbies[x].players.splice(Public_Lobbies[x].players.indexOf(e), 1);
                            Public_Lobbies[x].players.forEach(function(e, index){
                                io.to(e.socket_id).emit('player_left', { username : username, socket_id : socket.id});
                                io.to(e.socket_id).emit('lobby_message_s', { username : username, input : " >> has left the lobby << "});
                            });
                        }
                    }
                });
            }
            else if(Public_Lobbies[x].state == 0){
                Public_Lobbies[x].players.forEach(function(e, index){
                    if(e.socket_id == socket.id){
                        if (index > -1) {
                            var  username = Public_Lobbies[x].players[Public_Lobbies[x].players.indexOf(e)].username;
                            Public_Lobbies[x].players.splice(Public_Lobbies[x].players.indexOf(e), 1);
                            Public_Lobbies[x].players.forEach(function(e, index){
                                io.to(e.socket_id).emit('player_left', { username : username, socket_id : socket.id});
                                io.to(e.socket_id).emit('ingame_message_s', { username : "SERVER", input : username+" has left the game"});
                            });
                        }
                    }
                });
            }
        }
        for(var x = 0; x < 3; x++){
            var index = Players[x].indexOf(socket.id);
            if (index > -1) {
                Players[x].splice(index, 1);
            }
        }
    });

    socket.on('start_game', function(obj){
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            Public_Lobbies[obj.lobby_id].open = 0;
            Public_Lobbies[obj.lobby_id].state = 0;
            io.to(e.socket_id).emit('s_start_game', obj );
        });
    });

    socket.on('lobby_message_c', function(obj){
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            io.to(e.socket_id).emit('lobby_message_s', obj );
        });
    });

    socket.on('ingame_message_c', function(obj){
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            io.to(e.socket_id).emit('ingame_message_s', obj );
        });
    });

    socket.on('player_scored', function(obj){
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            if(obj.username == e.username){
                Public_Lobbies[obj.lobby_id].players[index].current_objective = obj.current_objective;        
                io.to(e.socket_id).emit('ingame_message_s', { username : "SERVER" , input : "You have found an objective!"});        
            }else{
                io.to(e.socket_id).emit('player_has_scored', obj);
                io.to(e.socket_id).emit('ingame_message_s', { username : "SERVER" , input : obj.username + " has found an objective!"});
            }
        });
    });

    socket.on('player_won', function(obj){
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            Public_Lobbies[obj.lobby_id].players[index].current_objective = 0;
            if(obj.username == e.username){
                Public_Lobbies[obj.lobby_id].players[index].current_objective = obj.current_objective;
                Public_Lobbies[obj.lobby_id].open = 1;
                Public_Lobbies[obj.lobby_id].state = 1;
                io.to(e.socket_id).emit('ingame_message_s', { username : "SERVER" , input : "You have won the game!"});      
                io.to(e.socket_id).emit('player_has_won', obj);  
            }else{
                io.to(e.socket_id).emit('ingame_message_s', { username : "SERVER" , input : obj.username + " has won the game!"});
                io.to(e.socket_id).emit('player_has_won', obj);
            }
        });
    });

    socket.on('joined_game', function(obj){
        colour_distribution = colour_distribution < colours.length-1 ? colour_distribution+1 : 0;
        obj.socket_id = socket.id;
        obj.colour = colours[colour_distribution];
        obj.current_objective = 1;
        var username = obj.username;
        var found = false;
        var location = obj.loc;
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            if(username == e.username){
                found = true;
                Public_Lobbies[obj.lobby_id].players[index].socket_id = socket.id;
                Public_Lobbies[obj.lobby_id].players[index].loc = location;
                Public_Lobbies[obj.lobby_id].players[index].in_game = 1;
            }else{
                io.to(e.socket_id).emit('player_has_joined', obj);
            }
        });
        if(!found){
            io.to(socket.id).emit('get_other_players',  Public_Lobbies[obj.lobby_id].players);
            var players_length =  Public_Lobbies[obj.lobby_id].players.length;
            Public_Lobbies[obj.lobby_id].players.push({});
            Public_Lobbies[obj.lobby_id].players[players_length].username = obj.username;
            Public_Lobbies[obj.lobby_id].players[players_length].socket_id = socket.id;
            Public_Lobbies[obj.lobby_id].players[players_length].loc = location;
            Public_Lobbies[obj.lobby_id].players[players_length].in_game = 1;
            Public_Lobbies[obj.lobby_id].players[players_length].current_objective = 1;
            Public_Lobbies[obj.lobby_id].players[players_length].colour = colours[colour_distribution];
            //Send important info to the client
            io.to(socket.id).emit('get_starting_data',  { colour : colours[colour_distribution], lobby : Public_Lobbies[obj.lobby_id] });

        }

    });

    socket.on('update_my_angle', function(obj){
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            if(e.socket_id != socket.id){
                io.to(e.socket_id).emit('update_player_angle', { username : obj.username, angle : obj.angle, socket_id : socket.id, colour : obj.colour} );
            }
        });
    });

    socket.on('update_my_position', function(obj){
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            if(e.socket_id == socket.id){
                Public_Lobbies[obj.lobby_id].players[index].loc = obj.loc;
            }else{
                io.to(e.socket_id).emit('update_player', { username : obj.username, loc : obj.loc, socket_id : socket.id} );
            }
        });
    });
});

http.listen(25565, function(){
    console.log('listening on *:25565');
});