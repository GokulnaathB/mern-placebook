const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const fileUpload = multer({
  // configuring multer to tell it where to store something and also which files to accept.
  limits: 500000, // to have an upload limit of 500 KB
  // here we can control how data should get stored. we need to provide a driver (disk storage driver for example).
  storage: multer.diskStorage({
    // configuring the disk storage
    destination: (req, file, cb) => {
      cb(null, "uploads/images");
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      cb(null, uuidv4() + "." + ext);
    },
    fileFilter: (req, file, cb) => {
      const isValid = !!MIME_TYPE_MAP[file.mimetype];
      let error = isValid ? null : new Error("Invalid mime type!");
      cb(error, isValid);
      //   the 2nd argument above is true if the file has to be accepted and false for otherwise.
    },
  }),
});

module.exports = fileUpload;
