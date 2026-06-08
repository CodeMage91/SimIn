// admin.js
import {
    db,
    collection,
    getDocs,
    getDoc,
    query,
    orderBy,
    updateDoc,
    deleteDoc,
    doc
} from "./firebase_config.js";

let current_user = JSON.parse(sessionStorage.getItem("current_user"));
let logout = document.getElementById("logout");

if (!current_user) {
    window.location.href = "index.html";
}

if (current_user.type !== "admin") {
    window.location.href = "sim_inventory.html";
}

let admin_name = document.getElementById("admin_name");
let request_list = document.getElementById("request_list");

//admin windows
let calendar_window = document.getElementById("calendar_window");
let timeline_window = document.getElementById("timeline_window");
let currentTimelineDate = null;

//admin nav
let show_request = document.getElementById("show_request");
let show_calendar = document.getElementById("show_calendar");

let request_window = document.getElementById("request_window");

let calendarDate = new Date();
let allRequests = [];

//filters
let all_filter = document.getElementById("all_filter");
let pending_filter = document.getElementById("pending_filter");
let approved_filter = document.getElementById("approved_filter");
let denied_filter = document.getElementById("denied_filter");

let currentFilter = "all";

let sim_window = document.getElementById("sim_window");
let group_window = document.getElementById("group_window");
let show_sims = document.getElementById("show_sims");
let show_groups = document.getElementById("show_groups");

let create_sim = document.getElementById("create_sim");

admin_name.innerHTML = `Logged in as ${current_user.userName}`;

renderRequests();

async function renderRequests() {
    request_list.innerHTML = "";

    const q = query(
        collection(db, "inventory_requests"),
        orderBy("created_at", "desc")
    );

    const snapshot = await getDocs(q);
    let requestsToShow = [];
    allRequests = [];

    snapshot.forEach(requestDoc => {
        let req = requestDoc.data();

        let requestObj = {
            data: req,
            id: requestDoc.id
        };

        allRequests.push(requestObj);

        if (currentFilter === "all" || req.status === currentFilter) {
            requestsToShow.push(requestObj);
        }
    });

    if (requestsToShow.length === 0) {
        request_list.innerHTML = `<h3>No ${currentFilter} requests found.</h3>`;
        return;
    }

    if (snapshot.empty) {
        request_list.innerHTML = "<h3>No requests yet.</h3>";
        return;
    }

   requestsToShow.forEach(requestObj => {
    let req = requestObj.data;
    let firebaseId = requestObj.id;

        let card = document.createElement("div");

        Object.assign(card.style, {
            border: "1px solid black",
            borderRadius: "7px",
            padding: "12px",
            marginBottom: "12px"
        });

        let itemList = "";

        req.items.forEach(item => {
            let imageHTML = item.image
                ? `
                    <img
                        src="./images/${item.image}"
                        style="
                            width:80px;
                            height:80px;
                            object-fit:cover;
                            border:1px solid black;
                        "
                    >
                  `
                : `
                    <div style="
                        width:80px;
                        height:80px;
                        border:1px solid black;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:12px;
                        color:#666;
                    ">
                        No Photo
                    </div>
                  `;

            itemList += `
                <li style="margin-bottom:12px;">
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${imageHTML}

                        <div>
                            <strong>${item.productName}</strong><br>
                            Serial: ${item.serialNumber || "N/A"}<br>
                            Line: ${item.productLine || "N/A"}<br>
                            Stored Location: ${item.location || "Not listed"}
                        </div>
                    </div>
                </li>
            `;
        });

        card.innerHTML = `
            <h3>Request</h3>

            <p><strong>From:</strong> ${req.from}</p>

            <p>
                <strong>Submitted:</strong>
                ${req.submitted_date || req.date || "Unknown"}
                at
                ${req.submitted_time || req.time || "Unknown"}
            </p>

            <p>
                <strong>Needed From:</strong>
                ${req.needed_from_date || "Not specified"}
                ${req.needed_from_time || ""}
            </p>

            <p>
                <strong>Needed To:</strong>
                ${req.needed_to_date || "Not specified"}
                ${req.needed_to_time || ""}
            </p>

            <p>
                <strong>Event Location:</strong>
                ${req.event_location || "Not specified"}
            </p>

            <p>
                <strong>Comments:</strong>
                ${req.comments || "None"}
            </p>

            <p><strong>Status:</strong> ${req.status}</p>

            <h4>Requested Items</h4>
            <ul>${itemList}</ul>
        `;

        let approveBtn = document.createElement("button");
        approveBtn.innerHTML = "Approve";
        approveBtn.addEventListener("click", () => {
            updateRequestStatus(firebaseId, "approved");
        });

        let denyBtn = document.createElement("button");
        denyBtn.innerHTML = "Deny";
        denyBtn.style.marginLeft = "8px";
        denyBtn.addEventListener("click", () => {
            updateRequestStatus(firebaseId, "denied");
        });

        card.appendChild(approveBtn);
        card.appendChild(denyBtn);

        if (req.status === "denied") {
            let deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "Delete";
            deleteBtn.style.marginLeft = "8px";
            deleteBtn.style.backgroundColor = "crimson";
            deleteBtn.style.color = "white";
            deleteBtn.style.cursor = "pointer";

            deleteBtn.addEventListener("click", () => {
                showDeleteConfirm(firebaseId, card);
            });

            card.appendChild(deleteBtn);
        }

        request_list.appendChild(card);
    });
}

async function updateRequestStatus(requestId, newStatus) {
    await updateDoc(doc(db, "inventory_requests", requestId), {
        status: newStatus
    });

    renderRequests();
}

let message_notification_icon = document.getElementById("message_notification_icon");

function updateMessageNotification(count) {
    if (!message_notification_icon) return;

    if (count > 0) {
        message_notification_icon.innerHTML = count;
        message_notification_icon.style.display = "flex";
    } else {
        message_notification_icon.innerHTML = "0";
        message_notification_icon.style.display = "none";
    }
}

if (all_filter) {
    all_filter.addEventListener("click", () => {
        currentFilter = "all";
        setActiveFilterButton();
        renderRequests();
    });
}

if (pending_filter) {
    pending_filter.addEventListener("click", () => {
        currentFilter = "pending";
        setActiveFilterButton();
        renderRequests();
    });
}

if (approved_filter) {
    approved_filter.addEventListener("click", () => {
        currentFilter = "approved";
        setActiveFilterButton();
        renderRequests();
    });
}

if (denied_filter) {
    denied_filter.addEventListener("click", () => {
        currentFilter = "denied";
        setActiveFilterButton();
        renderRequests();
    });
}

setActiveFilterButton();

updateMessageNotification(0);

function setActiveFilterButton() {
    let filters = [
        all_filter,
        pending_filter,
        approved_filter,
        denied_filter
    ];

    filters.forEach(btn => {
        if (!btn) return;
        btn.style.backgroundColor = "black";
        btn.style.color = "white";
    });

    let activeBtn = null;

    if (currentFilter === "all") activeBtn = all_filter;
    if (currentFilter === "pending") activeBtn = pending_filter;
    if (currentFilter === "approved") activeBtn = approved_filter;
    if (currentFilter === "denied") activeBtn = denied_filter;

    if (activeBtn) {
        activeBtn.style.backgroundColor = "white";
        activeBtn.style.color = "black";
        activeBtn.style.border = "1px solid black";
    }
}

//delete request
function showDeleteConfirm(requestId, card) {
    let existingConfirm = card.querySelector(".delete-confirm-box");

    if (existingConfirm) {
        existingConfirm.remove();
        return;
    }

    let confirmBox = document.createElement("div");
    confirmBox.className = "delete-confirm-box";

    Object.assign(confirmBox.style, {
        border: "1px solid crimson",
        padding: "8px",
        marginTop: "8px",
        borderRadius: "7px",
        backgroundColor: "#ffecec"
    });

    confirmBox.innerHTML = `
        <strong>Are you sure you want to delete this request?</strong>
    `;

    let yesBtn = document.createElement("button");
    yesBtn.innerHTML = "Yes";
    yesBtn.style.marginLeft = "8px";

    yesBtn.addEventListener("click", () => {
        deleteRequest(requestId);
    });

    let noBtn = document.createElement("button");
    noBtn.innerHTML = "No";
    noBtn.style.marginLeft = "8px";

    noBtn.addEventListener("click", () => {
        confirmBox.remove();
    });

    confirmBox.appendChild(yesBtn);
    confirmBox.appendChild(noBtn);

    card.appendChild(confirmBox);
}

async function deleteRequest(requestId) {
    await deleteDoc(
        doc(db, "inventory_requests", requestId)
    );

    renderRequests();
}

show_calendar.onclick = () => {
    hideAdminWindows();
    calendar_window.style.display = "flex";
    renderCalendar();
};

show_request.onclick = () => {
    hideAdminWindows();
    request_window.style.display = "flex";
};

show_sims.onclick = () => {
    hideAdminWindows();
    sim_window.style.display = "flex";
};

show_groups.onclick = () => {
    hideAdminWindows();
    group_window.style.display = "flex";
    renderAdminGroups();
};

function windowShowHide(clicked_el,win_hide,win_show){

    clicked_el.onclick = ()=>{
        win_hide.style.display = "none";
        win_show.style.display = "flex";
    }; 
}

function renderCalendar() {
    calendar_window.innerHTML = "";

    let year = calendarDate.getFullYear();
    let month = calendarDate.getMonth();

    let monthName = calendarDate.toLocaleString("default", {
        month: "long"
    });

    let firstDay = new Date(year, month, 1).getDay();
    let daysInMonth = new Date(year, month + 1, 0).getDate();

    calendar_window.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <button id="prev_month" style="cursor: pointer;">Previous</button>
            <h2>${monthName} ${year}</h2>
            <button id="next_month" style="cursor: pointer;">Next</button>
        </div>

        <div style="
            display:grid;
            grid-template-columns:repeat(7, 1fr);
            gap:4px;
            margin-top:12px;
        " id="calendar_grid"></div>
    `;

    let calendar_grid = document.getElementById("calendar_grid");

    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
        calendar_grid.innerHTML += `
            <div style="font-weight:bold; text-align:center; border:1px solid black;">
                ${day}
            </div>
        `;
    });

    for (let i = 0; i < firstDay; i++) {
        calendar_grid.innerHTML += `<div></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        let dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        let dayRequests = allRequests.filter(obj => {
            let req = obj.data;

            if (!req.needed_from_date || !req.needed_to_date) {
                return false;
            }

            return isDateInRequestRange(
                dateString,
                req.needed_from_date,
                req.needed_to_date
            );
        });

        let requestHTML = "";

        dayRequests.forEach(obj => {
            let req = obj.data;

            requestHTML += `
                <div style="
                    font-size:12px;
                    margin-top:4px;
                    padding:3px;
                    border-radius:4px;
                    background:black;
                    color:white;
                ">
                    ${req.from} - ${req.status}
                </div>
            `;
        });

        let dayCell = document.createElement("div");

        Object.assign(dayCell.style, {
            minHeight: "100px",
            border: "1px solid black",
            padding: "4px",
            verticalAlign: "top",
            cursor: "pointer"
        });

        dayCell.innerHTML = `
            <strong>${day}</strong>
            ${requestHTML}
        `;

        dayCell.addEventListener("click", () => {
            renderDayTimeline(dateString);
        });

        calendar_grid.appendChild(dayCell);
    }

    document.getElementById("prev_month").onclick = () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    };

    document.getElementById("next_month").onclick = () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    };
}

function renderDayTimeline(dateString) {
    currentTimelineDate = dateString;

    calendar_window.style.display = "none";
    request_window.style.display = "none";
    timeline_window.style.display = "flex";

    let dayRequests = allRequests.filter(obj => {
        let req = obj.data;

        if (!req.needed_from_date || !req.needed_to_date) {
            return false;
        }

        return isDateInRequestRange(
            dateString,
            req.needed_from_date,
            req.needed_to_date
        );
    });

    timeline_window.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <button id="prev_day" style="cursor:pointer;">Previous Day</button>

            <button id="back_to_calendar" style="cursor:pointer;">
                Back to Month
            </button>

            <button id="next_day" style="cursor:pointer;">Next Day</button>
        </div>

        <h2>Timeline for ${dateString}</h2>

        <div id="timeline_grid" style="
            display:grid;
            grid-template-columns:160px repeat(24, 40px);
            overflow-x:auto;
            border:1px solid black;
        "></div>
    `;

    let timeline_grid = document.getElementById("timeline_grid");

    timeline_grid.innerHTML += `
        <div style="border:1px solid black; padding:4px;">
            Request
        </div>
    `;

    for (let h = 0; h < 24; h++) {
        timeline_grid.innerHTML += `
            <div style="border:1px solid black; padding:4px; font-size:12px;">
                ${h}:00
            </div>
        `;
    }

    if (dayRequests.length === 0) {
        timeline_grid.innerHTML += `
            <div style="grid-column:1 / span 25; padding:12px;">
                No requests for this day.
            </div>
        `;
    }

    dayRequests.forEach(obj => {
        let req = obj.data;

        timeline_grid.innerHTML += `
            <div style="border:1px solid black; padding:4px; font-size:12px;">
                <strong>${req.from}</strong><br>
                ${req.status}
            </div>
        `;

        for (let h = 0; h < 24; h++) {
            let isActive = isRequestActiveDuringHour(req, dateString, h);

            timeline_grid.innerHTML += `
                <div style="
                    border:1px solid black;
                    padding:4px;
                    min-height:36px;
                    background:${isActive ? "black" : "white"};
                    color:${isActive ? "white" : "black"};
                    font-size:10px;
                ">
                    ${isActive ? "Booked" : ""}
                </div>
            `;
        }
    });

    document.getElementById("back_to_calendar").onclick = () => {
        timeline_window.style.display = "none";
        calendar_window.style.display = "flex";
        renderCalendar();
    };

    document.getElementById("prev_day").onclick = () => {
        let previousDate = moveDateByDays(currentTimelineDate, -1);
        renderDayTimeline(previousDate);
    };

    document.getElementById("next_day").onclick = () => {
        let nextDate = moveDateByDays(currentTimelineDate, 1);
        renderDayTimeline(nextDate);
    };
}

function isRequestActiveDuringHour(req, dateString, hour) {
    let startDate = req.needed_from_date;
    let endDate = req.needed_to_date;

    let startTime = req.needed_from_time || "00:00";
    let endTime = req.needed_to_time || "23:59";

    let hourStart = new Date(
        `${dateString}T${String(hour).padStart(2, "0")}:00:00`
    );

    let hourEnd = new Date(
        `${dateString}T${String(hour).padStart(2, "0")}:59:59`
    );

    let requestStart = new Date(`${startDate}T${startTime}:00`);
    let requestEnd = new Date(`${endDate}T${endTime}:00`);

    return hourStart <= requestEnd && hourEnd >= requestStart;
}

function isDateInRequestRange(dateString, startDate, endDate) {
    let check = new Date(dateString + "T00:00:00");
    let start = new Date(startDate + "T00:00:00");
    let end = new Date(endDate + "T00:00:00");

    return check >= start && check <= end;
}

function moveDateByDays(dateString, amount) {
    let date = new Date(dateString + "T00:00:00");
    date.setDate(date.getDate() + amount);

    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, "0");
    let day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

if (logout) {
    logout.addEventListener("click", () => {
        sessionStorage.removeItem("current_user");
        window.location.href = "index.html";
    });
}

if (create_sim) {
    create_sim.addEventListener("click", () => {
        window.location.href = "sound_sim.html";
    });
}

function hideAdminWindows() {
    request_window.style.display = "none";
    calendar_window.style.display = "none";
    timeline_window.style.display = "none";
    sim_window.style.display = "none";
    group_window.style.display = "none";
}

async function renderAdminGroups() {
    group_window.innerHTML = "<h2>Sim Groups</h2>";

    let snapshot = await getDocs(
        collection(db, "sim_groups")
    );

    if (snapshot.empty) {
        group_window.innerHTML += "<p>No sim groups found.</p>";
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
            borderRadius: "7px",
            padding: "12px",
            marginBottom: "12px",
            width: "420px"
        });

        card.innerHTML = `
            <h3>${group.group_name}</h3>
            <p><strong>Created By:</strong> ${group.created_by}</p>
            <p><strong>Status:</strong> ${group.status}</p>
            <p><strong>Members:</strong> ${group.members ? group.members.length : 0}</p>

            <ul>${membersHTML}</ul>
        `;

        let joinBtn = document.createElement("button");
        joinBtn.innerHTML = "Join Group";

        joinBtn.addEventListener("click", () => {
            adminJoinGroup(groupId, group);
        });

        let detailsBtn = document.createElement("button");
        detailsBtn.innerHTML = "Group Details";
        detailsBtn.style.marginLeft = "8px";

        detailsBtn.addEventListener("click", () => {
            showGroupDetails(groupId, card);
        });

        let deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "Delete Group";
        deleteBtn.style.marginLeft = "8px";
        deleteBtn.style.backgroundColor = "crimson";
        deleteBtn.style.color = "white";
        deleteBtn.style.cursor = "pointer";

        deleteBtn.addEventListener("click", () => {
            showDeleteGroupConfirm(groupId, card);
        });

        card.appendChild(joinBtn);
        card.appendChild(detailsBtn);
        card.appendChild(deleteBtn);

        group_window.appendChild(card);
    });
}

async function adminJoinGroup(groupId, group) {
    let members = group.members || [];

    let alreadyJoined = members.some(member =>
        member.userName === current_user.userName
    );

    if (!alreadyJoined) {
        members.push({
            user_id: current_user.id,
            userName: current_user.userName,
            role: current_user.type || "admin"
        });

        await updateDoc(
            doc(db, "sim_groups", groupId),
            {
                members: members
            }
        );
    }

    sessionStorage.setItem("active_sim_group_id", groupId);
    sessionStorage.setItem("active_sim_group_name", group.group_name);
    sessionStorage.setItem("sim_view_mode", "admin");

    window.location.href = "sound_sim.html";
}

async function showGroupDetails(groupId, card) {
    let existing = card.querySelector(".group-details-box");

    if (existing) {
        existing.remove();
        return;
    }

    let groupSnap = await getDoc(
        doc(db, "sim_groups", groupId)
    );

    if (!groupSnap.exists()) {
        alert("Group no longer exists.");
        renderAdminGroups();
        return;
    }

    let group = groupSnap.data();

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

    let detailsBox = document.createElement("div");
    detailsBox.className = "group-details-box";

    Object.assign(detailsBox.style, {
        marginTop: "8px",
        padding: "8px",
        border: "1px solid black",
        borderRadius: "7px",
        backgroundColor: "#f5f5f5"
    });

    detailsBox.innerHTML = `
        <p><strong>Group ID:</strong> ${groupId}</p>
        <p><strong>Password:</strong> ${group.password}</p>
        <p><strong>Status:</strong> ${group.status}</p>

        <p><strong>Members:</strong></p>
        <ul>${membersHTML}</ul>
    `;

    card.appendChild(detailsBox);
}

function showDeleteGroupConfirm(groupId, card) {
    let existing = card.querySelector(".delete-group-confirm");

    if (existing) {
        existing.remove();
        return;
    }

    let confirmBox = document.createElement("div");
    confirmBox.className = "delete-group-confirm";

    Object.assign(confirmBox.style, {
        border: "1px solid crimson",
        padding: "8px",
        marginTop: "8px",
        borderRadius: "7px",
        backgroundColor: "#ffecec"
    });

    confirmBox.innerHTML = `
        <strong>Delete this group?</strong>
    `;

    let yesBtn = document.createElement("button");
    yesBtn.innerHTML = "Yes";
    yesBtn.style.marginLeft = "8px";

    yesBtn.addEventListener("click", async () => {
        await deleteDoc(
            doc(db, "sim_groups", groupId)
        );

        renderAdminGroups();
    });

    let noBtn = document.createElement("button");
    noBtn.innerHTML = "No";
    noBtn.style.marginLeft = "8px";

    noBtn.addEventListener("click", () => {
        confirmBox.remove();
    });

    confirmBox.appendChild(yesBtn);
    confirmBox.appendChild(noBtn);

    card.appendChild(confirmBox);
}