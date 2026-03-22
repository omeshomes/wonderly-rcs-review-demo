const form = document.getElementById("demo-form");
const phoneInput = document.getElementById("phoneNumber");
const submitButton = document.getElementById("submitButton");
const statusElement = document.getElementById("form-status");

const successMessage =
  "Test notifications sent! Check your phone. If this device is approved as a Wonderly RCS test device in Twilio and supports RCS on a supported carrier, you'll receive branded messages from Wonderly.";

function digitsOnly(value) {
  return value.replace(/\D/g, "");
}

function formatUsPhoneNumber(value) {
  const digits = digitsOnly(value).slice(0, 11);
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (normalized.length <= 3) {
    return normalized;
  }

  if (normalized.length <= 6) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3)}`;
  }

  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6, 10)}`;
}

function isValidUsPhoneNumber(value) {
  const digits = digitsOnly(value);

  if (digits.length === 10) {
    return true;
  }

  return digits.length === 11 && digits.startsWith("1");
}

function setStatus(message, state) {
  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function clearStatus() {
  statusElement.textContent = "";
  delete statusElement.dataset.state;
}

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatUsPhoneNumber(phoneInput.value);
  clearStatus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();

  const phoneNumber = phoneInput.value.trim();

  if (!isValidUsPhoneNumber(phoneNumber)) {
    setStatus("Enter a valid US phone number.", "error");
    phoneInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Sending...";

  try {
    const response = await fetch("/api/send-test-notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phoneNumber })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(payload?.error || "We couldn't send the test notifications. Please try again.", "error");
      return;
    }

    setStatus(successMessage, "success");
    form.reset();
  } catch {
    setStatus("We couldn't send the test notifications. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send Test Notifications";
  }
});
