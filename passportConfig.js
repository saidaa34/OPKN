const LocalStrategy = require('passport-local').Strategy
//const { pool } = require('./dbConfig')
const bcrypt = require("bcrypt")

const { createPool } = require('mysql2/promise');
const {rows} = require("pg/lib/defaults");
require("dotenv").config();

const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
});

// inicializiramo Local Strategy
function initialize(passport) {
    const autheticateUser = async (email, password, done)=>{
        await  pool.query(`SELECT * FROM korisnici WHERE email like ?`, [email]
        ).then((rows, fields) => {
            console.log("Podaci koje dobijamo ", email, password)
            console.log("Trazimo email u pass")
            if(rows.length > 0) { // pronasao je usera
                console.log("Pronasao usera, ", rows[0])
                const user = rows[0][0];
                console.log("sifra ", user)
                bcrypt.compare(password, user.sifra, (err, isMatch)=>{ // funkcija koja poredi hash lozinku i unijetu lozinku
                    if(err) {
                        throw err
                    }
                    if(isMatch) {
                        console.log("slazu se sifre")
                        return done(null, user) // prvi parametar je error = null, user vraca korisnika i sprema ga u session cookie
                    } else {
                        return done(null, false, {message: "Password is not correct"}) // nema nikakve prave greske zato je null, vracamo user=false i poruku
                    }
                })
            } else { // nismo pronasli korisnika u bazi
                return done(null, false, {message: "Email is not registred"})
            }
        })

    }
    passport.use(new LocalStrategy({
                usernameField: "email",
                passwordField: "password"
            },
            autheticateUser
        )
    )

    passport.serializeUser((user, done)=> done(null, user.korisnik_id)) // hocemo da store user.id u session
    passport.deserializeUser((korisnik_id, done)=>{
        pool.query('SELECT * FROM korisnici WHERE korisnik_id = ?', [korisnik_id]
        ).then((rows, fields) => {
            console.log("Cuvamo korisnika unutar sesije")
            console.log("Taj korisik ", rows[0][0])
            return done(null, rows[0][0]) // sacuvamo user objects unutar sesije
        })

    })
}
module.exports = initialize;