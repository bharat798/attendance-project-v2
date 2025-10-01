//
// ===================================
//  EMPLOYEE APP LOGIC
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
const browser = window.SimpleWebAuthnBrowser;

// Get Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const welcomeMessage = document.getElementById('welcome-message');
const registerPasskeyBtn = document.getElementById('register-passkey-btn');
const markAttendanceBtn = document.getElementById('mark-attendance-btn');

// --- AUTHENTICATION ---
loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value)
        .catch(error => alert(error.message));
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
    if (user) {
        loginScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        // Fetch user's name and display it
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                welcomeMessage.textContent = `Welcome, ${doc.data().name}!`;
            }
        });
        checkPasskeyRegistration(user.uid);
    } else {
        dashboardScreen.classList.remove('active');
        loginScreen.classList.add('active');
    }
});

// --- PASSKEY & ATTENDANCE ---
function bufferToBase64URL(buffer) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

registerPasskeyBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const rpId = window.location.hostname === '127.0.0.1' ? 'localhost' : window.location.hostname;
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const registrationOptions = {
        rp: { name: 'Employee App', id: rpId },
        user: { id: bufferToBase64URL(new TextEncoder().encode(user.uid)), name: user.email, displayName: user.email },
        challenge: bufferToBase64URL(challenge),
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: { userVerification: 'required' }
    };

    try {
        const registrationCredential = await browser.startRegistration(registrationOptions);
        await db.collection('users').doc(user.uid).set({ passkeyCredential: { id: registrationCredential.id } }, { merge: true });
        alert('Passkey registered successfully!');
        registerPasskeyBtn.disabled = true;
    } catch (error) {
        alert('Passkey registration failed. Please try again.');
        console.error(error);
    }
});

async function checkPasskeyRegistration(uid) {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists && doc.data().passkeyCredential) {
        registerPasskeyBtn.disabled = true;
        registerPasskeyBtn.textContent = "Passkey Registered";
    }
}

markAttendanceBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || !userDoc.data().passkeyCredential) {
            return alert('You must register a passkey first.');
        }

        const credentialId = userDoc.data().passkeyCredential.id;
        const challenge = crypto.getRandomValues(new Uint8Array(32));

        const authenticationOptions = {
            challenge: bufferToBase64URL(challenge),
            allowCredentials: [{ id: credentialId, type: 'public-key' }],
            userVerification: 'required',
        };

        await browser.startAuthentication(authenticationOptions);
        
        // If authentication is successful, mark attendance
        const userName = userDoc.data().name;
        await db.collection('attendance').add({
            userId: user.uid,
            name: userName,
            email: user.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Attendance marked successfully!');
        markAttendanceBtn.disabled = true;
        markAttendanceBtn.textContent = "Attendance Marked";

    } catch (error) {
        alert('Verification failed. Please try again.');
        console.error(error);
    }
});
