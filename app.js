const express = require('express');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;
const DATA_FILE = 'kayitlar.json'; 

// --- YENİ EKLENEN YAPILANDIRMA (Aynı Kaldı) ---
app.set('view engine', 'ejs');
app.set('views', './views'); 
// ---------------------------------

app.use(express.urlencoded({ extended: true }));

// --- DOSYA İŞLEMLERİ (Aynı Kaldı) ---
function loadKayitlar() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function saveKayitlar() {
    const data = JSON.stringify(kayitlar, null, 2); 
    fs.writeFileSync(DATA_FILE, data, 'utf8');
}

let kayitlar = loadKayitlar(); 

// --- SIVI DENGE ANALİZ FONKSİYONU (Aynı Kaldı) ---
function calculateDailyBalance(records) {
    const dailyData = {};
    records.forEach(kayit => {
        const tarih = kayit.tarih;
        const miktar = parseInt(kayit.miktar);
        const tur = kayit.tur;
        if (!dailyData[tarih]) {
            dailyData[tarih] = { giris: 0, cikis: 0 };
        }
        if (tur === 'Su İçildi') {
            dailyData[tarih].giris += miktar;
        } else if (tur === 'İdrar Çıkışı') {
            dailyData[tarih].cikis += miktar;
        }
    });
    return dailyData;
}

// --- SUNUCU YOLLARI (ROUTES) ---

// 1. Anasayfayı gösterme (SIRALAMA MANTIĞI EKLENDİ)
app.get('/', (req, res) => {
    
    // YENİ: URL'den 'sort' parametresini al
    const siralamaTuru = req.query.sort;

    // Ana kayıt listesinin bir kopyası üzerinde çalış (orijinali bozmamak için)
    let siralayiciKayitlar = [...kayitlar]; 
    
    // Sıralama mantığı:
    if (siralamaTuru === 'eskiden_yeniye') {
        // ID'si küçük olan (eskiden girilen) öne gelir
        siralayiciKayitlar.sort((a, b) => a.id - b.id);
    } else if (siralamaTuru === 'yeniden_eskiye' || !siralamaTuru) {
        // Varsayılan olarak ID'si büyük olan (yeniden girilen) öne gelir
        siralayiciKayitlar.sort((a, b) => b.id - a.id);
    } 
    // Not: Farklı sıralama türleri de eklenebilir (örn: miktara göre)

    const dailyBalance = calculateDailyBalance(kayitlar);
    
    // Sıralanmış listeyi EJS'ye gönder
    res.render('index', { 
        kayitlar: siralayiciKayitlar, 
        dailyBalance: dailyBalance 
    });
});

// 2, 3, 4, 5. Diğer rotalar (Kaydet, Sil, Düzenle, Güncelle) aynı kaldı
app.post('/kaydet', (req, res) => {
    kayitlar.push({
        id: Date.now(),
        tarih: req.body.tarih,
        saat: req.body.saat,
        tur: req.body.tur,
        miktar: req.body.miktar
    });
    saveKayitlar();
    res.redirect('/');
});

app.post('/sil', (req, res) => {
    const silinecekId = parseInt(req.body.id); 
    kayitlar = kayitlar.filter(kayit => kayit.id !== silinecekId);
    saveKayitlar(); 
    res.redirect('/'); 
});

app.get('/duzenle/:id', (req, res) => {
    const kayitId = parseInt(req.params.id); 
    const kayit = kayitlar.find(k => k.id === kayitId);
    if (!kayit) return res.send("Kayıt bulunamadı!");
    res.render('edit', { kayit: kayit });
});

app.post('/guncelle', (req, res) => {
    const guncellenecekId = parseInt(req.body.id);
    const index = kayitlar.findIndex(kayit => kayit.id === guncellenecekId);
    if (index !== -1) {
        kayitlar[index] = {
            id: guncellenecekId,
            tarih: req.body.tarih,
            saat: req.body.saat,
            tur: req.body.tur,
            miktar: req.body.miktar
        };
        saveKayitlar();
    }
    res.redirect('/');
});


// Sunucuyu başlat (Aynı kaldı)
app.listen(port, () => {
    console.log(`Uygulama hazır! Tarayıcıdan şu adrese girin: http://localhost:${port}`);
});
