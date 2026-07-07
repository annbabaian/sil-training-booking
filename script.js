const state = {
  selectedDay: null,
  selectedSession: null,
  selectedSeat: null,
  bookings: [],
  realtimeChannel: null,
};

const els = {
  fullName: document.getElementById("fullName"),
  department: document.getElementById("department"),
  daysGrid: document.getElementById("daysGrid"),
  sessionsGrid: document.getElementById("sessionsGrid"),
  seatSection: document.getElementById("seatSection"),
  seatMap: document.getElementById("seatMap"),
  bookingSummary: document.getElementById("bookingSummary"),
  bookBtn: document.getElementById("bookBtn"),
  toast: document.getElementById("toast"),
};

function init() {
  renderDays();
  renderSessions();
  renderSeats();
  bindEvents();
  loadBookings();
  subscribeRealtime();
}

function bindEvents() {
  els.fullName.addEventListener("input", updateSummary);
  els.department.addEventListener("input", updateSummary);
  els.bookBtn.addEventListener("click", bookSelectedSeat);
}

function showToast(message, type = "info") {
  els.toast.textContent = message;
  els.toast.dataset.type = type;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
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
  els.sessionsGrid.innerHTML = TRAINING_SESSIONS.map(session => {
    const count = getFreeSeatsCount(state.selectedDay, session.value);
    return `
      <button class="choice-card" data-session="${session.value}" type="button" ${!state.selectedDay ? "disabled" : ""}>
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
  const radiusX = window.innerWidth < 520 ? 42 : window.innerWidth < 900 ? 43 : 42;
  const radiusY = window.innerWidth < 520 ? 38 : window.innerWidth < 900 ? 38 : 39;

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
    btn.setAttribute("aria-label", booking ? `Աթոռ ${i}, զբաղված, ${booking.full_name}` : `Աթոռ ${i}, ազատ`);
    btn.dataset.seat = String(i);
    btn.style.transform = `rotate(${angle + 90}deg)`;
    btn.innerHTML = `<span class="arm left"></span><span class="arm right"></span><span class="num">${i}</span>`;

    if (booking) {
      btn.classList.add("booked");
      btn.disabled = true;
      const name = document.createElement("div");
      name.className = "booked-name";
      name.textContent = booking.full_name;
      wrap.append(btn, name);
    } else {
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
  const used = state.bookings.filter(item => item.training_day === day && item.session_time === session).length;
  return Math.max(TOTAL_SEATS - used, 0);
}

function updateSummary() {
  const day = TRAINING_DAYS.find(d => d.value === state.selectedDay)?.label;
  const session = TRAINING_SESSIONS.find(s => s.value === state.selectedSession)?.label;
  const name = els.fullName.value.trim();
  const department = els.department.value.trim();
  const seat = state.selectedSeat ? `Աթոռ ${state.selectedSeat}` : null;
  const parts = [name, department, day, session, seat].filter(Boolean);
  els.bookingSummary.textContent = parts.length ? parts.join(" · ") : "Օրը, սեսիան և աթոռը դեռ ընտրված չեն։";
  els.bookBtn.disabled = !(name.length >= 2 && department.length >= 2 && state.selectedDay && state.selectedSession && state.selectedSeat);
}

async function loadBookings() {
  const { data, error } = await db
    .from("training_bookings")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    showToast("Չհաջողվեց բեռնել ամրագրումները։ Ստուգեք Supabase կարգավորումները։", "error");
    return;
  }
  state.bookings = data || [];
  renderSessions();
  renderSeats();
}

async function bookSelectedSeat() {
  const payload = {
    full_name: els.fullName.value.trim(),
    department: els.department.value.trim(),
    training_day: state.selectedDay,
    session_time: state.selectedSession,
    seat_number: state.selectedSeat,
  };

  if (!payload.full_name || !payload.department || !payload.training_day || !payload.session_time || !payload.seat_number) {
    showToast("Լրացրեք բոլոր դաշտերը և ընտրեք ազատ աթոռ։", "error");
    return;
  }

  els.bookBtn.disabled = true;
  const { error } = await db.from("training_bookings").insert(payload);

  if (error) {
    const duplicate = error.code === "23505" || String(error.message).includes("duplicate");
    showToast(duplicate ? "Այս աթոռը քիչ առաջ արդեն զբաղեցվեց։ Ընտրեք ուրիշ աթոռ։" : "Ամրագրումը չհաջողվեց։", "error");
    await loadBookings();
    updateSummary();
    return;
  }

  showToast("Ամրագրումը հաջողությամբ պահպանվեց։", "success");
  state.selectedSeat = null;
  await loadBookings();
  updateSummary();
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
