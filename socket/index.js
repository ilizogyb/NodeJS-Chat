
var async = require('async');
var cookie = require('cookie');  
var connect = require('connect'); 
var config = require('config');
var sessionStore = require('libs/sessionStore');
var HttpError = require('error').HttpError;
var User = require('models/user').User;
var log = require('libs/log')(module);
var cookieParser = require('cookie-parser');

function loadSession(sid, callback) {

  // sessionStore callback is not quite async-style!
  sessionStore.load(sid, function(err, session) {
    if (arguments.length == 0) {
      // no arguments => no session
      return callback(null, null);
    } else {
      return callback(null, session);
    }
  });

}



function loadUser(session, callback) {
  if (!session.user) {
    log.debug("Session %s is anonymous", session.id);
    return callback(null, null);
  }

  log.debug("retrieving user ", session.user);

  User.findById(session.user, function(err, user) {
    if (err) return callback(err);

    if (!user) {
      return callback(null, null);
    }
    log.debug("user findbyId result: " + user);
    callback(null, user);
  });

}


module.exports = function (server) {
  var io = require('socket.io').listen(server);
  
  io.set('origins', 'localhost:*');
  
  io.set('authorization', function(handshake, callback) {
    async.waterfall([
      function(callback) {

        // сделать handshake.cookies - объектом с cookie
        handshake.cookies = cookie.parse(handshake.headers.cookie || '');
        var sidCookie = handshake.cookies[config.get('session:key')];
        var sid = cookieParser.signedCookie(sidCookie, config.get('session:secret'));
        
        loadSession(sid, callback);
      },
      function(session, callback) {

        if (!session) {
          callback(new HttpError(401, "No session"));
        }

        handshake.session = session;
        loadUser(session, callback);
      },
      function(user, callback) {
        if (!user) {
          callback(new HttpError(403, "Anonymous session may not connect"));
        }

        handshake.user = user;

        callback(null);
      }

    ], function(err) {
      if (!err) {
        return callback(null, true);
      }

      if (err instanceof HttpError) {
        return callback(null, false);
      }

      callback(err);
    });
  });

 io.sockets.on('sessreload', function(sid) {
   var ns = io.of("/");

    if (ns) {
      //get all connected user sockets and iterate
      for (var id in ns.connected) {
        var client = ns.connected[id];
        //get client cookie session id 
        var clientCookieSID = cookie.parse(client.handshake.headers.cookie);
        //get client cookie session id and parse
        var clientSid = cookieParser.signedCookies( clientCookieSID, config.get('session:secret'));
       
       
        //get current user socket and recline other users *
        if (clientSid.sid != sid) {
          return;
        }
        
        loadSession(sid, function(err, session) {
        
        if (err) {
          client.emit("error", "server error");
          client.disconnect();
          return;
        }
        
        if (!session) {
          client.emit("logout");
          client.disconnect();
          return;
        }

        client.handshake.session = session;
          
      });
        }
   }
});

  io.sockets.on('connection', function(socket) {
    var handshake = socket.request;
    var username = socket.request.user.username;
    socket.broadcast.emit('join', username);

     socket.on('message', function(text, cb) {
       socket.broadcast.emit('message', username, text);
       cb && cb();
     });

     socket.on('disconnect', function() {
      socket.broadcast.emit('leave', username);
    });
});
  return io;
};
