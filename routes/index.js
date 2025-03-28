var express = require('express');
var router = express.Router();
//const {pool} = require("../dbConfig");
const bcrypt = require("bcrypt");
const passport = require('passport')
const flash = require('express-flash')

const mysql = require('mysql2');
require("dotenv").config();
const multer = require('multer');
// Set up storage for multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { createPool } = require('mysql2/promise');
require("dotenv").config();

const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
});

/* GET home page. */
router.get('/', function(req, res, next) {
    if(req.isAuthenticated()) {
        if(req.user.tip_korisnik == 1)
            return res.redirect('/admin')
        else return res.redirect('/pocetna')
    }
    else return res.redirect('/pocetna');
});


/* originalno je bilo samo ovako, bez provjere radnih mjesta
router.post('/', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true // ovo je jedna od onih poruka npr "Password is not correct" u done funkciji
}))
*/

// Use your custom middleware in your route

router.get('/pocetna', async (req, res, next) => {
    console.log("Prije")
    var logovan = false;
    if(req.isAuthenticated()) {
        if(req.user.tip_korisnik == 1)
            res.redirect('/admin')
        logovan = true
    }

    try {
        let najpopularniji = await pool.query(
            `call popularni();`
        )
        let najnoviji = await pool.query(
            `call najnoviji();`
        )
        najpopularniji = najpopularniji[0][0]
        najnoviji = najnoviji[0][0]
        return res.render('pocetna',{logovan, najpopularniji, najnoviji})


    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).send('Internal Server Error');
    }



})
router.get('/dodaj-novi-recept', async (req, res, next) => {
    if(req.isAuthenticated()) {
        if(req.user.tip_korisnik == 1) { // ako je admin ne dopustamo da dodaje recepte
            res.redirect('/admin')
        }
        else {
            try {
                // Save the recipe data and image buffer to the database
                let kategorije = await pool.query(
                    'select kategorija_id, naziv_kategorije from kategorije_jela;',
                    []
                );
                kategorije = kategorije[0]
                console.log('Kategorije:', kategorije);
                res.render('dodaj-novi-recept', { kategorije, logovan: true })

            } catch (error) {
                console.error('Error adding recipe:', error);
                res.status(500).send('Internal Server Error');
            }
            res.render('dodaj-novi-recept', {logovan: true}) // nakon sto doda recept salje da na '/moji-recepti'
        }
    }
    else {
        res.redirect('/login')
    }
})
router.post('/dodaj-novi-recept/dodaj', upload.single('slika'), async (req, res) => {
    try {
        const { naziv_recepta, opis_recepta, tezina_recepta, kategorije, sastojak, kolicina, mjernaJedinica } = req.body;
        const slikaBuffer = req.file.buffer;
        console.log("kolicina", kolicina)
        console.log("sastojak", kolicina)
        console.log("mjernaJed", mjernaJedinica)


        // Save the recipe data and image buffer to the database
        const result = await pool.query(
            'INSERT INTO recepti (korisnik_id, naziv_recepta, opis_recepta, tezina_recepta, slika) VALUES (?, ?, ?, ?, ?)',
            [req.user.korisnik_id, naziv_recepta, opis_recepta, tezina_recepta, slikaBuffer]
        );
        const receptId = result[0].insertId;
        console.log("Zadnji id ", receptId)
        for(let i = 0; i<kategorije.length; i++) {
            const result2 = await pool.query(
                'INSERT INTO recepti_i_kategorije (kategorija_id, recept_id) VALUES (?, ?)',
                [kategorije[i], receptId]
            );
        }
        for(let i = 0; i<kolicina.length; i++) {
            if(kolicina[i] !== "" && sastojak[i] !== "" && mjernaJedinica[i] !== "") {
                const result2 = await pool.query(
                    'INSERT INTO sastojci (recept_id, naziv_sastojka, kolicina_sastojka, mjerna_jedinica) VALUES (?, ?, ?, ?)',
                    [receptId, sastojak[i], kolicina[i], mjernaJedinica[i]]
                );
            }
        }
        console.log('Recipe added:', result);

        res.redirect('/moji-recepti')
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/filtriraj-recepte/:id', async (req, res, next) => {
    try {
        // Save the recipe data and image buffer to the database
        var recepti = await pool.query(
            'call daj_recepte(?)',
            [req.params.id]
        );
        console.log("2222", recepti[0][0].length)
        recepti = recepti[0][0]
        console.log("Cisti recepti ", recepti)

        if(req.isAuthenticated())
            res.render('filtrirani-recepti', { recepti, logovan: true })
        else res.render('filtrirani-recepti', { recepti, logovan: false })
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).send('Internal Server Error');
    }
})
router.get('/detaljno-o-receptu/:id', async (req, res, next) => {
    var ovajKorisnikLajkovao = false
    if(req.isAuthenticated()) {
        if (req.user.tip_korisnik == 1)
            return res.redirect('/admin')
        var brojac = await pool.query(
            `select count(*) as br from lajkovi where recept_id = ? and korisnik_id = ?;`,
            [req.params.id, req.user.korisnik_id]
        )
        console.log("brojac ", brojac[0][0])
        if(brojac[0][0].br > 0)
            ovajKorisnikLajkovao = true
    }

    try {
        // Save the recipe data and image buffer to the database
        var recept = await pool.query(
            `call daj_recept(?);`,
            [req.params.id]
        );
        recept = recept[0][0][0]
        console.log("Cisti recepti ", recept)


        var sastojci = await pool.query(
            `call daj_sastojke(?);`,
            [req.params.id]
        )
        var lajkovi = await pool.query(
            `select lajkovi from recepti where recept_id = ?;`,
            [req.params.id]
        );
        lajkovi = lajkovi[0][0].lajkovi
        sastojci = sastojci[0][0]
        console.log("Sastojci ", sastojci)
        if(req.isAuthenticated())
            res.render('detaljno-o-receptu', { recept, sastojci, lajkovi, ovajKorisnikLajkovao, logovan: true })
        else res.render('detaljno-o-receptu', { recept, sastojci, lajkovi, logovan: false })
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).send('Internal Server Error');
    }


})
router.get('/laki-recepti/:id', async (req, res, next) => {
    console.log(req.params.id)
    var logovan = false
    if(req.isAuthenticated()) {
        if(req.tip_korisnik == 1)
            res.redirect('/admin')
        else {
            logovan = true
        }
    }
    var recepti = await pool.query(
        `call daj_lakse(?)`, [req.params.id]
    )
    recepti = recepti[0][0]
    console.log("Lakši recepti ", recepti)

    res.render('filtrirani-recepti', {recepti, logovan})
})
router.get('/moji-recepti', async (req, res, next) => {
    if(req.isAuthenticated()) {
        if(req.tip_korisnik == 1)
            res.redirect('/admin')
        else {
            var recepti = await pool.query(
                `call moji_recepti(?)`, [req.user.korisnik_id]
            )
            recepti = recepti[0][0]
            console.log("Moji recepti ", recepti)

            res.render('filtrirani-recepti', {recepti, logovan: true})
        }
    }
else res.redirect('/login')
})
router.post('/lajkuj/:id', async (req, res, next) => {
    if(req.isAuthenticated()) {
        if(req.tip_korisnik == 1)
            res.redirect('/admin')
        let brojac = await pool.query(
            `select count(*) as br from lajkovi where recept_id = ? and korisnik_id = ?;`,
            [req.params.id, req.user.korisnik_id]
        )
        console.log("brojac ", brojac[0][0])
        if(brojac[0][0].br == 0) { // nije lajkovao ovaj posto do sad
            const result = await pool.query(
                'INSERT INTO lajkovi (recept_id, korisnik_id) VALUES (?, ?)',
                [req.params.id, req.user.korisnik_id]
            );
            const prepravi = await pool.query(
                `update recepti set lajkovi = lajkovi + 1 where recept_id = ?;`,
                [req.params.id]
            )
            res.redirect('/detaljno-o-receptu/' + req.params.id)
        }
    }
    else res.redirect('/login')
})
router.post('/unlajkuj/:id', async (req, res, next) => {
    if(req.isAuthenticated()) {
        if(req.tip_korisnik == 1)
            res.redirect('/admin')
        var brojac = await pool.query(
            `select count(*) as br from lajkovi where recept_id = ? and korisnik_id = ?;`,
            [req.params.id, req.user.korisnik_id]
        )
        console.log("brojac ", brojac[0][0])
        if(brojac[0][0].br > 0) { // lajkovao je do sad ovaj recept
            const result = await pool.query(
                'delete from lajkovi where recept_id = ? and korisnik_id = ?',
                [req.params.id, req.user.korisnik_id]
            );
            const prepravi = await pool.query(
                `update recepti set lajkovi = lajkovi - 1 where recept_id = ?;`,
                [req.params.id]
            )
            return res.redirect('/detaljno-o-receptu/' + req.params.id)
        }
    }
    else res.redirect('/login')
})
function checkAuthenticated(req, res, next) { // da zabranimo pristup ako je logovan
    if(req.isAuthenticated()) {
        return res.redirect('/pocetna')
    }
    next()
}

module.exports = router;
