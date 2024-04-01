const express=require("express");
const app=express();
const { v4: uuidv4 } = require('uuid');
const { generateJwt } = require("./jwt/genratetoken");
const jwtSecret="3##"
const auth = require ( "./middleware/auth");
const mysql = require('mysql');
const bcrypt=require("bcrypt")
const saltOrRounds=10;
const jwt =require("jsonwebtoken");
const { upload } = require('./middleware/fich');
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "tp02"
});

app.use(express.json()) ;

// Connexion à la base de données
db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connexion à la base de données établie avec succès.');
  }
});


// juste un exemple lors de teste
app.get("/users",(req,res)=>{
const sql="select * from users";
db.query (sql,(err,data)=>{
if (err)
    return res.json(err)
    return res.json(data)
})
})


// cree un compte sur la platforme locu
app.post("/api/v1/register", (req, res) => {
  try {
    const lastname = req.body.lastname;
    const firstname = req.body.firstname;
    const email = req.body.email; 
    const password = req.body.password; 

    // Vérification si l'email est déjà utilisé
    db.query(
      `SELECT * FROM registerr WHERE email = ?`,
      [email],
      (err, result) => {
        if (err) {
          return res.json({ error: "erreur dans le server" });
        }
        if (result.length !== 0) {
          return res.json("Email deja exists!");
        }


        // Hachage de mode passe de lutilisateur
        bcrypt.hash(password, saltOrRounds, (err, hash) => {
          if (err) {
            console.error("Error hachage :", err);
            return res.json({ error: " erreur trouvé dans le hachage" });
          }

          
          // Ajout des données dans la base de données
          db.query(
            "INSERT INTO registerr (iduser, lastname, firstname, email, password) VALUES (?, ?, ?, ?, ?)",
            [uuidv4(), lastname, firstname, email, hash],
            (err, result) => {
              if (err) {
                console.error("Error inserting user into database:", err);
                return res.json({ error: err.message }); 
              }
          

              // Génération du JWT
              const token = generateJwt({ email, firstname, lastname });
              console.log("token generated successfully:");
              

              // Envoi du cookie contenant le token
              res.cookie("accessToken", token, {
                httpOnly: true,
                secure: true,
              }).json({ token });
            }
          );
        });
      }
    );
  } catch (error) {
    console.error("Error registering user:", error);
    res.json({ error: "Internal Server Error" });
  }
  console.log("User registered successfully:");
});

// tayi login  
app.post("/api/v1/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  db.query(
    'SELECT * FROM registerr WHERE email = ?',
    [email],
    (err, result) => {
      if (err) {
        res.json({ error: "Server Error" });
          
      } else if (result.length > 0) {
        const hashedPassword = result[0].password; 
        bcrypt.compare(password, hashedPassword, (error, response) => {
          if (response) {
            const userId = result[0].id; 
            const tok= jwt.sign(({userid:userId}), jwtSecret , { expiresIn: "1h" });
            console.error(error)
            res.json({ message: "Authentication successful", token: tok });
          } else {
            console.log("token");
            res.status(401).json({ message: "Wrong password" });
          }
        });
      } else {
        res.json({ message: "User not found" });
      }
    }
  );
});


//  Logout
app.get("/api/v1/logout", (request, response) => {
  try {
    response.clearCookie("accessToken", null).send({
      authenticated: false,
      message: "Logout Successful.",
    });
  } catch (error) {
    console.log(error);
  }
});


//prover the auth
app.get("/api/v1/profile", auth, async (request, response) => {
  try {
    const user = await pool.query(
      "SELECT iduser, nom, prenom, email FROM client WHERE iduser = ?",
      [request.user.iduser]
    );

    if (user.rows.length === 0) {
      return response.json({ msg: "Utilisateur non trouvé" });
    }

    response.json(user.rows[0]);
  } catch (error) {
    console.error(error.message);
    response.json({ msg: "Erreur serveur" });
  }
});


// Verify the current user token if authenticated
app.get("/api/v1/verify", auth, async (request, response) => {
  try {
    response.json(true);
  } catch (error) {
    console.error(error.message);
    response.status(500).send({ msg: "Unauthenticated" });
  }
});


// cree une annonce sur la platforme locu
app.post('/api/v1/new/annonce',auth, upload.array('file',3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.send({ message: "Aucun fichier n'a été téléchargé." });
    }
    const image1 = req.files[0].filename;
    const image2 = req.files[1].filename;
    const image3 = req.files[2].filename;
   
    //const userId = request.user.user_id;  tayi apres kn wahi frontend
    userId=123456;
    const { type ,surface,adresse,prix,titre, description } = req.body;

    // Validation pour voir
    if (!titre || !description|| !surface|| !prix|| !description|| !adresse) {
      return res.send({ message: "ces champs sont  requis." });
    }
    
// insert to database 
    await db.query(
      "INSERT INTO annonce (idann,type,surface,adresse,prix, titre, description, image1,image2,image3,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [uuidv4(),type,surface,adresse,prix, titre, description, image1,image2,image3,userId]
    );
    res.send({ message: "Annonce ajoutée avec succès.", annonceId: uuidv4() , userId});
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'annonce :", error);
    res.send({ message: "Une erreur s'est produite lors de l'ajout de l'annonce." });
  }
});


// recuperere tout les annonces 
app.get("/api/v1/all/annonces", async(req,res)=>{
  try{

  const toutes = await db.query(
 " select ( idann, type,surface,adresse,prix, titre, description,image1,image2,image3 ) from annonce ordere by annonce.idann " 
)
console.log("a ce niveau ya pas derreur")
   res.json({
    //  tab de objets 
    totalListing : toutes.rows.length,
    listing : toutes.rows,
   });
  } catch(error){

      console.log(error);
  };
})

// recuperer une annonce avec sans id 
app.get("/api/v1/single/annonces/:id", async (request, response) => {
  try {
    const annid = request.params.id;
    await pool.query(
      "SELECT annonce.idann, annonce.titre, annonce.description, annonce.date_ajout, annonce.image1, annonce.image2, annonce.image3, annonce.image4, annonce.image5, annonce.iduser FROM annonce WHERE annonce.idann = ?",
      [annid],
      (err, result) => {
        if (err) {
          console.error(err);
          return response.json({ error: "Une erreur s'est produite lors de la récupération des détails de l'annonce." });
        }
        if (result.length === 0) {
          return response.json({ error: "Aucune annonce trouvée avec l'identifiant spécifié." });
        }
        response.json(result[0]);
      }
    );
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Une erreur s'est produite lors de la récupération des détails de l'annonce." });
  }
});


// recuperer une annonce avec id specifique et on inclu les info de le client 

app.get("/api/v1/single/whith info client/annonces/:id", async (request, response) => {
  try {
    const annid = request.params.id;
    await pool.query(
      "SELECT annonce.idann, annonce.titre, annonce.description, annonce.date_ajout, annonce.image1, annonce.image2, annonce.image3, annonce.image4, annonce.image5, annonce.iduser, client.nom, client.prenom, client.email FROM annonce INNER JOIN client ON annonce.iduser = client.iduser WHERE annonce.idann = ?",
      [annid],
      (err, result) => {
        if (err) {
          console.error(err);
          return response.json({ error: "Une erreur s'est produite lors de la récupération des détails de l'annonce." });
        }
        if (result.length === 0) {
          return response.json({ error: "Aucune annonce trouvée avec l'identifiant spécifié." });
        }
        response.json(result[0]);
      }
    );
  } catch (error) {
    console.error(error);
    response.json({ error: "Une erreur s'est produite lors de la récupération des détails de l'annonce." });
  }
});


//  section recement ajouter , recuperere les dernier annonce ajouter .
app.get("/api/v1/recement/annonces", (req, res) => {
  try {
    db.query(
      "SELECT idann, type, surface, adresse, prix, titre, description, image1, image2, image3 FROM annonce",
      (error, result) => {
        if (error) {
          console.log(error);
          res.json({ error: "Une erreur s'est produite lors de la récupération des annonces." });
          return;
        }
        
        // Triez les annonces par ID 1 2 3 4 5 
        result.rows.sort((a, b) => b.idann - a.idann);

        // Sélectionnez les 12 premières annonces
        const dDernieresAnnonces = result.rows.slice(0, 12);
        // Envoyez les annonces sélectionnées en réponse
        res.json({ annonces: dixDernieresAnnonces });
      }
    );
  } catch (error) {
    console.log(error);
    res.json({ error: "Une erreur s'est produite lors de la récupération des annonces." });
  }
});


// recherche basique 
app.get("/api/v1/basique/recherche", (req, res) => {
  const {ville, prix} = req.body;

  pool.query(
    "SELECT annonce.idann, annonce.titre, annonce.description, annonce.date_ajout, annonce.image1, annonce.image2, annonce.image3, annonce.image4, annonce.image5,annonce.iduser FROM annonce JOIN bien ON bien.idann = annonce.idann WHERE bien.ville LIKE ? and prix <= ?",
    [`%${ville}%`,prix],
      (error, result) => {
          if (error) { 

              console.error(error);
              res.send("Une erreur s'est produite lors de la recherche.");
          } else {
              res.send({
                  totalListing: result.length,
                  listing: result
              });
          }
      }
  );
});


// recherche avancé
app.get("/api/v1/avance/recherche", (req, res) => {
  const {ville, prix,surface,meublé,type} = req.body;

  pool.query(
    "SELECT bien.surface,bien.type,bien.meublé,annonce.idann, annonce.titre, annonce.description, annonce.date_ajout, annonce.image1, annonce.image2, annonce.image3, annonce.image4, annonce.image5,annonce.iduser FROM annonce JOIN bien ON bien.idann = annonce.idann WHERE bien.ville LIKE ? and prix <= ? and bien.surface=? and bien.meublé= ? and bien.type =? ",
    [`%${ville}%`,prix,surface,meublé,type],
      (error, result) => {
          if (error) { 
              console.error(error);
              res.send("Une erreur s'est produite lors de la recherche.");
          } else {
              res.send({
                  totalListing: result.length,
                  listing: result
              });
          }
      }
  );
});


// le port et message de connextion au serveur
app.listen(3001,()=>{
console.log("I am listen what kho ")

})


