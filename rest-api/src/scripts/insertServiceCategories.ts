import mongoose from 'mongoose';
import { ServiceCategory } from '../models/ServiceCategory';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rektefe';

async function insertServiceCategories() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB bağlantısı başarılı!');
    
    // Önce mevcut servis kategorilerini sil
    await ServiceCategory.deleteMany({});
    console.log('Mevcut servis kategorileri silindi.');
    
    // Gerçek servis kategorileri ekle
    const categories = [
      {
        name: 'Genel Bakım',
        description: 'Periyodik bakım ve genel servis işlemleri',
        type: 'maintenance',
        subCategories: ['Yağ değişimi', 'Filtre değişimi', 'Fren kontrolü', 'Genel kontrol'],
        isActive: true
      },
      {
        name: 'Motor Bakımı',
        description: 'Motor ile ilgili bakım ve onarım işlemleri',
        type: 'maintenance',
        subCategories: ['Motor yağı değişimi', 'Hava filtresi', 'Yakıt filtresi', 'Motor temizliği'],
        isActive: true
      },
      {
        name: 'Fren Sistemi',
        description: 'Fren sistemi bakım ve onarımı',
        type: 'repair',
        subCategories: ['Fren balatası değişimi', 'Fren diski değişimi', 'Fren hidroliği', 'Fren ayarı'],
        isActive: true
      },
      {
        name: 'Süspansiyon',
        description: 'Süspansiyon sistemi bakım ve onarımı',
        type: 'repair',
        subCategories: ['Amortisör değişimi', 'Yay değişimi', 'Burç değişimi', 'Süspansiyon ayarı'],
        isActive: true
      },
      {
        name: 'Elektrik Sistemi',
        description: 'Elektrik ve elektronik sistem onarımı',
        type: 'repair',
        subCategories: ['Aku değişimi', 'Şarj dinamosu', 'Marş motoru', 'Elektrik arıza tespiti'],
        isActive: true
      },
      {
        name: 'Kaporta Boya',
        description: 'Kaporta ve boya işlemleri',
        type: 'bodywork',
        subCategories: ['Çizik giderme', 'Boyama', 'Kaporta düzeltme', 'Çarpma onarımı'],
        isActive: true
      },
      {
        name: 'Lastik Servisi',
        description: 'Lastik değişimi ve bakımı',
        type: 'tire',
        subCategories: ['Lastik değişimi', 'Balans ayarı', 'Rot ayarı', 'Lastik tamiri'],
        isActive: true
      },
      {
        name: 'Yıkama Detay',
        description: 'Araç yıkama ve detay işlemleri',
        type: 'wash',
        subCategories: ['Dış yıkama', 'İç temizlik', 'Cilalama', 'Detay temizlik'],
        isActive: true
      },
      {
        name: 'Klima Servisi',
        description: 'Klima sistemi bakım ve onarımı',
        type: 'repair',
        subCategories: ['Klima gazı doldurma', 'Klima filtresi', 'Klima arıza tespiti', 'Klima temizliği'],
        isActive: true
      },
      {
        name: 'Egzoz Sistemi',
        description: 'Egzoz sistemi bakım ve onarımı',
        type: 'repair',
        subCategories: ['Egzoz borusu değişimi', 'Katalitik konvertör', 'Egzoz arıza tespiti'],
        isActive: true
      }
    ];
    
    for (const category of categories) {
      await ServiceCategory.create(category);
      console.log(`Kategori eklendi: ${category.name}`);
    }
    
    console.log('Tüm servis kategorileri başarıyla eklendi!');
    
    // Eklenen kategorileri listele
    const allCategories = await ServiceCategory.find({});
    console.log('Toplam kategori sayısı:', allCategories.length);
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

insertServiceCategories(); 