const AdmZip = require('adm-zip');

function zipHTML() {
  const zip = new AdmZip();
  zip.addLocalFile('generated/index.html');
  zip.writeZip("generated_tool.zip");
  alert("Alat je spakovan i spreman za preuzimanje!");
}

module.exports = { zipHTML };
