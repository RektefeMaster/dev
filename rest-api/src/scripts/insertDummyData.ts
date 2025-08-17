import mongoose from 'mongoose';
import { ServiceCategory } from '../models/ServiceCategory';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rektefe';
const userId = '684d1d8614d6dfa52dabdf71';

const vehicleSchema = new mongoose.Schema({
  userId: String,
  brand: String,
  modelName: String,
  package: String,
  year: Number,
  engineType: String,
  fuelType: String,
  transmission: String,
  mileage: Number,
  plateNumber: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
});
const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);

const maintenanceSchema = new mongoose.Schema({
  userId: String,
  date: String,
  mileage: String,
  type: String,
  details: [String],
  serviceName: String,
});
const Maintenance = mongoose.models.Maintenance || mongoose.model('Maintenance', maintenanceSchema);

const insuranceSchema = new mongoose.Schema({
  userId: String,
  company: String,
  type: String,
  startDate: String,
  endDate: String,
  policyNumber: String,
});
const Insurance = mongoose.models.Insurance || mongoose.model('Insurance', insuranceSchema);

const vehicleStatusSchema = new mongoose.Schema({
  userId: String,
  overallStatus: String,
  lastCheck: String,
  issues: [String],
});
const VehicleStatus = mongoose.models.VehicleStatus || mongoose.model('VehicleStatus', vehicleStatusSchema);

const tireStatusSchema = new mongoose.Schema({
  userId: String,
  status: String,
  lastCheck: String,
  issues: [String],
});
const TireStatus = mongoose.models.TireStatus || mongoose.model('TireStatus', tireStatusSchema);

const appointmentSchema = new mongoose.Schema({
  userId: String,
  vehicleId: String,
  serviceType: String,
  appointmentDate: String,
  status: String,
  notes: String,
  sharePhoneNumber: Boolean,
});
const MaintenanceAppointment = mongoose.models.MaintenanceAppointment || mongoose.model('MaintenanceAppointment', appointmentSchema);

const masterSchema = new mongoose.Schema({
  name: String,
  services: [String],
  brands: [String],
  shopType: String,
  location: String,
});
const Master = mongoose.models.Master || mongoose.model('Master', masterSchema);



const campaignSchema = new mongoose.Schema({
  title: String,
  description: String,
  company: String,
  validUntil: String,
  discount: String,
});
const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);

const adSchema = new mongoose.Schema({
  title: String,
  image: String,
  shortText: String,
  detailText: String,
  company: String,
  validUntil: String,
});
const Ad = mongoose.models.Ad || mongoose.model('Ad', adSchema);

const userSchema = new mongoose.Schema({
  name: String,
  surname: String,
  email: String,
  password: String,
  username: String,
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function insertAllDummyData() {
  await mongoose.connect(MONGO_URI);
  
  // Önce mevcut servis kategorilerini sil
  await ServiceCategory.deleteMany({});
  
  // Servis kategorileri ekle
  await ServiceCategory.create({ name: 'Genel Bakım', description: 'Periyodik bakım ve genel servis işlemleri', type: 'maintenance', subCategories: ['Yağ değişimi', 'Filtre değişimi', 'Fren kontrolü'], isActive: true });
  await ServiceCategory.create({ name: 'Motor Bakımı', description: 'Motor ile ilgili bakım ve onarım işlemleri', type: 'maintenance', subCategories: ['Motor yağı', 'Hava filtresi', 'Yakıt filtresi'], isActive: true });
  await ServiceCategory.create({ name: 'Fren Sistemi', description: 'Fren sistemi bakım ve onarımı', type: 'repair', subCategories: ['Fren balatası', 'Fren diski', 'Fren hidroliği'], isActive: true });
  await ServiceCategory.create({ name: 'Süspansiyon', description: 'Süspansiyon sistemi bakım ve onarımı', type: 'repair', subCategories: ['Amortisör', 'Yay', 'Burç'], isActive: true });
  await ServiceCategory.create({ name: 'Elektrik Sistemi', description: 'Elektrik ve elektronik sistem onarımı', type: 'repair', subCategories: ['Aku', 'Şarj dinamosu', 'Marş motoru'], isActive: true });
  await ServiceCategory.create({ name: 'Kaporta Boya', description: 'Kaporta ve boya işlemleri', type: 'bodywork', subCategories: ['Çizik giderme', 'Boyama', 'Kaporta düzeltme'], isActive: true });
  await ServiceCategory.create({ name: 'Lastik Servisi', description: 'Lastik değişimi ve bakımı', type: 'tire', subCategories: ['Lastik değişimi', 'Balans ayarı', 'Rot ayarı'], isActive: true });
  await ServiceCategory.create({ name: 'Yıkama Detay', description: 'Araç yıkama ve detay işlemleri', type: 'wash', subCategories: ['Dış yıkama', 'İç temizlik', 'Cilalama'], isActive: true });
  
  await Vehicle.create({ userId, brand: 'BMW', modelName: '320i', package: 'Sport', year: 2020, engineType: 'B48', fuelType: 'Benzin', transmission: 'Otomatik', mileage: 35000, plateNumber: '44AEJ109', image: '', });
  await Vehicle.create({ userId, brand: 'Mercedes', modelName: 'C200', package: 'AMG', year: 2019, engineType: 'M264', fuelType: 'Benzin', transmission: 'Otomatik', mileage: 42000, plateNumber: '44ABC111', image: '', });
  await Maintenance.create({ userId, date: '2024-06-14', mileage: '35000', type: 'Periyodik', details: ['Yağ değişimi', 'Filtre değişimi'], serviceName: 'BMW Yetkili Servis' });
  await Insurance.create({ userId, company: 'Allianz', type: 'Kasko', startDate: '2024-01-01', endDate: '2025-01-01', policyNumber: 'POL123456' });
  await VehicleStatus.create({ userId, overallStatus: 'İyi', lastCheck: '2024-06-14', issues: [] });
  await TireStatus.create({ userId, status: 'İyi', lastCheck: '2024-06-14', issues: [] });
  await MaintenanceAppointment.create({ userId, vehicleId: 'dummyVehicleId', serviceType: 'Bakım', appointmentDate: '2024-07-01', status: 'pending', notes: 'Test randevu', sharePhoneNumber: false });
  await Master.create({ name: 'Usta Ahmet', services: ['bakım', 'onarım'], brands: ['BMW', 'Mercedes'], shopType: 'usta', location: 'İstanbul' });

  await Campaign.create({ title: 'Yaz İndirimi', description: 'Tüm bakımlarda %20 indirim!', company: 'BMW Servis', validUntil: '2024-08-31', discount: '%20' });
  await Ad.create({ title: 'Sigorta Kampanyası', image: '', shortText: 'Kasko %10 indirimli!', detailText: 'Detaylı bilgi için tıklayın.', company: 'Allianz', validUntil: '2024-07-31' });
  await User.create({ name: 'Test', surname: 'Kullanıcı', email: 'dummy1@example.com', password: 'dummy123', username: 'testuser1' });
  await User.create({ name: 'Ayşe', surname: 'Yılmaz', email: 'ayse@example.com', password: 'dummy123', username: 'ayseyilmaz' });
  await User.create({ name: 'Mehmet', surname: 'Demir', email: 'mehmet@example.com', password: 'dummy123', username: 'mehmetdemir' });
  await User.create({ name: 'Zeynep', surname: 'Kara', email: 'zeynep@example.com', password: 'dummy123', username: 'zeynepkara' });
  await User.create({ name: 'Ali', surname: 'Çelik', email: 'ali@example.com', password: 'dummy123', username: 'alicelik' });
  console.log('Tüm dummy veriler eklendi!');
  await mongoose.disconnect();
}

async function fixMechanicSurnames() {
  await mongoose.connect(MONGO_URI);
  const Mechanic = require('../models/Mechanic').Mechanic;
  const result = await Mechanic.updateMany(
    { surname: { $exists: false } },
    { $set: { surname: 'Usta' } }
  );
  console.log('surname alanı eksik mechanic sayısı:', result.modifiedCount);
  await mongoose.disconnect();
}

insertAllDummyData();
fixMechanicSurnames(); 