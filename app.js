var express = require('express'),app = express();
var path = require('path');

var http = require('http').Server(app);
var io = require('socket.io')(http);

var Lobbies = [
];

var Players = [
];

function updateGUI(){
    //io.emit('updateGUI', [Lobbies, Players, Players.length]);
}

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


app.get('/', function(req, res){
    res.sendfile('public/index.html');
});


app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket){
    /*
    Players.push(socket.id);
    updateGUI();

    socket.on('disconnect', function(){
        for(var x = 0; x < Lobbies.length; x++ ){
            var index = Lobbies[x].players.indexOf(socket.id);
            if (index > -1) {
                Lobbies[x].players.splice(index, 1);
            }
        }
        var index = Players.indexOf(socket.id);
        if (index > -1) {
            Players.splice(index, 1);
        }
        updateGUI();
    });

    socket.on('join_lobby', function(lobby_id){
        if(Lobbies[lobby_id].players.length < 2){
            if(!isPlayerInLobby(socket.id)){
                Lobbies[lobby_id].players.push(socket.id);
                updateGUI();
                io.to(socket.id).emit('lobby_join', { success : true});
                if(Lobbies[lobby_id].players.length == 2){
                    Lobbies[lobby_id].started = true;
                    io.to(Lobbies[lobby_id].players[0]).emit('game_start', { player : 1 , enemy : 2});
                    io.to(Lobbies[lobby_id].players[1]).emit('game_start', { player : 2 , enemy : 1});
                }
            }
        }else{
            io.to(socket.id).emit('lobby_join', { success : false, reason : "Lobby is full!" })
        }
    });

    socket.on('player_move', function(obj){
        if(obj.player == 2){
            io.to(getPlayerLobby(socket.id).players[0]).emit('player_moved', { player : 2 , direction : obj.direction });
        }else if(obj.player == 1){
            io.to(getPlayerLobby(socket.id).players[1]).emit('player_moved', { player : 1 , direction : obj.direction });
        }
    });
});


setInterval(
    function(){
        //Update

        for(var x = 0; x < Lobbies.length; x++ ){
            if(Lobbies[x].players.length < 2 && Lobbies[x].started == true){
                io.to(Lobbies[x].players[0]).emit('game_abandoned');
                Lobbies[x].started = false;
                Lobbies[x].player_1_score = 0;
                Lobbies[x].player_2_score = 0;
            }
        };
*/
},100);

http.listen(25565, function(){
    console.log('listening on *:25565');
});