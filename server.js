const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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
        const testData = req.body;
        const newTest = new Test(testData);
        await newTest.save();
        res.json({ success: true, test: newTest });
    } catch (err) {
        console.error(err);
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
