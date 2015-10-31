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

function isPlayerInLobby(player_id){
    /*
    for(var x = 0; x < Lobbies.length; x++ ){
        if(Lobbies[x].players.indexOf(player_id) != -1){
            return true;
        }
    };
    return false;
    */
}

function getPlayerLobby(player_id){
    /*
    for(var x = 0; x < Lobbies.length; x++ ){
        if(Lobbies[x].players.indexOf(player_id) != -1){
            return Lobbies[x];
        }
    };
    return false;
    */
}

function lobby(type){
    this.type = type;   //O == private, 1 == public
    this.open = 1;      //1 == open, 0 == not open
    this.state = 1;     //0 == ingame, 1 == lobby
    this.players = [];  //Players/sockets in the lobby
}

function player(socket_id, username){
    this.socket_id = socket_id;
    this.username = username;
}

var find_private = 0, find_public = 1, inlobby = 2, ingame = 3;
var Players = new Array([],[],[],[]);

var Public_Lobbies = new Array(new lobby(1), new lobby(1), new lobby(1));
var Private_Lobbies = new Array(new lobby(2), new lobby(2), new lobby(2));


app.get('/', function(req, res){
    res.render('index.html');
});


app.get('/lobby/:lobby_id', function(req, res) {
    //res.send("lobby_id is set to " + req.params.lobby_id);
    res.render('lobby', {lobby_id : req.params.lobby_id});
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
            Players[find_public].push(socket.id);

            //Before we find a lobby we need to verify all users are here with a ping request of some kind
            console.log("Finding an open lobby");
            var lobby_id = -1;
            for(var x = Public_Lobbies.length -1; x > -1; x--){
                if(Public_Lobbies[x].players.length < settings.max_players){
                    lobby_id = x;
                }
            }

            if(lobby_id == -1){
                console.log("Could not find a free lobby, please try again later");
                break;
            }

            Players[find_public].forEach(function(socketId, index){
                Public_Lobbies[lobby_id].players.push(socketId);
                if(Public_Lobbies[lobby_id].players.length >= settings.min_players){
                    //Start this lobby
                    Public_Lobbies[lobby_id].open = 0;
                    Public_Lobbies[lobby_id].players.forEach(function(socket_id, index){
                        io.to(socket_id).emit('join_lobby', { id:lobby_id });
                    });
                    Public_Lobbies[lobby_id].players.length = 0;
                }
            });
           Players[find_public].length = 0;
            //Find a public lobby here
        break;
        case inlobby: //InLobby
            //Get data from initial connect
            var username = socket.handshake.query.username;
            var lobby_id = socket.handshake.query.lobby_id;

            //Emit to other players that someone has joined
            Public_Lobbies[lobby_id].players.forEach(function(player, index){
                //tell this player of other users that are present
                io.to(socket.id).emit('player_joined', { username : player.username});
                //tell other players that this user has joined
                io.to(player.socket_id).emit('player_joined', { username : username});
                io.to(player.socket_id).emit('lobby_message_s', { username : username, input : " >> has joined the lobby << "});
            });

            Public_Lobbies[lobby_id].players.push(new player(socket.id, username));
            
            Players[inlobby].push(socket.id);

            //In Game code here
        break;
        case ingame: //InGame
            Players[ingame].push(socket.id);

            //In Game code here
        break;
        default: //Unkown Origin
            console.log("Unkown location");

        break;
    }

    //console.log("Players:");
    //console.log(Players);
    console.log("Public Lobbies");
    //console.log(Public_Lobbies);
        for(var x = Public_Lobbies.length -1; x > -1; x--){
            console.log(Public_Lobbies[x].players);
        }

    socket.on('disconnect', function(){
        for(var x = Public_Lobbies.length -1; x > -1; x--){
            Public_Lobbies[x].players.forEach(function(e, index){
                if(e.socket_id == socket.id){
                    if (index > -1) {
                        var  username = Public_Lobbies[x].players[Public_Lobbies[x].players.indexOf(e)].username;
                        Public_Lobbies[x].players.splice(Public_Lobbies[x].players.indexOf(e), 1);
                        Public_Lobbies[x].players.forEach(function(e, index){
                            io.to(e.socket_id).emit('player_left', { username : username});
                            io.to(e.socket_id).emit('lobby_message_s', { username : username, input : " >> has left the lobby << "});
                        });
                    }
                }

            });
        }
        for(var x = 0; x < 3; x++){
            var index = Players[x].indexOf(socket.id);
            if (index > -1) {
                Players[x].splice(index, 1);
            }
        }
    });

    socket.on('lobby_message_c', function(obj){
        Public_Lobbies[obj.lobby_id].players.forEach(function(e, index){
            io.to(e.socket_id).emit('lobby_message_s', obj );
        });

    });
});

http.listen(25565, function(){
    console.log('listening on *:25565');
});