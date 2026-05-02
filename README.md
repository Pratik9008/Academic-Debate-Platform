# 🎓 Academic Debate Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![AI Powered](https://img.shields.io/badge/AI-Llama%203.1-blueviolet)](https://groq.com/)

A premium, full-stack academic debate platform designed for rigorous intellectual exchange. Features a structured round system, real-time arguments, and AI-driven moderation and grading.

---

## 🌐 Live Demo
👉 [https://debate-platform-3iik.onrender.com](https://debate-platform-3iik.onrender.com)

---

## ✨ Key Features

### 🧠 AI-Powered Moderation & Grading
- **Automated Tournament Engine:** AI periodically generates high-quality technical debate topics across Science, Tech, and Politics.
- **Instant Evaluation:** At the end of each debate, our Master AI (Llama 3.1) evaluates every argument based on logic, evidence, and structure.
- **Smart Feedback:** Personalized feedback for every participant to help them improve their debating skills.

### 🏛️ Structured Debate Rounds
- **Round System:** Debates follow a clear sequence: Opening Arguments → Counterarguments → Final Statements.
- **Threaded Discussions:** Arguments are organized into logical threads, making complex discussions easy to follow.
- **Community Voting:** Users earn reputation points through community-driven upvotes on their arguments.

### 📊 Real-time & Interactive
- **Live Matchmaking:** Find and join live debates instantly with Socket.io integration.
- **Leaderboard:** Track top debaters globally based on reputation and AI scores.
- **Analytics Dashboard:** Visualize argument distributions and debate health in real-time.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), Modern CSS (Glassmorphism), Marked.js, Chart.js.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB with Mongoose ODM.
- **Real-time:** Socket.io.
- **AI Integration:** Groq SDK (Llama 3.1 8B/70B).
- **Scheduling:** Node-cron.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account
- Groq API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Pratik9008/Academic-Debate-Platform.git
   cd Academic-Debate-Platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key
   GROQ_API_KEY=your_groq_api_key
   CLIENT_ORIGIN=http://localhost:3000
   ```

4. **Seed the Database (Optional):**
   ```bash
   npm run seed
   ```

5. **Run the Application:**
   ```bash
   npm run dev
   ```

---

## 🛡️ Admin & Moderation
The platform includes a dedicated **Admin Portal** where moderators can:
- Approve or delete pending debates.
- Manage user reputations.
- Override AI scores in special cases.
- Monitor live tournament health.

---

## 👨‍💻 Authors
- **Pratik Kumar Singh**
- **Yash Verma**
- **RaviRala Rohith**

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for the Academic Community
</p>
