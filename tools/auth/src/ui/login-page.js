/**
 * Cactus Auth — Login Page HTML Generator
 *
 * Desert modernism aesthetic with Cormorant Garamond + Nunito.
 * All CSS classes prefixed `au-`.
 * Phase 1: Google + Magic Link active, others greyed out.
 */

/**
 * Render the full login page HTML.
 *
 * @param {{ appName: string, providers: string[], error?: string, state: string, csrfToken: string }} params
 * @returns {string} complete HTML document
 */
export const renderLoginPage = ({ appName, providers, error, state, csrfToken }) => {
  const enabledProviders = new Set(providers);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in — ${escapeHtml(appName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${getStyles()}</style>
</head>
<body>
  <div class="au-bg-pattern"></div>
  <main class="au-container">
    <div class="au-card">
      <div class="au-header au-fade-in" style="animation-delay: 0ms">
        <div class="au-logo">
          <svg class="au-cactus-icon" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 4 C20 4 18 16 18 28 C18 32 16 34 14 34 C12 34 10 32 10 28 C10 24 8 20 8 20 C8 20 4 22 4 28 C4 34 8 36 12 36 C14 36 16 35 18 33 L18 48 L22 48 L22 33 C24 35 26 36 28 36 C32 36 36 34 36 28 C36 22 32 20 32 20 C32 20 30 24 30 28 C30 32 28 34 26 34 C24 34 22 32 22 28 C22 16 20 4 20 4Z" fill="#4A7C59"/>
          </svg>
        </div>
        <h1 class="au-title">Welcome</h1>
        <p class="au-subtitle">Sign in to <strong>${escapeHtml(appName)}</strong></p>
      </div>

      ${error ? `<div class="au-error au-fade-in" style="animation-delay: 100ms" role="alert">${escapeHtml(error)}</div>` : ''}

      <div class="au-providers">
        ${renderGoogleButton(enabledProviders.has('google'), state)}
        ${renderProviderButton('apple', 'Apple', false)}
        ${renderProviderButton('microsoft', 'Microsoft', false)}
        ${renderProviderButton('github', 'GitHub', false)}
      </div>

      <div class="au-divider au-fade-in" style="animation-delay: 350ms">
        <span>or continue with email</span>
      </div>

      <div id="au-email-step" class="au-email-section au-fade-in" style="animation-delay: 400ms">
        <form id="au-email-form" class="au-form">
          <input type="hidden" name="state" value="${escapeHtml(state)}">
          <div class="au-input-group">
            <input
              type="email"
              id="au-email-input"
              name="email"
              class="au-input"
              placeholder="your@email.com"
              autocomplete="email"
              required
            >
            <button type="submit" class="au-btn au-btn-magic">
              <span class="au-btn-text">Send code</span>
              <span class="au-btn-loading" hidden>Sending...</span>
            </button>
          </div>
        </form>
      </div>

      <div id="au-otp-step" class="au-otp-section" hidden>
        <p class="au-otp-hint">Enter the 6-digit code sent to <strong id="au-otp-email"></strong></p>
        <form id="au-otp-form" class="au-form">
          <input type="hidden" name="state" value="${escapeHtml(state)}">
          <div class="au-input-group">
            <input
              type="text"
              id="au-otp-input"
              name="code"
              class="au-input au-input-otp"
              placeholder="000000"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength="6"
              autocomplete="one-time-code"
              required
            >
            <button type="submit" class="au-btn au-btn-verify">
              <span class="au-btn-text">Verify</span>
              <span class="au-btn-loading" hidden>Verifying...</span>
            </button>
          </div>
          <button type="button" id="au-back-btn" class="au-link-btn">Use a different email</button>
        </form>
      </div>

      <div id="au-message" class="au-message" hidden></div>

      <footer class="au-footer au-fade-in" style="animation-delay: 500ms">
        <p>Secured by <strong>Cactus Watch</strong></p>
      </footer>
    </div>
  </main>
  <script>${getScript()}</script>
</body>
</html>`;
};

/* ── Provider Buttons ────────────────────────────────────── */

const renderGoogleButton = (enabled, state) => `
  <a
    href="${enabled ? `/auth/google?state=${encodeURIComponent(state)}` : '#'}"
    class="au-btn au-btn-provider au-btn-google au-fade-in ${enabled ? '' : 'au-disabled'}"
    style="animation-delay: 150ms"
    ${enabled ? '' : 'aria-disabled="true" tabindex="-1"'}
  >
    <svg class="au-provider-icon" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    <span>Continue with Google</span>
  </a>`;

const renderProviderButton = (provider, label, enabled) => {
  const icons = {
    apple: `<svg class="au-provider-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`,
    microsoft: `<svg class="au-provider-icon" viewBox="0 0 24 24"><rect fill="#F25022" x="1" y="1" width="10" height="10"/><rect fill="#7FBA00" x="13" y="1" width="10" height="10"/><rect fill="#00A4EF" x="1" y="13" width="10" height="10"/><rect fill="#FFB900" x="13" y="13" width="10" height="10"/></svg>`,
    github: `<svg class="au-provider-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/></svg>`,
  };

  return `
  <button
    class="au-btn au-btn-provider au-btn-${provider} au-fade-in au-disabled"
    style="animation-delay: ${provider === 'apple' ? '200' : provider === 'microsoft' ? '250' : '300'}ms"
    disabled
    aria-disabled="true"
  >
    ${icons[provider] || ''}
    <span>${label}</span>
    <span class="au-coming-soon">Coming soon</span>
  </button>`;
};

/* ── Styles ──────────────────────────────────────────────── */

const getStyles = () => `
  :root {
    --au-mesa: #2C1810;
    --au-mesa-warm: #4A2F1E;
    --au-terracotta: #C1440E;
    --au-terracotta-light: #E8672F;
    --au-sage: #4A7C59;
    --au-sage-light: #6B9E7A;
    --au-sand: #FAF6F0;
    --au-sand-dark: #EDE5D8;
    --au-cream: #FFF8F0;
    --au-earth: #6B5B4F;
    --au-stone: #A69888;
    --au-border: #E0D5C8;
    --au-shadow: 0 8px 40px rgba(44, 24, 16, 0.12);
    --au-shadow-sm: 0 2px 8px rgba(44, 24, 16, 0.08);
    --au-radius: 12px;
    --au-radius-sm: 8px;
    --au-font-display: 'Cormorant Garamond', 'Georgia', serif;
    --au-font-body: 'Nunito', 'Segoe UI', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--au-font-body);
    background: var(--au-sand);
    color: var(--au-mesa);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  .au-bg-pattern {
    position: fixed;
    inset: 0;
    z-index: 0;
    opacity: 0.035;
    background-image:
      linear-gradient(30deg, var(--au-terracotta) 12%, transparent 12.5%, transparent 87%, var(--au-terracotta) 87.5%, var(--au-terracotta)),
      linear-gradient(150deg, var(--au-terracotta) 12%, transparent 12.5%, transparent 87%, var(--au-terracotta) 87.5%, var(--au-terracotta)),
      linear-gradient(30deg, var(--au-terracotta) 12%, transparent 12.5%, transparent 87%, var(--au-terracotta) 87.5%, var(--au-terracotta)),
      linear-gradient(150deg, var(--au-terracotta) 12%, transparent 12.5%, transparent 87%, var(--au-terracotta) 87.5%, var(--au-terracotta)),
      linear-gradient(60deg, var(--au-sage) 25%, transparent 25.5%, transparent 75%, var(--au-sage) 75%, var(--au-sage)),
      linear-gradient(60deg, var(--au-sage) 25%, transparent 25.5%, transparent 75%, var(--au-sage) 75%, var(--au-sage));
    background-size: 80px 140px;
    background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
    pointer-events: none;
  }

  .au-container {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
  }

  .au-card {
    background: white;
    border-radius: 16px;
    padding: 48px 40px;
    box-shadow: var(--au-shadow);
    border: 1px solid var(--au-border);
  }

  .au-header { text-align: center; margin-bottom: 32px; }

  .au-logo { margin-bottom: 16px; }

  .au-cactus-icon { width: 40px; height: 52px; }

  .au-title {
    font-family: var(--au-font-display);
    font-size: 32px;
    font-weight: 700;
    color: var(--au-mesa);
    margin-bottom: 6px;
    letter-spacing: -0.01em;
  }

  .au-subtitle {
    font-size: 15px;
    color: var(--au-earth);
    font-weight: 400;
  }
  .au-subtitle strong { color: var(--au-mesa); font-weight: 600; }

  .au-error {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
    padding: 12px 16px;
    border-radius: var(--au-radius-sm);
    font-size: 14px;
    margin-bottom: 24px;
    text-align: center;
  }

  .au-providers { display: flex; flex-direction: column; gap: 10px; }

  .au-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: var(--au-radius-sm);
    font-family: var(--au-font-body);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--au-border);
    background: white;
    color: var(--au-mesa);
    text-decoration: none;
    transition: all 0.2s ease;
    min-height: 48px;
    position: relative;
  }

  .au-btn:hover:not(.au-disabled) {
    box-shadow: var(--au-shadow-sm);
    border-color: var(--au-stone);
  }

  .au-btn.au-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .au-coming-soon {
    position: absolute;
    right: 16px;
    font-size: 11px;
    font-weight: 500;
    color: var(--au-stone);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .au-provider-icon { width: 20px; height: 20px; flex-shrink: 0; }

  .au-btn-google { background: white; }
  .au-btn-google:hover:not(.au-disabled) { background: #F8F8F8; }

  .au-btn-apple { background: #000; color: white; border-color: #000; }
  .au-btn-apple .au-coming-soon { color: #888; }

  .au-btn-microsoft { background: white; }

  .au-btn-github { background: #24292e; color: white; border-color: #24292e; }
  .au-btn-github .au-coming-soon { color: #8b949e; }

  .au-divider {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 28px 0 24px;
    color: var(--au-stone);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .au-divider::before, .au-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--au-border);
  }

  .au-input-group {
    display: flex;
    gap: 8px;
  }

  .au-input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid var(--au-border);
    border-radius: var(--au-radius-sm);
    font-family: var(--au-font-body);
    font-size: 15px;
    color: var(--au-mesa);
    background: var(--au-cream);
    outline: none;
    transition: border-color 0.2s;
    min-height: 48px;
  }
  .au-input:focus { border-color: var(--au-terracotta); }
  .au-input::placeholder { color: var(--au-stone); }

  .au-input-otp {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 6px;
    font-family: monospace;
  }

  .au-btn-magic, .au-btn-verify {
    background: var(--au-terracotta);
    color: white;
    border-color: var(--au-terracotta);
    white-space: nowrap;
    flex-shrink: 0;
    padding: 12px 24px;
  }
  .au-btn-magic:hover, .au-btn-verify:hover {
    background: var(--au-terracotta-light);
    border-color: var(--au-terracotta-light);
  }

  .au-otp-hint {
    font-size: 14px;
    color: var(--au-earth);
    margin-bottom: 16px;
    text-align: center;
  }
  .au-otp-hint strong { color: var(--au-mesa); }

  .au-link-btn {
    background: none;
    border: none;
    color: var(--au-terracotta);
    font-family: var(--au-font-body);
    font-size: 13px;
    cursor: pointer;
    padding: 8px 0;
    margin-top: 8px;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .au-link-btn:hover { color: var(--au-terracotta-light); }

  .au-message {
    padding: 12px 16px;
    border-radius: var(--au-radius-sm);
    font-size: 14px;
    text-align: center;
    margin-top: 16px;
  }
  .au-message.au-message-error { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; }
  .au-message.au-message-success { background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; }

  .au-footer {
    text-align: center;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--au-border);
    font-size: 12px;
    color: var(--au-stone);
  }
  .au-footer strong { color: var(--au-earth); font-weight: 600; }

  @keyframes au-fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .au-fade-in {
    opacity: 0;
    animation: au-fade-in 0.5s ease forwards;
  }

  @media (max-width: 480px) {
    .au-card { padding: 36px 24px; }
    .au-title { font-size: 28px; }
    .au-input-group { flex-direction: column; }
    .au-btn-magic, .au-btn-verify { width: 100%; }
  }
`;

/* ── Inline Script ───────────────────────────────────────── */

const getScript = () => `
(function() {
  const emailForm = document.getElementById('au-email-form');
  const otpForm = document.getElementById('au-otp-form');
  const emailStep = document.getElementById('au-email-step');
  const otpStep = document.getElementById('au-otp-step');
  const emailInput = document.getElementById('au-email-input');
  const otpInput = document.getElementById('au-otp-input');
  const otpEmail = document.getElementById('au-otp-email');
  const backBtn = document.getElementById('au-back-btn');
  const messageEl = document.getElementById('au-message');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'au-message au-message-' + type;
    messageEl.hidden = false;
  }

  function hideMessage() {
    messageEl.hidden = true;
  }

  function setLoading(form, loading) {
    var btn = form.querySelector('button[type="submit"]');
    btn.querySelector('.au-btn-text').hidden = loading;
    btn.querySelector('.au-btn-loading').hidden = !loading;
    btn.disabled = loading;
  }

  emailForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideMessage();
    var email = emailInput.value.trim();
    if (!email) return;

    var state = emailForm.querySelector('input[name="state"]').value;
    setLoading(emailForm, true);

    try {
      var res = await fetch('/api/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, state: state }),
        credentials: 'same-origin'
      });
      var data = await res.json();

      if (!res.ok) {
        showMessage(data.error || 'Something went wrong', 'error');
        return;
      }

      otpEmail.textContent = email;
      emailStep.hidden = true;
      otpStep.hidden = false;
      otpInput.focus();
    } catch (err) {
      showMessage('Network error. Please try again.', 'error');
    } finally {
      setLoading(emailForm, false);
    }
  });

  otpForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideMessage();
    var code = otpInput.value.trim();
    var email = otpEmail.textContent;
    var state = otpForm.querySelector('input[name="state"]').value;

    if (!code || code.length !== 6) {
      showMessage('Please enter the 6-digit code', 'error');
      return;
    }

    setLoading(otpForm, true);

    try {
      var res = await fetch('/api/magic-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, code: code, state: state }),
        credentials: 'same-origin'
      });
      var data = await res.json();

      if (!res.ok) {
        showMessage(data.error || 'Invalid code', 'error');
        return;
      }

      if (data.redirect) {
        window.location.href = data.redirect;
      }
    } catch (err) {
      showMessage('Network error. Please try again.', 'error');
    } finally {
      setLoading(otpForm, false);
    }
  });

  backBtn.addEventListener('click', function() {
    hideMessage();
    otpStep.hidden = true;
    emailStep.hidden = false;
    otpInput.value = '';
    emailInput.focus();
  });
})();
`;

/* ── Helpers ──────────────────────────────────────────────── */

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
