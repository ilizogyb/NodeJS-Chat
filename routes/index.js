var express = require('express');
var router = express.Router();
var HttpError = require('error').HttpError;
var User = require('models/user').User;
var ObjectID = require('mongodb').ObjectID;

/* GET home page. */
router.get('/', require('./frontpage').get);
router.get('/chat', require('./chat').get);
router.get('/login', require('./login').get);
router.post('/login', require('./login').post);
router.post('/logout', require('./logout').post);




module.exports = router;
