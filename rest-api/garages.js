const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// MongoDB bağlantısı
mongoose.connect('mongodb://localhost:27017/rektefe', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Araç şeması
const vehicleSchema = new mongoose.Schema({
  userId: String,
  brand: String,
  model: String,
  package: String,
  year: String,
  fuelType: String,
  mileage: String,
  createdAt: { type: Date, default: Date.now }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// Tüm araçları getir
router.get('/vehicles/:userId', async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.params.userId });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Yeni araç ekle
router.post('/vehicles', async (req, res) => {
  const vehicle = new Vehicle({
    userId: req.body.userId,
    brand: req.body.brand,
    model: req.body.model,
    package: req.body.package,
    year: req.body.year,
    fuelType: req.body.fuelType,
    mileage: req.body.mileage
  });

  try {
    const newVehicle = await vehicle.save();
    res.status(201).json(newVehicle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Araç sil
router.delete('/vehicles/:id', async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Araç başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 