import { Request, Response } from 'express';
import { Vehicle } from '../models/Vehicle';
import mongoose from 'mongoose';

export const getUserVehicles = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Kullanıcı girişi yapılmamış' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    console.log('Araçlar çekiliyor, userId:', userId, typeof userId);
    const vehicles = await Vehicle.find({ userId });
    res.json(vehicles);
  } catch (error) {
    console.log('Araçlar çekilirken hata:', error);
    res.status(500).json({ message: 'Araçlar getirilirken bir hata oluştu', error });
  }
};

export const addVehicle = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Kullanıcı girişi yapılmamış' });
    }
    const {
      brand,
      modelName,
      package: vehiclePackage,
      year,
      engineType,
      fuelType,
      transmission,
      mileage,
      plateNumber,
      image
    } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    console.log('Araç ekleniyor, userId:', userId, typeof userId);
    const newVehicle = new Vehicle({
      userId,
      brand,
      modelName,
      package: vehiclePackage,
      year,
      engineType,
      fuelType,
      transmission,
      mileage,
      plateNumber,
      image
    });
    await newVehicle.save();
    res.status(201).json(newVehicle);
  } catch (error) {
    console.log('Araç eklenirken hata:', error);
    res.status(500).json({ message: 'Araç eklenirken bir hata oluştu', error });
  }
}; 