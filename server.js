import express from "express";
import multer from 'multer';
import sharp from 'sharp';
import os from 'os';
import fs from 'fs';

const app = express();
const port = parseInt(process.env.PORT) || 3000;

const upload = multer({ dest: os.tmpdir() });

app.use(express.static("public"));
app.use(express.json());

app.post('/upload', upload.single('icon'), async (req, res) => {
    try {
        if (!req.file) {
            console.log('No file');
            return res.status(400).send('No file uploaded');
        }

        const baseImage = sharp(req.file.path);
        const metadata = await baseImage.metadata();
        const { width, height } = metadata;

        const size = Math.min(width, height);

        if (width !== height) {
            baseImage.extract({
                left: Math.floor((width - size) / 2),
                top: Math.floor((height - size) / 2),
                width: size,
                height: size
            });
        }

        const overlayPath = 'public/overlay.png';

        const overlayBuffer = await fs.promises.readFile(overlayPath);
        const overlayImage = await sharp(overlayBuffer)
            .resize(size, size)
            .toBuffer();

        const resultBuffer = await baseImage
            .composite([{ input: overlayImage }])
            .png()
            .toBuffer();

        const finalWidth = 500;
        const finalHeight = 500;
        const finalImageBuffer = await sharp(resultBuffer).resize(finalWidth, finalHeight).toBuffer();

        res.set('Content-Type', 'image/png');
        res.send(finalImageBuffer);

        await fs.promises.unlink(req.file.path);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
