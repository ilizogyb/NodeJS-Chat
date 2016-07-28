var express = require('express');
var path = require('path');
var http = require('http');
var config = require('config');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session')
var routes = require('./routes/index');
var User = require('models/user').User;
var log = require('libs/log')(module);
var HttpError = require('error').HttpError;
const MongoStore = require('connect-mongo')(session);
const mongoose = require('libs/mongoose');
var io = require('socket.io')(app);


var app = express();

app.set('views', path.join(__dirname, 'views'));

app.engine('ejs', require('ejs-locals'));

app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(session({
    secret: config.get('session:secret'),
    key: config.get('session:key'),
    proxy: config.get('session:proxy'),
    resave: config.get('session:resave'),
    saveUninitialized: config.get('session:saveUninitialized'),
    cookie: config.get("session:cookie"),
    store: new MongoStore({ mongooseConnection: mongoose.connection})
}));

app.use(require('middleware/loadUser'));

app.use('/', routes);

app.use(express.static(path.join(__dirname, 'public')));

app.use(function(err, req, res, next) {
  if (typeof err == 'number') {
    err = new HttpError(err);
  }

  if(err instanceof HttpError) {
    res.status(err.status);
    if(res.req.headers['x-requested-with'] == 'XMLHttpRequest') {
           res.json(err);
    } else {
      res.render('errors', {error: err});
    }
  } else {
    if (app.get('env' == 'development')) {
      express.errorHandeler()(err, req,res, next);
    } else {
     log.error(err);
     err = new HttpError(500);
     res.status(err.status);
     if(res.req.headers['x-requested-with'] == 'XMLHttpRequest') {
         res.json(err);
        } else {
            res.render('errors', {error: err});
        }
    }
  }
});

var server = http.createServer(app).listen(config.get('port'), function(){
  log.info('Express server listening on port ' + config.get('port'));
});

require('./socket')(server);

module.exports = app;