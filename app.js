//jshint esversion:6
require('dotenv').config();                     // for using environment variable protection
const express =require("express");
const bodyParser =require("body-parser");
const ejs =require("ejs");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app=express();


app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
  extended:true
}));

app.use(session({
  secret: 'My secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB");
// mongoose.set("useCreateIndex",true);   //used if we get a deprecation warning(as in video). I didn't get any such warning

const userSchema= new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.displayName });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});

app.get("/auth/google",                                     // copy-paste from docs(passport-google-oauth-2.0)
  passport.authenticate("google", { scope: ["profile"] }));   // the google accounts list or sign-in pop-up appears due to this line

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect to secrets page.
      res.redirect("/secrets");
    });


app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){
  User.find({"secret": {$ne: null}}, function(err,foundUsers){
    if(err){
      console.log(err);
    }
    else{
      if(foundUsers){
        res.render("secrets" , {usersWithSecrets: foundUsers});       //The other part inside the render is related to ejs rendering the result
      }
    }
  });
});

app.get("/submit",function(req,res){
  if (req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});

app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;

  User.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      if(foundUser){
        foundUser.secret=submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets")
        });
      }
    }
  });
});

app.get("/logout",function(req,res){
  req.logout(function(err){               // MANDATORY CALLBACK FUNCTION(not mentioned in video)
    if(err){
      console.log(err);
    }
  });
  res.redirect("/");
});

app.post("/register",function(req,res){
  User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req, res, function(){              // autheticating whether the session is already active. If yes,directly take to secrets page
        res.redirect("/secrets");                                       //uptill now we didnt had a secrets route explicitly,but now we need to create one secrets route
      });
    }
  });
});

app.post("/login",function(req,res){

  const user= new User({
    username:req.body.username,
    password:req.body.password
  });

  req.login(user,function(err){
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req, res, function(){              // autheticating whether the session is already active. If yes,directly take to secrets page
        res.redirect("/secrets");                                       //uptill now we didnt had a secrets route explicitly,but now we need to create one secrets route
      });
    }
  });
});


app.listen(3000,function(){
  console.log("Server started at port 3000");
})


///////////////////////////////////////////////////ENCRYPTION/////////////////////////////////////////////////////
// require('dotenv').config();                     // for using environment variable protection
// const express =require("express");
// const bodyParser =require("body-parser");
// const ejs =require("ejs");
// const mongoose=require("mongoose");
// const encrypt=require("mongoose-encryption");
//
// const app=express();
//
// mongoose.connect("mongodb://127.0.0.1:27017/userDB");
//
// const userSchema= new mongoose.Schema({
//   email:String,
//   password:String
// });
//
// //////////For encryption////////
// userSchema.plugin(encrypt, { secret: process.env.SECRET , encryptedFields: ["password"]});
//
//
//
// const User = mongoose.model("User",userSchema);
//
// app.use(express.static("public"));
// app.set('view engine','ejs');
// app.use(bodyParser.urlencoded({
//   extended:true
// }));
//
// app.get("/",function(req,res){
//   res.render("home");
// });
//
// app.get("/login",function(req,res){
//   res.render("login");
// });
//
// app.get("/register",function(req,res){
//   res.render("register");
// });
//
// app.post("/register",function(req,res){
//   const newUser = new User({
//     email:req.body.username,
//     password:req.body.password
//   });
//   newUser.save(function(err){
//     if(err){
//       console.log(err);
//     }
//     else{
//       res.render("secrets");
//     }
//   });
// });
//
// app.post("/login",function(req,res){
//   const username=req.body.username;
//   const password=req.body.password;
//
//   User.findOne({email:username},function(err,foundUser){
//     if(err){
//       console.log(err)
//     }
//     else{
//       if(foundUser){
//         if(foundUser.password===password){
//           res.render("secrets")
//         }
//       }
//     }
//   });
// });


///////////////////////////////////////////////HASHING USING MD5///////////////////////////////////////////
// require('dotenv').config();                     // for using environment variable protection
// const express =require("express");
// const bodyParser =require("body-parser");
// const ejs =require("ejs");
// const mongoose=require("mongoose");
// const md5=require("md5");  used for hashing using md5
//
// const app=express();
//
// mongoose.connect("mongodb://127.0.0.1:27017/userDB");
//
// const userSchema= new mongoose.Schema({
//   email:String,
//   password:String
// });
//
//
// const User = mongoose.model("User",userSchema);
//
// app.use(express.static("public"));
// app.set('view engine','ejs');
// app.use(bodyParser.urlencoded({
//   extended:true
// }));
//
// app.get("/",function(req,res){
//   res.render("home");
// });
//
// app.get("/login",function(req,res){
//   res.render("login");
// });
//
// app.get("/register",function(req,res){
//   res.render("register");
// });
//
// app.post("/register",function(req,res){
//   const newUser = new User({
//     email:req.body.username,
//     password:md5(req.body.password)  ///// converting the password into hash
//   });
//   newUser.save(function(err){
//     if(err){
//       console.log(err);
//     }
//     else{
//       res.render("secrets");
//     }
//   });
// });
//
// app.post("/login",function(req,res){
//   const username=req.body.username;
//   const password=md5(req.body.password);
//
//   User.findOne({email:username},function(err,foundUser){
//     if(err){
//       console.log(err)
//     }
//     else{
//       if(foundUser){
//         if(foundUser.password===password){
//           res.render("secrets")
//         }
//       }
//     }
//   });
// });
//
//
// app.listen(3000,function(){
//   console.log("Server started at port 3000");
// })

////////////////////////////////////////////HASHING USING BCRYPT WIHTOUT COOKIES AND SESSIONS/////////////////////

// require('dotenv').config();                     // for using environment variable protection
// const express =require("express");
// const bodyParser =require("body-parser");
// const ejs =require("ejs");
// const mongoose=require("mongoose");
//
// const bcrypt=require("bcrypt");
// const saltRounds=10;
//
// const app=express();
//
// mongoose.connect("mongodb://127.0.0.1:27017/userDB");
//
// const userSchema= new mongoose.Schema({
//   email:String,
//   password:String
// });
//
//
// const User = mongoose.model("User",userSchema);
//
// app.use(express.static("public"));
// app.set('view engine','ejs');
// app.use(bodyParser.urlencoded({
//   extended:true
// }));
//
// app.get("/",function(req,res){
//   res.render("home");
// });
//
// app.get("/login",function(req,res){
//   res.render("login");
// });
//
// app.get("/register",function(req,res){
//   res.render("register");
// });
//
// app.post("/register",function(req,res){
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//       email:req.body.username,
//       password:hash                           ///// converting the password into hash
//     });
//     newUser.save(function(err){
//       if(err){
//         console.log(err);
//       }
//       else{
//         res.render("secrets");
//       }
//     });
//     });
//
// });
//
// app.post("/login",function(req,res){
//   const username=req.body.username;
//   const password=req.body.password;
//
//   User.findOne({email:username},function(err,foundUser){
//     if(err){
//       console.log(err)
//     }
//     else{
//       if(foundUser){
//         bcrypt.compare(password, foundUser.password, function(err, result) {
//           if(result===true){
//             res.render("secrets")
//           }
//         });
//       }
//     }
//   });
// });
//
//
// app.listen(3000,function(){
//   console.log("Server started at port 3000");
// })
