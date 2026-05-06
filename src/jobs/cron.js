const cron = require('node-cron');
const Debate = require('../models/Debate');
const Argument = require('../models/Argument');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Match = require('../models/Match');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateEngineeringDebates(count = 5, isDemo = false, startFrom = new Date(), status = "upcoming") {
  try {
    console.log(`[Cron] Generating ${count} ${isDemo ? 'DEMO ' : ''}Engineering debates...`);
    const admin = await User.findOne({ role: { $in: ['admin', 'moderator'] } });
    if (!admin) {
      console.log('[Cron] Error: No admin user found to act as creator.');
      return false;
    }

    const techAreas = [
      "Data Structures & Algorithms (DSA) vs Web Development",
      "Backend Architectures, Microservices, and System Design",
      "Cloud Computing, AWS, and DevOps Practices",
      "Artificial Intelligence, Generative AI, and Machine Learning",
      "Cybersecurity, Encryption, and Web Security",
      "Database Management Systems (DBMS), SQL vs NoSQL",
      "Mobile App Development (React Native, Flutter)",
      "Software Engineering Practices, Testing, and Agile",
      "Competitive Programming vs Open Source Contributions",
      "Blockchain, Web3, and Decentralized Systems",
      "Operating Systems, Linux, and Low-Level Programming",
      "Emerging Tech trends for B.Tech Placements and Internships"
    ];
    const randomArea = techAreas[Math.floor(Math.random() * techAreas.length)];

    const prompt = `You are a technical mentor for B.Tech Computer Science Engineering (CSE) students in India. Generate exactly ${count} highly technical and engaging debate topics. 
Focus SPECIFICALLY on this sub-field or dilemma: ${randomArea}. Ensure the topics are very relevant to B.Tech CSE students, placements, and modern tech industry trends. They must be unique, specific, and debatable.
You must respond with ONLY a valid JSON array of objects. Do not include any other text or markdown formatting.
Each object must have these exact keys: 
"title" (string, max 100 chars), 
"description" (string, detailed background of the engineering tradeoff), 
"category" (string, strictly "Tech"),
"durationMinutes" (number, between 5 and 120). Assign based on topic complexity: Simple topics (5-15 min), Medium topics (15-45 min), Complex topics (45-120 min).`;

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    let aiResponse = chatCompletion.choices[0]?.message?.content || "[]";
    if (aiResponse.startsWith("```")) aiResponse = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let debatesJSON = [];
    try {
      debatesJSON = JSON.parse(aiResponse);
    } catch (parseErr) {
      console.warn('[Cron] JSON parse failed, using mock debates:', parseErr.message);
      // Fallback mock debates
      debatesJSON = Array.from({ length: count }).map((_, i) => ({
        title: `Tech Debate ${i + 1}`,
        description: `This is a technical debate about modern software development practices and architecture decisions.`,
        category: "Tech",
        durationMinutes: 20 + Math.random() * 60
      }));
    }
    
    if (!Array.isArray(debatesJSON)) debatesJSON = [debatesJSON];
    
    for (const [index, d] of debatesJSON.entries()) {
      let startTime = new Date(startFrom);
      let endTime = new Date(startFrom);

      if (isDemo) {
        // Demo mode: cascade them closely. First one starts now, next starts in 5 mins
        startTime.setMinutes(startTime.getMinutes() + (index * 2)); // cascade start
        endTime = new Date(startTime.getTime() + (5 * 60000)); // All demos last 5 mins
      } else {
        // Hourly mode: Spread debates over 60 minutes
        const minutesPerDebate = 60 / count;
        const offsetMinutes = index * minutesPerDebate;
        startTime.setMinutes(startTime.getMinutes() + Math.floor(offsetMinutes));
        startTime.setSeconds(0);
        
        const durationMs = (d.durationMinutes || 30) * 60000;
        endTime = new Date(startTime.getTime() + durationMs);
      }

      await Debate.create({
        title: d.title.substring(0, 140),
        description: d.description.substring(0, 2000),
        category: "Tech",
        createdBy: admin._id,
        approved: true,
        status: status,
        startTime,
        endTime,
        round: 1,
        roundState: "open"
      });
    }
    
    console.log(`[Cron] Successfully created ${debatesJSON.length} debates.`);
    return true;
  } catch (err) {
    console.error('[Cron] Error generating debates:', err);
    return false;
  }
}

function initCronJobs() {
  // Initialize on startup - generate current hour and next hour debates
  (async () => {
    try {
      console.log('[Cron] Startup: Checking debates...');
      
      // Check if we need to generate initial buffer
      const upcomingDebates = await Debate.countDocuments({ status: 'upcoming' });
      if (upcomingDebates < 10) {
        console.log('[Cron] Low upcoming debates found. Generating startup buffer (Next 3 hours)...');
        const now = new Date();
      for (let i = 0; i < 3; i++) {
        const targetHour = new Date(now);
        targetHour.setHours(now.getHours() + i + 1); // Next 3 hours
        targetHour.setMinutes(0, 0, 0);
        await generateEngineeringDebates(4, false, targetHour, "upcoming");
        // Sleep 4 seconds between calls to avoid hitting Groq API rate limits
        await new Promise(r => setTimeout(r, 4000));
      }
      console.log('[Cron] Startup buffer generated successfully.');
      
      }
    } catch (err) {
      console.error('[Cron] Init failed:', err.message);
    }
  })();

  // 1. Hourly Auto-Generator (Checks and maintains buffer)
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Hourly schedule triggered. Checking debate buffer...');
    
    // Close active debates from the previous day (safeguard)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await Debate.updateMany({ status: 'active', endTime: { $lt: yesterday } }, { status: 'completed' });
    
    const upcomingCount = await Debate.countDocuments({ status: 'upcoming' });
    
    if (upcomingCount < 15) {
      console.log(`[Cron] Buffer low (${upcomingCount} upcoming). Generating new debates for next 4 hours...`);
      const now = new Date();
      for (let i = 1; i <= 4; i++) {
        const targetHour = new Date(now);
        targetHour.setHours(now.getHours() + i);
        targetHour.setMinutes(0,0,0);
        
        await generateEngineeringDebates(4, false, targetHour, "upcoming");
        // Sleep for 8 seconds between each hour to completely avoid API token/rate limits
        await new Promise(r => setTimeout(r, 8000));
      }
      console.log('[Cron] Successfully replenished debate buffer.');
    } else {
      console.log(`[Cron] Buffer healthy (${upcomingCount} upcoming). No generation needed.`);
    }
  });

  // 2. Every Minute Engine (Checks Starts, Ends, and Triggers Grading)
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    // A. Start upcoming debates
    await Debate.updateMany(
      { status: 'upcoming', startTime: { $lte: now } },
      { status: 'active' }
    );

    // B. Close expired active debates
    const expiredDebates = await Debate.find({
      status: 'active',
      endTime: { $lte: now },
      aiGraded: false
    });

    for (const debate of expiredDebates) {
      console.log(`[Cron] Debate ${debate._id} ended. Initiating AI Grading...`);
      debate.status = 'completed';
      debate.roundState = 'closed';
      
      try {
        const args = await Argument.find({ debate: debate._id, deleted: false }).populate("author", "name");
        if (args.length === 0) {
          debate.aiGraded = true; // No participants
          await debate.save();
          continue;
        }

        // Group by author
        const userArgs = {};
        for (const a of args) {
          if (!userArgs[a.author._id]) userArgs[a.author._id] = { user: a.author, texts: [] };
          userArgs[a.author._id].texts.push(a.content);
        }

        const rankings = [];

        // Grade each user
        for (const userId in userArgs) {
          const userObj = userArgs[userId].user;
          const combinedText = userArgs[userId].texts.join("\n\n");
          
          const prompt = `Read this student's arguments for the debate titled '${debate.title}':
${combinedText}

Grade the student out of 100 based on logic, evidence, and structure. Provide 1 sentence of feedback.
Format exactly like this:
SCORE: <number>
FEEDBACK: <text>`;

          const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant"
          });

          const text = chatCompletion.choices[0]?.message?.content || "";
          const scoreMatch = text.match(/SCORE:\s*(\d+)/);
          const feedbackMatch = text.split("FEEDBACK:");
          
          const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
          const feedback = feedbackMatch.length > 1 ? feedbackMatch[1].trim() : text;

          rankings.push({ user: userObj._id, score, feedback });
          
          // Add to Global Match score for leaderboard!
          await Match.create({
            userId: userObj._id,
            opponent: "Forum Debate",
            mode: "ai",
            score,
            feedback,
            transcript: combinedText
          });

          // Notify User
          await Notification.create({
            user: userObj._id,
            type: "system",
            title: "Debate Results Published!",
            body: `The debate "${debate.title}" has concluded. You scored ${score}/100.`,
            link: `/debate.html?id=${debate._id}`
          });
        }

        // Sort rankings
        rankings.sort((a, b) => b.score - a.score);
        rankings.forEach((r, i) => r.rank = i + 1);

        debate.rankings = rankings;
        debate.aiGraded = true;
        await debate.save();

      } catch (err) {
        console.error(`[Cron] Grading failed for debate ${debate._id}`, err);
        await debate.save(); // Save as completed even if grading failed
      }
    }
  });

  console.log('[Cron] Automated Tournament Engine initialized.');
}

module.exports = { initCronJobs, generateEngineeringDebates };
