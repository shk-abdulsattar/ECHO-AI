# ECHO AI 🌿🤖

ECHO AI is an AI-powered therapist and wellness platform designed as a comprehensive web-based application. It empowers users to maintain their emotional well being, establish healthy life habits, reduce stress, and cultivate deeper self awareness through intelligent conversations and evidence based wellness activities.


## 🚀 Core Features

### 🧠 Intelligent Support
* **AI Chat**: Engage in personalized, context-aware conversations for emotional guidance powered by the Gemini API. 
* **Context-Driven Limits**: Stores a contextual window of the last 20 messages per session for fluid conversation flow.
* **Crisis Detection & Panic Overlay**: Monitored interaction filters keyword indicators of severe distress (e.g., "how to die") to automatically block harmful contexts and immediately surface a supportive **Panic Support Module** filled with deep-breathing guides and emergency contacts.

### 🧘‍♂️ Wellness Ecosystem
* **Emoji-Based Mood Tracker**: Log daily emotional states seamlessly to uncover underlying behavioral trends and map weekly progress charts on the main dashboard.
* **AI-Generated Daily Goals**: Receives dynamically customized daily action checklists (3–5 goals) tailored to track user consistency and reward streak milestones.
* **Guided Meditation & Breathing Exercises**: Interactive sessions built around targeted patterns (e.g., Box Breathing, Body Scans) featuring visual pace trackers.
* **Memory Card Game**: Gamified mental exercise intervals with variable difficulties (Easy, Medium, Hard) configured to track time and optimize daily focus.
* **Weekly Health Summaries**: Automatically builds actionable mental wellness reports analyzing overall mood variance and conversational patterns across your sessions.



## 🛠️ Tech Stack & Requirements

### Software Architecture
* **Frontend**: React.js, Tailwind CSS, HTML5, CSS3, JavaScript (Vite environment).
* **Backend Framework**: Node.js, Express.js.
* **Database & Auth**: Google Cloud Firestore & Firebase Authentication.
* **Core AI Engine**: Google Gemini API Integration.


---


## 🔧 Installation & Initial Setup

Follow these steps to deploy and run ECHO AI locally in your development environment:

Ensure you have the Node.js Runtime Environment and npm installed on your system.


1. Clone the Repository

```Bash
  git clone [https://github.com/shk-abdulsattar/echo-ai.git](https://github.com/shk-abdulsattar/echo-ai.git)
  cd echo-ai
```


2. Configure Environment Variables

  Code snippet
  ```
    # Firebase Configuration
    REACT_APP_FIREBASE_API_KEY=your_firebase_key
    REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    REACT_APP_FIREBASE_PROJECT_ID=your_project_id
  ```
  Google AI Studio Configuration
  ```
    GEMINI_API_KEY=your_google_gemini_api_token
  ```

3. Setup the Backend Server
  ```bash
  cd backend
    npm install
    npm run dev
  ```

4. Setup the Frontend App
Open a separate terminal window and execute:

  ```Bash
      cd frontend
      npm install
      npm run dev
  ```

Your browser should automatically launch the platform at http://localhost:5173.
