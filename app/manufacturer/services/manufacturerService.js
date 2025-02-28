const Manufacturer = require('../model/manufacturerModel');

exports.getAllManufacturerNames = async () => {
  const manufacturers = await Manufacturer.find();
  return manufacturers.map((manufacturer) => manufacturer.name);
};
