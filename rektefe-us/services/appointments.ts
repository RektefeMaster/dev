import api from './api';

export interface Appointment {
  _id: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
  mechanicId: string;
  vehicleId: {
    _id: string;
    brand: string;
    modelName: string;
    plateNumber: string;
    year?: number;
  };
  serviceTypes: string[];
  appointmentDate: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// Ustanın randevularını getir
export const getMechanicAppointments = async (): Promise<Appointment[]> => {
  const response = await api.get('/maintenance-appointment/mechanic');
  return response.data;
};

// Usta için randevu onayla
export const confirmAppointment = async (appointmentId: string): Promise<Appointment> => {
    const response = await api.put(`/maintenance-appointment/${appointmentId}/mechanic/confirm`);
    return response.data;
};

// Usta için randevu tamamla
export const completeAppointment = async (appointmentId: string): Promise<Appointment> => {
    const response = await api.put(`/maintenance-appointment/${appointmentId}/mechanic/complete`);
    return response.data;
};

// Usta için randevu reddet
export const rejectAppointment = async (appointmentId: string): Promise<Appointment> => {
    const response = await api.put(`/maintenance-appointment/${appointmentId}/mechanic/reject`);
    return response.data;
}; 