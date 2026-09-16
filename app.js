// ============================================================
// UPSC Mains Answer Tracker — app logic
// ============================================================

const SUBJECTS = [
  { id: "history", name: "History" },
  { id: "geography", name: "Geography" },
  { id: "polity", name: "Polity" },
  { id: "science_tech", name: "Science & Technology" },
  { id: "environment", name: "Environment" },
  { id: "economy", name: "Economy" },
  { id: "ir", name: "International Relations (IR)" },
  { id: "social_justice", name: "Social Justice" },
  { id: "ethics", name: "Ethics" },
  { id: "essay", name: "Essay" },
  { id: "world_history", name: "World History" },
  { id: "governance", name: "Governance" },
  { id: "disaster_management", name: "Disaster Management" },
  { id: "art_culture", name: "Art & Culture" },
];

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let counts = {}; // { subjectId: number }
let saveTimers = {}; // debounce handles per subject

// ---------- DOM refs ----------
const authScreen = document.getElementById("auth-screen");
const dashboard = document.getElementById("dashboard");
const authForm = document.getElementById("auth-form");
const authError = document.getElementById("auth-error");
const authSubmit = document.getElementById("auth-submit");
const authToggleText = document.getElementById("auth-toggle-text");
const authToggleBtn = document.getElementById("auth-toggle-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const userEmailEl = document.getElementById("user-email");
const signoutBtn = document.getElementById("signout-btn");
const totalCountEl = document.getElementById("total-count");
const syncStatusEl = document.getElementById("sync-status");
const subjectGrid = document.getElementById("subject-grid");
const resetBtn = document.getElementById("reset-btn");
const modalOverlay = document.getElementById("modal-overlay");
const modalCancel = document.getElementById("modal-cancel");
const modalConfirm = document.getElementById("modal-confirm");

let mode = "signin"; // or "signup"

// ============================================================
// Auth
// ============================================================

authToggleBtn.addEventListener("click", () => {
  mode = mode === "signin" ? "signup" : "signin";
  authSubmit.textContent = mode === "signin" ? "Sign in" : "Create account";
  authToggleText.textContent = mode === "signin" ? "New here?" : "Already have an account?";
  authToggleBtn.textContent = mode === "signin" ? "Create an account" : "Sign in";
  hideAuthError();
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthError();
  authSubmit.disabled = true;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    if (mode === "signin") {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      showAuthError("Account created. If email confirmation is enabled, check your inbox, then sign in.");
      authSubmit.disabled = false;
      return;
    }
  } catch (err) {
    showAuthError(err.message || "Something went wrong.");
    authSubmit.disabled = false;
  }
});

signoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

function showAuthError(msg) {
  authError.textContent = msg;
  authError.hidden = false;
}
function hideAuthError() {
  authError.hidden = true;
  authError.textContent = "";
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    currentUser = session.user;
    enterDashboard();
  } else {
    currentUser = null;
    showAuthScreen();
  }
});

function showAuthScreen() {
  authScreen.hidden = false;
  dashboard.hidden = true;
  authForm.reset();
  authSubmit.disabled = false;
}

async function enterDashboard() {
  authScreen.hidden = true;
  dashboard.hidden = false;
  userEmailEl.textContent = currentUser.email;
  await loadProgress();
  renderCards();
  updateTotal();
}

// ============================================================
// Data: load / save via Supabase Postgres
// ============================================================

function defaultCounts() {
  const c = {};
  SUBJECTS.forEach((s) => (c[s.id] = 0));
  return c;
}

async function loadProgress() {
  setSyncStatus("Loading…", "saving");
  const { data, error } = await supabaseClient
    .from("progress")
    .select("counts")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    setSyncStatus("Couldn't load saved progress", "error");
    counts = defaultCounts();
    return;
  }

  if (data) {
    counts = { ...defaultCounts(), ...data.counts };
  } else {
    counts = defaultCounts();
    await supabaseClient.from("progress").insert({
      user_id: currentUser.id,
      counts,
    });
  }
  setSyncStatus("Synced");
}

function saveCounts(subjectId) {
  clearTimeout(saveTimers[subjectId]);
  setSyncStatus("Saving…", "saving");
  saveTimers[subjectId] = setTimeout(async () => {
    const { error } = await supabaseClient
      .from("progress")
      .update({ counts, updated_at: new Date().toISOString() })
      .eq("user_id", currentUser.id);

    if (error) {
      console.error(error);
      setSyncStatus("Save failed — retrying on next change", "error");
    } else {
      setSyncStatus("Synced");
    }
  }, 250);
}

function setSyncStatus(text, cls) {
  syncStatusEl.textContent = text;
  syncStatusEl.className = "sync-status" + (cls ? " " + cls : "");
}

// ============================================================
// Rendering
// ============================================================

function renderCards() {
  subjectGrid.innerHTML = "";
  SUBJECTS.forEach((subject) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <p class="card-name">${subject.name}</p>
      <p class="card-count" id="count-${subject.id}">${counts[subject.id]}</p>
      <div class="card-actions">
        <button class="count-btn minus" data-id="${subject.id}" aria-label="Decrease ${subject.name}">−</button>
        <button class="count-btn plus" data-id="${subject.id}" aria-label="Increase ${subject.name}">+</button>
      </div>
    `;
    subjectGrid.appendChild(card);
  });

  subjectGrid.querySelectorAll(".count-btn.plus").forEach((btn) => {
    btn.addEventListener("click", () => changeCount(btn.dataset.id, 1));
  });
  subjectGrid.querySelectorAll(".count-btn.minus").forEach((btn) => {
    btn.addEventListener("click", () => changeCount(btn.dataset.id, -1));
  });

  updateMinusStates();
}

function changeCount(subjectId, delta) {
  const next = counts[subjectId] + delta;
  if (next < 0) return;
  counts[subjectId] = next;

  document.getElementById(`count-${subjectId}`).textContent = next;
  updateMinusStates();
  updateTotal();
  saveCounts(subjectId);
}

function updateMinusStates() {
  SUBJECTS.forEach((subject) => {
    const minusBtn = subjectGrid.querySelector(`.count-btn.minus[data-id="${subject.id}"]`);
    if (minusBtn) minusBtn.disabled = counts[subject.id] <= 0;
  });
}

function updateTotal() {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  totalCountEl.textContent = total.toLocaleString();
}

// ============================================================
// Reset with confirmation
// ============================================================

resetBtn.addEventListener("click", () => {
  modalOverlay.hidden = false;
});

modalCancel.addEventListener("click", () => {
  modalOverlay.hidden = true;
});

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) modalOverlay.hidden = true;
});

modalConfirm.addEventListener("click", async () => {
  modalOverlay.hidden = true;
  counts = defaultCounts();
  renderCards();
  updateTotal();
  setSyncStatus("Saving…", "saving");

  const { error } = await supabaseClient
    .from("progress")
    .update({ counts, updated_at: new Date().toISOString() })
    .eq("user_id", currentUser.id);

  setSyncStatus(error ? "Save failed" : "Synced", error ? "error" : undefined);
});
