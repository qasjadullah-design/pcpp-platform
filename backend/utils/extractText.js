const path = require('path');

const MAX_EXTRACTED_TEXT_LENGTH = 500_000;
const cap = (value) => String(value || '').slice(0, MAX_EXTRACTED_TEXT_LENGTH);

const extractText = async (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  try {
    if (extension === '.pdf') {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      try {
        const result = await parser.getText();
        return cap(result.text);
      } finally {
        await parser.destroy();
      }
    }
    if (extension === '.docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return cap(result.value);
    }
  } catch (error) {
    // A corrupt or unsupported document must never make an upload fail.
    console.warn(`Text extraction skipped for ${file.originalname}:`, error.message);
  }
  return null;
};

module.exports = { extractText };
