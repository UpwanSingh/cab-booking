import fs from 'fs';
import { createCanvas } from 'canvas';

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0a0e17'; // App Dark Theme
    ctx.fillRect(0, 0, size, size);

    // Inner Circle (Accent)
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981'; // CabGo Emerald Green
    ctx.fill();

    // Text "C"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.4}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', size / 2, size / 2);

    // Write to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`./public/pwa-${size}x${size}.png`, buffer);
    console.log(`Generated ./public/pwa-${size}x${size}.png`);
}

generateIcon(192);
generateIcon(512);
