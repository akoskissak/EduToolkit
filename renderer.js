// functionalities
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("generateBtn").addEventListener("click", generate);
  document.getElementById("downloadBtn").addEventListener("click", download);
  document.getElementById("resetBtn").addEventListener("click", resetForm);
  lucide.createIcons();
});

// change theme
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

let lastFilePath = null;

async function generate() {
  const spinner = document.getElementById("spinner");
  spinner.classList.add("visible");

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
    spinner.classList.remove("visible");
    return;
  }

  const { title, description, audience, initial } = values;

  if (!title || !description || !audience || !initial || !interactions) {
    alert("Popuni sva obavezna polja!");
    spinner.classList.remove("visible");
    return;
  }

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
    alert("Greška: " + e.message);
  } finally {
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
    }" style="width: 90%;" required /><br />

    <label><b>THEN (prvi klik):</b></label><br />
    <input type="text" class="thenFirst" value="${
      data.then_first || ""
    }" style="width: 90%;" required /><br />

    <label><b>Naknadni klikovi:</b></label>
    <div class="thenNextContainer"></div>
    <button type="button" class="addRule-button" onclick="addNextClick(this)"><i data-lucide="plus"></i>Dodaj ponašanje za sledeći klik</button>

    <label><b>Pozicija objekta:</b></label><br />
    <input type="text" class="position" value="${
      data.position || ""
    }" style="width: 90%;" required /><br />

    <label><b>Stil objekta:</b></label><br />
    <input type="text" class="style" value="${
      data.style || ""
    }" style="width: 90%;" required /><br />
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
    alert("Nema generisanog alata za preuzimanje!");
    return;
  }
  try {
    const zipPath = await window.api.zipHTML();
    alert("ZIP kreiran: " + zipPath);
  } catch (e) {
    alert("Greška prilikom pravljenja ZIP-a: " + e.message);
  }
}

function resetForm() {
  const inputs = document.querySelectorAll(
    ".container input, .container textarea"
  );
  inputs.forEach((el) => (el.value = ""));
  const rulesContainer = document.getElementById("rulesContainer");
  if (rulesContainer) {
    rulesContainer.innerHTML = "";
  }
}
