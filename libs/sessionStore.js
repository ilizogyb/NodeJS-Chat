const mongoose = require('libs/mongoose');
var session = require('express-session')
const MongoStore = require('connect-mongo')(session);


var sessionStorage = new MongoStore({ mongooseConnection: mongoose.connection})

module.exports = sessionStorage;