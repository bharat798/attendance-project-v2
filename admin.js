// FINAL ADMIN JAVASCRIPT - With one-time admin registration

//
// ===================================
//  ADMIN APP LOGIC
// ===================================
//
const firebaseConfig = {
    apiKey: "AIzaSyDIXwI85CH-uXrsPmXTCsX2cEzKPtPxcP8",
    authDomain: "employeeattendanceapp-387e2.firebaseapp.com",
    projectId: "employeeattendanceapp-387e2",
    storageBucket: "employeeattendanceapp-387e2.appspot.com",
    messagingSenderId: "1023846201615",
    appId: "1:1023846201615:web:040da8523772ac8275267a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const ADMIN_EMAIL = "admin@company.com"; // Your admin email

// Get Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginView = document.getElementById('login-view');
const adminRegView = document.getElementById('admin-reg-view');

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

const showAdminRegLink = document.getElementById('show-admin-reg-link');
const showAdminLoginLink = document.getElementById('show-admin-login-link');
const adminRegPassword = document.getElementById('admin-reg-password');
const adminRegBtn = document.getElementById('admin-reg-btn');

const regName = document.getElementById('reg-name');
const regEmail = document.getElementById('reg-email');
const regPassword = document.getElementById('reg-password');
const registerBtn = document.getElementById('register-btn');
const employeeList = document.getElementById('employee-list');
const attendanceList = document.getElementById('attendance-list');

// --- TOGGLE LOGIN / ADMIN REGISTRATION VIEWS ---
showAdminRegLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'none';
    adminRegView.style.display = 'block';
});

showAdminLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    adminRegView.style.display = 'none';
    loginView.style.display = 'block';
});

// --- ONE-TIME ADMIN REGISTRATION ---
adminRegBtn.addEventListener('click', async () => {
    const password = adminRegPassword.value;
    if (password.length < 6) {
        return alert('Password should be at least 6 characters.');
    }

    // Securely check if an admin already exists before creating a new one
    const configDocRef = db.collection('config').doc('admin');
    const doc = await configDocRef.get();

    if (doc.exists && doc.data().isRegistered) {
        return alert('Admin account has already been registered. Please log in.');
    }

    // If no admin exists, create one
    auth.createUserWithEmailAndPassword(ADMIN_EMAIL, password)
        .then(async (userCredential) => {
            const userId = userCredential.user.uid;
            // 1. Save admin info in the 'users' collection
            await db.collection('users').doc(userId).set({
                name: 'Admin',
                email: ADMIN_EMAIL
            });
            // 2. Set the flag to prevent future admin registrations
            await configDocRef.set({ isRegistered: true });
            
            alert('Admin account created successfully! You can now log in.');
            showAdminLoginLink.click(); // Go back to the login view
        })
        .catch(error => {
            alert('Error: ' + error.message);
        });
});

// --- AUTHENTICATION ---
loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value)
        .catch(error => alert(error.message));
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
    if (user && user.email === ADMIN_EMAIL) {
        loginScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        fetchRegisteredEmployees();
        listenForAttendance();
    } else {
        dashboardScreen.classList.remove('active');
        loginScreen.classList.add('active');
    }
});

// --- USER MANAGEMENT ---
registerBtn.addEventListener('click', () => {
    const name = regName.value;
    const email = regEmail.value;
    const password = regPassword.value;

    if (!name || !email || !password) {
        return alert('Please fill all fields.');
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const userId = userCredential.user.uid;
            // Now save the employee's name in Firestore
            return db.collection('users').doc(userId).set({
                name: name,
                email: email
            });
        })
        .then(() => {
            alert(`Employee ${name} registered successfully!`);
            regName.value = '';
            regEmail.value = '';
            regPassword.value = '';
        })
        .catch(error => {
            // This error often happens if the currently logged-in user (admin) doesn't have permission
            // to create other users, or if the new user is automatically logged in.
            // For this project, we accept this flow, but a real app would use Cloud Functions.
            if (error.code === 'auth/email-already-in-use') {
                alert('This email is already registered.');
            } else {
                alert('An error occurred during employee registration. The admin may have been logged out. Please log back in.');
            }
            console.error("Employee registration error:", error);
        });
});

function fetchRegisteredEmployees() {
    db.collection('users').onSnapshot(snapshot => {
        employeeList.innerHTML = ''; // Clear list
        snapshot.forEach(doc => {
            const user = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span class="employee-name">${user.name}</span><span>${user.email}</span>`;
            employeeList.appendChild(li);
        });
    });
}

// --- ATTENDANCE LIST ---
function listenForAttendance() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    db.collection('attendance')
        .where('timestamp', '>=', today)
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            attendanceList.innerHTML = ''; // Clear list
            if (snapshot.empty) {
                attendanceList.innerHTML = '<li>No attendance marked today.</li>';
                return;
            }
            snapshot.forEach(doc => {
                const record = doc.data();
                const time = record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const li = document.createElement('li');
                li.innerHTML = `<span class="employee-name">${record.name}</span><span class="timestamp">${time}</span>`;
                attendanceList.appendChild(li);
            });
        });
}
