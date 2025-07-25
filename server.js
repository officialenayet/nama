const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// API Keys (embedded as requested)
const OPENAI_API_KEY = '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';
const FLASK_KEY = 'my-flask-key-32digit-only-for-me';
const JWT_KEY = 'my-jwt-key-3eo2digit-only-for-me';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Database setup
const dbPath = path.join(__dirname, 'islamic_database.db');
let db;

// Initialize database
function initializeDatabase() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database');
      createTables();
      seedDatabase();
    }
  });
}

function createTables() {
  // Create tables for Islamic data
  const tables = [
    `CREATE TABLE IF NOT EXISTS quran_verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_number INTEGER,
      surah_name_arabic TEXT,
      surah_name_english TEXT,
      surah_name_bangla TEXT,
      verse_number INTEGER,
      arabic_text TEXT,
      english_translation TEXT,
      bangla_translation TEXT,
      tafsir_english TEXT,
      tafsir_bangla TEXT,
      revelation_type TEXT,
      juz_number INTEGER,
      hizb_number INTEGER,
      ruku_number INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS hadith_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_name TEXT,
      collection_name_arabic TEXT,
      collection_name_bangla TEXT,
      compiler_name TEXT,
      total_hadiths INTEGER,
      authenticity_level TEXT,
      description TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS hadiths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER,
      book_number INTEGER,
      hadith_number INTEGER,
      chapter_name TEXT,
      chapter_name_arabic TEXT,
      chapter_name_bangla TEXT,
      narrator_chain TEXT,
      arabic_text TEXT,
      english_translation TEXT,
      bangla_translation TEXT,
      explanation TEXT,
      explanation_bangla TEXT,
      authenticity_grade TEXT,
      keywords TEXT,
      topic_category TEXT,
      FOREIGN KEY (collection_id) REFERENCES hadith_collections (id)
    )`,
    `CREATE TABLE IF NOT EXISTS fatwa_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT,
      category_name_arabic TEXT,
      category_name_bangla TEXT,
      description TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS islamic_scholars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      name_arabic TEXT,
      name_bangla TEXT,
      title TEXT,
      specialization TEXT,
      institution TEXT,
      country TEXT,
      biography TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS fatwas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      scholar_id INTEGER,
      question TEXT,
      question_bangla TEXT,
      answer TEXT,
      answer_bangla TEXT,
      evidence_quran TEXT,
      evidence_hadith TEXT,
      madhab TEXT,
      fatwa_date TEXT,
      source_website TEXT,
      keywords TEXT,
      is_verified BOOLEAN,
      FOREIGN KEY (category_id) REFERENCES fatwa_categories (id),
      FOREIGN KEY (scholar_id) REFERENCES islamic_scholars (id)
    )`,
    `CREATE TABLE IF NOT EXISTS dua_collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dua_name TEXT,
      dua_name_arabic TEXT,
      dua_name_bangla TEXT,
      arabic_text TEXT,
      transliteration TEXT,
      english_translation TEXT,
      bangla_translation TEXT,
      occasion TEXT,
      source_reference TEXT,
      benefits TEXT,
      benefits_bangla TEXT,
      frequency TEXT
    )`
  ];

  tables.forEach(table => {
    db.run(table, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      }
    });
  });
}

function seedDatabase() {
  // Check if data already exists
  db.get("SELECT COUNT(*) as count FROM quran_verses", (err, row) => {
    if (err) {
      console.error('Error checking data:', err.message);
      return;
    }
    
    if (row.count === 0) {
      console.log('Seeding database with Islamic data...');
      seedSampleData();
    } else {
      console.log('Database already contains data');
    }
  });
}

function seedSampleData() {
  // Sample Quran verses
  const quranVerses = [
    [1, 'الفاتحة', 'Al-Fatihah', 'আল-ফাতিহা', 1, 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'In the name of Allah, the Entirely Merciful, the Especially Merciful.', 'পরম করুণাময় অসীম দয়ালু আল্লাহর নামে।', 'This is the opening verse of the Quran.', 'এটি কুরআনের প্রারম্ভিক আয়াত।', 'Meccan', 1, 1, 1],
    [1, 'الفاتحة', 'Al-Fatihah', 'আল-ফাতিহা', 2, 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', '[All] praise is [due] to Allah, Lord of the worlds.', 'সমস্ত প্রশংসা আল্লাহর জন্য, যিনি সকল জগতের প্রতিপালক।', 'This verse establishes Allah as the Lord of all worlds.', 'এই আয়াত আল্লাহকে সকল জগতের প্রভু হিসেবে প্রতিষ্ঠিত করে।', 'Meccan', 1, 1, 1],
    [2, 'البقرة', 'Al-Baqarah', 'আল-বাকারা', 255, 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.', 'আল্লাহ, তিনি ছাড়া কোন ইলাহ নেই। তিনি চিরঞ্জীব, সর্বসত্তার ধারক।', 'This is Ayat al-Kursi, one of the most powerful verses.', 'এটি আয়াতুল কুরসি, সবচেয়ে শক্তিশালী আয়াতগুলির একটি।', 'Medinan', 3, 5, 35]
  ];

  const quranInsert = db.prepare(`INSERT INTO quran_verses 
    (surah_number, surah_name_arabic, surah_name_english, surah_name_bangla, verse_number, 
     arabic_text, english_translation, bangla_translation, tafsir_english, tafsir_bangla, 
     revelation_type, juz_number, hizb_number, ruku_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  quranVerses.forEach(verse => {
    quranInsert.run(verse);
  });
  quranInsert.finalize();

  // Sample Hadith collections
  const collections = [
    ['Sahih Bukhari', 'صحيح البخاري', 'সহীহ বুখারী', 'Imam Muhammad ibn Ismail al-Bukhari', 7563, 'Sahih', 'Most authentic collection of Hadith'],
    ['Sahih Muslim', 'صحيح مسلم', 'সহীহ মুসলিম', 'Imam Muslim ibn al-Hajjaj', 7470, 'Sahih', 'Second most authentic collection']
  ];

  const collectionInsert = db.prepare(`INSERT INTO hadith_collections 
    (collection_name, collection_name_arabic, collection_name_bangla, compiler_name, total_hadiths, authenticity_level, description) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  collections.forEach(collection => {
    collectionInsert.run(collection);
  });
  collectionInsert.finalize();

  // Sample Hadiths
  const hadiths = [
    [1, 1, 1, 'How the Divine Inspiration started', 'بدء الوحي', 'ওহী অবতরণের সূচনা', 'Narrated by Umar ibn al-Khattab', 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 'Actions are but by intention and every man shall have but that which he intended.', 'কাজ নিয়তের উপর নির্ভরশীল এবং প্রত্যেক ব্যক্তি তার নিয়ত অনুযায়ী ফল পাবে।', 'This hadith emphasizes the importance of intention.', 'এই হাদিসটি নিয়তের গুরুত্ব তুলে ধরে।', 'Sahih', '["intention", "actions"]', 'Faith and Belief'],
    [1, 2, 8, 'Faith', 'الإيمان', 'ঈমান', 'Narrated by Abdullah ibn Umar', 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', 'A Muslim is one from whose tongue and hand the Muslims are safe.', 'প্রকৃত মুসলিম সে, যার জিহ্বা ও হাত থেকে অন্য মুসলিমরা নিরাপদ থাকে।', 'This hadith defines the character of a true Muslim.', 'এই হাদিসটি একজন সত্যিকারের মুসলিমের চরিত্র নির্ধারণ করে।', 'Sahih', '["Muslim", "character"]', 'Character and Morals']
  ];

  const hadithInsert = db.prepare(`INSERT INTO hadiths 
    (collection_id, book_number, hadith_number, chapter_name, chapter_name_arabic, chapter_name_bangla, 
     narrator_chain, arabic_text, english_translation, bangla_translation, explanation, explanation_bangla, 
     authenticity_grade, keywords, topic_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  hadiths.forEach(hadith => {
    hadithInsert.run(hadith);
  });
  hadithInsert.finalize();

  // Sample Duas
  const duas = [
    ['Morning Remembrance', 'أذكار الصباح', 'সকালের জিকির', 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ', 'Asbahna wa asbahal mulku lillah', 'We have reached the morning and at this very time unto Allah belongs all sovereignty.', 'আমরা সকালে পৌঁছেছি এবং এই সময়ে সমস্ত সার্বভৌমত্ব আল্লাহর।', 'Morning', 'Sahih Muslim', 'Protection and blessings for the day', 'দিনের জন্য সুরক্ষা ও বরকত', 'Daily'],
    ['Before Eating', 'دعاء قبل الطعام', 'খাওয়ার আগের দোয়া', 'بِسْمِ اللَّهِ', 'Bismillah', 'In the name of Allah', 'আল্লাহর নামে', 'Before eating', 'Sunan Abu Dawood', 'Blessing in food', 'খাবারে বরকত', 'Before every meal']
  ];

  const duaInsert = db.prepare(`INSERT INTO dua_collection 
    (dua_name, dua_name_arabic, dua_name_bangla, arabic_text, transliteration, english_translation, 
     bangla_translation, occasion, source_reference, benefits, benefits_bangla, frequency) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  duas.forEach(dua => {
    duaInsert.run(dua);
  });
  duaInsert.finalize();

  console.log('Sample Islamic data seeded successfully!');
}

// Search functions
function searchQuran(query, limit = 3) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM quran_verses 
                 WHERE english_translation LIKE ? OR bangla_translation LIKE ? 
                 OR tafsir_english LIKE ? OR tafsir_bangla LIKE ? 
                 LIMIT ?`;
    const searchTerm = `%${query}%`;
    
    db.all(sql, [searchTerm, searchTerm, searchTerm, searchTerm, limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function searchHadith(query, limit = 5) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT h.*, hc.collection_name 
                 FROM hadiths h 
                 JOIN hadith_collections hc ON h.collection_id = hc.id 
                 WHERE h.english_translation LIKE ? OR h.bangla_translation LIKE ? 
                 OR h.explanation LIKE ? OR h.explanation_bangla LIKE ? 
                 OR h.topic_category LIKE ? 
                 LIMIT ?`;
    const searchTerm = `%${query}%`;
    
    db.all(sql, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function searchDuas(query, limit = 2) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM dua_collection 
                 WHERE dua_name LIKE ? OR dua_name_bangla LIKE ? 
                 OR english_translation LIKE ? OR bangla_translation LIKE ? 
                 OR occasion LIKE ? 
                 LIMIT ?`;
    const searchTerm = `%${query}%`;
    
    db.all(sql, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, language = 'english' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Search across all Islamic data sources
    const [quranResults, hadithResults, duaResults] = await Promise.all([
      searchQuran(message),
      searchHadith(message),
      searchDuas(message)
    ]);

    // Prepare context for OpenAI
    let context = `You are an advanced Islamic AI assistant with access to a comprehensive database of Islamic knowledge. 
    Answer questions based on Quran, authentic Hadith, and Islamic teachings. 
    Always provide accurate references and sources. If you're uncertain about any ruling, recommend consulting with a qualified Islamic scholar.
    Be respectful, accurate, and helpful. Provide both English and Bengali translations when possible.\n\n`;

    // Add relevant sources to context
    if (quranResults.length > 0) {
      context += "Relevant Quranic Verses:\n";
      quranResults.forEach(verse => {
        context += `Surah ${verse.surah_name_english} (${verse.surah_number}:${verse.verse_number}): ${verse.english_translation}\n`;
        if (verse.tafsir_english) {
          context += `Tafsir: ${verse.tafsir_english}\n`;
        }
      });
      context += "\n";
    }

    if (hadithResults.length > 0) {
      context += "Relevant Hadith:\n";
      hadithResults.forEach(hadith => {
        context += `${hadith.collection_name} ${hadith.hadith_number}: ${hadith.english_translation}\n`;
        if (hadith.explanation) {
          context += `Explanation: ${hadith.explanation}\n`;
        }
      });
      context += "\n";
    }

    if (duaResults.length > 0) {
      context += "Relevant Duas:\n";
      duaResults.forEach(dua => {
        context += `${dua.dua_name}: ${dua.english_translation}\n`;
        context += `Occasion: ${dua.occasion}\n`;
      });
      context += "\n";
    }

    // Call OpenAI API
    let systemMessage = context;
    if (language === 'bangla') {
      systemMessage += "Please respond primarily in Bengali (বাংলা) while including Arabic references where appropriate.";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const aiResponse = completion.choices[0].message.content;

    // Check for uncertainty indicators
    const uncertaintyKeywords = ['not sure', 'uncertain', 'may vary', 'consult', 'scholar', 'Allah knows best'];
    const isUncertain = uncertaintyKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword));

    // Prepare response with all relevant sources
    const responseData = {
      response: aiResponse,
      sources: {
        quran_verses: quranResults,
        hadiths: hadithResults,
        duas: duaResults
      },
      is_uncertain: isUncertain,
      expert_contact: isUncertain ? 'bio.link/officialenayet' : null,
      total_sources: quranResults.length + hadithResults.length + duaResults.length
    };

    res.json(responseData);

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as count FROM quran_verses',
    'SELECT COUNT(*) as count FROM hadiths',
    'SELECT COUNT(*) as count FROM dua_collection'
  ];

  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.get(query, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    })
  )).then(([quranCount, hadithCount, duaCount]) => {
    res.json({
      quran_verses: quranCount,
      total_hadiths: hadithCount,
      verified_fatwas: 0, // Placeholder
      total_fatwas: 0,    // Placeholder
      duas: duaCount,
      islamic_books: 0,   // Placeholder
      hadith_collections: 2,
      database_size: 'Comprehensive Islamic Knowledge Base',
      last_updated: 'Real-time updates available'
    });
  }).catch(error => {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  });
});

// Serve React app for all other routes
app.use('/', express.static(path.join(__dirname, 'dist')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize database and start server
initializeDatabase();

app.listen(PORT, () => {
  console.log(`Islamic AI Chatbot server running on port ${PORT}`);
});

module.exports = app;

