import mongoose from 'mongoose';
import '../config'; // Ensure environment variables are loaded
import { Vehicle } from '../models/Vehicle';
import { MileageModel } from '../models/MileageModel';
import { FeatureFlag } from '../models/FeatureFlag';
import { MONGODB_URI, MONGODB_OPTIONS } from '../config';

const DEFAULT_RATE = Number(process.env.MILEAGE_DEFAULT_RATE_KM_PER_DAY || 30);
const DEFAULT_CONFIDENCE = Number(process.env.MILEAGE_DEFAULT_CONFIDENCE || 0.3);
const FLAG_SEED_DATA = [
  {
    key: 'akilli_kilometre',
    defaultOn: false,
    description: 'Akıllı kilometre tahmini ana özelliği',
  },
  {
    key: 'akilli_kilometre_shadow',
    defaultOn: false,
    description: 'Akıllı kilometre gölge modu; metrik toplar fakat UI göstermeden çalışır',
  },
];

const ALLOW_SEED = process.env.ALLOW_SEED === 'true';

async function main() {
  if (!ALLOW_SEED) {
    console.log('🚫 ALLOW_SEED=false, seed işlemi atlandı.');
    return;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI tanımlı değil.');
  }

  console.log('🔌 MongoDB bağlantısı kuruluyor...');
  await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);

  try {
    console.log('🚩 Feature flag seed başlatılıyor...');
    for (const flag of FLAG_SEED_DATA) {
      await FeatureFlag.updateOne(
        { key: flag.key },
        { $setOnInsert: flag },
        { upsert: true }
      );
    }
    console.log('✅ Feature flag seed tamamlandı.');

    console.log('🚗 Mileage model backfill başlatılıyor...');
    const vehiclesCursor = Vehicle.find({}, { _id: 1, mileage: 1 })
      .lean()
      .cursor();

    let processed = 0;
    for await (const vehicle of vehiclesCursor) {
      const tenantId = 'default'; // TODO: replace with actual tenant resolution when multi-tenant data is available
      await MileageModel.updateOne(
        { vehicleId: vehicle._id, tenantId },
        {
          $setOnInsert: {
            seriesId: `series-${vehicle._id.toString()}`,
            lastTrueKm: typeof vehicle.mileage === 'number' ? vehicle.mileage : 0,
            lastTrueTsUtc: new Date(),
            rateKmPerDay: DEFAULT_RATE,
            confidence: DEFAULT_CONFIDENCE,
            defaultUnit: 'km',
          },
        },
        { upsert: true }
      );
      processed += 1;
      if (processed % 100 === 0) {
        console.log(`   • ${processed} araç işlendi`);
      }
    }

    console.log(`✅ Mileage model backfill tamamlandı. Toplam ${processed} araç işlendi.`);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı.');
  }
}

main()
  .then(() => {
    console.log('🎉 Seed işlemi başarıyla tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed işlemi başarısız:', error);
    process.exit(1);
  });


