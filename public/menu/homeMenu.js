const socket = io();

const btn = document.getElementById("createBtn");
const usernameInput = document.getElementById("usernameInput");
const errorText = document.getElementById("error");

btn.addEventListener("click", () => {
    const username = usernameInput.value.trim();

    if (username === "") {
        errorText.textContent = "Username cannot be empty!";
        setTimeout (() => {
            errorText.textContent = "";
        }, 5000);
        return;
    }

    socket.emit("createUser", { userName: username });
});

socket.on("usernameStatus", (data) => {
    if (data.success) {
        // Save username and color
        localStorage.setItem("username", data.userName);

        // Redirect to lobby
        window.location.href = "./game.html";
    } else {
        errorText.textContent = "Username already taken!";
        //clears error message after 5 secons 
        setTimeout (() => {
            errorText.textContent = "";
        }, 5000);
    }
});
