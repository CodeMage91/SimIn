//index.js

const loginInput = document.getElementById("username_input_log");
const loginSubmit = document.getElementById("login_submit");
const loginForm = document.getElementById("login_form");

if (loginSubmit && loginInput) {
    loginSubmit.addEventListener("click", loginUser);
}

if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        loginUser();
    });
}

function loginUser() {
    const typedName = loginInput.value.trim();

    const foundUser = window.users.find(user =>
        user.userName.toLowerCase() === typedName.toLowerCase()
    );

    if (!foundUser) {
        alert("User not found.");
        return;
    }

    sessionStorage.setItem("current_user", JSON.stringify(foundUser));

    if(foundUser.type === "admin"){
    window.location.href = "admin.html";
    }
    else{
        window.location.href = "sim_inventory.html";
    }
}