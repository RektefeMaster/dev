import { Request, Response, NextFunction } from 'express';
import { MaintenanceAppointment } from '../models/MaintenanceAppointment';

export const autoSetDates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    
    if (status) {
      const updateData: any = {};
      
      // Status'e göre tarih alanlarını otomatik set et
      switch (status) {
        case 'confirmed':
          updateData.confirmedAt = new Date();
          break;
        case 'in-progress':
          updateData.inProgressAt = new Date();
          break;
        case 'completed':
          updateData.completionDate = new Date();
          break;
        case 'cancelled':
          updateData.cancellationDate = new Date();
          break;
      }
      
      // Eğer tarih alanları varsa body'ye ekle
      if (Object.keys(updateData).length > 0) {
        req.body = { ...req.body, ...updateData };
      }
    }
    
    next();
  } catch (error) {
    console.error('Auto date setter middleware hatası:', error);
    next();
  }
};
