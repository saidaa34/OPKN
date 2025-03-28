var express = require('express');
var router = express.Router();
//const {pool} = require("../dbConfig");
const bcrypt = require("bcrypt");
const passport = require('passport')
const flash = require('express-flash')

const { createPool } = require('mysql2/promise');
require("dotenv").config();

const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
});

router.get('/', function(req, res, next) {
    req.logOut(function (err) {
        if(err) {
            throw err
        }
        req.flash('success_msg', "Odjavili ste se!")
        res.redirect('/login')
    })

});


module.exports = router;