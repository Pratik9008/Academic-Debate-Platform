<div align="center">
  <h1>🎓 Academic Debate Platform</h1>
  <p><strong>A Next-Generation AI-Powered Platform for Structured Academic Debates</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
  [![AI Powered](https://img.shields.io/badge/AI-Llama%203.1-blueviolet)](https://groq.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)
</div>

<br />

## 📖 Abstract

The **Academic Debate Platform** is a full-stack, real-time web application engineered to facilitate rigorous intellectual exchange among engineering students. Moving away from chaotic forum threads, this platform introduces a **structured round system** (Opening Arguments, Counterarguments, Final Statements) augmented by **Artificial Intelligence**. The system autonomously generates relevant B.Tech CSE topics, moderates discussions, and uses a Large Language Model (Llama 3.1) to grade participants based on logic, evidence, and argument structure.

---

## 🌐 Live Demo
👉 **[https://debate-platform-3iik.onrender.com](https://debate-platform-3iik.onrender.com)**

---

## ✨ Key Features & Modules

### 1. 🧠 AI-Powered Automation (Master AI)
- **Autonomous Topic Generation:** A background Cron engine automatically curates high-quality technical debate topics focused on Computer Science Engineering (e.g., *DSA vs Web Development*, *System Design Architecture*).
- **Automated Grading System:** At the conclusion of a debate, the AI evaluates the transcript and scores every participant out of 100 based on logical reasoning and structural integrity.
- **Smart Feedback:** Generates personalized, actionable feedback for each debater to enhance their analytical skills.

### 2. 🏛️ Structured Debate Architecture
- **Round-Based Progression:** Debates enforce a strict timeline and round sequence to maintain academic decorum.
- **Threaded Discussions:** Arguments are hierarchically organized, preventing topic derailment.
- **Peer Reputation System:** Users build their global reputation through community-driven upvotes on high-quality technical arguments.

### 3. 📊 Real-Time Interaction & Analytics
- **Live Updates:** Powered by WebSockets (`Socket.io`) for instantaneous argument delivery and matchmaking without page reloads.
- **Global Leaderboard:** Ranks top engineering debaters based on cumulative AI scores and community upvotes.
- **Interactive Dashboards:** Real-time data visualization of argument distributions using Chart.js.

### 4. 🛡️ Role-Based Access Control (RBAC)
- **Admin Portal:** Dedicated interface for moderators to approve/delete debates, override AI scores, and monitor platform health.
- **User Profiles:** Personalized tracking of debate history, win rates, and AI feedback.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JS | Glassmorphic UI design, highly responsive. |
| **Backend** | Node.js, Express.js | RESTful API architecture. |
| **Database** | MongoDB & Mongoose | NoSQL database for flexible transcript schemas. |
| **Real-Time** | Socket.io | Bidirectional event-driven communication. |
| **AI Engine** | Groq SDK (Llama 3.1) | Lightning-fast LLM inference for grading/generation. |
| **Scheduling**| Node-cron | Hourly automated tournament and buffer management. |

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0 or higher)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Account (or local MongoDB)
- [Groq API Key](https://console.groq.com/keys)

### Steps to Run Locally

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
   Create a `.env` file in the root directory and add:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Run the Application:**
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:3000`.*

---

## 📸 System Interface

*(Add screenshots of your project here for the presentation)*
- **Home/Dashboard:** `![Dashboard](link-to-image)`
- **Live Debate Arena:** `![Debate Arena](link-to-image)`
- **AI Feedback & Grading:** `![Grading](link-to-image)`

---

## 👨‍💻 Project Team / Authors

This project was collaboratively developed by:
- **Pratik Kumar Singh** 
- **Yash Verma**
- **RaviRala Rohith**

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<br />
<p align="center">
  <b>Built for the Academic & Engineering Community</b>
</p>
