const cron = require('node-cron');
const Debate = require('../models/Debate');
const Argument = require('../models/Argument');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Match = require('../models/Match');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateEngineeringDebates(count = 50, isDemo = false) {
  try {
    console.log(`[Cron] Generating ${count} ${isDemo ? 'DEMO ' : ''}Engineering debates...`);
    const admin = await User.findOne({ role: { $in: ['admin', 'moderator'] } });
    if (!admin) {
      console.log('[Cron] Error: No admin user found to act as creator.');
      return false;
    }

    const prompt = `You are a curriculum director for a Computer Engineering degree. Generate exactly ${count} highly technical debate topics. 
The topics MUST strictly relate to Computer Engineering, Web Development, Full-Stack, Software Architecture, AI/ML, or Tech Stacks (e.g. React vs Angular, SQL vs NoSQL, Microservices vs Monolith).
You must respond with ONLY a valid JSON array of objects. Do not include any other text or markdown formatting.
Each object must have these exact keys: 
"title" (string, max 100 chars), 
"description" (string, detailed background), 
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
    
    let baseTime = new Date();
    
    for (const [index, d] of debatesJSON.entries()) {
      let startTime = new Date(baseTime);
      let endTime = new Date(baseTime);

      if (isDemo) {
        // Demo mode: cascade them closely. First one starts now, next starts in 5 mins
        startTime.setMinutes(startTime.getMinutes() + (index * 2)); // cascade start
        endTime = new Date(startTime.getTime() + (5 * 60000)); // All demos last 5 mins
      } else {
        // Daily mode: Spread 50 debates from NOW onwards (for today)
        // Start from current time to ensure debates are "live" right now
        const minutesPerDebate = (24 * 60) / 50; // ~28.8 minutes per debate
        const offsetMinutes = index * minutesPerDebate;
        startTime = new Date(baseTime);
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
        status: "active", // All debates start as active immediately
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
  // Initialize on startup - generate today and tomorrow debates
  (async () => {
    try {
      console.log('[Cron] Startup: Checking debates...');
      
      // Clear all old debates first
      await Debate.deleteMany({});
      console.log('[Cron] Cleared all old debates.');
      
      // Generate today's 50 active debates
      console.log('[Cron] Generating 50 active debates for today...');
      await generateEngineeringDebates(50, false);
      
      // Generate tomorrow's 50 upcoming debates
      console.log('[Cron] Generating 50 upcoming debates for tomorrow...');
      try {
        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0); // Tomorrow at midnight
        
        const admin = await User.findOne({ role: { $in: ['admin', 'moderator'] } });
        if (!admin) {
          console.log('[Cron] Error: No admin found.');
          return;
        }

        const prompt = `You are a curriculum director for a Computer Engineering degree. Generate exactly 50 highly technical debate topics. 
The topics MUST strictly relate to Computer Engineering, Web Development, Full-Stack, Software Architecture, AI/ML, or Tech Stacks.
You must respond with ONLY a valid JSON array. Do not include markdown or any other text.
Each object must have: "title" (max 100 chars), "description", "category" ("Tech"), "durationMinutes" (5-120).`;

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
          console.warn('[Cron] Tomorrow JSON parse failed, using mock debates:', parseErr.message);
          debatesJSON = Array.from({ length: 50 }).map((_, i) => ({
            title: `Tech Debate Tomorrow ${i + 1}`,
            description: `Technical debate about modern software practices.`,
            category: "Tech",
            durationMinutes: 20 + Math.random() * 60
          }));
        }
        
        if (!Array.isArray(debatesJSON)) debatesJSON = [debatesJSON];
        
        for (const [index, d] of debatesJSON.entries()) {
          const minutesPerDebate = (24 * 60) / 50;
          const offsetMinutes = index * minutesPerDebate;
          let startTime = new Date(tomorrowStart);
          startTime.setMinutes(Math.floor(offsetMinutes));
          startTime.setSeconds(0);
          const durationMs = (d.durationMinutes || 30) * 60000;
          let endTime = new Date(startTime.getTime() + durationMs);

          await Debate.create({
            title: d.title.substring(0, 140),
            description: d.description.substring(0, 2000),
            category: "Tech",
            createdBy: admin._id,
            approved: true,
            status: "upcoming",
            startTime,
            endTime,
            round: 1,
            roundState: "open"
          });
        }
        
        console.log('[Cron] Successfully created 50 debates for tomorrow (upcoming).');
      } catch (err) {
        console.error('[Cron] Error generating tomorrow debates:', err.message);
      }
    } catch (err) {
      console.error('[Cron] Init failed:', err.message);
    }
  })();

  // 1. Midnight Auto-Generator (00:00 every day)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Midnight schedule triggered. Generating daily debates...');
    // Close all active/upcoming from previous day
    await Debate.updateMany({ status: { $in: ['active', 'upcoming'] } }, { status: 'completed' });
    
    // Generate today's 50 debates (starting from midnight - they'll be active immediately)
    await generateEngineeringDebates(50, false);
    
    // Generate tomorrow's 50 debates as upcoming (starting from next day midnight)
    try {
      const nextDayMidnight = new Date();
      nextDayMidnight.setDate(nextDayMidnight.getDate() + 1);
      nextDayMidnight.setHours(0, 0, 0, 0); // Next day at midnight
      
      const admin = await User.findOne({ role: { $in: ['admin', 'moderator'] } });
      if (!admin) {
        console.log('[Cron] Error: No admin found for next day debates.');
        return;
      }

      const prompt = `You are a curriculum director for a Computer Engineering degree. Generate exactly 50 highly technical debate topics. 
The topics MUST strictly relate to Computer Engineering, Web Development, Full-Stack, Software Architecture, AI/ML, or Tech Stacks.
You must respond with ONLY a valid JSON array. Do not include markdown or any other text.
Each object must have: "title" (max 100 chars), "description", "category" ("Tech"), "durationMinutes" (5-120).`;

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
        console.warn('[Cron] Midnight JSON parse failed, using mock debates:', parseErr.message);
        debatesJSON = Array.from({ length: 50 }).map((_, i) => ({
          title: `Tech Debate ${i + 1}`,
          description: `Technical debate about modern software practices.`,
          category: "Tech",
          durationMinutes: 20 + Math.random() * 60
        }));
      }
      
      if (!Array.isArray(debatesJSON)) debatesJSON = [debatesJSON];
      
      for (const [index, d] of debatesJSON.entries()) {
        const minutesPerDebate = (24 * 60) / 50;
        const offsetMinutes = index * minutesPerDebate;
        let startTime = new Date(nextDayMidnight);
        startTime.setMinutes(Math.floor(offsetMinutes));
        startTime.setSeconds(0);
        const durationMs = (d.durationMinutes || 30) * 60000;
        let endTime = new Date(startTime.getTime() + durationMs);

        await Debate.create({
          title: d.title.substring(0, 140),
          description: d.description.substring(0, 2000),
          category: "Tech",
          createdBy: admin._id,
          approved: true,
          status: "upcoming",
          startTime,
          endTime,
          round: 1,
          roundState: "open"
        });
      }
      
      console.log('[Cron] Successfully created 50 debates for next day.');
    } catch (err) {
      console.error('[Cron] Error generating next day debates:', err.message);
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
