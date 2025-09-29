window.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generateBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const themeToggle = document.getElementById("themeToggle");
  const exitBtn = document.getElementById("exitBtn");

  generateBtn.addEventListener("click", generate);
  downloadBtn.addEventListener("click", download);
  resetBtn.addEventListener("click", resetForm);

  themeToggle.addEventListener("click", () =>
    document.body.classList.toggle("dark")
  );

  const exitModal = document.getElementById("exitModal");
  const confirmExit = document.getElementById("confirmExit");
  const cancelExit = document.getElementById("cancelExit");

  exitBtn.addEventListener("click", () => exitModal.classList.add("active"));
  cancelExit.addEventListener("click", () =>
    exitModal.classList.remove("active")
  );
  confirmExit.addEventListener("click", () => window.api.closeApp());

  initImageModal();

  initWizard();

  initCopyButton();

  lucide.createIcons();
});

let lastFilePath = null;

async function generate() {
  const spinner = document.getElementById("spinnerTool");
  spinner.classList.add("visible");

  generateBtn.disabled = true;

  const fields = [
    { id: "title", name: "Naziv alata" },
    { id: "description", name: "Opis koncepta" },
    { id: "audience", name: "Ciljna grupa" },
    { id: "initial", name: "Početni prikaz" },
  ];

  const interactions = collectRules();
  const extras = document.getElementById("extras").value.trim();

  let valid = true;

  const values = {};

  // Provera obaveznih polja i prikaz greške
  fields.forEach((field) => {
    const input = document.getElementById(field.id);
    const errorDiv = document.getElementById("error-" + field.id);
    const value = input.value.trim();
    values[field.id] = value;

    if (!value) {
      valid = false;
      input.classList.add("error");
      errorDiv.textContent = `${field.name} je obavezno.`;
    } else {
      input.classList.remove("error");
      errorDiv.textContent = "";
    }
  });

  if (!valid) {
    showAlert("Popuni sva obavezna polja!");
    spinner.classList.remove("visible");
    generateBtn.disabled = false;
    return;
  }

  const { title, description, audience, initial } = values;

  try {
    let html = await window.api.generateHTML({
      title,
      description,
      audience,
      initial,
      interactions,
      extras,
    });

    // uklanjanje markdown-a
    html = html.replace(/^```html\s*/, "");
    html = html.replace(/\s*```$/, "");

    lastFilePath = await window.api.saveHTML(html, title);
    document.getElementById("preview").src = lastFilePath;
  } catch (e) {
    showAlert("Greška: " + e.message);
  } finally {
    generateBtn.disabled = false;
    spinner.classList.remove("visible");
  }
}

let ruleId = 0;

function addRule(data = {}) {
  const container = document.getElementById("rulesContainer");

  const wrapper = document.createElement("div");
  wrapper.className = "rule";
  wrapper.setAttribute("data-id", ruleId);

  const ruleHtml = `
    <button type="button" class="remove-button" title="Obriši ovaj uslov" onclick="deleteRule(${ruleId})" style="position:absolute; right:15px; top:15px;"><i data-lucide="trash"></i></button>

    <label style="margin-top: 50px;" ><b>IF (uslov):</b></label><br />
    <input type="text" class="if" value="${
      data.if || ""
    }" spellcheck="false" placeholder="Opis uslova koji pokreće akciju, npr. 'Objekat A dodiruje vodu'" style="width: 90%;" required /><br />

    <label><b>THEN (prvi klik):</b></label><br />
    <input type="text" class="thenFirst" value="${
      data.then_first || ""
    }" spellcheck="false" placeholder="Šta se dešava kada se uslov ispuni, npr. 'Objekat A počinje da pluta'" style="width: 90%;" required /><br />

    <label><b>Naknadni klikovi:</b></label>
    <div class="thenNextContainer"></div>
    <button type="button" class="addRule-button" onclick="addNextClick(this)"><i data-lucide="plus"></i>Dodaj ponašanje za sledeći klik</button>

    <label><b>Pozicija objekta:</b></label><br />
    <input type="text" class="position" value="${
      data.position || ""
    }" spellcheck="false" placeholder="Gde se objekat pojavljuje ili pomera"style="width: 90%;" required /><br />

    <label><b>Stil objekta:</b></label><br />
    <input type="text" class="style" value="${
      data.style || ""
    }" spellcheck="false" placeholder="Kako objekat izgleda (boja, oblik, veličina)" style="width: 90%;" required /><br />
  `;

  wrapper.innerHTML = ruleHtml;

  container.appendChild(wrapper);
  lucide.createIcons(wrapper);
  ruleId++;
}

function addNextClick(button) {
  const container = button.previousElementSibling; // .thenNextContainer

  const wrapper = document.createElement("div");
  wrapper.className = "thenNextWrapper";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "space-between";
  wrapper.style.marginBottom = "15px";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "thenNext";
  input.style.flexGrow = "1";
  input.style = "margin-right: 18px;";
  input.style.marginBottom = "0";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "remove-button";
  deleteBtn.title = "Obriši ovaj klik";
  deleteBtn.onclick = () => {
    wrapper.remove();
    updateClickPlaceholders(container);
  };

  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", "trash");

  deleteBtn.appendChild(icon);
  wrapper.appendChild(input);
  wrapper.appendChild(deleteBtn);
  container.appendChild(wrapper);

  lucide.createIcons(wrapper);
  updateClickPlaceholders(container);
}

function updateClickPlaceholders(container) {
  const wrappers = container.querySelectorAll(".thenNextWrapper");
  wrappers.forEach((wrapper, index) => {
    const input = wrapper.querySelector("input.thenNext");
    input.placeholder = `THEN na klik ${index + 2}`;
  });
}

function deleteRule(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
}

function collectRules() {
  const rules = [];
  const ruleDivs = document.querySelectorAll(".rule");

  ruleDivs.forEach((rule) => {
    const thenNextInputs = rule.querySelectorAll(".thenNext");
    const thenNextArray = Array.from(thenNextInputs)
      .map((input) => input.value.trim())
      .filter((value) => value !== "");

    rules.push({
      if: rule.querySelector(".if").value,
      then_first: rule.querySelector(".thenFirst").value,
      then_next: thenNextArray,
      position: rule.querySelector(".position").value,
      style: rule.querySelector(".style").value,
    });
  });

  return rules;
}

async function download() {
  if (!lastFilePath) {
    showAlert("Nema generisanog alata za preuzimanje!");
    return;
  }
  try {
    const zipPath = await window.api.zipHTML();
    showAlert("ZIP kreiran: " + zipPath);
  } catch (e) {
    showAlert("Greška prilikom pravljenja ZIP-a: " + e.message);
  }
}

function resetForm() {
  const inputs = document.querySelectorAll(
    ".container input, .container textarea:not(#generatedDescription)"
  );
  inputs.forEach((el) => (el.value = ""));
  const rulesContainer = document.getElementById("rulesContainer");
  if (rulesContainer) {
    rulesContainer.innerHTML = "";
  }
}

// ---------------- Wizard logika ----------------
function initWizard() {
  let currentStep = 1;
  const steps = document.querySelectorAll(".form-step");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const chatBtn = document.getElementById("chatBtn");
  const resetBtn = document.getElementById("resetBtn");
  const importBtn = document.getElementById("importBtn");
  const generateButtons = document.querySelector(".generate-tool-buttons");
  const preview = document.getElementById("preview");

  function showStep(step) {
    steps.forEach((s, i) => {
      if (i === step - 1) {
        s.classList.add("active");
        s.classList.remove("fade-out");
      } else {
        s.classList.remove("active");
        s.classList.remove("fade-out");
      }
    });

    prevBtn.style.display = step === 1 ? "none" : "inline-flex";

    if (step === 3) {
      nextBtn.style.display = "none";
      chatBtn.style.display = "none";
      resetBtn.style.display = "none";
      importBtn.style.display = "none";
    } else if (step === 1) {
      nextBtn.style.display = "inline-flex";
      resetBtn.style.display = "inline-flex";
      importBtn.style.display = "inline-flex";
      chatBtn.style.display = "none";
    } else if (step === 2) {
      const previewHasContent = preview.src.trim() !== "";
      if (previewHasContent) {
        chatBtn.style.display = "inline-flex";
        resetBtn.style.display = "inline-flex";
        nextBtn.style.display = "none";
        importBtn.style.display = "none";
      } else {
        nextBtn.style.display = "none";
        chatBtn.style.display = "none";
        resetBtn.style.display = "inline-flex";
        importBtn.style.display = "none";
      }
    }

    if (step === 2) {
      generateButtons.classList.remove("fade-out");
    } else {
      generateButtons.classList.add("fade-out");
    }
  }

  function validateStep1() {
    const fields = [
      { id: "title", name: "Naziv alata" },
      { id: "description", name: "Opis koncepta" },
      { id: "audience", name: "Ciljna grupa" },
      { id: "initial", name: "Početni prikaz" },
    ];

    let valid = true;

    fields.forEach((field) => {
      const input = document.getElementById(field.id);
      const errorDiv = document.getElementById("error-" + field.id);
      const value = input.value.trim();

      if (!value) {
        valid = false;
        input.classList.add("error");
        errorDiv.textContent = `${field.name} je obavezno.`;
      } else {
        input.classList.remove("error");
        errorDiv.textContent = "";
      }
    });

    return valid;
  }

  function goToStep(newStep) {
    if (newStep < 1 || newStep > steps.length || newStep === currentStep)
      return;

    if (newStep === 2 && !validateStep1()) {
      showAlert(
        "Popuni sva obavezna polja pre nego što pređeš na sledeći korak!"
      );
      return;
    }

    const oldStep = steps[currentStep - 1];
    oldStep.classList.add("fade-out");
    oldStep.classList.remove("active");

    setTimeout(() => {
      currentStep = newStep;
      showStep(currentStep);
    }, 500);
  }

  nextBtn.addEventListener("click", () => goToStep(currentStep + 1));
  prevBtn.addEventListener("click", () => goToStep(currentStep - 1));
  chatBtn.addEventListener("click", () => goToStep(3));

  showStep(currentStep);

  const observer = new MutationObserver(() => {
    if (preview.src.trim() !== "" && currentStep === 2) {
      chatBtn.style.display = "inline-flex";
    } else {
      chatBtn.style.display = "none";
    }
  });

  observer.observe(preview, { attributes: true, attributeFilter: ["src"] });
}

// ---------------- Image upload i generisanje opisa ----------------
function initImageModal() {
  const selectBtn = document.getElementById("selectImageBtn");
  const sceneInput = document.getElementById("sceneImage");
  const thumbnail = document.getElementById("sceneThumbnail");
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const generateFromImageBtn = document.getElementById("generateFromImageBtn");
  const generatedDescription = document.getElementById("generatedDescription");
  let selectedFile = null;

  selectBtn.addEventListener("click", () => sceneInput.click());

  sceneInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
      thumbnail.src = "";
      thumbnail.style.display = "none";
      selectedFile = null;
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      thumbnail.src = ev.target.result;
      thumbnail.style.display = "inline-block";
      modalImg.src = ev.target.result;
      thumbnail.title = "Pogledaj sliku";
    };
    reader.readAsDataURL(file);
  });

  thumbnail.addEventListener("click", () => {
    if (!thumbnail.src) return;
    modal.classList.add("active");
    modalImg.src = thumbnail.src;
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  generateFromImageBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      showAlert("Izaberi sliku pre nego što generišeš opis od slike!");
      return;
    }

    const spinner = document.getElementById("spinnerImage");
    const initialTextarea = document.getElementById("initial");
    const initialColumn = initialTextarea.closest(".initial-column");

    spinner.classList.add("visible");
    initialColumn.classList.add("disabled-expand");
    generateFromImageBtn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imageBase64 = ev.target.result;
      try {
        const generatedText = await window.api.generateDescriptionFromImage({
          image: imageBase64,
        });

        generatedDescription.value = generatedText;
        if (generatedText.trim() !== "") {
          generatedDescription.classList.add("has-text-focus");
        }
      } catch (err) {
        showAlert("Greška: " + err.message);
      } finally {
        spinner.classList.remove("visible");
        generateFromImageBtn.disabled = false;
        initialColumn.classList.remove("disabled-expand");
      }
    };
    reader.readAsDataURL(selectedFile);
  });

  generatedDescription.addEventListener("focus", () => {
    if (generatedDescription.value.trim() !== "") {
      generatedDescription.classList.add("has-text-focus");
    }
  });
  generatedDescription.addEventListener("blur", () => {
    generatedDescription.classList.remove("has-text-focus");
  });
}

function initCopyButton() {
  const copyBtn = document.querySelector(".copy-btn");
  const generatedDescription = document.getElementById("generatedDescription");

  if (!copyBtn || !generatedDescription) return;

  copyBtn.addEventListener("click", () => {
    if (!generatedDescription.value) return;

    navigator.clipboard
      .writeText(generatedDescription.value)
      .then(() => {
        copyBtn.textContent = "kopiran";
        setTimeout(() => {
          copyBtn.innerHTML = '<i data-lucide="copy"></i>';
          lucide.createIcons();
        }, 1000);
      })
      .catch((err) => {
        console.error("Greška pri kopiranju:", err);
      });
  });
}

function showAlert(message) {
  const alertModal = document.getElementById("alertModal");
  const alertMessage = document.getElementById("alertMessage");
  const closeAlert = document.getElementById("closeAlert");

  alertMessage.textContent = message;
  alertModal.classList.add("active");

  closeAlert.onclick = () => {
    alertModal.classList.remove("active");
  };
}

const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const sendChat = document.getElementById("sendChat");

sendChat.addEventListener("click", async () => {
  const instruction = chatInput.value.trim();
  if (!instruction) return;

  const previewIframe = document.getElementById("preview");
  const html = previewIframe.contentDocument
    ? previewIframe.contentDocument.documentElement.outerHTML
    : previewIframe.srcdoc || "";

  chatMessages.innerHTML += `
    <div class="chat-bubble user-msg">
      <div class="msg-text">${instruction}</div>
    </div>
  `;
  chatInput.value = "";
  chatMessages.scrollTop = chatMessages.scrollHeight;

  chatInput.disabled = true;
  sendChat.disabled = true;

  const spinnerId = "spinner-" + Date.now();
  chatMessages.innerHTML += `
    <div class="chat-bubble gpt-msg" id="${spinnerId}">
      <div class="msg-text">
        <div class="loader"></div> Generisanje alata...
      </div>
    </div>
  `;
  try {
    let newHtml = await window.api.editTool({ html, instruction });
    newHtml = newHtml.replace(/^```html\s*/, "");
    newHtml = newHtml.replace(/\s*```$/, "");

    let title = document.getElementById("title").value.trim();

    lastFilePath = await window.api.saveHTML(newHtml, title);
    document.getElementById("preview").src = lastFilePath;
    const spinnerEl = document.getElementById(spinnerId);
    if (spinnerEl) {
      spinnerEl.innerHTML = `<div class="msg-text">✅ Alat ažuriran.</div>`;
    }
  } catch (err) {
    const spinnerEl = document.getElementById(spinnerId);
    if (spinnerEl) {
      spinnerEl.innerHTML = `<div class="msg-text">❌ Greška: ${err.message}</div>`;
    }
  } finally {
    chatInput.disabled = false;
    sendChat.disabled = false;
    chatInput.focus();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat.click();
  }
});

const importBtn = document.getElementById("importBtn");
const jsonInput = document.getElementById("jsonInput");

importBtn.addEventListener("click", () => jsonInput.click());

jsonInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      renderTool(data);
    } catch (err) {
      alert("Nevalidan JSON fajl!");
      console.error(err);
    }
  };
  reader.readAsText(file);
});

// funkcija za renderovanje podataka iz JSON-a
function renderTool(data) {
  document.getElementById("title").value = data.title || "";
  document.getElementById("audience").value = data.audience || "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("initial").value = data.initial || "";
  document.getElementById("extras").value = data.extras || "";

  const container = document.getElementById("rulesContainer");
  container.innerHTML = "";
  ruleId = 0;

  if (data.interactions && Array.isArray(data.interactions)) {
    data.interactions.forEach((interaction) => {
      addRule({
        if: interaction.if || "",
        then_first: interaction.then_first || "",
        position: interaction.position || "",
        style: interaction.style || "",
      });

      const currentRule = container.querySelector(`[data-id="${ruleId - 1}"]`);
      const thenNextContainer = currentRule.querySelector(".thenNextContainer");
      if (interaction.then_next && Array.isArray(interaction.then_next)) {
        interaction.then_next.forEach((next) => {
          addNextClick(thenNextContainer.nextElementSibling);
          const inputs = thenNextContainer.querySelectorAll(".thenNext");
          inputs[inputs.length - 1].value = next;
        });
      }
    });
  }
}
