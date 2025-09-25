const DetoxCircusEnvironment = require('detox/runners/jest-circus/environment').default;

class CustomDetoxEnvironment extends DetoxCircusEnvironment {
  constructor(config, context) {
    super(config, context);

    // Test başlangıcında kullanılacak global değişkenler
    this.global.testData = {
      users: {
        testDriver: {
          email: 'testdv@gmail.com',
          password: 'test123',
          name: 'Test',
          surname: 'Driver',
          phone: '+905551234567'
        },
        testMechanic: {
          email: 'testus@gmail.com',
          password: 'test123',
          name: 'Test',
          surname: 'Mechanic',
          phone: '+905551234568'
        }
      },
      vehicles: {
        testVehicle: {
          plate: '34ABC123',
          brand: 'Toyota',
          model: 'Corolla',
          year: '2020',
          fuelType: 'Benzin'
        }
      },
      appointments: {
        testService: {
          serviceType: 'Fren Bakımı',
          description: 'Fren balata değişimi gerekiyor',
          urgency: 'normal'
        }
      }
    };
  }

  async setup() {
    await super.setup();
    }

  async teardown() {
    await super.teardown();
  }
}

module.exports = CustomDetoxEnvironment;
