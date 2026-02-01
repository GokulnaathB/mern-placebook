const express = require("express");
const { check } = require("express-validator");
// check is a method we can execute and it will return a new middleware configured for our validation requirements.
const placesControllers = require("../controllers/places-controller");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/:pid", placesControllers.getPlaceById);
// route "/" prepended with /api/places will reach this middleware.

router.get("/user/:uid", placesControllers.getPlacesByUserId);

router.use(checkAuth);
// We shouldn't be able to send a request to add, update, or delete a place if we're not authenticated (we don't have a valid token). We can protect the following routes by adding a middleware in front of them as above, which ensures that requests have to have a token.
router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("address").not().isEmpty(),
    check("description").isLength({ min: 5 }),
  ],
  placesControllers.createPlace,
);
// We can register multiple middlewares on the same HTTP method path combination. And they will simply executed from left to right in our arguments.

router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placesControllers.updatePlace,
);
router.delete("/:pid", placesControllers.deletePlace);

module.exports = router;
