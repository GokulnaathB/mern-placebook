// The idea is that in here we will have all the middleware functions which actually are reached for certain routes.

const HttpError = require("../models/http-error");
const uuid = require("uuid").v4;
const { validationResult } = require("express-validator");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const fs = require("fs");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500,
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided place id.",
      404,
    );
    // throw error; // this will trigger the error handling middleware.
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find places.",
      500,
    );
    return next(error);
  }

  // if (!places || places.length === 0) {
  //   const error = new HttpError("This user has no places yet!", 404);
  //   return next(error);
  // }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs, enter details that make sense!", 422),
    );
  }
  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (e) {
    return next(e);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500,
    );
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  console.log(user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    // push() here is not the standard push which you can use on any JS array. Instead, this is a method used by mongoose: Mongoose automatically takes the _id (only this property) of createdPlace and stores it in the user’s places field, thereby linking the two documents.
    await user.save({ session: sess });
    // {session: sess} says that this updated user is a part of our current session that we're referring to (sess).
    await sess.commitTransaction();
    // Only at this point, the changes are really saved in the database. If anything would have gone wrong in the tasks that are part of the session and transaction, all changes would have been rolled back automatically by MongoDB.
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500,
    );
    return next(error);
  }

  //   Sending back a response:
  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  // We typically encode the identifying criteria, so the ID in this case, into the URL and the data with which you then work into the request body.

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs, enter details that make sense.", 422),
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500,
    );
    return next(error);
  }

  // Checking if the one who's trying to update this place is also the one who created it:
  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allowed to edit this place.", 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500,
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    // populate() allows us to replace an ObjectId field in the current document with the full document from another collection that the ObjectId refers to.
    place = await Place.findById(placeId).populate("creator");
    // populate allows us to refer to a document stored in another collection and to work with data in that existing document of that other collection. To do so, we need a relation b/w these two documents and we established these relations in our schemas with ref prop. Populate method would not work without this connection.
    // We need to pass in as a parameter the information about the document where we want to change something. 'creator' property contains the id of the user, whose places property we need to modify (remove the id of the place being deleted). Mongoose uses this id and searches for the corresponding user in the users collection. With that we will have the option to change something in the user document.
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500,
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError("Could not find place for this id.", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "Your are not allowed to delete this place.",
      401,
    );
    return next(error);
  }

  const imagePath = place.image;
  try {
    // We need a session to start our transaction. Only if we can delete the place and if we can delete the place's id from the corresponding user, then this transaction should be executed.
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    // We can use places.pull and save on creator because creator gave us the full user object linked to that place.
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not delete place!", 500),
    );
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Place deleted!" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
