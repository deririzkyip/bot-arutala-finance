const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(express.json());

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Database Sementara (Gunakan Database asli untuk permanen)
let financeData = { records: [] };

const formatRupiah = (num) => "Rp." + num.toLocaleString('id-ID');
const parseNominal = (str) => {
    let val = str.toLowerCase().replace(/k/g, '000').replace(/rb/g, '000');
    return parseInt(val) || 0;
};

const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('BOT_ARUTALA aktif!'));

client.on('message', async (msg) => {
    const text = msg.body.toLowerCase();
    
    // LOGIKA KEUANGAN
    if (text.startsWith('pemasukan')) {
        const nominal = parseNominal(text.split(' ')[1] || '0');
        financeData.records.push({ type: 'pemasukan', desc: 'Pemasukan', amount: nominal, date: new Date().toLocaleDateString('id-ID') });
        return msg.reply(`BOT_ARUTALA: Data tersimpan.\nPemasukan: ${formatRupiah(nominal)}`);
    }

    if (text.startsWith('pengeluaran')) {
        const parts = text.split(' ');
        const nominal = parseNominal(parts[parts.length - 1]);
        const desc = parts.slice(1, parts.length - 1).join(' ');
        financeData.records.push({ type: 'pengeluaran', desc: desc, amount: nominal, date: new Date().toLocaleDateString('id-ID') });
        return msg.reply(`BOT_ARUTALA: Data tersimpan.\nPengeluaran ${desc}: ${formatRupiah(nominal)}`);
    }

    if (text === 'info') {
        let p = financeData.records.filter(r => r.type === 'pemasukan');
        let e = financeData.records.filter(r => r.type === 'pengeluaran');
        let report = "*Laporan Keuangan -BOT_ARUTALA*\n\n*Pemasukan:*\n";
        p.forEach(r => report += `${r.date} ${formatRupiah(r.amount)}\n`);
        report += "\n*Pengeluaran:*\n";
        e.forEach(r => report += `${r.date} ${r.desc} ${formatRupiah(r.amount)}\n`);
        const total = p.reduce((a, b) => a + b.amount, 0) - e.reduce((a, b) => a + b.amount, 0);
        report += `\n*Sisa uang Anda saat ini:*\n${formatRupiah(total)}`;
        return msg.reply(report);
    }

    // LOGIKA AI (Gemini) - Jika bukan perintah keuangan
    try {
        const result = await model.generateContent(`Anda adalah BOT_ARUTALA, asisten serba bisa. Jawab ini: ${msg.body}`);
        msg.reply(`BOT_ARUTALA: ${result.response.text()}`);
    } catch (err) {
        msg.reply("BOT_ARUTALA: Maaf, sedang ada gangguan teknis.");
    }
});

client.initialize();
app.listen(process.env.PORT || 3000);