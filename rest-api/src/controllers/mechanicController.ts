import { Request, Response } from 'express';
import { Mechanic } from '../models/Mechanic';
import MaintenanceAppointment from '../models/MaintenanceAppointment';

// PROFİL
export const getProfile = async (req: Request, res: Response) => {
  const mechanic = await Mechanic.findById(req.user?.userId);
  if (!mechanic) return res.status(404).json({ message: 'Usta bulunamadı' });
  res.json(mechanic);
};

export const updateProfile = async (req: Request, res: Response) => {
  const updated = await Mechanic.findByIdAndUpdate(req.user?.userId, req.body, { new: true });
  res.json(updated);
};

// HİZMETLER
export const getServices = async (req: Request, res: Response) => {
  const mechanic = await Mechanic.findById(req.user?.userId);
  res.json(mechanic?.serviceCategories || []);
};

export const updateServices = async (req: Request, res: Response) => {
  const updated = await Mechanic.findByIdAndUpdate(req.user?.userId, { serviceCategories: req.body.serviceCategories }, { new: true });
  res.json(updated?.serviceCategories || []);
};

// RANDEVULAR
export const getAppointments = async (req: Request, res: Response) => {
  const appointments = await MaintenanceAppointment.find({ mechanicId: req.user?.userId });
  res.json(appointments);
};

export const confirmAppointment = async (req: Request, res: Response) => {
  const updated = await MaintenanceAppointment.findByIdAndUpdate(req.params.id, { status: 'confirmed' }, { new: true });
  res.json(updated);
};

export const completeAppointment = async (req: Request, res: Response) => {
  const updated = await MaintenanceAppointment.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
  res.json(updated);
};

export const rejectAppointment = async (req: Request, res: Response) => {
  const updated = await MaintenanceAppointment.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
  res.json(updated);
};

// İSTATİSTİK
export const getStatistics = async (req: Request, res: Response) => {
  const mechanic = await Mechanic.findById(req.user?.userId);
  res.json({
    totalServices: mechanic?.totalServices || 0,
    rating: mechanic?.rating || 0,
    experience: mechanic?.experience || 0
  });
};

// BİLDİRİMLER (dummy)
export const getNotifications = async (req: Request, res: Response) => {
  res.json([]);
};

export const readNotification = async (req: Request, res: Response) => {
  res.json({ message: 'Okundu' });
};

// ÇALIŞMA SAATLERİ
export const getWorkingHours = async (req: Request, res: Response) => {
  const mechanic = await Mechanic.findById(req.user?.userId).lean();
  res.json(mechanic?.workingHours || {});
};

export const setWorkingHours = async (req: Request, res: Response) => {
  const updated = await Mechanic.findByIdAndUpdate(req.user?.userId, { workingHours: req.body }, { new: true });
  res.json((updated as any)?.workingHours || {});
};

// KONUM
export const updateLocation = async (req: Request, res: Response) => {
  const updated = await Mechanic.findByIdAndUpdate(req.user?.userId, { currentLocation: req.body.currentLocation }, { new: true });
  res.json(updated?.currentLocation || {});
}; 