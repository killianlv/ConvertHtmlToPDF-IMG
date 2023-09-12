const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

async function openBrowserAndLoadHtml(htmlFilePath) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
    await page.setContent(htmlContent);
    return { browser, page };
}

async function convertToPdf(htmlFilePath) {
    const { browser, page } = await openBrowserAndLoadHtml(htmlFilePath);
    const pdfFilePath = `output.pdf`;
    await page.pdf({ path: pdfFilePath, format: 'A4' });
    await browser.close();
    return pdfFilePath;
}

async function convertToImage(htmlFilePath) {
    const { browser, page } = await openBrowserAndLoadHtml(htmlFilePath);
    const imageFilePath = `output.png`;
    const screenshot = await page.screenshot();
    await sharp(screenshot).toFile(imageFilePath);
    await browser.close();
    return imageFilePath;
}

app.post('/convert', upload.single('htmlFile'), async (req, res) => {
  const { path: htmlFilePath } = req.file;
  const conversionType = req.body.conversionType;

  try {
    let filePath;

    if (conversionType === 'pdf') {
      filePath = await convertToPdf(htmlFilePath);
    } else if (conversionType === 'image') {
      filePath = await convertToImage(htmlFilePath);
    } else {
      throw new Error('Invalid conversion type');
    }

    res.download(filePath, () => {
      fs.unlinkSync(htmlFilePath);
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Une erreur s\'est produite lors de la conversion.');
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
