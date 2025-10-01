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
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const regName = document.getElementById('reg-name');
const regEmail = document.getElementById('reg-email');
const regPassword = document.getElementById('reg-password');
const registerBtn = document.getElementById('register-btn');
const employeeList = document.getElementById('employee-list');
const attendanceList = document.getElementById('attendance-list');

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

    // This requires a special setup in Firebase to work from the client.
    // For now, we'll store the user details, but account creation would need a Cloud Function for security.
    // For this project, we'll create the user directly.
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
        .catch(error => alert(error.message));
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
            snapshot.forEach(doc => {
                const record = doc.data();
                const time = record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const li = document.createElement('li');
                li.innerHTML = `<span class="employee-name">${record.name}</span><span class="timestamp">${time}</span>`;
                attendanceList.appendChild(li);
            });
        });
}
