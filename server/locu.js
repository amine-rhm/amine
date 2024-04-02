const express=require("express");
const app=express();
const bodyParser =require( "body-parser");
const { v4: uuidv4 } = require('uuid');
const { generateJwt } = require("./jwt/genratetoken");
const cors =require("cors");
const mysql = require('mysql');
const fs =require("fs");
const bcrypt=require("bcryptjs")
require('dotenv').config();
const jwt =require("jsonwebtoken");
const { upload } = require('./middleware/fich');
const path =require( "path");
const cookieParser =require("cookie-parser");
const helmet =require("helmet");
app.use(cookieParser());
app.use(helmet());
const auth = require("./middleware/auth");
const { error, Console } = require("console");
const pool = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "newdata"
});

app.use(express.json()) ;
app.use(cors({ origin: "http://localhost:3001", credentials: true }));
app.use(cookieParser());
app.use(express.json()); // req.body
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  helmet({
    frameguard: {
      action: "deny",
    },
    xssFilter: true,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);



// Connexion à la base de données
pool.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connexion à la base de données établie avec succès.');
  }
});


saltOrRounds=10;
// Register User
app.post("/api/v1/register", (req, res) => {
  try {
    const nom = req.body.nom;
    const prenom = req.body.prenom;
    const email = req.body.email; 
    const password = req.body.password; 

    // Vérification si l'email est déjà utilisé
    pool.query(
      `SELECT * FROM client WHERE email = ?`,
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

          const userId = uuidv4();
          // Ajout des données dans la base de données
          pool.query(
            "INSERT INTO client (iduser,nom,prenom, email, password) VALUES (?, ?, ?, ?, ?)",
            [ userId,nom,prenom, email, hash],
            (err, result) => {
              if (err) {
                console.error("Error inserting user into database:", err);
                return res.json({ error: err.message }); 
              }
        

              // Génération du JWT
              
               const token = generateJwt({userId , email, nom, prenom, hash });
              console.log("token generated successfully:");
              
              // Envoi du cookie contenant le token
              res.cookie("accessToken", token, {
                httpOnly: true,
                secure: true,
              }).json({ token });
              console.log(token)
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

  pool.query(
    'SELECT * FROM client WHERE email = ?',
    [email],
    (err, result) => {
      if (err) {
        res.json({ error: "Server Error" });
          
      } else if (result.length > 0) {
        const hashedPassword = result[0].password; 
        bcrypt.compare(password, hashedPassword, (error, response) => {
          if (response) {
            const userId = result[0].iduser;
            const token = generateJwt({userId});
            console.log(userId);

            res.cookie("accessToken", token, {
                httpOnly: true,
                secure: true,
              })
              .json({ token });
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
app.get("/api/v1/verif", auth, async (req, res) => {
  try {
    const userId = req.userData.iduser;
    
    const user = await pool.query(" SELECT * FROM client WHERE iduser = ?", 
    [userId]);

    if (!user || user.length === 0) {
      return res.json({ message: "Utilisateur non trouvé dans la base de données" });
    }
    res.json({ message: "Token valide" });
   console.log(userId);

  } catch (error) {

    console.error("Erreur lors de la vérification du token avec l'ID de l'utilisateur:", error);
    res.json({ message: "Erreur server lors de la vérification du token avec l'ID de l'utilisateur" });
  }
});


// Verify the current user token if authenticated
app.get("/api/v1/that", auth, async (request, response) => {
  try {
    response.json(true);
  } catch (error) {
    console.error(error.message);
    response.status(500).send({ msg: "Unauthenticated" });
  }
});



  // dayi tla lkhdma wahi uth ni dyi pour essaiyer juste jai fixer le id de user
// déposer une annonce 

app.post('/api/v1/new/annonce', auth, upload.array('file', 5), async (req, res) => {

  const userId=req.userData.userId;

  try {
    if (!req.files || req.files.length === 0) {
      return res.send({ message: "Aucun fichier n'a été téléchargé." });
    }

    const image1 = req.files[0].filename;  
    const image2 = req.files[1] ? req.files[1].filename : null;
    const image3 = req.files[2] ? req.files[2].filename : null;
    const image4 = req.files[3] ? req.files[3].filename : null;
    const image5 = req.files[4] ? req.files[4].filename : null;
   
 
    const dateAjout = new Date();
    const {type, surface, adresse, prix, titre, description} = req.body;
    if (!titre || !description || !prix || !description || !adresse) {
      return res.send({ message: "Ces champs sont requis."});
    }
    const idann = uuidv4();
    await pool.query(
      "INSERT INTO annonce (idann, titre, description, date_ajout, image1, image2, image3,image4,image5,iduser) VALUES (?, ?, ?,?, ?, ?, ?, ?,?,?)",
      [idann, titre, description,dateAjout,image1, image2, image3,image4,image5,userId]
    );
    console.log("bien inserrer dans la table annonce")
    // Insérer dans la table Bien si nécessaire
    const idB = uuidv4();
    await pool.query(
      "INSERT INTO Bien (idB, type,surface, prix, adresse,userId, idann) VALUES (?, ?, ?, ?, ?, ?,?)",
      [idB, type,surface, prix, adresse, userId, idann]
      

    );

    console.log("bien inserrer dans la table bien")

    // Retour d'informations supplémentaires
    res.send({ message: "Annonce ajoutée avec succès.", idann});
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'annonce :", error);
    res.send({ message: "Une erreur s'est produite lors de l'ajout de l'annonce." });
  }
});


// recuperere tous les annonces 
app.get("/api/v1/all/annonce", (req, res) => {
  try {
    pool.query(
      "SELECT idann, titre, description, date_ajout, image1, image2, image3, image4, image5, iduser FROM annonce ORDER BY idann",
      (error, result) => {
        if (error) {
      return res.status(500).json({ message: "Erreur lors de la récupération des annonces." });
        }
        console.log("A ce niveau, il n'y a pas d'erreur");
        res.json({
          totalListing:result.length,
          listing: result
        });
      }
    );
  } catch (error) {
    console.error(error);
  }
});

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


 //section recement ajouter , recuperere les dernier annonce ajouter.

app.get("/api/v1/recement/annonces", (req, res) => {
  try {
    pool.query(
      "SELECT idann, titre, description, date_ajout, image1, image2, image3, image4, image5, iduser FROM annonce",
      (error, result) => {
        if (error) {
          console.log(error);
          res.json({ error: "Une erreur s'est produite lors de la récupération des annonces." });
          return;
        }
        
        // Triez les annonces par ID 1 2 3 4 5 
        result.sort((a, b) => b.idann - a.idann);
        // dayi labghit 3 4 lsl atan 12 aka
        const dixDernieresAnnonces = result.slice(0, 12);
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
    "SELECT annonce.idann, annonce.titre, annonce.description, annonce.date_ajout,bien.surface,bien.type,bien.meublé, annonce.image1, annonce.image2, annonce.image3, annonce.image4, annonce.image5,annonce.iduser FROM annonce JOIN bien ON bien.idann = annonce.idann WHERE bien.ville LIKE ? and prix <= ? and bien.surface=? and bien.meublé= ? and bien.type =? ",
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

app.listen(3001,()=>{
console.log("I am listen what kho ")

})


