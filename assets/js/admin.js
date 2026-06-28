const ADMIN_SCRIPT_URL = (window.TK_CONFIG && window.TK_CONFIG.GOOGLE_SCRIPT_URL) || "PASTE_URL_APPS_SCRIPT_DI_SINI";
const ADMIN_PASSWORD = (window.TK_CONFIG && window.TK_CONFIG.ADMIN_PASSWORD) || "admin123";
const ADMIN_SAMPLE_KEY = "tk_pertiwi_sample_registrations";
const PRINT_SETTINGS_KEY = "tk_pertiwi_print_settings";

const LABELS = {
  waktuDaftar: "Waktu Daftar",
  namaAnak: "Nama Anak",
  tanggalLahir: "Tanggal Lahir",
  jenisKelamin: "Jenis Kelamin",
  umur: "Umur",
  tinggiBadan: "Tinggi Badan (cm)",
  beratBadan: "Berat Badan (kg)",
  agama: "Agama",
  tahunAjaran: "Tahun Ajaran",
  namaOrangTua: "Nama Orang Tua/Wali",
  telepon: "Nomor WhatsApp",
  pekerjaanOrangTua: "Pekerjaan Orang Tua/Wali",
  alamat: "Alamat",
  catatan: "Catatan Tambahan",
  pasFotoUrl: "Link Pas Foto",
  kkUrl: "Link KK",
  aktaUrl: "Link Akta Kelahiran"
};

const EDIT_FIELDS = [
  "waktuDaftar",
  "namaAnak",
  "tanggalLahir",
  "jenisKelamin",
  "umur",
  "tinggiBadan",
  "beratBadan",
  "agama",
  "tahunAjaran",
  "namaOrangTua",
  "telepon",
  "pekerjaanOrangTua",
  "alamat",
  "catatan",
  "pasFotoUrl",
  "kkUrl",
  "aktaUrl"
];

const TEXTAREA_FIELDS = new Set(["alamat", "catatan"]);
const URL_FIELDS = new Set(["pasFotoUrl", "kkUrl", "aktaUrl"]);
let registrations = [];
let filteredRegistrations = [];
let activeEditRow = null;

const defaultPrintSettings = {
  schoolName: "TK PERTIWI I",
  letterSubtitle: "PENERIMAAN PESERTA DIDIK BARU",
  address: "Jl. Contoh Alamat Sekolah No. 01, Desa/Kelurahan, Kecamatan, Kabupaten/Kota",
  phone: "Telp. 08xxxxxxxxxx • Email: tkpertiwi1@email.com",
  cityDate: "................, .................... 2026",
  principalName: "Ibu Dewi Kartika, S.Pd.",
  principalNip: "NIP/NIY. ........................",
  signatureData: ""
};

const loginCard = document.getElementById("adminLoginCard");
const loginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("adminLoginMessage");
const adminPanel = document.getElementById("adminPanel");
const adminStatus = document.getElementById("adminStatus");
const tableBody = document.getElementById("registrationsTableBody");
const searchInput = document.getElementById("adminSearch");
const reloadDataBtn = document.getElementById("reloadDataBtn");
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editRegistrationForm");
const printSettingsModal = document.getElementById("printSettingsModal");
const openPrintSettingsBtn = document.getElementById("openPrintSettingsBtn");
const printSettingsForm = document.getElementById("printSettingsForm");
const signatureUpload = document.getElementById("signatureUpload");
const signaturePreview = document.getElementById("signaturePreview");
const resetPrintSettingsBtn = document.getElementById("resetPrintSettingsBtn");
const printArea = document.getElementById("printArea");

function isScriptConfigured() {
  return ADMIN_SCRIPT_URL && ADMIN_SCRIPT_URL !== "PASTE_URL_APPS_SCRIPT_DI_SINI";
}

function getSampleRegistrations() {
  const saved = localStorage.getItem(ADMIN_SAMPLE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (error) { localStorage.removeItem(ADMIN_SAMPLE_KEY); }
  }

  const sample = [
    {
      rowNumber: 2,
      waktuDaftar: "25/06/2026, 09.15",
      namaAnak: "Aisyah Putri",
      tanggalLahir: "2021-05-12",
      jenisKelamin: "Perempuan",
      umur: "5",
      tinggiBadan: "105",
      beratBadan: "18.5",
      agama: "Islam",
      tahunAjaran: "2026/2027",
      namaOrangTua: "Bapak Ahmad / Ibu Sari",
      telepon: "081234567890",
      pekerjaanOrangTua: "Wiraswasta",
      alamat: "Jl. Melati No. 10",
      catatan: "Contoh data untuk tampilan dashboard.",
      pasFotoUrl: "",
      kkUrl: "",
      aktaUrl: ""
    },
    {
      rowNumber: 3,
      waktuDaftar: "25/06/2026, 10.30",
      namaAnak: "Rafa Pratama",
      tanggalLahir: "2020-11-04",
      jenisKelamin: "Laki-laki",
      umur: "5",
      tinggiBadan: "108",
      beratBadan: "19",
      agama: "Islam",
      tahunAjaran: "2026/2027",
      namaOrangTua: "Bapak Dimas / Ibu Lina",
      telepon: "082233445566",
      pekerjaanOrangTua: "Pegawai Swasta",
      alamat: "Jl. Kenanga No. 5",
      catatan: "Perlu pendampingan adaptasi awal.",
      pasFotoUrl: "",
      kkUrl: "",
      aktaUrl: ""
    }
  ];
  localStorage.setItem(ADMIN_SAMPLE_KEY, JSON.stringify(sample));
  return sample;
}

function saveSampleRegistrations(data) {
  localStorage.setItem(ADMIN_SAMPLE_KEY, JSON.stringify(data));
}

function getPrintSettings() {
  const saved = localStorage.getItem(PRINT_SETTINGS_KEY);
  if (!saved) return { ...defaultPrintSettings };
  try {
    return { ...defaultPrintSettings, ...JSON.parse(saved) };
  } catch (error) {
    return { ...defaultPrintSettings };
  }
}

function savePrintSettings(settings) {
  localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify(settings));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonpRequest(action) {
  return new Promise((resolve, reject) => {
    const callbackName = `tkAdminCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const separator = ADMIN_SCRIPT_URL.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Koneksi ke Google Apps Script terlalu lama atau gagal."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = (response) => {
      cleanup();
      resolve(response);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Gagal memuat data dari Google Apps Script."));
    };

    script.src = `${ADMIN_SCRIPT_URL}${separator}action=${encodeURIComponent(action)}&callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
    document.body.appendChild(script);
  });
}

async function loadRegistrations() {
  adminStatus.textContent = "Memuat data pendaftaran...";

  if (!isScriptConfigured()) {
    registrations = getSampleRegistrations();
    filteredRegistrations = registrations;
    adminStatus.textContent = "Mode contoh: URL Google Apps Script belum diatur di assets/js/config.js.";
    renderTable();
    return;
  }

  try {
    const response = await jsonpRequest("list");
    if (!response || response.status !== "success") {
      throw new Error(response && response.message ? response.message : "Data tidak dapat dibaca.");
    }
    registrations = Array.isArray(response.data) ? response.data : [];
    filteredRegistrations = registrations;
    adminStatus.textContent = `${registrations.length} data pendaftaran berhasil dimuat.`;
    renderTable();
  } catch (error) {
    registrations = [];
    filteredRegistrations = [];
    adminStatus.textContent = error.message || "Gagal memuat data pendaftaran.";
    renderTable();
  }
}

function renderBerkasLinks(item) {
  const links = [
    ["Foto", item.pasFotoUrl],
    ["KK", item.kkUrl],
    ["Akta", item.aktaUrl]
  ].filter(([, url]) => url);

  if (!links.length) return '<span class="muted-text">Belum ada</span>';
  return links.map(([label, url]) => `<a class="file-chip" href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`).join(" ");
}

function renderTable() {
  if (!tableBody) return;

  if (!filteredRegistrations.length) {
    tableBody.innerHTML = '<tr><td colspan="8">Belum ada data yang sesuai.</td></tr>';
    return;
  }

  tableBody.innerHTML = filteredRegistrations.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(item.namaAnak || "-")}</strong><br><small>${escapeHtml(item.waktuDaftar || "")}</small></td>
      <td>${escapeHtml(item.umur || "-")}</td>
      <td>${escapeHtml(item.namaOrangTua || "-")}</td>
      <td>${escapeHtml(item.telepon || "-")}</td>
      <td>${escapeHtml(item.tahunAjaran || "-")}</td>
      <td>${renderBerkasLinks(item)}</td>
      <td>
        <div class="table-actions">
          <button class="mini-btn" type="button" data-action="edit" data-row="${escapeHtml(item.rowNumber)}">Edit</button>
          <button class="mini-btn print-mini" type="button" data-action="print" data-row="${escapeHtml(item.rowNumber)}" title="Cetak formulir ke PDF">
            <span aria-hidden="true">🖨️</span><span>Cetak PDF</span>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function applySearch() {
  const query = (searchInput.value || "").toLowerCase().trim();
  if (!query) {
    filteredRegistrations = registrations;
  } else {
    filteredRegistrations = registrations.filter((item) => {
      return [item.namaAnak, item.namaOrangTua, item.telepon, item.tahunAjaran, item.alamat]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }
  renderTable();
}

function findRegistration(rowNumber) {
  return registrations.find((item) => String(item.rowNumber) === String(rowNumber));
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function openEditModal(rowNumber) {
  const item = findRegistration(rowNumber);
  if (!item || !editForm) return;
  activeEditRow = rowNumber;

  editForm.innerHTML = `
    <input type="hidden" name="rowNumber" value="${escapeHtml(rowNumber)}" />
    <div class="edit-grid">
      ${EDIT_FIELDS.map((field) => {
        const label = LABELS[field] || field;
        const value = item[field] || "";
        if (TEXTAREA_FIELDS.has(field)) {
          return `<div class="form-row full-row"><label for="edit_${field}">${escapeHtml(label)}</label><textarea id="edit_${field}" name="${field}" rows="3">${escapeHtml(value)}</textarea></div>`;
        }
        const type = field === "tanggalLahir" ? "date" : URL_FIELDS.has(field) ? "url" : "text";
        return `<div class="form-row"><label for="edit_${field}">${escapeHtml(label)}</label><input id="edit_${field}" type="${type}" name="${field}" value="${escapeHtml(value)}" /></div>`;
      }).join("")}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" type="button" data-close-modal="editModal">Batal</button>
      <button class="btn btn-primary" type="submit">Simpan Perubahan</button>
    </div>
    <p class="form-message" id="editMessage"></p>
  `;
  openModal(editModal);
}

async function saveEditedRegistration(event) {
  event.preventDefault();
  const editMessage = document.getElementById("editMessage");
  const formData = new FormData(editForm);
  const payload = { action: "update" };

  for (const [key, value] of formData.entries()) {
    payload[key] = value;
  }

  if (!payload.rowNumber) {
    editMessage.textContent = "Nomor baris tidak ditemukan.";
    editMessage.className = "form-message error";
    return;
  }

  editMessage.textContent = "Menyimpan perubahan...";

  if (!isScriptConfigured()) {
    registrations = registrations.map((item) => String(item.rowNumber) === String(payload.rowNumber) ? { ...item, ...payload } : item);
    saveSampleRegistrations(registrations);
    applySearch();
    editMessage.textContent = "Perubahan contoh berhasil disimpan di browser.";
    editMessage.className = "form-message success";
    window.setTimeout(() => closeModal(editModal), 700);
    return;
  }

  try {
    await fetch(ADMIN_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    editMessage.textContent = "Perubahan dikirim. Memuat ulang data...";
    editMessage.className = "form-message success";
    window.setTimeout(async () => {
      closeModal(editModal);
      await loadRegistrations();
    }, 900);
  } catch (error) {
    editMessage.textContent = error.message || "Gagal menyimpan perubahan.";
    editMessage.className = "form-message error";
  }
}

function fillPrintSettingsForm() {
  const settings = getPrintSettings();
  if (!printSettingsForm) return;
  printSettingsForm.elements.schoolName.value = settings.schoolName;
  printSettingsForm.elements.letterSubtitle.value = settings.letterSubtitle;
  printSettingsForm.elements.address.value = settings.address;
  printSettingsForm.elements.phone.value = settings.phone;
  printSettingsForm.elements.cityDate.value = settings.cityDate;
  printSettingsForm.elements.principalName.value = settings.principalName;
  printSettingsForm.elements.principalNip.value = settings.principalNip;
  if (settings.signatureData) {
    signaturePreview.src = settings.signatureData;
    signaturePreview.style.display = "block";
  } else {
    signaturePreview.removeAttribute("src");
    signaturePreview.style.display = "none";
  }
}

function savePrintSettingsFromForm(event) {
  event.preventDefault();
  const current = getPrintSettings();
  const formData = new FormData(printSettingsForm);
  const settings = { ...current };
  for (const [key, value] of formData.entries()) {
    settings[key] = value;
  }
  savePrintSettings(settings);
  closeModal(printSettingsModal);
}

function resetPrintSettings() {
  localStorage.removeItem(PRINT_SETTINGS_KEY);
  fillPrintSettingsForm();
}

function handleSignatureUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const settings = getPrintSettings();
    settings.signatureData = String(reader.result || "");
    savePrintSettings(settings);
    fillPrintSettingsForm();
  };
  reader.readAsDataURL(file);
}

function dataRow(label, value) {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "-")}</td></tr>`;
}

function linkRow(label, value) {
  if (!value) return dataRow(label, "Belum diunggah");
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

function printSection(title, rows) {
  return `
    <section class="print-section">
      <h4>${escapeHtml(title)}</h4>
      <table class="print-table">
        <tbody>${rows.join("")}</tbody>
      </table>
    </section>
  `;
}

function printRegistration(rowNumber) {
  const item = findRegistration(rowNumber);
  if (!item || !printArea) return;
  const settings = getPrintSettings();
  const signature = settings.signatureData ? `<img class="print-signature-img" src="${escapeHtml(settings.signatureData)}" alt="Tanda tangan kepala sekolah" />` : '<div class="signature-space"></div>';
  const documentNumber = item.rowNumber ? `PPDB-${String(item.rowNumber).padStart(3, "0")}` : "PPDB-000";
  const printedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  printArea.innerHTML = `
    <article class="print-document">
      <div class="print-watermark">TK PERTIWI I</div>

      <header class="print-letterhead">
        <div class="print-logo-box">
          <img
            src="https://drive.google.com/thumbnail?id=1IOHkSdN7VLTc2iw_aQxg-Ow5BWU3UgRm&sz=w512"
            alt="Logo TK Pertiwi I"
            onerror="this.onerror=null;this.src='assets/img/logo-tk-pertiwi.svg';"
          />
        </div>
        <div class="print-letterhead-text">
          <span class="print-kop-label">Formulir Resmi</span>
          <h1>${escapeHtml(settings.schoolName)}</h1>
          <h2>${escapeHtml(settings.letterSubtitle)}</h2>
          <p>${escapeHtml(settings.address)}</p>
          <p>${escapeHtml(settings.phone)}</p>
        </div>
      </header>

      <div class="print-title-card">
        <div>
          <p>Data Pendaftaran Peserta Didik Baru</p>
          <h3>FORMULIR PENDAFTARAN</h3>
        </div>
        <div class="print-doc-code">
          <span>No. Formulir</span>
          <strong>${escapeHtml(documentNumber)}</strong>
        </div>
      </div>

      <div class="print-student-summary">
        <div>
          <span>Nama Calon Peserta Didik</span>
          <strong>${escapeHtml(item.namaAnak || "-")}</strong>
        </div>
        <div>
          <span>Tahun Ajaran</span>
          <strong>${escapeHtml(item.tahunAjaran || "-")}</strong>
        </div>
        <div>
          <span>Tanggal Cetak</span>
          <strong>${escapeHtml(printedDate)}</strong>
        </div>
      </div>

      <div class="print-section-grid">
        ${printSection("A. Identitas Anak", [
          dataRow("Waktu Daftar", item.waktuDaftar),
          dataRow("Nama Anak", item.namaAnak),
          dataRow("Tanggal Lahir", item.tanggalLahir),
          dataRow("Jenis Kelamin", item.jenisKelamin),
          dataRow("Umur", item.umur),
          dataRow("Agama", item.agama)
        ])}

        ${printSection("B. Data Fisik & Akademik", [
          dataRow("Tinggi Badan", item.tinggiBadan ? item.tinggiBadan + " cm" : ""),
          dataRow("Berat Badan", item.beratBadan ? item.beratBadan + " kg" : ""),
          dataRow("Tahun Ajaran", item.tahunAjaran),
          dataRow("Catatan Tambahan", item.catatan)
        ])}

        ${printSection("C. Data Orang Tua/Wali", [
          dataRow("Nama Orang Tua/Wali", item.namaOrangTua),
          dataRow("Nomor WhatsApp", item.telepon),
          dataRow("Pekerjaan Orang Tua/Wali", item.pekerjaanOrangTua),
          dataRow("Alamat", item.alamat)
        ])}

        ${printSection("D. Kelengkapan Berkas", [
          linkRow("Link Pas Foto", item.pasFotoUrl),
          linkRow("Link KK", item.kkUrl),
          linkRow("Link Akta Kelahiran", item.aktaUrl)
        ])}
      </div>

      <div class="print-note-box">
        <strong>Catatan:</strong> Dokumen ini dicetak dari Dashboard Admin TK Pertiwi I. Mohon periksa kembali kesesuaian data dan kelengkapan berkas sebelum proses administrasi berikutnya.
      </div>

      <footer class="print-signatures">
        <div class="signature-card">
          <p>Orang Tua/Wali,</p>
          <div class="signature-space"></div>
          <strong>(........................................)</strong>
        </div>
        <div class="signature-card">
          <p>${escapeHtml(settings.cityDate)}</p>
          <p>Kepala Sekolah,</p>
          ${signature}
          <strong>${escapeHtml(settings.principalName)}</strong>
          <span>${escapeHtml(settings.principalNip)}</span>
        </div>
      </footer>
    </article>
  `;

  window.print();
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("adminPassword").value;
    if (password !== ADMIN_PASSWORD) {
      loginMessage.textContent = "Password admin tidak sesuai.";
      loginMessage.className = "form-message error";
      return;
    }
    loginMessage.textContent = "Berhasil masuk.";
    loginMessage.className = "form-message success";
    loginCard.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    await loadRegistrations();
  });
}

if (reloadDataBtn) reloadDataBtn.addEventListener("click", loadRegistrations);
if (searchInput) searchInput.addEventListener("input", applySearch);
if (editForm) editForm.addEventListener("submit", saveEditedRegistration);
if (openPrintSettingsBtn) openPrintSettingsBtn.addEventListener("click", () => { fillPrintSettingsForm(); openModal(printSettingsModal); });
if (printSettingsForm) printSettingsForm.addEventListener("submit", savePrintSettingsFromForm);
if (signatureUpload) signatureUpload.addEventListener("change", handleSignatureUpload);
if (resetPrintSettingsBtn) resetPrintSettingsBtn.addEventListener("click", resetPrintSettings);

if (tableBody) {
  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const rowNumber = button.getAttribute("data-row");
    if (button.dataset.action === "edit") openEditModal(rowNumber);
    if (button.dataset.action === "print") printRegistration(rowNumber);
  });
}

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-modal]");
  if (!closeButton) return;
  const modalId = closeButton.getAttribute("data-close-modal");
  const modal = document.getElementById(modalId);
  if (modal) closeModal(modal);
});

[editModal, printSettingsModal].forEach((modal) => {
  if (!modal) return;
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });
});
