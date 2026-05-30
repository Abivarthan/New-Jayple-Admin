const admin = require('firebase-admin');

// Initialize with default credentials
admin.initializeApp({
  projectId: "jayple-app-2026"
});

const db = admin.firestore();

async function createAdmin() {
  try {
    const email = "admin@jayple.in";
    const password = "AdminPassword123!";
    
    console.log("Creating user in Firebase Auth...");
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: "Super Admin",
    });
    
    console.log("User created with UID:", userRecord.uid);
    
    console.log("Creating admin profile in Firestore...");
    await db.collection('adminUsers').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: "Super Admin",
      role: "superadmin",
      isActive: true,
      permissions: ["vendors", "content", "analytics", "settlements"],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log("Admin profile successfully created!");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (error) {
    console.error("Error creating admin:", error);
  }
}

createAdmin();
