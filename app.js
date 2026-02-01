const fs = require("fs"); // allows us to interact with the files in our file system.

const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const placesRoutes = require("./routes/places-routes");
// We can now use this constant as a middleware.

const usersRoutes = require("./routes/users-routes");

const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json()); // This will parse any incoming request's body and extract any JSON data which is in there, convert it to regular JS DS like objects and arrays and call next automatically so that we reach the next middleware in line (which are our custom routes) and then also add this JSON data there. We are choosing to send data this way for post request (not in urlencoded form).

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // We also need to specify which headers these requests sent by the browser may have. This controls which headers incoming requests may have so that they are handled.
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  // Controls which HTTP headers may attached to incoming requests.
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

app.use("/api/places", placesRoutes);
// Routes configured in places-routes.js are added as middleware in app.js.

app.use("/api/users", usersRoutes);

// Middleware for handling wrong routes
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});
// This middleware is only reached if we have some request which didn't get a response before (i.e., none of the middlewares in placesRoutes was triggered). And that can only be a request which we don't wanna handle.

app.use((error, req, res, next) => {
  // multer adds a new property "file" to the req object.
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      // a callback that is run when deletion is done or something went wrong.
      console.log(err);
    });
  }
  if (res.headerSent) {
    // If a response has already been sent, I am NOT allowed to send another one. So pass the error to the next error handler.
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occoured!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cbksjqx.mongodb.net/${process.env.DB_NAME}?appName=Cluster0`,
  )
  .then(() => {
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });
