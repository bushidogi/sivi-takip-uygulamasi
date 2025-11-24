const express = require('express');
const mongoose = require('mongoose'); // Mongoose eklendi
const app = express();
// Render'ın dinamik portunu kullanır
const port = process.env.PORT || 3000; 

// !!! BURAYI KENDİ BİLGİLERİNİZLE DEĞİŞTİRİN !!!
const DB_URI = process.env.MONGO_URI;


// --- MONGODB BAĞLANTISI ---
mongoose.connect(DB_URI)
    .then(() => console.log('MongoDB Bağlantısı Başarılı!'))
    .catch(err => console.error('MongoDB Bağlantı Hatası:', err));


// --- KAYIT ŞEMASI (MODEL) ---
const kayitSchema = new mongoose.Schema({
    tarih: String,
    saat: String,
    tur: String,
    miktar: Number,
});

const Kayit = mongoose.model('Kayit', kayitSchema);


// --- KODUN DİĞER BÖLÜMLERİ ---
app.set('view engine', 'ejs');
app.set('views', './views'); 
app.use(express.urlencoded({ extended: true }));


// --- SIVI DENGE ANALİZ FONKSİYONU (Aynı kaldı) ---
function calculateDailyBalance(records) {
    const dailyData = {};
    records.forEach(kayit => {
        const tarih = kayit.tarih;
        // Kayıtlar artık JSON değil, Mongoose objesi olduğu için parseInt'e gerek yok
        const miktar = kayit.miktar; 
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

// 1. Anasayfayı gösterme (ASYNC yapıldı)
app.get('/', async (req, res) => { 
    const siralamaTuru = req.query.sort;
    
    // Veritabanından verileri çek
    let siralayiciKayitlar = await Kayit.find().lean(); 

    // Sıralama mantığı (MongoDB _id'sine göre sıralanır)
    if (siralamaTuru === 'eskiden_yeniye') {
        // En eski kayıtlar öne
        siralayiciKayitlar.sort((a, b) => a._id.getTimestamp() - b._id.getTimestamp());
    } else if (siralamaTuru === 'yeniden_eskiye' || !siralamaTuru) {
        // En yeni kayıtlar öne (Varsayılan)
        siralayiciKayitlar.sort((a, b) => b._id.getTimestamp() - a._id.getTimestamp());
    } 

    const dailyBalance = calculateDailyBalance(siralayiciKayitlar);

    res.render('index', { 
        kayitlar: siralayiciKayitlar, 
        dailyBalance: dailyBalance 
    });
});

// 2. KAYDETME İŞLEMİ (ASYNC yapıldı)
app.post('/kaydet', async (req, res) => { 
    const yeniKayit = new Kayit({ 
        tarih: req.body.tarih,
        saat: req.body.saat,
        tur: req.body.tur,
        miktar: parseInt(req.body.miktar)
    });

    try {
        await yeniKayit.save(); 
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.send('Kaydetme hatası oluştu!');
    }
});

// 3. SİLME İŞLEMİ (ASYNC yapıldı)
app.post('/sil', async (req, res) => { 
    const silinecekId = req.body.id; 
    try {
        await Kayit.findByIdAndDelete(silinecekId); 
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.send('Silme hatası oluştu!');
    }
});

// 4. DÜZENLEME SAYFASINI GÖSTERME (ASYNC yapıldı)
app.get('/duzenle/:id', async (req, res) => { 
    const kayitId = req.params.id; 
    const kayit = await Kayit.findById(kayitId).lean(); 
    if (!kayit) return res.send("Kayıt bulunamadı!");
    res.render('edit', { kayit: kayit });
});

// 5. GÜNCELLEME İŞLEMİ (ASYNC yapıldı)
app.post('/guncelle', async (req, res) => { 
    const guncellenecekId = req.body.id;
    const guncellenenVeri = {
        tarih: req.body.tarih,
        saat: req.body.saat,
        tur: req.body.tur,
        miktar: parseInt(req.body.miktar)
    };
    
    try {
        await Kayit.findByIdAndUpdate(guncellenecekId, guncellenenVeri); 
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.send('Güncelleme hatası oluştu!');
    }
});


// Sunucuyu başlat (Aynı kaldı)
app.listen(port, () => {
    console.log(`Uygulama hazır! Tarayıcıdan şu adrese girin: http://localhost:${port}`);
});