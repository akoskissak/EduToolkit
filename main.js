const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require("dotenv").config();
const fs = require("fs");
const AdmZip = require("adm-zip");

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let lastGeneratedFolder = null;

let mainWindow;
let splash;

function createWindow() {
  splash = new BrowserWindow({
    width: 400,
    height: 200,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
  });
  splash.loadFile(path.join(__dirname, "splash.html"));

  mainWindow = new BrowserWindow({
    fullscreen: true,
    resizable: false,
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    splash.destroy();
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle(
  "generate-html",
  async (
    event,
    { title, description, audience, initial, interactions, extras }
  ) => {
    const systemPrompt = getSystemPrompt("en", interactions, extras);

    const content = {
      title,
      audience,
      description,
      initial,
    };

    if (
      Array.isArray(interactions) &&
      interactions.some((obj) => obj.if && obj.if.trim() !== "")
    ) {
      content.interactions = interactions;
    }

    if (extras && extras.trim() !== "") {
      content.extras = extras;
    }

    const userPrompt = `<content>
    ${JSON.stringify(content, null, 2)}
    </content>`;

    console.log("-----------------------------------\n" + systemPrompt);
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: userPrompt },
      ],
    });

    return completion.choices[0].message.content;
  }
);

function getSystemPrompt(lang = "sr", interactions = [], extras = "") {
  const prompts = {
    sr: {
      goal: `
        <goal>
        Generiši jedan samostalan ".html" dokument koji predstavlja kompletan interaktivni obrazovni alat. 
        Dokument mora imati ugrađen CSS i JavaScript kod, uljuči ili p5.js ili d3.j biblioteke po potrebi.
        Alat treba da vizuelno i interaktivno prikazuje obrazovni koncept opisan kroz ulazne podatke, koristeći IF-THEN logiku ponašanja objekata.
        U početnom prikazu se jasno vidi naslov, opis i početno stanje elemenata, a korisničke interakcije kroz klikove pokreću odgovarajuće reakcije.
        Izlaz mora biti jedan funkcionalan ".html" fajl, spreman za direktno pokretanje u web pregledaču bez dodatnih podešavanja.
        </goal>
        <instruction>
        Obradi svaki ključ iz JSON ulaza prema sledećem značenju i uputstvu:

        - **"title"**: Predstavlja naziv interaktivnog alata. Ovaj tekst koristi kao glavni naslov stranice (npr. unutar "<h1>" taga), vidljivo prikazan na vrhu alata. Treba jasno da identifikuje temu ili funkcionalnost alata.

        - **"audience"**: Opis ciljne grupe kojoj je alat namenjen (npr. osnovnoškolci, studenti, nastavnici). Ova informacija je meta-podatak i nije namenjena za prikaz u korisničkom interfejsu, ali je možeš uključiti kao komentar u HTML kodu radi orijentacije programera.

        - **"description"**: Tekstualni opis obrazovnog koncepta koji alat ilustruje. Ovaj sadržaj prikaži kao paragraf (npr. unutar "<p>") ispod naslova, kao uvod u alat. Treba da bude lako čitljiv i jasno objašnjava svrhu i funkciju alata.

        - **"initial"**: Definiše početno vizuelno stanje objekata na ekranu — njihove pozicije, oblike, veličine, boje i raspored. Na osnovu ovog opisa generiši početni prikaz koristeći HTML canvas, SVG, ili biblioteke poput p5.js ili D3.js. Ovo je početna scena koju korisnik vidi pre nego što započne interakciju.
        `,
      interactions: `
        - **"interactions"**: Niz pravila koja definišu kako objekti reaguju na korisničke akcije. Svako pravilo sadrži sledeća polja:
          - **"if"**: Uslov koji aktivira pravilo (npr. klik na određeni objekat ili poziciju).
          - **"then_first"**: Akcija koja se izvršava pri prvom ispunjenju uslova (npr. promena boje, prikaz teksta).
          - **"then_next"**: Lista akcija koje se izvršavaju redosledno pri svakom sledećem aktiviranju istog uslova.
          - **"position"**: Početna pozicija objekta na ekranu, obično u koordinatama (x, y). Koristi se za precizno postavljanje interaktivnih elemenata.
          - **"style"**: Stilizacija objekta — uključuje vizuelne osobine poput boje, ivica, oblika i veličine. Koristi se za inicijalno renderovanje objekta.

          Implementiraj mehanizam koji detektuje klikove i prati broj klikova po objektu kako bi pravilno menjao ponašanje kroz "then_first" i "then_next" sekvence.
          `,
      extras: `
        - **"extras"**: Polje sa dodatnim funkcionalnostima kao što su animacije, dodatne vizualizacije, pojavljivanje teksta, audio efekti, itd. Uključi ih kao dopune osnovnim ponašanjima, u skladu sa semantikom datih opisa.
        `,
      footer: `
        Na kraju, generiši jedan ".html" dokument koji uključuje sve potrebne elemente (HTML, ugrađeni CSS, ugrađeni JavaScript), potpuno funkcionalan i spreman za lokalno otvaranje u pregledaču.
        Ne dodaj nikakve dodatne komentare, uvodne rečenice, objašnjenja ili tekst izvan HTML koda. Output mora sadržati isključivo jedan validan HTML dokument bez ikakvog zaglavlja, uvoda ili tumačenja.
        </instruction>`,
    },
    en: {
      goal: `
        <goal>
        Generate a standalone ".html" document representing a complete interactive educational tool.
        The document must include embedded CSS and JavaScript code, and optionally use p5.js or D3.js libraries if needed.
        The tool should visually and interactively illustrate the educational concept described by the input data, using IF-THEN logic for object behaviors.
        In the initial view, the title, description, and initial state of the elements should be clearly visible, while user interactions through clicks trigger the appropriate reactions.
        The output must be a single functional ".html" file, ready to run directly in a web browser without additional setup.
        </goal>
        <instruction>
        Process each key from the JSON input according to the following meaning and instructions:

        - **"title"**: Represents the name of the interactive tool. Use this text as the main page heading (e.g., inside an "<h1>" tag), visibly displayed at the top of the tool. It should clearly identify the topic or functionality of the tool.

        - **"audience"**: Describes the target group for which the tool is intended (e.g., elementary students, university students, teachers). This information is metadata and is not intended for display in the user interface, but you may include it as a comment in the HTML code for developer orientation.

        - **"description"**: Textual description of the educational concept illustrated by the tool. Display this content as a paragraph (e.g., inside a "<p>") below the title as an introduction to the tool. It should be easily readable and clearly explain the purpose and function of the tool.

        - **"initial"**: Defines the initial visual state of objects on the screen — their positions, shapes, sizes, colors, and layout. Based on this description, generate the initial view using HTML canvas, SVG, or libraries like p5.js or D3.js. This is the initial scene the user sees before interacting.
        `,
      interactions: `
        - **"interactions"**: An array of rules that define how objects respond to user actions. Each rule contains the following fields:
          - **"if"**: The condition that triggers the rule (e.g., click on a specific object or position).
          - **"then_first"**: The action executed the first time the condition is met (e.g., change color, display text).
          - **"then_next"**: A list of actions executed sequentially each subsequent time the same condition is triggered.
          - **"position"**: The initial position of the object on the screen, usually in (x, y) coordinates. Used for precise placement of interactive elements.
          - **"style"**: Object styling — includes visual properties like color, borders, shape, and size. Used for the initial rendering of the object.

        Implement a mechanism that detects clicks and tracks the number of clicks per object to correctly change behavior through the "then_first" and "then_next" sequences.
        `,
      extras: `
        - **"extras"**: A field with additional functionalities such as animations, extra visualizations, text appearance, audio effects, etc. Include them as enhancements to the basic behaviors, according to the semantics of the given descriptions.
        `,
      footer: `
        Finally, generate a single ".html" document that includes all necessary elements (HTML, embedded CSS, embedded JavaScript), fully functional and ready for local opening in a browser.
        Do not add any extra comments, introductory sentences, explanations, or text outside the HTML code. The output must consist solely of a single valid HTML document without any header, introduction, or interpretation.
        </instruction>`,
    },
  };

  let prompt = prompts[lang].goal;

  if (
    Array.isArray(interactions) &&
    interactions.some((obj) => obj.if && obj.if.trim() !== "")
  ) {
    prompt += prompts[lang].interactions;
  }

  if (extras && extras.trim() !== "") {
    prompt += prompts[lang].extras;
  }

  prompt += prompts[lang].footer;

  return prompt;
}

ipcMain.handle("generateDescriptionFromImage", async (event, { image }) => {
  const systemPrompt = `
  Generiši detaljan, kratak i edukativan opis scene sa slike. 
  Opis treba da istakne sve važne elemente scene, uključujući objekte, aktivnosti, boje i raspored u prostoru. 
  Fokusiraj se na ono što je vizuelno jasno vidljivo i potencijalno interaktivno za učenike, bez pretpostavki ili imaginacije. 
  Odgovor treba biti u jednom pasusu (3–4 rečenice), pisan jednostavnim, razumljivim jezikom, bez komentara, uputstava ili pitanja.
  `;

  const userPrompt = `Ovo je Base64 slika: ${image}. Napiši kratak tekstualni opis scene.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userPrompt,
          },
          {
            type: "image_url",
            image_url: { url: image },
          },
        ],
      },
    ],
  });

  console.log("=== Generisani opis iz slike ===");
  console.log(completion.choices[0].message.content);
  console.log("================================");

  return completion.choices[0].message.content;
});

// IPC za generisanje i snimanje
ipcMain.handle("save-html", async (event, { html, title }) => {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "_")
    .replace(/\..+/, "");

  // ciscenje title-a
  const rawTitle =
    typeof title === "string" && title.trim() !== "" ? title : "Untitled";
  const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, "_");

  const dirName = `${safeTitle}_${timestamp}`;
  const folderPath = path.join(__dirname, "generated", dirName);

  fs.mkdirSync(folderPath, { recursive: true });

  const filePath = path.join(folderPath, "index.html");
  fs.writeFileSync(filePath, html, "utf-8");

  lastGeneratedFolder = folderPath;

  return filePath;
});

// IPC za zipovanje
ipcMain.handle("zip-html", async (event) => {
  if (!lastGeneratedFolder || !fs.existsSync(lastGeneratedFolder)) {
    throw new Error("Nema generisanog HTML foldera");
  }
  const zip = new AdmZip();
  zip.addLocalFolder(lastGeneratedFolder);

  const folderName = path.basename(lastGeneratedFolder);
  const zipPath = path.join(__dirname, "generated", `${folderName}.zip`);
  zip.writeZip(zipPath);

  return zipPath;
});

ipcMain.handle("edit-tool", async (event, { html, instruction }) => {
  const systemPrompt = `
    <goal>
    Tvoj zadatak je da izmeniš postojeći interaktivni HTML alat prema instrukcijama koje dolaze iz "instruction".
    Sačuvaj sve postojeće HTML elemente, CSS i JavaScript funkcionalnosti osim ako instrukcija jasno ne nalaže promenu.
    Rezultat mora biti jedan validan, samostalan HTML dokument koji može da se otvori direktno u browseru.
    Ne dodaj nikakve komentare, uvodne tekstove, objašnjenja ili bilo kakav sadržaj izvan HTML koda.
    </goal>
    <instruction>
    ${instruction}
    </instruction>
    <currentHTML>
    ${html}
    </currentHTML>
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Primeni instrukciju i vrati samo HTML dokument",
        },
      ],
    });

    const editedHtml = completion.choices[0].message.content;
    return editedHtml;
  } catch (err) {
    console.error("Greška u editTool:", err);
    throw new Error("Neuspešno editovanje alata: " + err.message);
  }
});

ipcMain.handle("close-app", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});
