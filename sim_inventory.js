// sim_inventory.js
import {
    db,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from "./firebase_config.js";

// Calendar state
let currentView = "week"; // "week" or "month"
let currentDate = new Date();
let userEvents = []; 

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

// Calendar controls
let calendar_controls = document.getElementById("calendar_controls");
let prev_btn = document.getElementById("prev_btn");
let next_btn = document.getElementById("next_btn");
let today_btn = document.getElementById("today_btn");
let calendar_header = document.getElementById("calendar_header");
let week_view_btn = document.getElementById("week_view_btn");
let month_view_btn = document.getElementById("month_view_btn");

let request_cart = [];

results.style.display = "none";
request_cart_box.style.display = "none";
group_results.style.display = "none";
event_calendar.style.display = "flex";

if (results) {
    renderResults(window.sim_inventory || []);
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
    let inventory = window.sim_inventory || [];

    let filtered = inventory.filter(item =>
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

// Fetch user events from Firebase and merge with hard-coded events
async function fetchUserEvents() {
    userEvents = [];

    // Add hard-coded events from sim_events (events.js) - access via window for ES modules
    let hardcodedEvents = window.sim_events || [];

    if (Array.isArray(hardcodedEvents) && hardcodedEvents.length > 0) {
        hardcodedEvents.forEach(event => {
            userEvents.push({
                id: `hardcoded_${event.id}`,
                title: event.title,
                date: event.date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                description: event.description,
                lead: event.lead,
                category: event.category,
                notes: event.notes,
                source: "hardcoded"
            });
        });
    }

    // Also fetch from Firebase
    try {
        let snapshot = await getDocs(
            query(collection(db, "user_events"), orderBy("date"))
        );

        snapshot.forEach(docSnap => {
            let event = docSnap.data();
            event.id = docSnap.id;
            event.source = "firebase";

            // Check if event is assigned to current user or their groups
            let isAssigned = false;

            if (event.assigned_users && event.assigned_users.includes(current_user.id)) {
                isAssigned = true;
            }

            if (event.assigned_to_all) {
                isAssigned = true;
            }

            if (isAssigned) {
                userEvents.push(event);
            }
        });
    } catch (error) {
        console.error("Error fetching Firebase events:", error);
    }

    return userEvents;
}

// Get week start date (Sunday)
function getWeekStart(date) {
    let d = new Date(date);
    let day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get month name
function getMonthName(monthIndex) {
    const months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    return months[monthIndex];
}

// Get day name
function getDayName(dayIndex) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayIndex];
}

// Update calendar header
function updateCalendarHeader() {
    if (!calendar_header) return;

    if (currentView === "week") {
        let weekStart = getWeekStart(currentDate);
        let weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        let startMonth = getMonthName(weekStart.getMonth());
        let endMonth = getMonthName(weekEnd.getMonth());

        if (startMonth === endMonth) {
            calendar_header.innerHTML = `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        } else {
            calendar_header.innerHTML = `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
        }
    } else {
        calendar_header.innerHTML = `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;
    }
}

// Render week view
function renderWeekView() {
    if (!event_calendar) return;

    event_calendar.innerHTML = "";
    updateCalendarHeader();

    // Update button styles
    if (week_view_btn) week_view_btn.style.backgroundColor = "#222";
    if (month_view_btn) month_view_btn.style.backgroundColor = "#555";

    let weekStart = getWeekStart(currentDate);

    // Create day headers
    let headerRow = document.createElement("div");
    Object.assign(headerRow.style, {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: "2px solid #222",
        backgroundColor: "#222",
        color: "white"
    });

    for (let i = 0; i < 7; i++) {
        let dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + i);

        let header = document.createElement("div");
        Object.assign(header.style, {
            padding: "12px",
            textAlign: "center",
            fontWeight: "bold"
        });

        let isToday = formatDate(dayDate) === formatDate(new Date());
        if (isToday) {
            header.style.backgroundColor = "#444";
        }

        header.innerHTML = `${getDayName(i)}<br>${dayDate.getDate()}`;
        headerRow.appendChild(header);
    }

    event_calendar.appendChild(headerRow);

    // Create day columns
    let bodyRow = document.createElement("div");
    Object.assign(bodyRow.style, {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        flexGrow: "1",
        minHeight: "700px"
    });

    for (let i = 0; i < 7; i++) {
        let dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + i);
        let dateStr = formatDate(dayDate);

        let dayColumn = document.createElement("div");
        Object.assign(dayColumn.style, {
            borderRight: i < 6 ? "1px solid #ccc" : "none",
            padding: "8px",
            minHeight: "100%",
            backgroundColor: formatDate(dayDate) === formatDate(new Date()) ? "#f0f8ff" : "white"
        });

        // Find events for this day
        let dayEvents = userEvents.filter(e => e.date === dateStr);

        dayEvents.sort((a, b) => {
            return (a.start_time || "00:00").localeCompare(b.start_time || "00:00");
        });

        dayEvents.forEach(event => {
            let eventCard = document.createElement("div");
            Object.assign(eventCard.style, {
                backgroundColor: event.source === "hardcoded" ? "#34a853" : "#4285f4",
                color: "white",
                padding: "6px 8px",
                marginBottom: "4px",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer"
            });

            let leadText = event.lead ? `<br><span style="font-size:10px;">Lead: ${event.lead}</span>` : "";

            eventCard.innerHTML = `
                <strong>${event.title}</strong><br>
                <span>${event.start_time || ""} - ${event.end_time || ""}</span>
                ${leadText}
            `;

            eventCard.addEventListener("click", () => {
                showEventDetail(event);
            });

            dayColumn.appendChild(eventCard);
        });

        bodyRow.appendChild(dayColumn);
    }

    event_calendar.appendChild(bodyRow);
}

// Render month view
function renderMonthView() {
    if (!event_calendar) return;

    event_calendar.innerHTML = "";
    updateCalendarHeader();

    // Update button styles
    if (week_view_btn) week_view_btn.style.backgroundColor = "#555";
    if (month_view_btn) month_view_btn.style.backgroundColor = "#222";

    let year = currentDate.getFullYear();
    let month = currentDate.getMonth();

    let firstDay = new Date(year, month, 1);
    let lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay();
    let totalDays = lastDay.getDate();

    // Create day headers
    let headerRow = document.createElement("div");
    Object.assign(headerRow.style, {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: "2px solid #222",
        backgroundColor: "#222",
        color: "white"
    });

    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
        let header = document.createElement("div");
        Object.assign(header.style, {
            padding: "12px",
            textAlign: "center",
            fontWeight: "bold"
        });
        header.innerHTML = day;
        headerRow.appendChild(header);
    });

    event_calendar.appendChild(headerRow);

    // Create calendar grid
    let calendarGrid = document.createElement("div");
    Object.assign(calendarGrid.style, {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        flexGrow: "1"
    });

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
        let emptyCell = document.createElement("div");
        Object.assign(emptyCell.style, {
            borderRight: "1px solid #eee",
            borderBottom: "1px solid #eee",
            backgroundColor: "#f9f9f9",
            minHeight: "120px"
        });
        calendarGrid.appendChild(emptyCell);
    }

    // Add day cells
    for (let day = 1; day <= totalDays; day++) {
        let cellDate = new Date(year, month, day);
        let dateStr = formatDate(cellDate);

        let dayCell = document.createElement("div");
        let isToday = formatDate(cellDate) === formatDate(new Date());

        Object.assign(dayCell.style, {
            borderRight: "1px solid #eee",
            borderBottom: "1px solid #eee",
            padding: "4px",
            minHeight: "120px",
            backgroundColor: isToday ? "#f0f8ff" : "white",
            cursor: "pointer"
        });

        // Day number
        let dayNum = document.createElement("div");
        Object.assign(dayNum.style, {
            fontWeight: isToday ? "bold" : "normal",
            color: isToday ? "#4285f4" : "#333",
            marginBottom: "4px"
        });
        dayNum.innerHTML = day;
        dayCell.appendChild(dayNum);

        // Find events for this day
        let dayEvents = userEvents.filter(e => e.date === dateStr);

        dayEvents.slice(0, 3).forEach(event => {
            let eventPill = document.createElement("div");
            Object.assign(eventPill.style, {
                backgroundColor: event.source === "hardcoded" ? "#34a853" : "#4285f4",
                color: "white",
                padding: "2px 6px",
                marginBottom: "2px",
                borderRadius: "3px",
                fontSize: "11px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
            });
            eventPill.innerHTML = event.title;
            eventPill.addEventListener("click", (e) => {
                e.stopPropagation();
                showEventDetail(event);
            });
            dayCell.appendChild(eventPill);
        });

        if (dayEvents.length > 3) {
            let more = document.createElement("div");
            more.style.fontSize = "11px";
            more.style.color = "#666";
            more.innerHTML = `+${dayEvents.length - 3} more`;
            dayCell.appendChild(more);
        }

        // Click day to switch to week view for that day
        dayCell.addEventListener("click", () => {
            currentDate = cellDate;
            currentView = "week";
            renderWeekView();
        });

        calendarGrid.appendChild(dayCell);
    }

    event_calendar.appendChild(calendarGrid);
}

// Show event detail popup
function showEventDetail(event) {
    event_calendar.style.display = "none";
    if (calendar_controls) calendar_controls.style.display = "none";
    event_details.style.display = "flex";

    event_details.innerHTML = "";

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
        if (calendar_controls) calendar_controls.style.display = "flex";
    });
    event_details.appendChild(backBtn);

    let detail = document.createElement("div");
    Object.assign(detail.style, {
        padding: "20px",
        maxWidth: "600px"
    });

    let leadHTML = event.lead ? `<p><strong>Lead:</strong> ${event.lead}</p>` : "";
    let categoryHTML = event.category ? `<p><strong>Category:</strong> ${event.category}</p>` : "";
    let notesHTML = event.notes ? `<p><strong>Notes:</strong> <em>${event.notes}</em></p>` : "";

    detail.innerHTML = `
        <h2 style="margin-top:0;">${event.title}</h2>
        <p><strong>Date:</strong> ${event.date}</p>
        <p><strong>Time:</strong> ${event.start_time || "N/A"} - ${event.end_time || "N/A"}</p>
        <p><strong>Location:</strong> ${event.location || "N/A"}</p>
        ${leadHTML}
        ${categoryHTML}
        <p><strong>Description:</strong> ${event.description || "No description"}</p>
        ${notesHTML}
    `;

    event_details.appendChild(detail);
}

// Navigate to previous week/month
function navigatePrev() {
    if (currentView === "week") {
        currentDate.setDate(currentDate.getDate() - 7);
        renderWeekView();
    } else {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderMonthView();
    }
}

// Navigate to next week/month
function navigateNext() {
    if (currentView === "week") {
        currentDate.setDate(currentDate.getDate() + 7);
        renderWeekView();
    } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderMonthView();
    }
}

// Go to today
function goToToday() {
    currentDate = new Date();
    if (currentView === "week") {
        renderWeekView();
    } else {
        renderMonthView();
    }
}

// Render calendar based on current view
async function renderCalendar() {
    await fetchUserEvents();

    if (currentView === "week") {
        renderWeekView();
    } else {
        renderMonthView();
    }
}

// Legacy function for compatibility - no longer uses hard-coded events
function renderEvents(eventsList) {
    renderCalendar();
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
    if (calendar_controls) calendar_controls.style.display = "flex";

    results.style.display = "none";
    group_results.style.display = "none";
    request_cart_box.style.display = "none";

    renderCalendar();
}

if (events_filter) {
    events_filter.addEventListener("click", showEventsView);
}

// Calendar control event listeners
if (prev_btn) {
    prev_btn.addEventListener("click", navigatePrev);
}

if (next_btn) {
    next_btn.addEventListener("click", navigateNext);
}

if (today_btn) {
    today_btn.addEventListener("click", goToToday);
}

if (week_view_btn) {
    week_view_btn.addEventListener("click", () => {
        currentView = "week";
        renderWeekView();
    });
}

if (month_view_btn) {
    month_view_btn.addEventListener("click", () => {
        currentView = "month";
        renderMonthView();
    });
}

function showInventoryView() {
    event_calendar.style.display = "none";
    event_details.style.display = "none";
    if (calendar_controls) calendar_controls.style.display = "none";

    results.style.display = "flex";
    request_cart_box.style.display = "flex";
    group_results.style.display = "none";
}

if (sim_group_filter) {
    sim_group_filter.addEventListener("click", () => {

        event_calendar.style.display = "none";
        if (calendar_controls) calendar_controls.style.display = "none";

        results.style.display = "none";
        request_cart_box.style.display = "none";
        event_details.style.display = "none";
        group_results.style.display = "flex";

        renderUserGroups();
    });
}

if(event_calendar){
    renderCalendar();
}
