import request from 'supertest';
import { app } from '../src/index';

const DRIVER_EMAIL = 'home-test-driver@example.com';
const DRIVER_PASSWORD = 'HomeTest123!';

describe('Home Overview API', () => {
  let authToken: string;

  beforeAll(async () => {
    const registerPayload = {
      name: 'Home',
      surname: 'Tester',
      email: DRIVER_EMAIL,
      password: DRIVER_PASSWORD,
      phone: '+905551112233',
      userType: 'driver',
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(registerPayload)
      .expect(201);

    authToken = registerResponse.body.data.token;
    expect(authToken).toBeDefined();
  });

  it('should return aggregated home overview data with fallbacks', async () => {
    const response = await request(app)
      .get('/api/home/overview')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    const { maintenanceRecords, insurancePolicy, vehicleStatus, tireStatus, campaigns, ads } =
      response.body.data;

    expect(Array.isArray(maintenanceRecords)).toBe(true);
    expect(maintenanceRecords.length).toBeGreaterThan(0);

    expect(insurancePolicy).toBeDefined();
    expect(insurancePolicy.company).toBeTruthy();

    expect(vehicleStatus).toBeDefined();
    expect(vehicleStatus.overallStatus).toBeTruthy();

    expect(tireStatus).toBeDefined();
    expect(tireStatus.status).toBeTruthy();

    expect(Array.isArray(campaigns)).toBe(true);
    expect(campaigns.length).toBeGreaterThan(0);

    expect(Array.isArray(ads)).toBe(true);
    expect(ads.length).toBeGreaterThan(0);
  });
});


