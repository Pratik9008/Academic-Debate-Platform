const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DebateSchema = new mongoose.Schema({
  status: String,
  approved: Boolean
});

const Debate = mongoose.model('Debate', DebateSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Debate.countDocuments();
    const activeUpcoming = await Debate.countDocuments({ status: { $in: ['upcoming', 'active'] } });
    const approved = await Debate.countDocuments({ approved: true });
    
    console.log('Total debates:', count);
    console.log('Active/Upcoming debates:', activeUpcoming);
    console.log('Approved debates:', approved);
    
    const latest = await Debate.find().sort({ createdAt: -1 }).limit(5);
    console.log('Latest 5 debates:', JSON.stringify(latest, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
