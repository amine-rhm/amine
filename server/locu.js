const express=require("express");
const app=express();
const { v4: uuidv4 } = require('uuid');
const { generateJwt } = require("./jwt/genratetoken");

app.use(express.json()) ;

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


// Connexion à la base de données
db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connexion à la base de données établie avec succès.');
  }
});





app.get("/users",(req,res)=>{
const sql="select * from users";
db.query (sql,(err,data)=>{
if (err)
    return res.json(err)
    return res.json(data)
})
})


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


        // Hachage ni 
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
          


              // Génération du token JWT
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







// tayi login ma tla dina 

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



// verifier de3wa kifah

app.get("/api/v1/profile", auth, async (request, response) => {
  try {

    await db.query(
      "SELECT iduser , firstname, lastname, email FROM regiisterr WHERE iduser= ?",
      [request.user.iduser]
    );

    response.json(user.rows[0]);
  } catch (error) {
    console.error(error.message);
    response.send({
      msg: "Unauthenticated",
    });
  }
});




// Verify the current user token if authenticated
app.post('/api/v1/add-annonce', upload.array('file'),  (req, res) => {
  try {
    // Vérifier si req.files est défini et s'il contient des éléments
    if (req.files && req.files.length > 0) {
      const image1 = req.files[0].filename;
      const { surface, titre, type, description, prix, adresse } = req.body;
      
      // Insérer les données dans la base de données
      db.query(
        "INSERT INTO annonce (idann, surface, titre, type, description, prix, adresse, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [uuidv4(), surface, titre, type, description, prix, adresse, image1]
      );
      


    } else {
      // Gérer le cas où aucun fichier n'a été téléchargé
      res.status(400).json({ message: "Aucun fichier n'a été téléchargé" });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Erreur lors de l'ajout de l'annonce" });
  }
});






  

















const verifyjwt = (req, res, next) => {
  const token = req.headers["acces"];
  if (!token) {
    return res.json ("3iwdas apres");
  } else {
    jwt.verify(token, "jwtSecret", (err, decode) => {
      if (err) {
        return res.json ("dir athentification ");
      } else {
        const userId = decode.userid; 
        req.userid = userId; 
        console.log(userId)
        next(); 
      }
    });
  }
};

app.get('/checkauth', verifyjwt, (req, res) => {
  res.send("amk dina ");
});





app.get("/amkdina", (req, res) => {
  const crtkjs = (jsonData, jwtSecret, option = {}) => {
      try {
          const token = jwt.sign(jsonData, jwtSecret, option);
          return token;
      } catch (error) {
          console.log({ message: "erreur dina" });
          return null;
      }
  };

  const jsonData = { email: "rahmouni@gmail.com", modepasse: "riitar" };
  const token = crtkjs(jsonData, Secretkey);
  if (token) {
      return res.send({ status: true, token: token });
  } else {
      return res.send({ status: false });
  }
});




 

app.listen(3001,()=>{
console.log("I am listen what kho ")

})


