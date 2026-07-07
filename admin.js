const adminState = {
  bookings: [],
  filtered: [],
  channel: null,
};

const adminEls = {
  tbody: document.getElementById("bookingsTbody"),
  empty: document.getElementById("emptyState"),
  totalCount: document.getElementById("totalCount"),
  filteredCount: document.getElementById("filteredCount"),
  freeCount: document.getElementById("freeCount"),
  nameSearch: document.getElementById("nameSearch"),
  departmentSearch: document.getElementById("departmentSearch"),
  dayFilter: document.getElementById("dayFilter"),
  sessionFilter: document.getElementById("sessionFilter"),
  resetBtn: document.getElementById("resetBtn"),
  exportBtn: document.getElementById("exportBtn"),
  toast: document.getElementById("toast"),
  editDialog: document.getElementById("editDialog"),
  editId: document.getElementById("editId"),
  editFullName: document.getElementById("editFullName"),
  editDay: document.getElementById("editDay"),
  editSession: document.getElementById("editSession"),
  editSeat: document.getElementById("editSeat"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
};

function getAllTrainingSessions() {
  const all = Object.values(TRAINING_SESSIONS).flat();
  return [...new Map(all.map(item => [item.value, item])).values()];
}

function getTotalCapacity() {
  return Object.values(TRAINING_SESSIONS).flat().length * TOTAL_SEATS;
}
function getSessionsForDay(dayValue) {
  return TRAINING_SESSIONS[dayValue] || [];
}

function populateEditSessions(dayValue, selectedSession = "") {
  const sessions = getSessionsForDay(dayValue);
  adminEls.editSession.innerHTML = "";

  sessions.forEach(session => {
    adminEls.editSession.insertAdjacentHTML(
      "beforeend",
      `<option value="${session.value}">${session.label}</option>`
    );
  });

  if (selectedSession) {
    adminEls.editSession.value = selectedSession;
  }
}
function initAdmin() {
  populateFilters();
  bindAdminEvents();
  loadAdminBookings();
  subscribeAdminRealtime();
}

function populateFilters() {
  TRAINING_DAYS.forEach(day => {
    adminEls.dayFilter.insertAdjacentHTML("beforeend", `<option value="${day.value}">${day.label}</option>`);
    adminEls.editDay.insertAdjacentHTML("beforeend", `<option value="${day.value}">${day.label}</option>`);
  });

  getAllTrainingSessions().forEach(session => {
    adminEls.sessionFilter.insertAdjacentHTML("beforeend", `<option value="${session.value}">${session.label}</option>`);
  });
} 

function bindAdminEvents() {
  [adminEls.nameSearch, adminEls.departmentSearch, adminEls.dayFilter, adminEls.sessionFilter].forEach(el => {
    if (!el) return;
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  adminEls.resetBtn.addEventListener("click", resetFilters);
  adminEls.exportBtn.addEventListener("click", exportCsvForExcel);
  adminEls.cancelEditBtn.addEventListener("click", () => adminEls.editDialog.close());
  adminEls.editDialog.querySelector("form").addEventListener("submit", saveEdit);

  adminEls.editDay.addEventListener("change", () => {
    populateEditSessions(adminEls.editDay.value);
  });
}

function showAdminToast(message) {
  adminEls.toast.textContent = message;
  adminEls.toast.classList.add("show");
  clearTimeout(showAdminToast.timer);
  showAdminToast.timer = setTimeout(() => adminEls.toast.classList.remove("show"), 2800);
}

async function loadAdminBookings() {
  const { data, error } = await db
    .from("training_bookings")
    .select("*")
    .order("training_day", { ascending: true })
    .order("session_time", { ascending: true })
    .order("seat_number", { ascending: true });

  if (error) {
    console.error(error);
    showAdminToast("Չհաջողվեց բեռնել տվյալները։");
    return;
  }

  adminState.bookings = data || [];
  applyFilters();
}

function applyFilters() {
  const nameQ = adminEls.nameSearch.value.trim().toLowerCase();
  const departmentQ = adminEls.departmentSearch ? adminEls.departmentSearch.value.trim().toLowerCase() : "";
  const day = adminEls.dayFilter.value;
  const session = adminEls.sessionFilter.value;

  adminState.filtered = adminState.bookings.filter(item => {
    const byName = !nameQ || item.full_name.toLowerCase().includes(nameQ);
    const byDepartment = !departmentQ || String(item.department || "").toLowerCase().includes(departmentQ);
    const byDay = !day || item.training_day === day;
    const bySession = !session || item.session_time === session;
    return byName && byDepartment && byDay && bySession;
  });

  renderAdminTable();
  renderStats();
}

function renderStats() {
  adminEls.totalCount.textContent = adminState.bookings.length;
  adminEls.filteredCount.textContent = adminState.filtered.length;
  adminEls.freeCount.textContent = getTotalCapacity() - adminState.bookings.length;
}

function renderAdminTable() {
  adminEls.empty.classList.toggle("hidden", adminState.filtered.length > 0);

  adminEls.tbody.innerHTML = adminState.filtered.map(item => `
    <tr>
      <td>${escapeHtml(item.full_name)}</td>
      <td>${escapeHtml(item.department || "")}</td>
      <td>${formatDay(item.training_day)}</td>
      <td>${formatSession(item.session_time)}</td>
      <td>${item.seat_number}</td>
      <td>${formatDateTime(item.created_at)}</td>
      <td>
        <div class="actions">
          <button class="blue-btn" type="button" data-action="edit" data-id="${item.id}">Խմբագրել</button>
          <button class="ghost-btn" type="button" data-action="free" data-id="${item.id}">Ազատել աթոռը</button>
          <button class="danger-btn" type="button" data-action="delete" data-id="${item.id}">Ջնջել</button>
        </div>
      </td>
    </tr>
  `).join("");

  adminEls.tbody.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => handleRowAction(btn.dataset.action, btn.dataset.id));
  });
}

function handleRowAction(action, id) {
  const booking = adminState.bookings.find(item => item.id === id);
  if (!booking) return;

  if (action === "edit") openEditDialog(booking);
  if (action === "free" || action === "delete") {
    deleteBooking(id, action === "free" ? "Աթոռը ազատվեց։" : "Ամրագրումը ջնջվեց։");
  }
}

function openEditDialog(booking) {
adminEls.editId.value = booking.id;
adminEls.editFullName.value = booking.full_name;
adminEls.editDay.value = booking.training_day;

populateEditSessions(
  booking.training_day,
  booking.session_time
);

adminEls.editSeat.value = booking.seat_number;
adminEls.editDialog.showModal();

}

async function saveEdit(event) {
  event.preventDefault();

  const id = adminEls.editId.value;

  const payload = {
    full_name: adminEls.editFullName.value.trim(),
    department: "",
    training_day: adminEls.editDay.value,
    session_time: adminEls.editSession.value,
    seat_number: Number(adminEls.editSeat.value),
  };

  const { error } = await db.from("training_bookings").update(payload).eq("id", id);

  if (error) {
    const duplicate = error.code === "23505" || String(error.message).includes("duplicate");
    showAdminToast(duplicate ? "Այդ աշխատակիցը կամ աթոռն արդեն զբաղված է։" : "Չհաջողվեց պահպանել։");
    return;
  }

  adminEls.editDialog.close();
  showAdminToast("Փոփոխությունները պահպանվեցին։");
  await loadAdminBookings();
}

async function deleteBooking(id, successMessage) {
  const { error } = await db.from("training_bookings").delete().eq("id", id);

  if (error) {
    console.error(error);
    showAdminToast("Չհաջողվեց կատարել գործողությունը։");
    return;
  }

  showAdminToast(successMessage);
  await loadAdminBookings();
}

function resetFilters() {
  adminEls.nameSearch.value = "";
  if (adminEls.departmentSearch) adminEls.departmentSearch.value = "";
  adminEls.dayFilter.value = "";
  adminEls.sessionFilter.value = "";
  applyFilters();
}

async function exportCsvForExcel() {
  const { data: employees, error } = await db
    .from("employees")
    .select("full_name")
    .order("full_name", { ascending: true });

  if (error) {
    console.error(error);
    showAdminToast("Չհաջողվեց բեռնել աշխատակիցների ցանկը։");
    return;
  }

  const bookingByName = new Map(adminState.bookings.map(item => [item.full_name, item]));

  const headers = ["Անուն ազգանուն", "Գրանցվել է", "Օր", "Սեսիա", "Աթոռ", "Ամսաթիվ"];

  const rows = (employees || []).map(emp => {
    const booking = bookingByName.get(emp.full_name);

    return [
      emp.full_name,
      booking ? "Այո" : "Ոչ",
      booking ? formatDay(booking.training_day) : "",
      booking ? formatSession(booking.session_time) : "",
      booking ? booking.seat_number : "",
      booking ? formatDateTime(booking.created_at) : "",
    ];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `training-attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function subscribeAdminRealtime() {
  adminState.channel = db.channel("admin-training-bookings-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "training_bookings" }, loadAdminBookings)
    .subscribe();
}

function formatDay(value) {
  return TRAINING_DAYS.find(day => day.value === value)?.label || value;
}

function formatSession(value) {
  return getAllTrainingSessions().find(session => session.value === value)?.label || value;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("hy-AM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;",
  }[char]));
}

initAdmin();