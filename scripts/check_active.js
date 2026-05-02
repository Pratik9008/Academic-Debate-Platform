const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DebateSchema = new mongoose.Schema({
  title: String,
  status: String,
  startTime: Date,
  endTime: Date,
  approved: Boolean
});

const Debate = mongoose.model('Debate', DebateSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const now = new Date();
    console.log('Current Server Time (UTC):', now.toISOString());
    
    const activeUpcoming = await Debate.find({ status: { $in: ['upcoming', 'active'] } }).sort({ startTime: 1 });
    console.log('Count of Active/Upcoming:', activeUpcoming.length);
    
    activeUpcoming.forEach(d => {
      console.log(`- [${d.status}] ${d.title} | Start: ${d.startTime?.toISOString()} | End: ${d.endTime?.toISOString()}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
