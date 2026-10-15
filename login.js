
/* ==========================================
   MITHAI LOGIN — SUPABASE DEMO
   Mobile → Name (new users) → OTP → Close
   Next Button: Small Loading Spinner
========================================== */

const MITHAI_DEMO_OTP = "123456";
const MITHAI_SESSION_KEY = "mithai_demo_session";

// Use your existing Supabase client
const mithaiDB = supabaseClient;

/* ==========================================
   ELEMENTS
========================================== */

const mithaiLoginOverlay =
  document.getElementById("mithaiLoginOverlay");

const mithaiLoginForm =
  document.getElementById("loginForm");

const mithaiNameForm =
  document.getElementById("mithaiNameForm");

const mithaiOtpForm =
  document.getElementById("mithaiOtpForm");

const mithaiMobileInput =
  document.getElementById("mobileNumber");

const mithaiNameInput =
  document.getElementById("mithaiUserName");

const mithaiOtpInput =
  document.getElementById("mithaiOtpInput");

const mithaiLoginError =
  document.getElementById("loginError");

const mithaiNameError =
  document.getElementById("mithaiNameError");

const mithaiOtpError =
  document.getElementById("mithaiOtpError");

const mithaiOtpMobile =
  document.getElementById("mithaiOtpMobile");

const mithaiNextButton =
  mithaiLoginForm.querySelector('button[type="submit"]');

const mithaiOtpButton =
  mithaiOtpForm.querySelector('button[type="submit"]');

/* ==========================================
   SMALL SPINNER CSS — INJECT ONCE
========================================== */

if (!document.getElementById("mithaiSpinnerStyle")) {

  const style = document.createElement("style");

  style.id = "mithaiSpinnerStyle";

  style.textContent = `
    #mithaiLoginOverlay .mithai-btn-spinner {
      display: inline-block;
      width: 19px;
      height: 19px;
      border: 2.5px solid rgba(255,255,255,0.35);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: mithaiSpin 0.65s linear infinite;
      vertical-align: middle;
    }

    @keyframes mithaiSpin {
      to {
        transform: rotate(360deg);
      }
    }

    #mithaiLoginOverlay .login-next-btn:disabled {
      cursor: wait;
      opacity: 0.9;
    }
  `;

  document.head.appendChild(style);
}

/* ==========================================
   BUTTON SPINNER
========================================== */

function mithaiSetButtonLoading(button, loading, label) {

  button.disabled = loading;

  if (loading) {

    // Hide text and show only spinner
    button.innerHTML =
      '<span class="mithai-btn-spinner" aria-hidden="true"></span>';

    button.setAttribute("aria-label", "Loading");

  } else {

    button.textContent = label;
    button.removeAttribute("aria-label");
  }
}

/* ==========================================
   STATE
========================================== */

let mithaiCurrentStep = "mobile";
let mithaiPendingMobile = "";
let mithaiPendingName = "";
let mithaiExistingUser = false;

let mithaiCheckingMobile = false;
let mithaiVerifyingOtp = false;
let mithaiRequestVersion = 0;

/* ==========================================
   SWITCH LOGIN STEPS
========================================== */

function mithaiShowLoginStep(step) {

  mithaiCurrentStep = step;

  mithaiLoginForm.style.display = "none";
  mithaiNameForm.style.display = "none";
  mithaiOtpForm.style.display = "none";

  if (step === "mobile") {
    mithaiLoginForm.style.display = "block";
  }

  if (step === "name") {
    mithaiNameForm.style.display = "block";
  }

  if (step === "otp") {
    mithaiOtpForm.style.display = "block";
  }
}

/* ==========================================
   OPEN LOGIN
========================================== */

function openMenu() {
  openMithaiLogin();
}

function openMithaiLogin() {

  mithaiRequestVersion++;

  mithaiLoginOverlay.classList.add("is-open");

  mithaiLoginOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add("mithai-login-open");

  mithaiLoginForm.reset();
  mithaiNameForm.reset();
  mithaiOtpForm.reset();

  mithaiLoginError.textContent = "";
  mithaiNameError.textContent = "";
  mithaiOtpError.textContent = "";

  mithaiPendingMobile = "";
  mithaiPendingName = "";
  mithaiExistingUser = false;

  mithaiCheckingMobile = false;
  mithaiVerifyingOtp = false;

  mithaiSetButtonLoading(mithaiNextButton, false, "Next");
  mithaiSetButtonLoading(mithaiOtpButton, false, "Verify & Login");

  mithaiShowLoginStep("mobile");
}

/* ==========================================
   CLOSE LOGIN
========================================== */

function closeMithaiLogin() {

  mithaiRequestVersion++;

  mithaiLoginOverlay.classList.remove("is-open");

  mithaiLoginOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove("mithai-login-open");

  document.activeElement?.blur?.();
}

/* ==========================================
   BACK BUTTON
========================================== */

function mithaiLoginBack() {

  mithaiRequestVersion++;

  if (mithaiCurrentStep === "otp") {

    mithaiOtpInput.value = "";
    mithaiOtpError.textContent = "";

    mithaiShowLoginStep(
      mithaiExistingUser ? "mobile" : "name"
    );

    return;
  }

  if (mithaiCurrentStep === "name") {

    mithaiNameError.textContent = "";
    mithaiShowLoginStep("mobile");

    return;
  }

  closeMithaiLogin();
}

/* ==========================================
   DATABASE LOOKUP
========================================== */

async function mithaiFindUser(mobile) {

  // Check mithai_profiles
  const { data: profile, error: profileError } =
    await mithaiDB
      .from("mithai_profiles")
      .select("name")
      .eq("mobile_number", mobile)
      .limit(1)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const profileName =
    typeof profile?.name === "string"
      ? profile.name.trim()
      : "";

  if (profileName) {
    return {
      name: profileName,
      source: "mithai_profiles"
    };
  }

  // Check mithai_orders
  const { data: orders, error: ordersError } =
    await mithaiDB
      .from("mithai_orders")
      .select("customer_name")
      .eq("mobile_number", mobile)
      .limit(1);

  if (ordersError) {
    throw ordersError;
  }

  const orderName = orders
    ?.map(order => order.customer_name)
    .find(name =>
      typeof name === "string" && name.trim()
    );

  if (orderName) {
    return {
      name: orderName.trim(),
      source: "mithai_orders"
    };
  }

  return null;
}

/* ==========================================
   MOBILE INPUT
========================================== */

mithaiMobileInput.addEventListener("input", () => {

  mithaiMobileInput.value =
    mithaiMobileInput.value
      .replace(/\D/g, "")
      .slice(0, 10);

  mithaiLoginError.textContent = "";
});

/* ==========================================
   STEP 1 — MOBILE NUMBER CHECK
========================================== */

mithaiLoginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (mithaiCheckingMobile) return;

    const mobile = mithaiMobileInput.value.trim();

    if (!/^[6-9]\d{9}$/.test(mobile)) {

      mithaiLoginError.textContent =
        "Enter a valid 10-digit mobile number";

      return;
    }

    mithaiCheckingMobile = true;

    const requestId = ++mithaiRequestVersion;

    mithaiLoginError.textContent = "";

    // NEXT TEXT HIDE → SMALL SPINNER
    mithaiSetButtonLoading(mithaiNextButton, true, "Next");

    try {

      const user = await mithaiFindUser(mobile);

      if (requestId !== mithaiRequestVersion) {
        return;
      }

      mithaiPendingMobile = mobile;

      if (user) {

        // Existing user → Skip name
        mithaiExistingUser = true;
        mithaiPendingName = user.name;

        mithaiOtpMobile.textContent =
          "+91 " + mobile;

        mithaiOtpInput.value = "";

        mithaiShowLoginStep("otp");

      } else {

        // New user → Ask name
        mithaiExistingUser = false;
        mithaiPendingName = "";

        mithaiNameInput.value = "";

        mithaiShowLoginStep("name");
      }

    } catch (error) {

      if (requestId !== mithaiRequestVersion) {
        return;
      }

      console.error("MITHAI lookup error:", error);

      mithaiLoginError.textContent =
        "Unable to check mobile number. Try again.";

    } finally {

      if (requestId === mithaiRequestVersion) {
        mithaiCheckingMobile = false;
        mithaiSetButtonLoading(mithaiNextButton, false, "Next");
      }
    }
  }
);

/* ==========================================
   STEP 2 — ENTER NAME
========================================== */

mithaiNameInput.addEventListener("input", () => {
  mithaiNameError.textContent = "";
});

mithaiNameForm.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();

    const name = mithaiNameInput.value
      .trim()
      .replace(/\s+/g, " ");

    if (name.length < 2) {

      mithaiNameError.textContent =
        "Please enter your name";

      return;
    }

    mithaiPendingName = name;

    mithaiNameError.textContent = "";

    mithaiOtpMobile.textContent =
      "+91 " + mithaiPendingMobile;

    mithaiOtpInput.value = "";

    mithaiShowLoginStep("otp");
  }
);

/* ==========================================
   OTP INPUT
========================================== */

mithaiOtpInput.addEventListener("input", () => {

  mithaiOtpInput.value =
    mithaiOtpInput.value
      .replace(/\D/g, "")
      .slice(0, 6);

  mithaiOtpError.textContent = "";
});

/* ==========================================
   STEP 3 — VERIFY OTP + SAVE DATABASE
========================================== */

mithaiOtpForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (mithaiVerifyingOtp) return;

    const otp = mithaiOtpInput.value.trim();

    if (otp !== MITHAI_DEMO_OTP) {

      mithaiOtpError.textContent =
        "Incorrect OTP. Please try again.";

      return;
    }

    if (!mithaiPendingMobile || !mithaiPendingName) {

      mithaiOtpError.textContent =
        "Please restart login.";

      return;
    }

    mithaiVerifyingOtp = true;

    const requestId = ++mithaiRequestVersion;

    mithaiOtpError.textContent = "";

    // Show spinner on Verify & Login too
    mithaiSetButtonLoading(
      mithaiOtpButton,
      true,
      "Verify & Login"
    );

    try {

      const { data: profile, error: checkError } =
        await mithaiDB
          .from("mithai_profiles")
          .select("mobile_number")
          .eq("mobile_number", mithaiPendingMobile)
          .limit(1)
          .maybeSingle();

      if (checkError) throw checkError;

      if (requestId !== mithaiRequestVersion) {
        return;
      }

      // Save only if profile doesn't exist
      if (!profile) {

        const { error: insertError } =
          await mithaiDB
            .from("mithai_profiles")
            .insert({
              mobile_number: mithaiPendingMobile,
              name: mithaiPendingName
            });

        if (insertError) throw insertError;
      }

      if (requestId !== mithaiRequestVersion) {
        return;
      }

      const session = {
        name: mithaiPendingName,
        mobile_number: mithaiPendingMobile,
        loggedInAt: new Date().toISOString()
      };

      localStorage.setItem(
        MITHAI_SESSION_KEY,
        JSON.stringify(session)
      );

      window.dispatchEvent(
        new CustomEvent("mithaiDemoLoginSuccess", {
          detail: session
        })
      );

      // Auto close — no success screen
      closeMithaiLogin();

    } catch (error) {

      if (requestId !== mithaiRequestVersion) {
        return;
      }

      console.error("MITHAI save error:", error);

      mithaiOtpError.textContent =
        "Unable to save login details. Try again.";

    } finally {

      if (requestId === mithaiRequestVersion) {
        mithaiVerifyingOtp = false;
        mithaiSetButtonLoading(
          mithaiOtpButton,
          false,
          "Verify & Login"
        );
      }
    }
  }
);

/* ==========================================
   ESCAPE KEY
========================================== */

document.addEventListener("keydown", (event) => {

  if (
    event.key === "Escape" &&
    mithaiLoginOverlay.classList.contains("is-open")
  ) {
    mithaiLoginBack();
  }
});

/* ==========================================
   GET LOGGED-IN USER
========================================== */

function mithaiGetLoggedInUser() {

  try {
    return JSON.parse(
      localStorage.getItem(MITHAI_SESSION_KEY) || "null"
    );
  } catch (error) {
    return null;
  }
}

/* ==========================================
   LOGOUT
========================================== */

function mithaiLogout() {

  localStorage.removeItem(MITHAI_SESSION_KEY);

  window.dispatchEvent(
    new CustomEvent("mithaiDemoLogout")
  );
}
