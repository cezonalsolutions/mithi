/* MITHAI demo login: database lookup, spinner, and same-page overlay.
   DEMO ONLY: 123456 is not real phone verification. */
(() => {
  'use strict';
  const DEMO_OTP = '123456';
  const SESSION_KEY = 'mithai_demo_session';
  let step = 'mobile', mobile = '', name = '', existing = false;
  let version = 0, checking = false, verifying = false;
  let overlay, mobileForm, nameForm, otpForm, mobileInput, nameInput,
      otpInput, mobileError, nameError, otpError, otpMobile, nextButton, verifyButton;

  function db() {
    const client = window.mithaiSupabase;
    if (!client || typeof client.from !== 'function') {
      throw new Error('Supabase not initialized. Initialize window.mithaiSupabase in index.html.');
    }
    return client;
  }

  function spinner(button, active, text) {
    if (!button) return;
    button.disabled = active;
    button.setAttribute('aria-busy', String(active));
    if (active) {
      button.innerHTML = '<span class="mithai-btn-spinner" aria-hidden="true"></span>';
    } else {
      button.textContent = text;
    }
  }

  function showStep(value) {
    step = value;
    mobileForm.style.display = value === 'mobile' ? 'block' : 'none';
    nameForm.style.display = value === 'name' ? 'block' : 'none';
    otpForm.style.display = value === 'otp' ? 'block' : 'none';
  }

  function open() {
    if (!overlay) return;
    ++version;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mithai-login-open');
    mobileForm.reset(); nameForm.reset(); otpForm.reset();
    mobileError.textContent = nameError.textContent = otpError.textContent = '';
    mobile = ''; name = ''; existing = false;
    checking = verifying = false;
    spinner(nextButton, false, 'Next');
    spinner(verifyButton, false, 'Verify');
    showStep('mobile');
  }

  function close() {
    ++version;
    overlay?.classList.remove('is-open');
    overlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mithai-login-open');
    document.activeElement?.blur?.();
  }

  function back() {
    ++version;
    checking = verifying = false;
    spinner(nextButton, false, 'Next');
    spinner(verifyButton, false, 'Verify');
    if (step === 'otp') {
      otpInput.value = '';
      otpError.textContent = '';
      showStep(existing ? 'mobile' : 'name');
    } else if (step === 'name') {
      showStep('mobile');
    } else {
      close();
    }
  }

  // Keep functions accessible to existing HTML onclick attributes.
  window.openMenu = open;
  window.openMithaiLogin = open;
  window.closeMithaiLogin = close;
  window.mithaiLoginBack = back;
  window.mithaiGetLoggedInUser = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  };
  window.mithaiLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent('mithaiDemoLogout'));
  };

  async function findUser(number) {
    const { data: profiles, error: pe } = await db()
      .from('mithai_profiles')
      .select('name')
      .eq('mobile_number', number)
      .limit(1);
    if (pe) throw pe;
    const profileName = profiles?.find(p => typeof p.name === 'string' && p.name.trim())?.name.trim();
    if (profileName) return profileName;

    const { data: orders, error: oe } = await db()
      .from('mithai_orders')
      .select('customer_name')
      .eq('mobile_number', number)
      .limit(20);
    if (oe) throw oe;
    return orders?.find(o => typeof o.customer_name === 'string' && o.customer_name.trim())?.customer_name.trim() || null;
  }

  function init() {
    overlay = document.getElementById('mithaiLoginOverlay');
    mobileForm = document.getElementById('loginForm');
    nameForm = document.getElementById('mithaiNameForm');
    otpForm = document.getElementById('mithaiOtpForm');
    mobileInput = document.getElementById('mobileNumber');
    nameInput = document.getElementById('mithaiUserName');
    otpInput = document.getElementById('mithaiOtpInput');
    mobileError = document.getElementById('loginError');
    nameError = document.getElementById('mithaiNameError');
    otpError = document.getElementById('mithaiOtpError');
    otpMobile = document.getElementById('mithaiOtpMobile');
    if ([overlay, mobileForm, nameForm, otpForm, mobileInput, nameInput,
         otpInput, mobileError, nameError, otpError, otpMobile].some(x => !x)) {
      console.error('MITHAI login: Missing HTML element; check login form IDs.');
      return;
    }
    nextButton = mobileForm.querySelector('button[type="submit"]');
    verifyButton = otpForm.querySelector('button[type="submit"]');
    if (!nextButton || !verifyButton) return;

    if (!document.getElementById('mithaiSpinnerStyle')) {
      const style = document.createElement('style');
      style.id = 'mithaiSpinnerStyle';
      style.textContent = `
        #mithaiLoginOverlay .mithai-btn-spinner {
          display:inline-block;width:18px;height:18px;border-radius:50%;
          border:2.5px solid rgba(255,255,255,.35);border-top-color:white;
          animation:mithaiButtonSpin .65s linear infinite;vertical-align:middle;
        }
        @keyframes mithaiButtonSpin { to { transform:rotate(360deg); } }
        #mithaiLoginOverlay .login-next-btn:disabled { cursor:wait; }
      `;
      document.head.appendChild(style);
    }

    mobileInput.addEventListener('input', () => {
      mobileInput.value = mobileInput.value.replace(/\D/g, '').slice(0, 10);
      mobileError.textContent = '';
    });
    otpInput.addEventListener('input', () => {
      otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
      otpError.textContent = '';
    });
    nameInput.addEventListener('input', () => { nameError.textContent = ''; });

    mobileForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (checking) return;
      const number = mobileInput.value.trim();
      if (!/^[6-9]\d{9}$/.test(number)) {
        mobileError.textContent = 'Enter a valid 10-digit mobile number';
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
          otpMobile.textContent = '+91 ' + mobile;
          otpInput.value = '';
          showStep('otp');
        } else {
          nameInput.value = '';
          showStep('name');
        }
      } catch (error) {
        if (request !== version) return;
        console.error('MITHAI mobile lookup:', error);
        mobileError.textContent = 'Unable to check mobile number. Please try again.';
      } finally {
        if (request === version) {
          checking = false;
          spinner(nextButton, false, 'Next');
        }
      }
    });

    nameForm.addEventListener('submit', event => {
      event.preventDefault();
      const entered = nameInput.value.trim().replace(/\s+/g, ' ');
      if (entered.length < 2) {
        nameError.textContent = 'Please enter your name';
        return;
      }
      name = entered;
      nameError.textContent = '';
      otpMobile.textContent = '+91 ' + mobile;
      otpInput.value = '';
      showStep('otp');
    });

    otpForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (verifying) return;
      if (otpInput.value.trim() !== DEMO_OTP) {
        otpError.textContent = 'Incorrect OTP. Please try again.';
        return;
      }
      if (!mobile || !name) {
        otpError.textContent = 'Please restart login.';
        return;
      }
      verifying = true;
      const request = ++version;
      otpError.textContent = '';
      spinner(verifyButton, true, 'Verify');
      try {
        const { data: profiles, error: checkError } = await db()
          .from('mithai_profiles')
          .select('mobile_number')
          .eq('mobile_number', mobile)
          .limit(1);
        if (checkError) throw checkError;
        if (request !== version) return;
        if (!profiles?.length) {
          const { error: insertError } = await db()
            .from('mithai_profiles')
            .insert({ mobile_number: mobile, name });
          if (insertError) throw insertError;
        }
        if (request !== version) return;
        const session = { name, mobile_number: mobile, loggedInAt: new Date().toISOString() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        close();
        window.dispatchEvent(new CustomEvent('mithaiDemoLoginSuccess', { detail: session }));
      } catch (error) {
        if (request !== version) return;
        console.error('MITHAI profile save:', error);
        otpError.textContent = 'Unable to save login details. Please try again.';
      } finally {
        if (request === version) {
          verifying = false;
          spinner(verifyButton, false, 'Verify');
        }
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) back();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
