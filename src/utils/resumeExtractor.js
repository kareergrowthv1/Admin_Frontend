import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Use the bundled worker from node_modules directly (no CDN, no version mismatch)
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';
pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();

export const extractTextFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension === 'pdf') return await extractTextFromPdf(file);
    if (extension === 'docx') return await extractTextFromDocx(file);
    if (extension === 'doc') throw new Error('Legacy .doc files are not supported. Please use .pdf or .docx');
    throw new Error('Unsupported file format');
};

const extractTextFromPdf = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // Preserve line breaks better by checking y-position
            let lastY = null;
            let lineText = '';
            for (const item of textContent.items) {
                const y = item.transform?.[5];
                if (lastY !== null && Math.abs(y - lastY) > 2) {
                    fullText += lineText.trim() + '\n';
                    lineText = '';
                }
                lineText += item.str + ' ';
                lastY = y;
            }
            if (lineText.trim()) fullText += lineText.trim() + '\n';
        }
        return fullText;
    } catch (error) {
        console.error('PDF extraction failed:', error);
        throw new Error('Failed to extract text from PDF: ' + error.message);
    }
};

const extractTextFromDocx = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error('DOCX extraction failed:', error);
        throw new Error('Failed to extract text from DOCX');
    }
};
