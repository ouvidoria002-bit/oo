import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputImage = path.join(__dirname, '../public/tarifazerobus.png');
const output192 = path.join(__dirname, '../public/pwa-192x192.png');
const output512 = path.join(__dirname, '../public/pwa-512x512.png');
const outputApple = path.join(__dirname, '../public/apple-touch-icon.png');

async function generateIcons() {
    try {
        // Generate 192x192
        await sharp(inputImage)
            .resize(192, 192, {
                fit: 'contain',
                background: { r: 11, g: 59, b: 110, alpha: 1 } // #0b3b6e
            })
            .toFile(output192);

        // Generate 512x512
        await sharp(inputImage)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 11, g: 59, b: 110, alpha: 1 }
            })
            .toFile(output512);

        // Generate Apple Touch Icon
        await sharp(inputImage)
            .resize(180, 180, {
                fit: 'contain',
                background: { r: 11, g: 59, b: 110, alpha: 1 }
            })
            .toFile(outputApple);

        console.log('✅ Ícones PWA gerados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao gerar ícones:', error);
    }
}

generateIcons();
