const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const registrationForm = document.getElementById("registrationForm");
const formMessage = document.getElementById("formMessage");
const year = document.getElementById("year");

// Ganti dengan URL Web App Google Apps Script Anda.
const GOOGLE_SCRIPT_URL = (window.TK_CONFIG && window.TK_CONFIG.GOOGLE_SCRIPT_URL) || "https://script.google.com/macros/s/AKfycbx0CmMFYDNLnatLf38ijGBgawo_A1H2AujclL4hmiMy3WdfnkuPzw07JZkrUOwrOeU/exec";
const MAX_FILE_SIZE_MB = 5;

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("show");
    menuToggle.classList.toggle("active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("show");
      menuToggle.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Menampilkan nama file yang dipilih pada tombol upload.
document.querySelectorAll('.upload-card input[type="file"]').forEach((input) => {
  const card = input.closest(".upload-card");
  const smallText = card ? card.querySelector("small") : null;
  const defaultText = smallText ? smallText.textContent : "JPG, PNG, atau PDF";

  input.addEventListener("change", () => {
    if (!smallText) return;
    const file = input.files && input.files[0];
    smallText.textContent = file ? file.name : defaultText;
  });
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: base64,
      });
    };

    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

async function collectUploadFiles(form) {
  const fileFields = ["pasFoto", "kartuKeluarga", "aktaKelahiran"];
  const files = {};

  for (const fieldName of fileFields) {
    const input = form.elements[fieldName];
    const file = input && input.files ? input.files[0] : null;

    if (!file) continue;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`Ukuran file ${file.name} melebihi ${MAX_FILE_SIZE_MB} MB.`);
    }

    files[fieldName] = await fileToBase64(file);
  }

  return files;
}

if (registrationForm && formMessage) {
  registrationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    formMessage.textContent = "Mengirim data pendaftaran...";
    formMessage.className = "form-message";

    if (GOOGLE_SCRIPT_URL === "PASTE_URL_APPS_SCRIPT_DI_SINI") {
      formMessage.textContent = "URL Google Apps Script belum diatur. Silakan isi URL pada file assets/js/script.js.";
      formMessage.className = "form-message error";
      return;
    }

    try {
      const formData = new FormData(registrationForm);
      const data = {};

      for (const [key, value] of formData.entries()) {
        if (!(value instanceof File)) {
          data[key] = value;
        }
      }

      data.action = "create";
      data.waktuDaftar = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
      data.berkas = await collectUploadFiles(registrationForm);

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(data),
      });

      formMessage.textContent = "Pendaftaran berhasil dikirim. Terima kasih!";
      formMessage.className = "form-message success";
      registrationForm.reset();

      document.querySelectorAll('.upload-card small').forEach((small) => {
        small.textContent = "JPG, PNG, atau PDF";
      });
    } catch (error) {
      formMessage.textContent = error.message || "Terjadi kendala saat mengirim data. Silakan coba lagi.";
      formMessage.className = "form-message error";
    }
  });
}
