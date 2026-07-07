const state = {
  selectedDay: null,
  selectedSession: null,
  selectedSeat: null,
  bookings: [],
  employees: [],
  realtimeChannel: null,
};

const els = {
  fullName: document.getElementById("fullName"),
  daysGrid: document.getElementById("daysGrid"),
  sessionsGrid: document.getElementById("sessionsGrid"),
  seatSection: document.getElementById("seatSection"),
  seatMap: document.getElementById("seatMap"),
  bookingSummary: document.getElementById("bookingSummary"),
  bookBtn: document.getElementById("bookBtn"),
  toast: document.getElementById("toast"),
};

function init() {
  createEmployeeList();
  renderDays();
  renderSessions();
  renderSeats();
  bindEvents();
  loadEmployees();
  loadBookings();
  subscribeRealtime();
}

function createEmployeeList() {
  const list = document.createElement("datalist");
  list.id = "employeesList";
  document.body.appendChild(list);
  els.fullName.setAttribute("list", "employeesList");
  els.fullName.placeholder = "Սկսեք գրել անունը...";
}

function bindEvents() {
  els.fullName.addEventListener("input", updateSummary);
  els.bookBtn.addEventListener("click", bookSelectedSeat);
}

function showToast(message, type = "info") {
  els.toast.textContent = message;
  els.toast.dataset.type = type;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

async function loadEmployees() {
  const { data, error } = await db
    .from("employees")
    .select("full_name")
    .order("full_name", { ascending: true });

  if (error) {
    console.error(error);
    showToast("Չհաջողվեց բեռնել աշխատակիցների ցանկը։", "error");
    return;
  }

  state.employees = data || [];

  const list = document.getElementById("employeesList");
  list.innerHTML = state.employees
    .map(emp => `<option value="${emp.full_name}"></option>`)
    .join("");
}

function isValidEmployee(name) {
  return state.employees.some(emp => emp.full_name === name);
}

function isAlreadyBooked(name) {
  return state.bookings.some(item => item.full_name === name);
}

function getSessionsForSelectedDay() {
  if (!state.selectedDay) return [];
  return TRAINING_SESSIONS[state.selectedDay] || [];
}

function renderDays() {
  els.daysGrid.innerHTML = TRAINING_DAYS.map(day => `
    <button class="choice-card" data-day="${day.value}" type="button">
      <strong>${day.label}</strong>
      <span>${day.dayName}</span>
    </button>
  `).join("");

  els.daysGrid.querySelectorAll("[data-day]").forEach(card => {
    card.addEventListener("click", () => {
      state.selectedDay = card.dataset.day;
      state.selectedSession = null;
      state.selectedSeat = null;
      renderDays();
      renderSessions();
      renderSeats();
      updateSummary();
      document.getElementById("sessionSection").scrollIntoView({ block: "nearest" });
    });
  });

  if (state.selectedDay) {
    const active = els.daysGrid.querySelector(`[data-day="${state.selectedDay}"]`);
    if (active) active.classList.add("active");
  }
}

function renderSessions() {
  const sessions = getSessionsForSelectedDay();

  els.sessionsGrid.innerHTML = sessions.map(session => {
    const count = getFreeSeatsCount(state.selectedDay, session.value);

    return `
      <button class="choice-card" data-session="${session.value}" type="button">
        <strong>${session.label}</strong>
        <span>Սեսիա</span>
        <div class="free-count">${count} ազատ տեղ</div>
      </button>
    `;
  }).join("");

  els.sessionsGrid.querySelectorAll("[data-session]").forEach(card => {
    card.addEventListener("click", () => {
      if (!state.selectedDay) {
        showToast("Նախ ընտրեք դասընթացի օրը։");
        return;
      }

      state.selectedSession = card.dataset.session;
      state.selectedSeat = null;
      renderSessions();
      renderSeats();
      updateSummary();
      els.seatSection.classList.remove("hidden");
      els.seatSection.scrollIntoView({ block: "start" });
    });
  });

  if (state.selectedSession) {
    const active = els.sessionsGrid.querySelector(`[data-session="${state.selectedSession}"]`);
    if (active) active.classList.add("active");
  }
}

function renderSeats() {
  els.seatMap.querySelectorAll(".seat-wrap").forEach(node => node.remove());

  const centerX = 50;
  const centerY = 50;
  const radiusX = window.innerWidth < 520 ? 42 : 42;
  const radiusY = window.innerWidth < 520 ? 38 : 39;

  for (let i = 1; i <= TOTAL_SEATS; i++) {
    const angle = -90 + ((i - 1) * 360 / TOTAL_SEATS);
    const rad = angle * Math.PI / 180;
    const x = centerX + radiusX * Math.cos(rad);
    const y = centerY + radiusY * Math.sin(rad);
    const booking = findBooking(i);

    const wrap = document.createElement("div");
    wrap.className = "seat-wrap";
    wrap.style.left = `${x}%`;
    wrap.style.top = `${y}%`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "seat";
    btn.dataset.seat = String(i);
    btn.style.transform = `rotate(${angle + 90}deg)`;
    btn.innerHTML = `<span class="arm left"></span><span class="arm right"></span><span class="num">${i}</span>`;

    if (booking) {
      btn.classList.add("booked");
      btn.disabled = true;
      btn.setAttribute("aria-label", `Աթոռ ${i}, զբաղված, ${booking.full_name}`);

      const name = document.createElement("div");
      name.className = "booked-name";
      name.textContent = booking.full_name;

      wrap.append(btn, name);
    } else {
      btn.setAttribute("aria-label", `Աթոռ ${i}, ազատ`);
      if (state.selectedSeat === i) btn.classList.add("selected");
      btn.addEventListener("click", () => selectSeat(i));
      wrap.append(btn);
    }

    els.seatMap.appendChild(wrap);
  }
}

function selectSeat(seatNumber) {
  if (!state.selectedDay || !state.selectedSession) {
    showToast("Նախ ընտրեք օրը և սեսիան։");
    return;
  }

  if (findBooking(seatNumber)) {
    showToast("Այս աթոռն արդեն զբաղված է։", "error");
    return;
  }

  state.selectedSeat = seatNumber;
  renderSeats();
  updateSummary();
}

function findBooking(seatNumber) {
  if (!state.selectedDay || !state.selectedSession) return null;

  return state.bookings.find(item =>
    item.training_day === state.selectedDay &&
    item.session_time === state.selectedSession &&
    Number(item.seat_number) === Number(seatNumber)
  );
}

function getFreeSeatsCount(day, session) {
  if (!day) return TOTAL_SEATS;

  const used = state.bookings.filter(item =>
    item.training_day === day &&
    item.session_time === session
  ).length;

  return Math.max(TOTAL_SEATS - used, 0);
}

function updateSummary() {
  const day = TRAINING_DAYS.find(d => d.value === state.selectedDay)?.label;
  const session = getSessionsForSelectedDay().find(s => s.value === state.selectedSession)?.label;
  const name = els.fullName.value.trim();
  const seat = state.selectedSeat ? `Աթոռ ${state.selectedSeat}` : null;

  const parts = [name, day, session, seat].filter(Boolean);
  els.bookingSummary.textContent = parts.length
    ? parts.join(" · ")
    : "Օրը, սեսիան և աթոռը դեռ ընտրված չեն։";

  els.bookBtn.disabled = !(
    name.length >= 2 &&
    isValidEmployee(name) &&
    !isAlreadyBooked(name) &&
    state.selectedDay &&
    state.selectedSession &&
    state.selectedSeat
  );
}

async function loadBookings() {
  const { data, error } = await db
    .from("training_bookings")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    showToast("Չհաջողվեց բեռնել ամրագրումները։", "error");
    return;
  }

  state.bookings = data || [];
  renderSessions();
  renderSeats();
  updateSummary();
}

async function bookSelectedSeat() {
  const name = els.fullName.value.trim();

  if (!isValidEmployee(name)) {
    showToast("Խնդրում ենք ընտրել անունը աշխատակիցների ցանկից։", "error");
    return;
  }

  if (isAlreadyBooked(name)) {
    showToast("Այս աշխատակիցն արդեն գրանցված է։", "error");
    return;
  }

  const payload = {
    full_name: name,
    department: "",
    training_day: state.selectedDay,
    session_time: state.selectedSession,
    seat_number: state.selectedSeat,
  };

  if (!payload.training_day || !payload.session_time || !payload.seat_number) {
    showToast("Ընտրեք օրը, սեսիան և ազատ աթոռը։", "error");
    return;
  }

  els.bookBtn.disabled = true;

  const { error } = await db.from("training_bookings").insert(payload);

  if (error) {
    const duplicate = error.code === "23505" || String(error.message).includes("duplicate");

    showToast(
      duplicate
        ? "Այս աշխատակիցը կամ աթոռը արդեն գրանցված է։"
        : "Ամրագրումը չհաջողվեց։",
      "error"
    );

    await loadBookings();
    return;
  }

  showToast("Ամրագրումը հաջողությամբ պահպանվեց։", "success");
  state.selectedSeat = null;
  await loadBookings();
}

function subscribeRealtime() {
  state.realtimeChannel = db.channel("training-bookings-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "training_bookings" }, async () => {
      await loadBookings();

      if (state.selectedSeat && findBooking(state.selectedSeat)) {
        state.selectedSeat = null;
        showToast("Ձեր ընտրած աթոռը զբաղեցվեց մեկ ուրիշի կողմից։", "error");
      }

      updateSummary();
    })
    .subscribe();
}

window.addEventListener("resize", () => renderSeats());

init();