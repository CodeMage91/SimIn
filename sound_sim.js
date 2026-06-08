import {
    db,
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    onSnapshot,
    serverTimestamp
} from "./firebase_config.js";

import { sounds } from "./sounds.js";

let current_user = JSON.parse(sessionStorage.getItem("current_user"));
let activeGroupId = sessionStorage.getItem("active_sim_group_id");
let simViewMode = sessionStorage.getItem("sim_view_mode");

if (!current_user) {
    window.location.href = "index.html";
}

let user_view = document.getElementById("user_view");
let group_name_user = document.getElementById("group_name_user");

let logout = document.getElementById("logout");
let group_name = document.getElementById("group_name");
let group_password = document.getElementById("group_password");
let create_group = document.getElementById("create_group");
let group_list = document.getElementById("group_list");
let participants = document.getElementById("participants");

let sound_board = document.getElementById("sound_board");


let create_group_window = document.getElementById("create_group_window");

let currentAudio = null;
let currentAudioFile = null;


applySoundSimViewMode();

function playLoopingSound(file) {
    if (currentAudioFile === file && currentAudio) {
        return;
    }

    stopCurrentSound();

    currentAudio = new Audio(`./sounds/${file}`);
    currentAudio.loop = true;
    currentAudio.play();

    currentAudioFile = file;
}

function stopCurrentSound() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    currentAudio = null;
    currentAudioFile = null;
}

if (create_group) {
    create_group.addEventListener("click", createSimGroup);
}

if (simViewMode === "user" && activeGroupId) {
    create_group_window.style.display = "none";
    renderJoinedGroup(activeGroupId);
}
else if (current_user.type !== "admin") {
    create_group_window.style.display = "none";
    renderGroups();
}
else if (activeGroupId) {
    create_group_window.style.display = "none";
    renderJoinedGroup(activeGroupId);
}
else {
    create_group_window.style.display = "block";
    renderGroups();
}

async function createSimGroup() {
    let name = group_name.value.trim();
    let password = group_password.value.trim();

    if (!name) {
        alert("Enter a group name.");
        return;
    }

    if (!password) {
        alert("Enter a group password.");
        return;
    }

    let newGroup = {
        group_name: name,
        password: password,

        created_by: current_user.userName,
        created_by_id: current_user.id,

        members: [
            {
                user_id: current_user.id,
                userName: current_user.userName,
                role: current_user.type || "user"
            }
        ],

        status: "open",
        created_at: serverTimestamp()
    };

    let docRef = await addDoc(
        collection(db, "sim_groups"),
        newGroup
    );

    sessionStorage.setItem("active_sim_group_id", docRef.id);
    sessionStorage.setItem("active_sim_group_name", name);
    sessionStorage.setItem("sim_view_mode", "admin");

    activeGroupId = docRef.id;

    group_name.value = "";
    group_password.value = "";

    alert("Sim group created.");

    create_group_window.style.display = "none";
    renderJoinedGroup(docRef.id);
}

async function renderGroups() {
    group_list.innerHTML = "";

    let snapshot = await getDocs(
        collection(db, "sim_groups")
    );

    if (snapshot.empty) {
        group_list.innerHTML = "<p>No active sim groups.</p>";
        return;
    }

    snapshot.forEach(groupDoc => {
        let group = groupDoc.data();

        let card = document.createElement("div");

        Object.assign(card.style, {
            border: "1px solid black",
            padding: "8px",
            marginBottom: "8px",
            borderRadius: "7px"
        });

        let membersHTML = "";

        if (group.members && group.members.length > 0) {
            group.members.forEach(member => {
                membersHTML += `
                    <li>
                        ${member.userName} - ${member.role}
                    </li>
                `;
            });
        } else {
            membersHTML = "<li>No members yet.</li>";
        }

        card.innerHTML = `
            <h3>${group.group_name}</h3>
            <p><strong>Created By:</strong> ${group.created_by}</p>
            <p><strong>Status:</strong> ${group.status}</p>

            <p><strong>Members:</strong></p>
            <ul>
                ${membersHTML}
            </ul>
        `;

        group_list.appendChild(card);
    });
}

async function renderJoinedGroup(groupId) {
    group_list.innerHTML = "";

    let groupRef = doc(db, "sim_groups", groupId);
    let groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
        group_list.innerHTML = "<p>This sim group no longer exists.</p>";
        return;
    }

    let group = groupSnap.data();
    if (group_name_user) {
    group_name_user.innerHTML = group.group_name;
}
    renderParticipants(group);

    let membersHTML = "";

    if (group.members && group.members.length > 0) {
        group.members.forEach(member => {
            membersHTML += `
                <li>
                    ${member.userName} - ${member.role}
                </li>
            `;
        });
    } else {
        membersHTML = "<li>No members yet.</li>";
    }

    group_list.innerHTML = `
        <div style="
            border:1px solid black;
            padding:12px;
            border-radius:7px;
            width:360px;
        ">
            <h2>${group.group_name}</h2>

            <p><strong>Status:</strong> ${group.status}</p>
            <p><strong>Created By:</strong> ${group.created_by}</p>

            <h3>Members</h3>
            <ul>
                ${membersHTML}
            </ul>
        </div>
    `;
}

if (logout) {
    logout.addEventListener("click", () => {
        sessionStorage.removeItem("current_user");
        sessionStorage.removeItem("active_sim_group_id");
        sessionStorage.removeItem("active_sim_group_name");
        sessionStorage.removeItem("sim_view_mode");

        window.location.href = "index.html";
    });
}

let selectedSound = null;
let selectedSoundSlot = null;
applySoundSimViewMode();
buildSoundBoard();

let unsubscribeGroupListener = null;

function startGroupListener(groupId) {
    if (!groupId) return;

    if (unsubscribeGroupListener) {
        unsubscribeGroupListener();
    }

    unsubscribeGroupListener = onSnapshot(doc(db, "sim_groups", groupId), groupSnap => {
        if (!groupSnap.exists()) return;

        let group = groupSnap.data();

        if (group_name_user) {
            group_name_user.innerHTML = group.group_name;
        }

        renderParticipants(group);

        let mySound = group.active_sounds?.[current_user.userName];

        if (mySound && mySound.playing) {
            playLoopingSound(mySound.file);
        } else {
            stopCurrentSound();
        }
    });
}
function renderParticipants(group) {
    if (current_user.type !== "admin") {
        return;
    }

    if (!participants) return;

    participants.innerHTML = "";

    if (!group.members || group.members.length === 0) {
        participants.innerHTML = "<p>No participants yet.</p>";
        return;
    }

    group.members.forEach(member => {
        let currentSound =
            group.active_sounds?.[member.userName]?.sound_name || "None";

        let card = document.createElement("div");

        Object.assign(card.style, {
            width: "240px",
            minHeight: "180px",
            margin: "12px",
            border: "1px solid black",
            display: "flex",
            flexDirection: "column",
            textAlign: "center",
            alignItems: "center",
            justifyContent: "space-evenly"
        });

        card.innerHTML = `
            <div>Name: ${member.userName}</div>
            <div>Role: ${member.role}</div>
            <div>Sound: ${currentSound}</div>
        `;

        if (current_user.type === "admin") {
            let playBtn = document.createElement("button");
            playBtn.innerHTML = "Play Selected Sound";

            playBtn.addEventListener("click", () => {
                assignSoundToUser(member.userName);
            });

            let stopBtn = document.createElement("button");
            stopBtn.innerHTML = "Stop";

            stopBtn.addEventListener("click", () => {
                stopSoundForUser(member.userName);
            });

            card.appendChild(playBtn);
            card.appendChild(stopBtn);
        }

        participants.appendChild(card);
    });
}

async function assignSoundToUser(userName) {
    if (!selectedSound) {
        alert("Select a sound first.");
        return;
    }

    if (!activeGroupId) {
        alert("No active group.");
        return;
    }

    await updateDoc(
        doc(db, "sim_groups", activeGroupId),
        {
            [`active_sounds.${userName}`]: {
                sound_id: selectedSound.id,
                sound_name: selectedSound.name,
                file: selectedSound.file,
                playing: true
            }
        }
    );
}

async function stopSoundForUser(userName) {
    if (!activeGroupId) return;

    await updateDoc(
        doc(db, "sim_groups", activeGroupId),
        {
            [`active_sounds.${userName}.playing`]: false
        }
    );
}

function applySoundSimViewMode() {
    if (current_user.type === "admin") {
        sound_board.style.display = "flex";
        participants.style.display = "flex";
        group_list.style.display = "block";
        user_view.style.display = "none";
    } else {
        sound_board.style.display = "none";
        participants.style.display = "none";
        group_list.style.display = "none";
        create_group_window.style.display = "none";
        user_view.style.display = "flex";
    }
}

function buildSoundBoard() {
    if (!sound_board) return;
    if (current_user.type !== "admin") return;

    sound_board.innerHTML = "";

    Object.assign(sound_board.style, {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        height: "auto"
    });

    sounds.forEach(sound => {
        let sound_slot = document.createElement("div");

        sound_slot.innerHTML = sound.name;

        Object.assign(sound_slot.style, {
            padding: "6px",
            border: "1px solid black",
            cursor: "pointer",
            margin: "4px",
            fontSize: "12px",
            backgroundColor: "white",
            color: "black"
        });

        sound_slot.addEventListener("click", () => {
            selectedSound = sound;

            if (selectedSoundSlot) {
                selectedSoundSlot.style.backgroundColor = "white";
                selectedSoundSlot.style.color = "black";
            }

            sound_slot.style.backgroundColor = "black";
            sound_slot.style.color = "white";

            selectedSoundSlot = sound_slot;
        });

        sound_board.appendChild(sound_slot);
    });
}

startGroupListener(activeGroupId);