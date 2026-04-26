const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { connectDb } = require("../src/config/db");
const User = require("../src/models/User");
const Debate = require("../src/models/Debate");

dotenv.config();

async function run() {
  await connectDb();

  const adminEmail = "admin@adp.local";
  const modEmail = "moderator@adp.local";
  const pass = "Password123!";

  const adminHash = await bcrypt.hash(pass, 12);
  const modHash = await bcrypt.hash(pass, 12);

  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    { name: "Admin", email: adminEmail, passwordHash: adminHash, role: "admin", bio: "Platform admin.", reputation: 250 },
    { upsert: true, new: true }
  );

  const moderator = await User.findOneAndUpdate(
    { email: modEmail },
    { name: "Moderator", email: modEmail, passwordHash: modHash, role: "moderator", bio: "Keeps debates healthy.", reputation: 120 },
    { upsert: true, new: true }
  );

  const existing = await Debate.countDocuments();
  if (existing === 0) {
    await Debate.create([
      {
        title: "Should AI assistants cite sources by default in academic settings?",
        description:
          "Debate whether source citation should be mandatory for AI-generated academic content. Consider usability, hallucinations, and verification cost.",
        category: "Tech",
        createdBy: admin._id,
        approved: true,
        status: "active",
        round: 1,
        roundState: "open"
      },
      {
        title: "Is nuclear energy essential for decarbonization?",
        description:
          "Argue if nuclear should be central to climate strategy versus renewables + storage. Use evidence and consider timelines and risks.",
        category: "Science",
        createdBy: moderator._id,
        approved: true,
        status: "active",
        round: 1,
        roundState: "open"
      }
    ]);
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log(`Admin: ${adminEmail} / ${pass}`);
  // eslint-disable-next-line no-console
  console.log(`Moderator: ${modEmail} / ${pass}`);
  process.exit(0);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

