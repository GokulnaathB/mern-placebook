// A model is a blueprint, the definition of a data object we work with.
// A class is essentially a blueprint for a JS object.

class HttpError extends Error {
  constructor(message, errorCode) {
    super(message);
    this.code = errorCode;
  }
}

module.exports = HttpError;
