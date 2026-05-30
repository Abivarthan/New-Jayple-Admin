const admin = require('firebase-admin');

// Ensure emulator is selected to prevent seeding production
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

admin.initializeApp({
  projectId: 'jayple-dev'
});

const db = admin.firestore();

async function seedData() {
  console.log('Seeding mock operational data to Firestore Emulator...');

  try {
    // 1. Seed adminUsers
    const superadminRef = db.collection('adminUsers').doc('mock_superadmin');
    await superadminRef.set({
      uid: 'mock_superadmin',
      email: 'admin@jayple.in',
      name: 'Jayaprakash',
      role: 'superadmin',
      permissions: ['vendors', 'users', 'zones', 'uiconfig', 'settlements', 'content', 'analytics', 'admin-users', 'audit'],
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    });
    console.log('✔ Seeded default superadmin adminUser (UID: mock_superadmin, Email: admin@jayple.in)');

    const managerRef = db.collection('adminUsers').doc('mock_manager');
    await managerRef.set({
      uid: 'mock_manager',
      email: 'manager@jayple.in',
      name: 'Meera Operations',
      role: 'manager',
      permissions: ['vendors', 'users', 'zones', 'uiconfig', 'settlements', 'content', 'analytics'],
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'mock_superadmin'
    });
    console.log('✔ Seeded default manager adminUser (UID: mock_manager)');

    // 2. Seed platformConfig
    const platformConfigRef = db.collection('platformConfig').doc('settings');
    await platformConfigRef.set({
      taxRates: {
        gstRegisteredTax: 18.0,
        nonGstTax: 5.0,
        convenienceFee: 9.00,
        taxIncluded: true,
        taxDisplayLabel: 'GST'
      },
      discountRules: {
        defaultFakeDiscount: 10,
        minPercentForBadge: 5,
        maxAllowedDiscount: 70,
        badgeStyle: 'PERCENT',
        showStrikethrough: true
      },
      vendorSettings: {
        autoApproveVendors: false,
        defaultCommission: 15,
        defaultCodThreshold: 5000,
        walletBlockThreshold: -500,
        slotLockDuration: 2
      },
      financialRules: {
        cancellationWindow: 2,
        cancellationPenalty: 25,
        vendorCancelPenalty: 100,
        vendorCancelCompensation: 30,
        welcomeBonus: 50,
        normalCashback: 2,
        minWeeklyPayout: 500
      },
      version: 5,
      lastUpdatedBy: 'mock_superadmin',
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✔ Seeded default platformConfig/settings settings');

    // 3. Seed mock zone
    const zoneRef = db.collection('serviceZones').doc('zone_01');
    await zoneRef.set({
      id: 'zone_01',
      name: 'Chennai Central',
      city: 'Chennai',
      pincodes: ['600001', '600002', '600003', '600004', '600005', '600006', '600007', '600008', '600014', '600018', '600028', '600040'],
      bounds: { minLat: 13.00, maxLat: 13.12, minLng: 80.20, maxLng: 80.30 },
      services: ['salon', 'home', 'bridal'],
      vendorsCount: 14,
      waitlistCount: 0,
      isActive: true,
      sponsorMode: 'CURATED'
    });
    console.log('✔ Seeded operational Chennai Central serviceZones document');

    console.log('Firestore seeder execution completed successfully! 🎉');
  } catch (error) {
    console.error('❌ Failed to seed operational mock data:', error);
  }
}

seedData();
