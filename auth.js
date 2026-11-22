"use strict";

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const resetForm = document.getElementById("resetForm");
const message = document.getElementById("message");
const passwordInput = document.getElementById("registerPassword");
const strengthMeter = document.getElementById("strengthMeter");
const strengthText = document.getElementById("strengthText");
const authClient = window.cyberShieldAuth;
let recoveryMode = new URLSearchParams(window.location.search).get("mode") === "reset";

try {
    localStorage.removeItem("cybershieldUsers");
    localStorage.removeItem("cybershieldCurrentUser");
    sessionStorage.removeItem("cybershieldCurrentUser");
} catch (error) {
    console.warn("Could not clear old demo account data from this browser.", error);
}

function showMessage(text, type) {
    message.textContent = text;
    message.classList.toggle("error", type === "error");
}

function pageUrl(file, query) {
    const url = new URL(file, window.location.href);
    if (query) url.search = new URLSearchParams(query).toString();
    return url.href;
}

function setBusy(form, busy) {
    form.querySelectorAll("button, input").forEach(function(control) {
        control.disabled = busy;
    });
}

function switchForm(showRegister) {
    loginForm.hidden = showRegister;
    registerForm.hidden = !showRegister;
    resetForm.hidden = true;
    loginTab.classList.toggle("active", !showRegister);
    registerTab.classList.toggle("active", showRegister);
    loginTab.setAttribute("aria-selected", String(!showRegister));
    registerTab.setAttribute("aria-selected", String(showRegister));
    loginTab.hidden = false;
    registerTab.hidden = false;
    document.getElementById("authTitle").textContent = showRegister ? "Create your account" : "Welcome back";
    document.querySelector(".auth-subtitle").textContent = showRegister
        ? "Your learning journey starts here."
        : "Pick up your learning journey.";
    showMessage("", "");
}

function showPasswordReset() {
    recoveryMode = true;
    loginForm.hidden = true;
    registerForm.hidden = true;
    resetForm.hidden = false;
    loginTab.hidden = true;
    registerTab.hidden = true;
    document.getElementById("authTitle").textContent = "Choose a new password";
    document.querySelector(".auth-subtitle").textContent = "Your reset link is ready.";
    showMessage("", "");
}

function requireAuthService() {
    if (authClient) return true;
    showMessage("Secure sign-in is not connected yet. Please try again after setup is complete.", "error");
    return false;
}

loginTab.addEventListener("click", function() {
    switchForm(false);
});

registerTab.addEventListener("click", function() {
    switchForm(true);
});

document.querySelectorAll("[data-toggle-password]").forEach(function(button) {
    button.addEventListener("click", function() {
        const input = document.getElementById(button.dataset.togglePassword);
        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";
        button.textContent = showPassword ? "Hide" : "Show";
        button.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
    });
});

document.getElementById("forgotPassword").addEventListener("click", async function() {
    if (!requireAuthService()) return;
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    if (!email) {
        showMessage("Enter your email address first, then choose Need help?.", "error");
        return;
    }

    const button = this;
    button.disabled = true;
    try {
        const { error } = await authClient.auth.resetPasswordForEmail(email, {
            redirectTo: pageUrl("auth.html", { mode: "reset" })
        });
        if (error) throw error;
        showMessage("If an account exists for that email, a password reset link is on its way.");
    } catch (error) {
        showMessage(error.message || "Could not send the reset email. Please try again.", "error");
    } finally {
        button.disabled = false;
    }
});

function updatePasswordStrength() {
    const password = passwordInput.value;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    const strength = password.length === 0 ? 0 : Math.min(score, 4);
    const labels = ["Use at least 8 characters. Choose a unique password.", "Weak password", "Fair password", "Good password", "Strong password"];
    const colors = ["transparent", "#ff8787", "#f7bd65", "#b6dc75", "#58e0b7"];
    strengthMeter.style.width = String(strength * 25) + "%";
    strengthMeter.style.backgroundColor = colors[strength];
    strengthText.textContent = labels[strength];
}

passwordInput.addEventListener("input", updatePasswordStrength);

registerForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    showMessage("", "");
    if (!requireAuthService()) return;

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!name || !email || !password) {
        showMessage("Please complete all fields.", "error");
        return;
    }
    if (password.length < 8) {
        showMessage("Choose a password with at least 8 characters.", "error");
        return;
    }

    setBusy(registerForm, true);
    try {
        const { data, error } = await authClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: name },
                emailRedirectTo: pageUrl("auth.html")
            }
        });
        if (error) throw error;

        if (data.session) {
            window.location.replace(pageUrl("dashboard.html"));
            return;
        }

        switchForm(false);
        document.getElementById("loginEmail").value = email;
        showMessage("Check your email and confirm your account before signing in.");
    } catch (error) {
        showMessage(error.message || "Could not create your account. Please try again.", "error");
    } finally {
        setBusy(registerForm, false);
    }
});

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    showMessage("", "");
    if (!requireAuthService()) return;

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    setBusy(loginForm, true);
    try {
        const { data, error } = await authClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        if (error) throw error;
        if (data.user) window.location.replace(pageUrl("dashboard.html"));
    } catch (error) {
        showMessage("Email or password is incorrect, or the email has not been confirmed.", "error");
    } finally {
        setBusy(loginForm, false);
    }
});

resetForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    showMessage("", "");
    if (!requireAuthService()) return;

    const password = document.getElementById("newPassword").value;
    const confirmation = document.getElementById("confirmPassword").value;
    if (password.length < 8) {
        showMessage("Choose a password with at least 8 characters.", "error");
        return;
    }
    if (password !== confirmation) {
        showMessage("The passwords do not match.", "error");
        return;
    }

    setBusy(resetForm, true);
    try {
        const { error } = await authClient.auth.updateUser({ password: password });
        if (error) throw error;
        await authClient.auth.signOut();
        recoveryMode = false;
        window.history.replaceState({}, document.title, pageUrl("auth.html"));
        switchForm(false);
        showMessage("Your password has been updated. Sign in with the new password.");
    } catch (error) {
        showMessage(error.message || "Could not update your password. Request a fresh reset link and try again.", "error");
    } finally {
        setBusy(resetForm, false);
    }
});

if (!authClient) {
    showMessage("Secure sign-in is not connected yet. The site owner must finish account setup.", "error");
} else {
    authClient.auth.onAuthStateChange(function(event, session) {
        if (event === "PASSWORD_RECOVERY") {
            showPasswordReset();
            return;
        }
        if (event === "SIGNED_IN" && session && !recoveryMode) {
            window.location.replace(pageUrl("dashboard.html"));
        }
    });

    authClient.auth.getSession().then(function(result) {
        if (result.error) {
            showMessage("Could not check your sign-in. Please refresh and try again.", "error");
            return;
        }
        if (recoveryMode) {
            if (result.data.session) showPasswordReset();
            else showMessage("This reset link has expired or is invalid. Request a new one.", "error");
            return;
        }
        if (result.data.session) window.location.replace(pageUrl("dashboard.html"));
    }).catch(function() {
        showMessage("Could not connect to the account service. Check your connection and try again.", "error");
    });
}

