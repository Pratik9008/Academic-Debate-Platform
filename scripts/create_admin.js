const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
require("dotenv").config({ path: "./.env" });

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const email = "prasam1552006@gmail.com";
  const password = "Ps@1234789";

  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = new User({
      email,
      passwordHash,
      name: "Prasam (Admin)",
      role: "admin",
      reputation: 10000,
      bio: "Super Admin of Academic Debate Platform"
    });
    await user.save();
    console.log("Admin account created successfully!");
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    user.role = "admin";
    user.name = "Prasam (Admin)";
    await user.save();
    console.log("Existing account updated to Admin!");
  }

  mongoose.connection.close();
}

createAdmin().catch(console.error);
