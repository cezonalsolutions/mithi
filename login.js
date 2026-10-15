
/* ==========================================
   MITHAI LOGIN + PROFILE SYSTEM
   Mobile → Name → OTP → Profile
   Existing Login → Direct Profile
   Logout → Clear Session → Home

   DEMO ONLY: OTP 123456
========================================== */

(() => {
  'use strict';

  const DEMO_OTP = '123456';
  const SESSION_KEY = 'mithai_demo_session';

  let step = 'mobile';
  let mobile = '';
  let name = '';
  let existing = false;

  let version = 0;
  let checking = false;
  let verifying = false;

  let overlay;
  let profilePage;

  let mobileForm;
  let nameForm;
  let otpForm;

  let mobileInput;
  let nameInput;
  let otpInput;

  let mobileError;
  let nameError;
  let otpError;
  let otpMobile;

  let nextButton;
  let verifyButton;

  /* ==========================================
     SUPABASE CLIENT
  ========================================== */

  function db() {
    const client =
      window.mithaiSupabase ||
      window.supabaseClient;

    if (!client || typeof client.from !== 'function') {
      throw new Error(
        'MITHAI Supabase client not initialized.'
      );
    }

    return client;
  }

  /* ==========================================
     GET LOGGED-IN USER
  ========================================== */

  function getUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);

      if (!raw) return null;

      const user = JSON.parse(raw);

      if (
        !user ||
        typeof user.name !== 'string' ||
        !/^[6-9]\d{9}$/.test(user.mobile_number || '')
      ) {
        return null;
      }

      return user;

    } catch (error) {
      return null;
    }
  }

  window.mithaiGetLoggedInUser = getUser;

  /* ==========================================
     UPDATE PROFILE NAME AND MOBILE
  ========================================== */

  function updateProfile(user) {

    if (!user) return;

    const profileName =
      document.getElementById('profileName');

    const profilePhone =
      document.getElementById('profilePhone');

    if (profileName) {
      profileName.textContent = user.name;
    }

    if (profilePhone) {
      profilePhone.textContent =
        '+91 ' + user.mobile_number;
    }
  }

  /* ==========================================
     OPEN PROFILE
  ========================================== */

  function openProfile() {

    const user = getUser();

    if (!user) {
      openLogin();
      return;
    }

    if (!profilePage) {
      profilePage =
        document.getElementById('mithaiProfilePage');
    }

    if (!profilePage) {
      console.error('Profile page not found');
      return;
    }

    closeLogin();

    updateProfile(user);

    profilePage.classList.add('is-open');

    document.body.classList.add(
      'mithai-profile-open'
    );

    profilePage.scrollTop = 0;
  }

  /* ==========================================
     CLOSE PROFILE
  ========================================== */

  function closeProfile() {

    if (!profilePage) {
      profilePage =
        document.getElementById('mithaiProfilePage');
    }

    profilePage?.classList.remove('is-open');

    document.body.classList.remove(
      'mithai-profile-open'
    );
  }

  window.openMithaiProfile = openProfile;
  window.closeMithaiProfile = closeProfile;

  /* ==========================================
     MENU CLICK
     Logged in → Profile
     Not logged in → Login
  ========================================== */

  function openMenu() {

    const user = getUser();

    if (user) {
      openProfile();
    } else {
      openLogin();
    }
  }

  window.openMenu = openMenu;

  /* ==========================================
     BUTTON SPINNER
  ========================================== */

  function spinner(button, active, text) {

    if (!button) return;

    button.disabled = active;

    button.setAttribute(
      'aria-busy',
      String(active)
    );

    if (active) {

      button.innerHTML =
        '<span class="mithai-btn-spinner" aria-hidden="true"></span>';

    } else {

      button.textContent = text;

    }
  }

  /* ==========================================
     LOGIN STEPS
  ========================================== */

  function showStep(value) {

    step = value;

    mobileForm.style.display =
      value === 'mobile' ? 'block' : 'none';

    nameForm.style.display =
      value === 'name' ? 'block' : 'none';

    otpForm.style.display =
      value === 'otp' ? 'block' : 'none';
  }

  /* ==========================================
     OPEN LOGIN
  ========================================== */

  function openLogin() {

    if (!overlay) return;

    ++version;

    closeProfile();

    overlay.classList.add('is-open');

    overlay.setAttribute(
      'aria-hidden',
      'false'
    );

    document.body.classList.add(
      'mithai-login-open'
    );

    mobileForm.reset();
    nameForm.reset();
    otpForm.reset();

    mobileError.textContent = '';
    nameError.textContent = '';
    otpError.textContent = '';

    mobile = '';
    name = '';
    existing = false;

    checking = false;
    verifying = false;

    spinner(nextButton, false, 'Next');
    spinner(verifyButton, false, 'Verify');

    showStep('mobile');
  }

  /* ==========================================
     CLOSE LOGIN
  ========================================== */

  function closeLogin() {

    ++version;

    overlay?.classList.remove('is-open');

    overlay?.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.classList.remove(
      'mithai-login-open'
    );

    document.activeElement?.blur?.();
  }

  /* ==========================================
     LOGIN BACK BUTTON
  ========================================== */

  function loginBack() {

    ++version;

    checking = false;
    verifying = false;

    spinner(nextButton, false, 'Next');
    spinner(verifyButton, false, 'Verify');

    if (step === 'otp') {

      otpInput.value = '';
      otpError.textContent = '';

      showStep(
        existing ? 'mobile' : 'name'
      );

    } else if (step === 'name') {

      showStep('mobile');

    } else {

      closeLogin();

    }
  }

  window.openMithaiLogin = openLogin;
  window.closeMithaiLogin = closeLogin;
  window.mithaiLoginBack = loginBack;

  /* ==========================================
     LOGOUT
  ========================================== */

  function logout() {

    localStorage.removeItem(SESSION_KEY);

    closeProfile();
    closeLogin();

    mobile = '';
    name = '';
    existing = false;

    window.dispatchEvent(
      new CustomEvent('mithaiDemoLogout')
    );
  }

  window.mithaiLogout = logout;

  /* ==========================================
     FIND USER IN DATABASE
  ========================================== */

  async function findUser(number) {

    const {
      data: profiles,
      error: profileError
    } = await db()
      .from('mithai_profiles')
      .select('name')
      .eq('mobile_number', number)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profileName = profiles
      ?.find(
        p =>
          typeof p.name === 'string' &&
          p.name.trim()
      )
      ?.name.trim();

    if (profileName) {
      return profileName;
    }

    const {
      data: orders,
      error: ordersError
    } = await db()
      .from('mithai_orders')
      .select('customer_name')
      .eq('mobile_number', number)
      .limit(20);

    if (ordersError) {
      throw ordersError;
    }

    return orders
      ?.find(
        o =>
          typeof o.customer_name === 'string' &&
          o.customer_name.trim()
      )
      ?.customer_name.trim() || null;
  }

  /* ==========================================
     INITIALIZE
  ========================================== */

  function init() {

    overlay =
      document.getElementById('mithaiLoginOverlay');

    profilePage =
      document.getElementById('mithaiProfilePage');

    mobileForm =
      document.getElementById('loginForm');

    nameForm =
      document.getElementById('mithaiNameForm');

    otpForm =
      document.getElementById('mithaiOtpForm');

    mobileInput =
      document.getElementById('mobileNumber');

    nameInput =
      document.getElementById('mithaiUserName');

    otpInput =
      document.getElementById('mithaiOtpInput');

    mobileError =
      document.getElementById('loginError');

    nameError =
      document.getElementById('mithaiNameError');

    otpError =
      document.getElementById('mithaiOtpError');

    otpMobile =
      document.getElementById('mithaiOtpMobile');

    const required = [
      overlay,
      profilePage,
      mobileForm,
      nameForm,
      otpForm,
      mobileInput,
      nameInput,
      otpInput,
      mobileError,
      nameError,
      otpError,
      otpMobile
    ];

    if (required.some(el => !el)) {

      console.error(
        'MITHAI: Missing required HTML elements.'
      );

      return;
    }

    nextButton =
      mobileForm.querySelector(
        'button[type="submit"]'
      );

    verifyButton =
      otpForm.querySelector(
        'button[type="submit"]'
      );

    if (!nextButton || !verifyButton) return;

    /* ==========================================
       SPINNER STYLE
    ========================================== */

    if (!document.getElementById('mithaiSpinnerStyle')) {

      const style = document.createElement('style');

      style.id = 'mithaiSpinnerStyle';

      style.textContent = `
        #mithaiLoginOverlay .mithai-btn-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,.35);
          border-top-color: white;
          animation: mithaiButtonSpin .65s linear infinite;
          vertical-align: middle;
        }

        @keyframes mithaiButtonSpin {
          to {
            transform: rotate(360deg);
          }
        }

        #mithaiLoginOverlay .login-next-btn:disabled {
          cursor: wait;
        }
      `;

      document.head.appendChild(style);
    }

    /* ==========================================
       PROFILE BACK BUTTON
    ========================================== */

    const profileBack =
      profilePage.querySelector(
        '.mithai-profile-back'
      );

    if (profileBack) {

      profileBack.onclick = event => {

        event.preventDefault();

        closeProfile();
      };
    }

    /* ==========================================
       LOGOUT BUTTON
    ========================================== */

    const logoutButton =
      document.getElementById(
        'mithaiProfileLogoutBtn'
      ) ||
      profilePage.querySelector(
        '.mithai-logout-btn'
      );

    if (logoutButton) {

      logoutButton.onclick = event => {

        event.preventDefault();

        logout();
      };
    }

    /* ==========================================
       MOBILE INPUT
    ========================================== */

    mobileInput.addEventListener('input', () => {

      mobileInput.value =
        mobileInput.value
          .replace(/\D/g, '')
          .slice(0, 10);

      mobileError.textContent = '';
    });

    /* ==========================================
       NAME INPUT
    ========================================== */

    nameInput.addEventListener('input', () => {

      nameError.textContent = '';
    });

    /* ==========================================
       OTP INPUT
    ========================================== */

    otpInput.addEventListener('input', () => {

      otpInput.value =
        otpInput.value
          .replace(/\D/g, '')
          .slice(0, 6);

      otpError.textContent = '';
    });

    /* ==========================================
       MOBILE FORM SUBMIT
    ========================================== */

    mobileForm.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        if (checking) return;

        const number =
          mobileInput.value.trim();

        if (!/^[6-9]\d{9}$/.test(number)) {

          mobileError.textContent =
            'Enter a valid 10-digit mobile number';

          return;
        }

        checking = true;

        const request = ++version;

        mobileError.textContent = '';

        spinner(nextButton, true, 'Next');

        try {

          const found = await findUser(number);

          if (request !== version) return;

          mobile = number;
          existing = !!found;
          name = found || '';

          if (existing) {

            otpMobile.textContent =
              '+91 ' + mobile;

            otpInput.value = '';

            showStep('otp');

          } else {

            nameInput.value = '';

            showStep('name');

          }

        } catch (error) {

          if (request !== version) return;

          console.error(
            'MITHAI mobile lookup:',
            error
          );

          mobileError.textContent =
            'Unable to check mobile number. Please try again.';

        } finally {

          if (request === version) {

            checking = false;

            spinner(nextButton, false, 'Next');
          }
        }
      }
    );

    /* ==========================================
       NAME FORM SUBMIT
    ========================================== */

    nameForm.addEventListener(
      'submit',
      event => {

        event.preventDefault();

        const entered =
          nameInput.value
            .trim()
            .replace(/\s+/g, ' ');

        if (entered.length < 2) {

          nameError.textContent =
            'Please enter your name';

          return;
        }

        name = entered;

        nameError.textContent = '';

        otpMobile.textContent =
          '+91 ' + mobile;

        otpInput.value = '';

        showStep('otp');
      }
    );

    /* ==========================================
       OTP VERIFY + LOGIN
    ========================================== */

    otpForm.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        if (verifying) return;

        if (otpInput.value.trim() !== DEMO_OTP) {

          otpError.textContent =
            'Incorrect OTP. Please try again.';

          return;
        }

        if (!mobile || !name) {

          otpError.textContent =
            'Please restart login.';

          return;
        }

        verifying = true;

        const request = ++version;

        otpError.textContent = '';

        spinner(verifyButton, true, 'Verify');

        try {

          const {
            data: profiles,
            error: checkError
          } = await db()
            .from('mithai_profiles')
            .select('mobile_number')
            .eq('mobile_number', mobile)
            .limit(1);

          if (checkError) throw checkError;

          if (request !== version) return;

          if (!profiles?.length) {

            const {
              error: insertError
            } = await db()
              .from('mithai_profiles')
              .insert({
                mobile_number: mobile,
                name
              });

            if (insertError) {
              throw insertError;
            }
          }

          if (request !== version) return;

          const session = {
            name,
            mobile_number: mobile,
            loggedInAt: new Date().toISOString()
          };

          localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
          );

          closeLogin();

          window.dispatchEvent(
            new CustomEvent(
              'mithaiDemoLoginSuccess',
              { detail: session }
            )
          );

          openProfile();

        } catch (error) {

          if (request !== version) return;

          console.error(
            'MITHAI profile save:',
            error
          );

          otpError.textContent =
            'Unable to save login details. Please try again.';

        } finally {

          if (request === version) {

            verifying = false;

            spinner(
              verifyButton,
              false,
              'Verify'
            );
          }
        }
      }
    );

    /* ==========================================
       ESCAPE KEY
    ========================================== */

    document.addEventListener(
      'keydown',
      event => {

        if (event.key !== 'Escape') return;

        if (overlay.classList.contains('is-open')) {

          loginBack();

        } else if (
          profilePage.classList.contains('is-open')
        ) {

          closeProfile();

        }
      }
    );

    /* ==========================================
       RESTORE EXISTING SESSION
       Do not automatically open Profile.
       Menu click → Direct Profile.
    ========================================== */

    const savedUser = getUser();

    if (savedUser) {
      updateProfile(savedUser);
    }
  }

  /* ==========================================
     DOM READY
  ========================================== */

  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );

  } else {

    init();
  }

})();
