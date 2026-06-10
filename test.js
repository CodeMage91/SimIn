// sim_inventory.js
import {
    db,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp
} from "./firebase_config.js"; 

console.log(db);

let savedUser = JSON.parse(sessionStorage.getItem("current_user"));

if (!savedUser) {
    window.location.href = "index.html";
}

let current_user = savedUser;

let user_name_display = document.getElementById("user_name_display");

if (user_name_display) {
    user_name_display.innerHTML = `Welcome, ${current_user.userName}`;
}

// filters
let manikin_filter = document.getElementById("manikin_filter");
let body_filter = document.getElementById("body_filter");
let simpad_filter = document.getElementById("simpad_filter");
let medical_supplies_filter = document.getElementById("medical_supplies_filter");
let sim_group_filter = document.getElementById("sim_group_filter");
let group_results = document.getElementById("group_results");

// search bar
const search_form = document.getElementById("search_form");
let search_bar = document.getElementById("search_bar");
let start_search = document.getElementById("start_search");

// result screen
let results = document.getElementById("results");

// request cart
let request_cart_box = document.getElementById("request_cart_box");
let request_display = document.getElementById("request_display");
let submit_request = document.getElementById("submit_request");

let to_request_details = document.getElementById("to_request_details");
let request_details = document.getElementById("request_details");

let back_to_request_cart = document.getElementById("back_to_request_cart");

let start_date = document.getElementById("start_date");
let start_time = document.getElementById("start_time");
let end_date = document.getElementById("end_date");
let end_time = document.getElementById("end_time");
let sim_location = document.getElementById("sim_location");
let request_comments = document.getElementById("request_comments");

let event_calendar = document.getElementById("event_calendar");
let events_filter = document.getElementById("events_filter");

let event_details = document.getElementById("event_details");

let request_cart = [];

results.style.display = "none";
request_cart_box.style.display = "none";
group_results.style.display = "none";
event_calendar.style.display = "flex";

if (results) {
    renderResults(sim_inventory);
}

function renderResults(list) {
    if (!results) return;

    results.innerHTML = "";
    
    list.forEach(item => {
        let slot = document.createElement("div");

        let imageHTML = item.image
        ? `<img src="./images/${item.image}"
            style="width:120px;height:120px;object-fit:cover;">`
        : `<div style="
                width:120px;
                height:120px;
                border:1px solid black;
                font-size:10px;
                display:flex;
                align-items:center;
                justify-content:center;
            ">
                No Photo
        </div>`;

        Object.assign(slot.style, {
            width: "98%",
            minHeight: "148px",
            borderBottom: "1px solid black",
            paddingTop: "14px",
            paddingLeft: "12px",
            fontSize: "18px"
        });

        slot.innerHTML = `
            <div style="
                display:flex;
                flex-direction:row;
                align-items:center;
                gap:12px;
            ">

                ${imageHTML}

                <div>
                    <strong>${item.productName}</strong><br>

                    <span style="font-size:14px;color:#555;">
                        Serial: ${item.serialNumber}<br>
                        Line: ${item.productLine}
                    </span>
                </div>

            </div>
        `;

        let requestBtn = document.createElement("button");
        requestBtn.innerHTML = "Request";
        requestBtn.title = "request item";
        requestBtn.style.cursor = "pointer";
        requestBtn.style.marginTop = "4px";
        requestBtn.style.width = "123px";

        requestBtn.addEventListener("click", () => {
            addToRequestCart(item);
        });

        slot.appendChild(requestBtn);
        results.appendChild(slot);
    });
}

function addToRequestCart(item) {
    let alreadyAdded = request_cart.some(cartItem => cartItem.id === item.id);

    if (alreadyAdded) {
        alert("This item is already in your request.");
        return;
    }

    request_cart.push(item);
    renderRequestCart();
}

function renderRequestCart() {
    if (!request_display) return;

    request_display.innerHTML = "";

    request_cart.forEach(item => {
        let requestSlot = document.createElement("div");

        Object.assign(requestSlot.style, {
            borderBottom: "1px solid black",
            padding: "6px",
            fontSize: "14px"
        });

        let imageHTML = item.image
            ? `
                <img 
                    src="./images/${item.image}" 
                    style="
                        width:120px;
                        height:120px;
                        object-fit:cover;
                        border:1px solid black;
                    "
                >
              `
            : `
                <div style="
                    width:120px;
                    height:120px;
                    border:1px solid black;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:10px;
                    color:#666;
                    text-align:center;
                ">
                    No Photo
                </div>
              `;

        requestSlot.innerHTML = `
            <div style="display:flex; flex-direction:row; gap:8px; align-items:center;">
                ${imageHTML}

                <div>
                    <strong>${item.productName}</strong><br>
                    Serial: ${item.serialNumber || "N/A"}
                </div>
            </div>
        `;

        let removeBtn = document.createElement("button");
        removeBtn.innerHTML = "Remove";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.marginTop = "4px";

        removeBtn.addEventListener("click", () => {
            removeFromRequestCart(item.id);
        });

        requestSlot.appendChild(removeBtn);
        request_display.appendChild(requestSlot);
    });
}

function removeFromRequestCart(itemId) {
    request_cart = request_cart.filter(item => item.id !== itemId);
    renderRequestCart();
}

async function submitRequest() {
    if (request_cart.length === 0) {
        alert("No items in request.");
        return;
    }

    if (!start_date.value || !start_time.value || !end_date.value || !end_time.value) {
        alert("Please enter the needed date and time range.");
        return;
    }

    if (!sim_location.value.trim()) {
        alert("Please enter the event location.");
        return;
    }

    let now = new Date();
    let startDateTime = new Date(
    `${start_date.value}T${start_time.value}`
    );

    let endDateTime = new Date(
        `${end_date.value}T${end_time.value}`
    );

    if (endDateTime <= startDateTime) {
        alert("End date/time must be after start date/time.");
        return;
    }
    let newRequest = {
        from: current_user.userName,
        user_id: current_user.id,

        items: request_cart.map(item => ({
            inventory_id: item.id,
            productName: item.productName,
            serialNumber: item.serialNumber || "N/A",
            productLine: item.productLine,
            image: item.image || null,
            location: item.location || ""
        })),

        submitted_date: now.toLocaleDateString(),

        submitted_time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        }),

        needed_from_date: start_date.value,
        needed_from_time: start_time.value,

        needed_to_date: end_date.value,
        needed_to_time: end_time.value,

        event_location: sim_location.value.trim(),
        comments: request_comments.value.trim(),

        created_at: serverTimestamp(),

        status: "pending"
    };

    await addDoc(
        collection(db, "inventory_requests"),
        newRequest
    );

    request_cart = [];
    renderRequestCart();

    start_date.value = "";
    start_time.value = "";
    end_date.value = "";
    end_time.value = "";
    sim_location.value = "";
    request_comments.value = "";

    alert(`${newRequest.items.length} item(s) submitted successfully.`);
}

if (submit_request) {
    submit_request.addEventListener("click", submitRequest);
}

function searchInventory(query) {
    query = query.toLowerCase();

    let filtered = sim_inventory.filter(item =>
        item.productName.toLowerCase().includes(query) ||
        item.serialNumber.toLowerCase().includes(query) ||
        item.productLine.toLowerCase().includes(query) ||
        item.accountName.toLowerCase().includes(query) ||
        item.assetName.toLowerCase().includes(query)
    );

    renderResults(filtered);
}

if (start_search && search_bar) {
    start_search.addEventListener("click", () => {
        let q = search_bar.value.trim();
        searchInventory(q);
    });

    search_bar.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            let q = search_bar.value.trim();
            searchInventory(q);
        }
    });
}

to_request_details.onclick = ()=>{
    request_display.style.display = "none";
    to_request_details.style.display = "none";

    request_details.style.display = "flex";
     back_to_request_cart.style.display = "flex";
};

back_to_request_cart.onclick = ()=>{
    request_display.style.display = "flex";
    to_request_details.style.display = "flex";

    request_details.style.display = "none";
    back_to_request_cart.style.display = "none";
};

let logout = document.getElementById("logout");

if (logout) {
    logout.addEventListener("click", () => {
        sessionStorage.removeItem("current_user");
        window.location.href = "index.html";
    });
}

if (manikin_filter) {
    manikin_filter.addEventListener("click", showInventoryView);
}

if (body_filter) {
    body_filter.addEventListener("click", showInventoryView);
}

if (simpad_filter) {
    simpad_filter.addEventListener("click", showInventoryView);
}

if (medical_supplies_filter) {
    medical_supplies_filter.addEventListener("click", showInventoryView);
}

async function renderUserGroups() {
    if (!group_results) return;

    group_results.innerHTML = "";

    let snapshot = await getDocs(
        collection(db, "sim_groups")
    );

    if (snapshot.empty) {
        group_results.innerHTML = "<h3>No active sim groups.</h3>";
        return;
    }

    snapshot.forEach(groupDoc => {
        let group = groupDoc.data();
        let groupId = groupDoc.id;

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

        let card = document.createElement("div");

        Object.assign(card.style, {
            border: "1px solid black",
            padding: "12px",
            margin: "8px",
            borderRadius: "7px",
            width: "360px"
        });

        card.innerHTML = `
            <h3>${group.group_name}</h3>
            <p><strong>Created By:</strong> ${group.created_by}</p>
            <p><strong>Status:</strong> ${group.status}</p>

            <p><strong>Members:</strong></p>
            <ul>${membersHTML}</ul>

            <input 
                type="text" 
                placeholder="Enter password"
                class="join_password"
                style="width:90%; padding:4px;"
            >

            <div 
                class="join_group_btn"
                style="
                    background:black;
                    color:white;
                    width:80px;
                    padding:6px;
                    margin-top:8px;
                    cursor:pointer;
                    text-align:center;
                    border-radius:7px;
                "
            >
                Join
            </div>
        `;

        let joinPasswordInput = card.querySelector(".join_password");
        let joinBtn = card.querySelector(".join_group_btn");

        joinBtn.addEventListener("click", () => {
            joinGroup(groupId, group, joinPasswordInput.value.trim());
        });

        group_results.appendChild(card);
    });
}

async function joinGroup(groupId, group, typedPassword) {
    if (!typedPassword) {
        alert("Enter the group password.");
        return;
    }

    if (typedPassword !== group.password) {
        alert("Incorrect password.");
        return;
    }

    let members = group.members || [];

    let alreadyJoined = members.some(member =>
        member.userName === current_user.userName
    );

    if (alreadyJoined) {
        alert("You are already in this group.");
        return;
    }

    members.push({
        user_id: current_user.id,
        userName: current_user.userName,
        role: current_user.type || "user"
    });

    await updateDoc(
        doc(db, "sim_groups", groupId),
        {
            members: members
        }
    );

    sessionStorage.setItem("active_sim_group_id", groupId);
    sessionStorage.setItem("active_sim_group_name", group.group_name);
    sessionStorage.setItem("sim_view_mode", "user");

    window.location.href = "sound_sim.html";
}

function renderEvents(eventsList) {
    if (!event_calendar) return;

    event_calendar.innerHTML = "";

    let activeEvent = event_title.find(event => event.active === true);

    if (!activeEvent) {
        event_calendar.innerHTML = "<h2>No active event selected.</h2>";
        return;
    }

    let activeEventActivities = eventsList.filter(activity => {
        return activity.event_id === activeEvent.id;
    });

    let hero = document.createElement("div");

    Object.assign(hero.style, {
        width: "100%",
        minHeight: "240px",
        backgroundImage: activeEvent.cover_image
            ? `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url('./images/${activeEvent.cover_image}')`
            : "linear-gradient(135deg, #222, #666)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        textAlign: "center",
        borderBottom: "1px solid black"
    });

    hero.innerHTML = `
        <h1 style="font-size:42px; margin:0;">${activeEvent.title}</h1>
        <div style="font-size:18px; margin-top:8px;">Event Calendar</div>
    `;

    event_calendar.appendChild(hero);

    let groupedByDate = {};

    activeEventActivities.forEach(activity => {
        if (!groupedByDate[activity.date]) {
            groupedByDate[activity.date] = [];
        }

        groupedByDate[activity.date].push(activity);
    });

    let calendarGrid = document.createElement("div");

    Object.assign(calendarGrid.style, {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        padding: "12px"
    });

    Object.keys(groupedByDate).forEach(date => {
        let dayEvents = groupedByDate[date];

        dayEvents.sort((a, b) => {
            return a.sort_time.localeCompare(b.sort_time);
        });

        let dayCard = document.createElement("div");

        Object.assign(dayCard.style, {
            border: "1px solid black",
            borderRadius: "7px",
            padding: "10px",
            minHeight: "180px",
            cursor: "pointer",
            backgroundColor: "#f7f7f7"
        });

        let eventHTML = "";

        dayEvents.forEach(activity => {
            eventHTML += `
                <div style="border-top:1px solid #ccc; padding-top:6px; margin-top:6px;">
                    <strong>${activity.title}</strong><br>
                    <span>${activity.start_time} - ${activity.end_time}</span><br>
                    <span>Lead: ${activity.lead || "N/A"}</span>
                </div>
            `;
        });

        dayCard.innerHTML = `
            <h3>${dayEvents[0].day}</h3>
            <strong>${date}</strong>
            ${eventHTML}
        `;

        dayCard.addEventListener("click", () => {
            renderEventDetails(date, dayEvents, activeEvent);
        });

        calendarGrid.appendChild(dayCard);
    });

    event_calendar.appendChild(calendarGrid);
}

function renderEventDetails(date, dayEvents, activeEvent) {
    if (!event_details) return;

    event_calendar.style.display = "none";
    event_details.style.display = "flex";

    event_details.innerHTML = "";

    dayEvents.sort((a, b) => {
        return a.sort_time.localeCompare(b.sort_time);
    });

    let backBtn = document.createElement("div");

    Object.assign(backBtn.style, {
        backgroundColor: "black",
        color: "white",
        width: "120px",
        padding: "6px",
        margin: "12px",
        textAlign: "center",
        cursor: "pointer",
        borderRadius: "7px"
    });

    backBtn.innerHTML = "Back";

    backBtn.addEventListener("click", () => {
        event_details.style.display = "none";
        event_calendar.style.display = "flex";
    });

    event_details.appendChild(backBtn);

    let title = document.createElement("h2");
    title.style.textAlign = "center";
    title.innerHTML = `${activeEvent.title}<br><span style="font-size:18px;">${dayEvents[0].day}, ${date}</span>`;
    event_details.appendChild(title);

    dayEvents.forEach(event => {
        let row = document.createElement("div");

        Object.assign(row.style, {
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            borderBottom: "1px solid black",
            padding: "12px",
            fontSize: "16px"
        });

        row.innerHTML = `
            <div>
                <strong>${event.start_time}</strong><br>
                to ${event.end_time}
            </div>

            <div>
                <h3>${event.title}</h3>
                <p><strong>Lead:</strong> ${event.lead || "N/A"}</p>
                <p><strong>Location:</strong> ${event.location || "N/A"}</p>
                <p>${event.description || ""}</p>
                <p><em>${event.notes || ""}</em></p>
            </div>
        `;

        event_details.appendChild(row);
    });
}

function showEventsView() {
    event_calendar.style.display = "flex";
    event_details.style.display = "none";

    results.style.display = "none";
    group_results.style.display = "none";
    request_cart_box.style.display = "none";

    renderEvents(sim_events);
}

if (events_filter) {
    events_filter.addEventListener("click", showEventsView);
}

function showInventoryView() {
    event_calendar.style.display = "none";
    event_details.style.display = "none";

    results.style.display = "flex";
    request_cart_box.style.display = "flex";
    group_results.style.display = "none";
}

if (sim_group_filter) {
    sim_group_filter.addEventListener("click", () => {

        event_calendar.style.display = "none";

        results.style.display = "none";
        request_cart_box.style.display = "none";
        event_details.style.display = "none";
        group_results.style.display = "flex";

        renderUserGroups();
    });
}

if(event_calendar){
    renderEvents(sim_events);
}