import { store } from './store.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Check if the user is already authenticated
    const user = store.getUser();
    if (user) {
        // If logged in, go straight to the app
        window.location.replace('app.html');
        return;
    }

    // DOM Elements
    const loginView = document.getElementById('loginView');
    const registerView = document.getElementById('registerView');
    const emailVerifyView = document.getElementById('emailVerifyView');
    
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const backToLoginFromVerify = document.getElementById('backToLoginFromVerify');
    
    // View Switch Logic
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    });
    
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.style.display = 'none';
        loginView.style.display = 'block';
    });
    
    backToLoginFromVerify.addEventListener('click', (e) => {
        e.preventDefault();
        emailVerifyView.style.display = 'none';
        loginView.style.display = 'block';
    });

    // Handle Login
    const loginForm = document.getElementById('loginForm');
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = 'Connexion en cours...';
        loginBtn.disabled = true;

        try {
            await store.loginUser(email, password);
            window.location.replace('app.html');
        } catch (error) {
            alert('Erreur : ' + (error.message || 'Identifiants incorrects.'));
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    });

    // Handle Registration
    const registerForm = document.getElementById('registerForm');
    const registerBtn = registerForm.querySelector('button[type="submit"]');
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('regFullName').value;
        const orgName = document.getElementById('regOrgName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        const originalText = registerBtn.innerHTML;
        registerBtn.innerHTML = 'Création en cours...';
        registerBtn.disabled = true;

        try {
            const user = await store.registerUser(fullName, orgName, email, password);
            
            // Show verification screen
            registerView.style.display = 'none';
            document.getElementById('verifyEmailTarget').innerText = email;
            emailVerifyView.style.display = 'block';
        } catch (error) {
            alert('Erreur : ' + (error.message || 'Impossible de créer le compte.'));
            registerBtn.innerHTML = originalText;
            registerBtn.disabled = false;
        }
    });
});
