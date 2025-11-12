/**
 * Home ekranı için örnek veri seed script'i.
 *
 * Kullanım:
 *   ts-node scripts/seedHomeData.ts <driver-email>
 *
 * Eğer e-posta belirtilmezse varsayılan olarak testdv@gmail.com kullanılır.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import {
  MaintenanceRecordModel,
  InsurancePolicyModel,
  VehicleStatusRecordModel,
  TireStatusRecordModel,
} from '../src/models/HomeRecords';
import {
  createSampleInsurancePolicy,
  createSampleMaintenanceRecords,
  createSampleTireStatus,
  createSampleVehicleStatus,
} from '../src/utils/homeFixtures';

dotenv.config();

const DEFAULT_DRIVER_EMAIL = 'testdv@gmail.com';
const targetEmail = process.argv[2] || DEFAULT_DRIVER_EMAIL;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function seedHomeData() {
  try {
    console.log('🔌 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Bağlantı başarılı');

    const user = await User.findOne({ email: targetEmail });

    if (!user) {
      throw new Error(`Belirtilen e-postaya sahip kullanıcı bulunamadı: ${targetEmail}`);
    }

    const userId = String(user._id);
    console.log(`👤 Kullanıcı bulundu: ${userId} (${targetEmail})`);

    const [maintenanceCount, insuranceCount, vehicleStatusCount, tireStatusCount] = await Promise.all([
      MaintenanceRecordModel.countDocuments({ userId }),
      InsurancePolicyModel.countDocuments({ userId }),
      VehicleStatusRecordModel.countDocuments({ userId }),
      TireStatusRecordModel.countDocuments({ userId }),
    ]);

    if (maintenanceCount === 0) {
      const maintenanceFixtures = createSampleMaintenanceRecords(userId);
      await MaintenanceRecordModel.insertMany(maintenanceFixtures);
      console.log(`🛠️  ${maintenanceFixtures.length} bakım kaydı eklendi.`);
    } else {
      console.log(`ℹ️  Kullanıcının ${maintenanceCount} bakım kaydı zaten mevcut, atlanıyor.`);
    }

    if (insuranceCount === 0) {
      const insuranceFixture = createSampleInsurancePolicy(userId);
      await InsurancePolicyModel.create(insuranceFixture);
      console.log('🛡️  Sigorta kaydı eklendi.');
    } else {
      console.log('ℹ️  Sigorta kaydı zaten mevcut, atlanıyor.');
    }

    if (vehicleStatusCount === 0) {
      const vehicleStatusFixture = createSampleVehicleStatus(userId);
      await VehicleStatusRecordModel.create(vehicleStatusFixture);
      console.log('🚗 Araç durumu kaydı eklendi.');
    } else {
      console.log('ℹ️  Araç durumu kaydı zaten mevcut, atlanıyor.');
    }

    if (tireStatusCount === 0) {
      const tireStatusFixture = createSampleTireStatus(userId);
      await TireStatusRecordModel.create(tireStatusFixture);
      console.log('🛞 Lastik durumu kaydı eklendi.');
    } else {
      console.log('ℹ️  Lastik durumu kaydı zaten mevcut, atlanıyor.');
    }

    console.log('\n🎉 Home ekranı verileri başarıyla hazırlandı.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seed işlemi başarısız:', error.message || error);
    process.exit(1);
  }
}

seedHomeData();


