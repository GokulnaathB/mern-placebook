const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  //   unique creates an index in the database for email to make it easier and faster to query our emails. It does not check if the email being created is already present or not. For that, we use the mongoose unique validator, a 3rd party package.
  password: { type: String, required: true, minLength: 6 },
  image: { type: String, required: true },
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }],
});

module.exports = mongoose.model("User", userSchema);
