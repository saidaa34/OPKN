var express = require('express');
var router = express.Router();
//const {pool} = require("../dbConfig");
const bcrypt = require("bcrypt");
const passport = require('passport')
const flash = require('express-flash')

//const mysql = require('mysql2');
const { createPool } = require('mysql2/promise');
require("dotenv").config();

const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
});
//const promisePool = pool.promise();

router.get('/', (req, res, next) => {
    console.log("ovdje")
    if(req.isAuthenticated()) {
        if(req.user.tip_korisnik == 2) // u slucaju da je korisnik a ne admin
            res.redirect('/pocetna')
        else res.redirect('/admin') // admina saljemo na admin stranicu
    }
    else {
        var errors = []
        res.render('signup', {errors , logovan:false});
    }
})
router.post('/add', async (req, res, next) => {
    if(req.isAuthenticated()) {
        if(req.user.tip_korisnik == 2) // u slucaju da je korisnik a ne admin
            res.redirect('/pocetna')
        else res.redirect('/admin') // admina saljemo na admin stranicu
    }
    else {
        console.log(req.body)
        let { ime, prezime, email, password, password2 } = req.body;
        console.log("pojedinacno ", ime, " ", prezime, " ", email)
        let errors = []; // ovo cemo koristiti za validaciju forme
        // provjera da li su sva polja unutar forme popunjena tj da li su ispravno popunjena
        if(!ime || !email || !password) {
            errors.push({message: "Unesite sva polja"}) // u ovaj gore niz stavljamo ovu error poruku
        }
        if(password.length < 4 ) {
            errors.push({message: "Šifra mora bit dugačka bar 4 znaka"})
        }
        if(password !== password2) {
            errors.push({message: "Šifre se ne poklapaju"})
        }
        if(errors.length > 0) {
            console.log("errori", errors)
            res.render('signup', { errors, logovan:false })
        } else{
            // form validation je prosla
            let hashedPassword = await bcrypt.hash(password, 10);
            console.log(hashedPassword)
            // provjeravamo da li korisnik vec postoji u bazi

            await pool.query(
                'SELECT * FROM korisnici WHERE email like ?', [email]
            ).then(([rows, fields]) => {
                console.log("prosao prvi upit");
                console.log("REz ", rows);

                if (rows.length > 0) {
                    errors.push({ message: "Korisnik već postoji" });
                    res.render('signup', { errors, logovan:false });
                } else {
                    console.log("nema postojeceg");

                    const dodajNovogKorisnika = async () => {
                        try {
                            const [rows, fields] = await pool.query(
                                `INSERT INTO korisnici (ime, prezime,  email, sifra, tip_korisnik) VALUES (?, ?, ?, ?, ?)`,
                                [ime, prezime, email, hashedPassword, 2]
                            );
                            res.render('login', { errors: [], logovan:false });
                        } catch (error) {
                            res.send(error.message);
                            console.error(error.message);
                        }
                    };
                    dodajNovogKorisnika();
                }
            }).catch(err => {
                throw err;
            });
        }
    }

})

module.exports = router;