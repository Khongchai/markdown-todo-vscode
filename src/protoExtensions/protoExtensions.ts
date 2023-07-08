Array.prototype.getLast = function () {
  if (this.length === 0) {
    throw new Error("Array is empty");
  }
  return this[this.length - 1];
};

Array.prototype.isNotEmpty = function () {
  return this.length > 0;
};

Array.prototype.isEmpty = function () {
  return this.length === 0;
};
