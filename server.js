const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'ejjlgoklmoagnxoshttb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = 'tests';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '')));

// Telegram Bot Settings (For future use if needed)
const BOT_TOKEN = '8998157164:AAEkXLwkxYlKZxh5YiI_0aoS1EBKtL5UrVo';

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://admin1:adminadmin1@cluster0.yfdumca.mongodb.net/UniversalLMS?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB ga muvaffaqiyatli ulandi!'))
  .catch(err => console.error('MongoDB xatoligi:', err));

// Schemas
const testSchema = new mongoose.Schema({
    id: String,
    title: String,
    teacherName: String,
    numQuestions: Number,
    fileType: String,
    fileName: String,
    fileData: String, // Base64
    answerKey: [String],
    date: { type: Date, default: Date.now }
});

const resultSchema = new mongoose.Schema({
    testId: String,
    studentName: String,
    score: Number,
    total: Number,
    date: String
});

const Test = mongoose.model('Test', testSchema);
const Result = mongoose.model('Result', resultSchema);

// --- API ROUTES ---

// 1. Upload Test
app.post('/api/tests', async (req, res) => {
    try {
        let testData = req.body;
        
        // Agar fayl (base64) kiritilgan bo'lsa, uni Supabase'ga yuklaymiz
        if (testData.fileData && testData.fileName && testData.fileData.startsWith('data:')) {
            const matches = testData.fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const contentType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                const uniqueFileName = `${Date.now()}_${testData.fileName.replace(/\s+/g, '_')}`;
                
                // Supabase API orqali faylni yuklash
                await new Promise((resolve, reject) => {
                    const options = {
                        hostname: SUPABASE_URL,
                        port: 443,
                        path: `/storage/v1/object/${BUCKET_NAME}/${encodeURIComponent(uniqueFileName)}`,
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': contentType,
                            'Content-Length': buffer.length
                        }
                    };
                    const request = https.request(options, (response) => {
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            resolve();
                        } else {
                            reject(new Error(`Upload failed with status ${response.statusCode}`));
                        }
                    });
                    request.on('error', reject);
                    request.write(buffer);
                    request.end();
                });
                
                // Public URL ni saqlash (Base64 o'rniga faqat URL saqlanadi)
                testData.fileData = `https://${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${encodeURIComponent(uniqueFileName)}`;
            }
        }

        const newTest = new Test(testData);
        await newTest.save();
        res.json({ success: true, test: newTest });
    } catch (err) {
        console.error("Xatolik yuz berdi:", err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// 2. Get All Tests
app.get('/api/tests', async (req, res) => {
    try {
        // Exclude fileData to make the list load very fast
        const tests = await Test.find({}, '-fileData').sort({ date: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// 3. Get Single Test
app.get('/api/tests/:id', async (req, res) => {
    try {
        const test = await Test.findOne({ id: req.params.id });
        if (!test) return res.status(404).json({ error: 'Test topilmadi' });
        res.json(test);
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// 4. Delete Test
app.delete('/api/tests/:id', async (req, res) => {
    try {
        const testToDelete = await Test.findOne({ id: req.params.id });
        if (testToDelete && testToDelete.fileData && testToDelete.fileData.includes('supabase.co')) {
            const parts = testToDelete.fileData.split('/');
            const fileName = parts[parts.length - 1];
            
            // Supabase API orqali faylni ham o'chirish (Xotira to'lib qolmasligi uchun)
            await new Promise((resolve, reject) => {
                const options = {
                    hostname: SUPABASE_URL,
                    port: 443,
                    path: `/storage/v1/object/${BUCKET_NAME}/${fileName}`,
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                };
                const request = https.request(options, (response) => {
                    resolve(); 
                });
                request.on('error', (e) => console.error("Faylni o'chirishda xato:", e));
                request.end();
            });
        }

        await Test.findOneAndDelete({ id: req.params.id });
        await Result.deleteMany({ testId: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// 5. Save Result
app.post('/api/results', async (req, res) => {
    try {
        const newResult = new Result(req.body);
        await newResult.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// 6. Get Results for a specific test
app.get('/api/results/:testId', async (req, res) => {
    try {
        const results = await Result.find({ testId: req.params.testId }).sort({ _id: -1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// 7. Get Teacher Rating
app.get('/api/rating/:teacherName', async (req, res) => {
    try {
        const tests = await Test.find({ teacherName: req.params.teacherName });
        if (tests.length === 0) return res.json({ rating: 0 });
        
        const testIds = tests.map(t => t.id);
        const results = await Result.find({ testId: { $in: testIds } });
        
        if (results.length === 0) return res.json({ rating: 0 });
        
        const totalPercentage = results.reduce((acc, curr) => acc + (curr.score / curr.total) * 100, 0);
        const rating = Math.round(totalPercentage / results.length);
        res.json({ rating });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server ishlashni boshladi: http://localhost:${PORT}`);
});
