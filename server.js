const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'ejjlgoklmoagnxoshttb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = 'tests';

const formattedUrl = SUPABASE_URL.startsWith('http') ? SUPABASE_URL : `https://${SUPABASE_URL}`;
const supabase = SUPABASE_KEY ? createClient(formattedUrl, SUPABASE_KEY) : null;

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
                
                // Supabase SDK orqali yuklash
                if (!supabase) throw new Error("Supabase kaliti topilmadi");
                
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(uniqueFileName, buffer, {
                        contentType: contentType,
                        upsert: false
                    });

                if (uploadError) {
                    throw new Error(`Supabase xatosi: ${uploadError.message}`);
                }
                
                // Public URL ni saqlash
                const cleanUrl = SUPABASE_URL.replace('https://', '');
                testData.fileData = `https://${cleanUrl}/storage/v1/object/public/${BUCKET_NAME}/${encodeURIComponent(uniqueFileName)}`;
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
        const test = await Test.findOne({ id: req.params.id });
        if (test && test.fileData && test.fileData.includes('supabase.co')) {
            try {
                if (supabase) {
                    const urlParts = test.fileData.split('/');
                    const fileName = decodeURIComponent(urlParts[urlParts.length - 1]);
                    await supabase.storage.from(BUCKET_NAME).remove([fileName]);
                }
            } catch (err) {
                console.error("Faylni o'chirishda xatolik:", err);
            }
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
