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

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
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
    const systemPrompt = `
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

      - **"interactions"**: Niz pravila koja definišu kako objekti reaguju na korisničke akcije. Svako pravilo sadrži sledeća polja:
        - **"if"**: Uslov koji aktivira pravilo (npr. klik na određeni objekat ili poziciju).
        - **"then_first"**: Akcija koja se izvršava pri prvom ispunjenju uslova (npr. promena boje, prikaz teksta).
        - **"then_next"**: Lista akcija koje se izvršavaju redosledno pri svakom sledećem aktiviranju istog uslova.
        - **"position"**: Početna pozicija objekta na ekranu, obično u koordinatama (x, y). Koristi se za precizno postavljanje interaktivnih elemenata.
        - **"style"**: Stilizacija objekta — uključuje vizuelne osobine poput boje, ivica, oblika i veličine. Koristi se za inicijalno renderovanje objekta.

      Implementiraj mehanizam koji detektuje klikove i prati broj klikova po objektu kako bi pravilno menjao ponašanje kroz "then_first" i "then_next" sekvence.

      - **"extras"**: Opcionalno polje sa dodatnim funkcionalnostima kao što su animacije, dodatne vizualizacije, pojavljivanje teksta, audio efekti, itd. Uključi ih kao dopune osnovnim ponašanjima, u skladu sa semantikom datih opisa.

      Na kraju, generiši jedan ".html" dokument koji uključuje sve potrebne elemente (HTML, ugrađeni CSS, ugrađeni JavaScript), potpuno funkcionalan i spreman za lokalno otvaranje u pregledaču.
      Ne dodaj nikakve dodatne komentare, uvodne rečenice, objašnjenja ili tekst izvan HTML koda. Output mora sadržati isključivo jedan validan HTML dokument bez ikakvog zaglavlja, uvoda ili tumačenja.
      </instruction>`;

    const userPrompt = `<content>
      {
        "title": "${title}",
        "audience": "${audience}",
        "description": "${description}",
        "initial": "${initial}",
        "interactions": ${JSON.stringify(interactions, null, 2)},
        "extras": "${extras}"
      }
      </content>
    `;

    // const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro" });
    // const result = await model.generateContent(prompt);
    // const response = await result.response;
    // const text = response.text();

    // return text;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
