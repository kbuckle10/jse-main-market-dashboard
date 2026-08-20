import fs from 'node:fs';

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// Never send users to the generic Listed Companies page from a stock row.
// A ticker/JSE source should use only the direct instrument URL captured by
// refresh-jse-links.mjs. When not yet captured, javascript:void(0) prevents
// a misleading navigation until the collector fills jseUrl/jse.
html = html.replace(
  "const jse=x=>x.jseUrl||x.jse||JSE_LIST;",
  "const jse=x=>x.jseUrl||x.jse||'javascript:void(0)';"
);

html = html.replace(
  '<b>Links:</b> ticker and JSE source open the captured direct JSE instrument page when available',
  '<b>Links:</b> ticker and JSE source open only the captured direct JSE instrument page (instrument=NN)'
);

fs.writeFileSync(file, html);
console.log('Dashboard patched to require direct JSE instrument links.');
