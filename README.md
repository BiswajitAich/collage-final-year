# AI-Powered Voice Automation Platform
### Final Year Project

<p align="center">
  <img src="/assets/final year banner.png" alt="banner" max-width="400px">
</p>

> An AI-powered voice automation platform that dynamically generates backend workflows from database schemas and enables natural voice interactions through LiveKit, LLMs, and n8n.

---

## Team Members

| Name | ![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)  |
|------|-------------|
| Ashish Gupta | [⭐🔗](https://github.com/ASHISH26940) |
| Amit Tiwari | [⭐🔗](https://github.com/Amittiwari2004) |
| Abinash Kumar Pandab |  |
| Prince Kumar Singh |  |
| Biswajit Aich | [⭐🔗](https://github.com/BiswajitAich) |

---

## Institution

**Academy of Technology**  
Department of Computer Science & Engineering  
Maulana Abul Kalam Azad University of Technology (MAKAUT)

Academic Session: **2022 – 2026**

---

# Project Overview

Traditional business applications require developers to manually build APIs, workflows, and automation logic for every database change. This process is repetitive, time-consuming, and difficult to maintain.

This project introduces an AI-powered automation platform capable of understanding a database schema, generating backend workflows automatically, and exposing them as callable tools for an intelligent voice assistant.

The system combines:

- AI-powered schema understanding
- Automatic workflow generation
- Live voice conversations
- Workflow execution through n8n
- Dynamic tool discovery
- FastAPI backend services
- LiveKit real-time communication

The platform reduces development effort while enabling users to interact with applications using natural speech.

---

# Features

- AI-assisted database schema analysis
- Automatic workflow generation
- Dynamic API generation
- Voice-controlled AI assistant
- LiveKit real-time communication
- n8n workflow automation
- Dynamic tool registration
- FastAPI backend
- PostgreSQL database integration
- Multi-tenant architecture
- REST API support
- Modular service architecture

---

# System Architecture

## Frontend Layer
﹡Mᴏʙɪʟᴇ ᴄᴀʟʟ ɪs ɴᴏᴛ ɪᴍᴘʟᴇᴍᴇɴᴛᴇᴅ﹗

<p align="center">
  <img src="/assets/Frontend Layer.drawio.png" alt="Frontend Layer" max-width="400px">
</p>

## Backend Layer

<p align="center">
  <img src="/assets/Backend Layer.drawio.png" alt="Backend Layer" max-width="300px">
</p>

## Agent Layer

<p align="center">
  <img src="/assets/Agent Layer.drawio.png" alt="Agent Layer" max-width="400px">
</p>

## Session Lifecycle

<p align="center">
  <img src="/assets/Session Lifecycle.drawio.png" alt="Session Lifecycle" max-width="400px">
</p>

## Workflow Layer

<p align="center">
  <img src="/assets/Workflow Layer.drawio.png" alt="Workflow Layer" max-width="200px">
</p>


---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript

## Backend

- FastAPI
- Python

## Database

- PostgreSQL
- Prisma ORM

## AI

- Large Language Model (LLM)

## Voice

- LiveKit

## Automation

- n8n
- Docker

## Cloud Services

- LiveKit Cloud

---

# Project Modules

## 1. Schema Manager

Responsible for:

- Uploading database schema
- Parsing SQL / Prisma schema
- Entity extraction
- Relationship detection

---

## 2. AI Analysis

The AI analyses the uploaded schema to understand

- Entities
- Relationships
- CRUD operations
- Possible APIs
- Business logic

---

## 3. Workflow Generator

Automatically creates backend workflows from AI analysis.

Example:

```
Database Schema
        ↓
AI Analysis
        ↓
Workflow Generation
        ↓
n8n Workflow
```

---

## 4. Tool Registry

Maintains dynamically generated tools that can be invoked by the AI agent.

Responsibilities:

- Register tools
- Load tools
- Execute tools
- Return responses

---

## 5. Voice Agent

Supports natural language conversations.

Capabilities include:

- Speech recognition
- LLM reasoning
- Tool calling
- Voice response

---

## 6. Workflow Execution

Generated workflows are deployed to n8n and executed whenever the AI requests them.

---

# Project Workflow

```
Database Schema
        │
        ▼
Schema Upload
        │
        ▼
Schema Parser
        │
        ▼
AI Analysis
        │
        ▼
Workflow Generation
        │
        ▼
n8n Deployment
        │
        ▼
Tool Registration
        │
        ▼
Voice Agent
        │
        ▼
User Conversation
```

---

# Folder Structure

```
collage-final-year/

├── agent-repo/
│
├── frontend-repo/
│
├── n8n-repo/
│
└── README.md
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/BiswajitAich/collage-final-year.git

cd collage-final-year
```

---

---

## Environment Variables
Create the `.env` file form the respective .env.example

Remainder
Do **not** commit your `.env` file.

---

# Running the Project

```bash
#  vscode shortcut
ctrl + shift + P
Tasks: Run Tasks
Start EveryThing

# zed shortcut
alt + shift + T
select to run
```

---

# API Documentation

FastAPI automatically generates Swagger documentation.

```
http://localhost:8000/docs
```

---

# Use Case

Example interaction:

```
> User:
>
> "What is my delivery address?"

↓

Voice Agent

↓

Tool Registry

↓

n8n Workflow

↓

Database Query

↓

Voice Response
```
---

# Advantages

- Reduces manual API development
- Faster workflow creation
- Scalable architecture
- AI-assisted automation
- Natural voice interaction
- Modular design
- Easy integration
- Reusable workflows

---

# Future Scope

- Multi-language support
- Authentication & Authorization
- Multi-agent architecture
- Analytics dashboard
- Workflow versioning
- Automatic API documentation
- Cloud deployment
- Enterprise integrations

---

## Screenshots

### Home Page

<p align="center">
  <img src="/assets/home_page.png" alt="Home Page" width="100%">
</p>

### Schema Upload Page

<p align="center">
  <img src="/assets/schema_upload_page.png" alt="Schema Upload Page" width="100%">
</p>

### Select for AI Analysis

<p align="center">
  <img src="/assets/select_for_ai_analysis.png" alt="Select for AI Analysis" width="100%">
</p>

### AI Analysis

<p align="center">
  <img src="/assets/ai_analysis.png" alt="AI Analysis" width="100%">
</p>

### Generated Workflow

<p align="center">
  <img src="/assets/generated_workflow.png" alt="Generated Workflow" width="100%">
</p>

### LiveKit Voice Agent

<p align="center">
  <img src="/assets/start_live_assistant.png" alt="LiveKit Voice Agent" width="100%">
  <img src="/assets/conversation_ai.png" alt="conversation with AI" width="100%">
</p>

### n8n Workflow

<p align="center">
  <img src="/assets/n8n_generated_workflow.png" alt="n8n Workflow" width="100%">
</p>

### Swagger API

<p align="center">
  <img src="/assets/fastapi.png" alt="Swagger API" width="100%">
</p>

### Database Schema

<p align="center">
  <img src="/assets/db.png" alt="Swagger API" max-width="400px">
</p>

### Architecture Diagram

<p align="center">
  <img src="/assets/System Architecture.drawio.png" alt="Swagger API" max-width="400px">
</p>

<!-----

# Demo

- Project Demo Video
- Presentation Slides
- Research Paper 

-->

---

# License

This project is developed for academic purposes as a Final Year  B.Tech Project.

---

# Acknowledgements

We would like to express our sincere gratitude to:

- Our Project Guide
- Department of Computer Science & Engineering
- Academy of Technology
- MAKAUT

for their continuous guidance and support throughout the development of this project.

---


## Thank You

Thank you for taking the time to explore our project.

We hope this work demonstrates the potential of combining AI, workflow automation, and voice technologies to simplify backend development and improve user interaction.

We welcome feedback, suggestions, and discussions that can help improve this project further.
