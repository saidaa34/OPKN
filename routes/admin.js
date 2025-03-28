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

router.get('/', async function(req, res, next) {
    if(req.isAuthenticated()){
        if(req.user.tip_korisnik != 1)
            return res.redirect('/pocetna')
        try {
            // Save the recipe data and image buffer to the database
            let korisnici = await pool.query(
                'call svi_korisnici()',
                []
            );

            korisnici = korisnici[0][0]
            console.log('Korisnici:', korisnici);
            res.render('admin', { korisnici, logovan: true })

        } catch (error) {
            console.error('Error adding recipe:', error);
            res.status(500).send('Internal Server Error');
        }
    }
    else
        res.render('login', {errors: [], logovan: false});
});
router.get('/brisi-korisnika/:id', async (req, res, next) => {
    try {
        // Save the recipe data and image buffer to the database
        let korisnici = await pool.query(
            'delete from korisnici where korisnik_id = ?',
            [req.params.id]
        );

        res.redirect('/admin')

    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).send('Internal Server Error');
    }
})
function checkAuthenticated(req, res, next) { // da zabranimo pristup ako je logovan
    if(req.isAuthenticated()) {
        return res.redirect('/pocetna')
    }
    next()
}
module.exports = router;