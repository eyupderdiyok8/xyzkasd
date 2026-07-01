const PDFDocument = require('pdfkit/js/pdfkit.standalone');
const fs = require('fs');

const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

try {
  const doc = new PDFDocument();
  let chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => console.log('PDF generated, size:', Buffer.concat(chunks).length));

  const base64Data = dataUrl.split(',')[1];
  const buf = Buffer.from(base64Data, 'base64');
  console.log('Buffer created, length:', buf.length);

  try {
    doc.image(buf, 50, 50, { width: 100 });
    console.log('Image added from Buffer successfully');
  } catch (err) {
    console.error('Error adding image from Buffer:', err.message);
    
    // Try ArrayBuffer
    try {
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      doc.image(ab, 50, 50, { width: 100 });
      console.log('Image added from ArrayBuffer successfully');
    } catch (err2) {
      console.error('Error adding image from ArrayBuffer:', err2.message);
    }
  }

  doc.end();
} catch (e) {
  console.error('General error:', e);
}
