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
    if(req.isAuthenticated()){
        if(req.user.tip_korisnik == 1)
            res.redirect('/admin')
        else res.redirect('/pocetna')
    }
    else
        res.render('login', {errors: [], logovan: false});
});
router.post('/prijava', async (req, res) => {
    console.log("usao u prijavu")
    await pool.query(
        'SELECT ime FROM korisnici WHERE email like ?', [req.body.email]
    ).then(([rows, fields]) => {
        console.log("prosao prvi upit");

        if (rows.length > 0) {
            console.log("Korisnik postoji")
            passport.authenticate('local', {
                successRedirect: '/pocetna',
                failureRedirect: '/login',
                failureFlash: true
            })(req, res);
        } else {
            console.log("nema postojeceg");
            errors = ["Neispavan email"]
            return res.render('login', {errors, logovan: false})
        }
    }).catch(err => {
        throw err;
    });
});
function checkAuthenticated(req, res, next) { // da zabranimo pristup ako je logovan
    if(req.isAuthenticated()) {
        return res.redirect('/pocetna')
    }
    next()
}
module.exports = router;