Here’s a strong prompt you can give to another AI to help design/build the app around your exact idea.

I want to build a personal self-improvement app called **Sharpr**.

### Core idea

Sharpr is a personal coaching and practice app designed to help me continuously improve:

* Communication
* English fluency from C1 toward C2/native-like professional communication
* Public speaking
* Storytelling
* Technical knowledge
* Interview skills
* Leadership and CTO-level thinking
* Founder communication
* General knowledge
* Reading and learning
* Critical thinking
* Confidence
* Vocabulary
* Presentation ability
* Speaking spontaneously without preparation

The app should feel like:

**A personal communication gym + knowledge trainer + career coach + learning companion.**

It is NOT primarily an English-learning app.

The main philosophy is:

**Discover → Speak → Learn → Review → Repeat → Improve**

---

# Important V1 Constraint

For the initial version:

**Do NOT integrate any AI API, LLM API, speech-analysis API, or automatic AI analysis inside the app.**

The app itself should have **zero AI usage/cost**.

Content such as:

* speaking topics
* interview questions
* stories
* debates
* scenarios
* technical questions
* learning material
* podcast prompts
* book discussions

will be generated separately using external AI agents and then manually/imported into the application.

User recordings and performance will initially be reviewed manually.

Design the architecture so AI analysis can be added later, but do not make AI necessary for V1.

---

# Main User Experience

When I open Sharpr, I should not always have to decide what to practice.

The app should be capable of giving me something random.

Examples:

**Speak for 3 minutes:**

“Should every startup begin with a monolith?”

or:

“Explain Kubernetes to a nontechnical founder.”

or:

“Tell a story about a time you had to solve an unexpected problem.”

or:

“You are a CTO. Your production database is failing during peak traffic. Explain your response.”

I should be able to press:

**Give Me Something Random**

and Sharpr randomly selects an activity from different categories.

Allow filters such as:

* completely random
* communication
* technical
* interview
* storytelling
* podcast
* leadership
* founder
* books
* general knowledge
* difficult
* quick practice
* 5-minute challenge
* 15-minute session

---

# Main Sections

Design Sharpr around several major training sections.

## 1. Daily / Today

This is the main dashboard.

Show things such as:

* Today's random challenge
* Continue learning
* Topic of the day
* Interview question
* Storytelling prompt
* Knowledge topic
* Recently practiced topics
* Topics waiting for review
* Daily speaking minutes
* Practice history

Include a prominent:

**Start Random Session**

button.

---

# 2. Random Practice

This is one of the most important features.

Randomly select activities from the entire database.

Examples:

### Random Speaking Topic

“Is remote work better for senior engineers than junior engineers?”

Give:

* preparation time
* recommended speaking duration
* difficulty
* category
* optional guiding questions

Example:

Preparation: 30 seconds
Speak: 3 minutes

Guiding questions:

* What is your position?
* What are the tradeoffs?
* Can you provide an example?
* What would someone who disagrees say?
* What is your conclusion?

---

# 3. Interview Practice

Have multiple interview tracks.

Examples:

### Flutter

* Dart
* Flutter internals
* state management
* architecture
* performance
* animations
* platform channels
* native integration
* testing
* deployment

### Full Stack

* React
* Next.js
* APIs
* Node
* backend architecture
* Laravel
* databases
* authentication
* caching
* networking
* security

### AI Engineer

* LLMs
* RAG
* embeddings
* agents
* evaluation
* inference
* vector databases
* ML fundamentals
* AI architecture
* AI product development

### System Design

* scalability
* databases
* queues
* caching
* load balancing
* distributed systems
* CAP theorem
* event-driven architecture
* microservices

### CTO

Questions should include more than technical knowledge.

Examples:

* architecture decisions
* hiring
* firing
* budgeting
* technical debt
* engineering culture
* security incidents
* outages
* vendor selection
* prioritization
* communicating with executives
* build vs buy
* product decisions

### Founder

* pitching
* explaining your product
* investor questions
* customer conversations
* product strategy
* business models
* pricing
* difficult decisions

Allow:

**Random Interview Question**

and:

**Mock Interview Session**

A session can contain multiple questions.

---

# 4. Tech Talks

This section trains me to explain technical subjects clearly.

Examples:

“Explain Redis.”

Then allow different speaking modes:

* explain to a beginner
* explain to junior developer
* explain to senior developer
* explain to CTO
* explain to CEO
* explain to investor
* explain to customer
* explain without technical jargon

This section should contain technologies across:

* Flutter
* React
* Next.js
* Node
* Laravel
* APIs
* databases
* PostgreSQL
* Redis
* Docker
* Kubernetes
* AWS
* networking
* DevOps
* CI/CD
* security
* system design
* AI
* ML
* LLMs
* RAG
* agents

After speaking, the user should be able to open:

**Learn This Topic**

---

# 5. Learn After Speaking

This is extremely important.

Sharpr should follow:

### Speak First → Learn Second

I should often attempt to explain something before reading about it.

For example:

Topic:

**Database Indexes**

Step 1:

“Explain how database indexes work.”

Step 2:

I record my explanation.

Step 3:

Sharpr reveals the learning resources.

Resources can include:

* short explanation
* detailed explanation
* important points
* examples
* common mistakes
* interview questions
* articles
* YouTube videos
* books
* documentation
* links
* related topics

Step 4:

After learning:

**Explain Again**

This allows me to compare my understanding before and after learning.

---

# 6. Storytelling

Create a dedicated storytelling trainer.

Examples:

“Tell a story about a difficult bug you solved.”

“Tell a story about a time you disagreed with someone.”

“Tell a story about something that changed your perspective.”

“Tell a story about failing at something.”

“Tell a story that makes a boring event interesting.”

Support storytelling frameworks such as:

* STAR
* Situation → Conflict → Resolution
* Beginning → Tension → Climax → Ending
* Hook → Story → Lesson
* Before → Change → After

Allow random storytelling prompts.

Have categories such as:

* personal
* professional
* technical
* funny
* emotional
* leadership
* interview
* founder
* completely fictional

---

# 7. Podcast Mode

Create a section that feels like practicing being on a podcast.

A podcast topic can contain:

* episode subject
* opening question
* discussion points
* follow-up questions
* controversial angle
* closing question

Example:

### Episode

**Will AI reduce the number of software developers?**

Opening:

“What has AI changed about your own development workflow?”

Follow-ups:

* What will junior developers struggle with?
* Will software engineering become easier?
* What skills will become more valuable?
* Are developers becoming overly dependent on AI?
* What happens in five years?

Let me record a long-form response/session.

Suggested durations:

* 5 minutes
* 10 minutes
* 20 minutes
* 30 minutes

---

# 8. Debate Mode

Give me a position.

Example:

**“Microservices are overused.”**

Choose:

* defend
* oppose
* random side

Give me preparation time.

Then provide counterarguments that I can manually reveal one at a time.

Example:

My argument:

“Microservices create unnecessary complexity.”

Reveal counterargument:

“But they allow independent scaling and deployment.”

Then I respond again.

The app itself does not need AI for this.

All counterarguments can be stored beforehand.

---

# 9. Quick Speaking

For very short practice sessions.

Examples:

### 30 Seconds

“Describe what an API is.”

### 60 Seconds

“Convince someone to learn Flutter.”

### 2 Minutes

“Describe the biggest mistake startups make with technology.”

Useful when I have only a few minutes.

---

# 10. Books

Create a personal book-learning section.

I should be able to add books manually.

For each book:

* title
* author
* status
* current chapter
* notes
* important ideas
* quotes
* vocabulary
* concepts
* discussion prompts

After reading a chapter, Sharpr should give prompts such as:

* Explain the chapter without looking.
* What was the main argument?
* What did you disagree with?
* What surprised you?
* Explain it in 2 minutes.
* Relate it to your career.
* Relate it to another book.
* How could you apply this idea?
* Teach the chapter to someone else.

The goal is active recall, not simply tracking books.

---

# 11. General Knowledge

Include topics beyond software engineering.

Examples:

* economics
* psychology
* business
* science
* history
* philosophy
* finance
* geopolitics
* productivity
* entrepreneurship
* leadership
* communication
* design
* marketing
* society
* technology trends

Give random topics.

First:

**What do you already know?**

Then allow:

**Learn More**

Then:

**Explain It Again**

---

# 12. Vocabulary

Let me manually collect useful words and expressions.

Each vocabulary item can contain:

* word
* meaning
* example
* pronunciation
* synonyms
* category
* where I discovered it
* personal example sentence

Allow:

**Use 3 random saved words in today's speaking challenge.**

Avoid focusing only on complicated vocabulary.

Prioritize:

* natural professional phrases
* precise vocabulary
* concise expressions
* executive language
* transition phrases
* storytelling expressions
* persuasive language

---

# 13. Recording

Speaking activities should support:

* audio recording
* video recording
* audio-only mode
* timer
* preparation timer
* pause/resume
* playback

Store:

* activity
* recording
* date
* duration
* category
* difficulty
* user notes
* manual rating

Allow me to watch previous recordings.

---

# 14. Manual Review

Since there is no AI analysis in V1, allow me to manually review myself.

After recording, show a review form.

Possible ratings from 1–10:

* fluency
* confidence
* clarity
* vocabulary
* grammar
* pronunciation
* conciseness
* organization
* knowledge
* storytelling
* persuasiveness
* technical accuracy

Also allow checkboxes:

* too many filler words
* spoke too quickly
* spoke too slowly
* repeated myself
* weak opening
* weak conclusion
* forgot important information
* lacked examples
* overused technical jargon
* lost train of thought

And notes:

**What went well?**

**What should improve?**

**What should I research?**

**Words I want to learn**

**Retry this topic later**

---

# 15. Retry System

A major feature should be:

**Practice Again Later**

When I perform poorly on a topic, save it to:

### Retry Queue

Allow retry:

* tomorrow
* next week
* someday
* custom date

Also allow automatic resurfacing based on simple deterministic rules.

No AI required.

Example:

If rating is below 6/10:

Recommend adding it to retry queue.

---

# 16. Learning Resources

Each topic can contain resources.

Resource types:

* article
* documentation
* video
* podcast
* book
* course
* notes
* cheatsheet
* external website

Topics and resources should have many-to-many relationships.

One resource may support multiple topics.

---

# 17. Content Collections

Allow grouping content into collections.

Examples:

### Become Better at Flutter

50 speaking topics
100 interview questions
20 system-design exercises

### CTO Preparation

Leadership
architecture
communication
hiring
incidents
business

### C1 → C2 Communication

Storytelling
debate
professional vocabulary
executive communication
impromptu speaking

### Founder Communication

pitching
sales
investor communication
product explanations
leadership

---

# 18. Sessions

Allow structured sessions.

Example:

### 20-Minute Daily Sharpr

1. 2-minute random speaking
2. technical explanation
3. interview question
4. learn one concept
5. storytelling challenge
6. reflection

Other session presets:

* Morning Sharpening
* Interview Preparation
* CTO Workout
* Speaking Only
* Technical Workout
* 10-Minute Quick Session
* 30-Minute Deep Practice

Allow custom session templates.

---

# 19. Progress Dashboard

Track progress without AI.

Useful statistics:

* total practice days
* total speaking minutes
* recordings created
* topics completed
* topics retried
* categories practiced
* books studied
* learning resources completed
* average self-rating
* strongest categories
* weakest categories based on manual ratings
* most practiced categories
* vocabulary collected

Charts should be simple and genuinely useful.

Do not gamify excessively.

This is for serious personal improvement.

---

# 20. Personal Goals

Allow goals such as:

* Speak for 20 minutes every day
* Practice 5 interview questions/week
* Complete 3 storytelling exercises/week
* Learn 5 technical concepts/week
* Read 20 pages/day
* Record one 10-minute podcast/week

Track completion.

---

# 21. Content Management

Because external AI will generate most of the content, make content management extremely easy.

I should be able to:

* manually create content
* edit content
* archive content
* duplicate content
* bulk import content
* import JSON
* import CSV
* export JSON
* tag everything

Create a flexible content model.

Example content types:

* speaking_topic
* interview_question
* technical_topic
* storytelling_prompt
* podcast_topic
* debate
* scenario
* book_prompt
* knowledge_topic
* vocabulary
* learning_resource

---

# 22. External AI Content Workflow

The app should support a workflow where I ask an external AI agent:

“Generate 100 senior Flutter interview questions.”

The external agent returns structured JSON.

I then import the JSON into Sharpr.

Define a clean reusable JSON schema for importing content.

Example:

{
"type": "speaking_topic",
"title": "Should startups use microservices?",
"category": "System Design",
"difficulty": "advanced",
"duration": 5,
"preparation_seconds": 30,
"prompt": "...",
"guiding_questions": [],
"tags": [],
"resources": []
}

Create similar schemas where necessary.

---

# 23. Randomization Engine

Build a flexible random-content engine.

Avoid repeatedly showing the same topics.

Random selection should optionally consider:

* content never practiced
* low-rated topics
* bookmarked topics
* difficulty
* category
* duration
* recently practiced items
* retry queue

Include:

**Surprise Me**

where absolutely any suitable exercise can appear.

---

# 24. Design Philosophy

The application should feel:

* premium
* minimal
* calm
* intelligent
* mature
* modern
* developer-friendly
* not childish
* not like Duolingo
* not excessively gamified
* not AI-generated/sloppy
* not filled with gradients everywhere

The experience should resemble a personal high-performance coaching environment.

Think:

**Notion + Linear + modern fitness tracking + executive coaching.**

Use clean typography, whitespace and subtle motion.

---

# 25. Navigation

Consider a navigation structure similar to:

### Today

Daily training and random session

### Practice

* Random
* Speak
* Story
* Podcast
* Debate
* Interview
* Tech Talk

### Learn

* Topics
* Books
* Resources
* Vocabulary

### Review

* Recordings
* Retry Queue
* Notes

### Progress

* statistics
* goals
* history

### Library

All manually created/imported content

Do not blindly follow this navigation if there is a better UX structure.

---

# 26. Technology

I am a developer and will be building this largely myself with AI-assisted development.

For V1, strongly consider:

* React / Next.js
* TypeScript
* responsive web application
* PWA support
* local-first where reasonable
* PostgreSQL/Supabase or another simple backend
* clean component architecture

The app should work well on desktop and mobile browsers.

Later I may create a Flutter mobile app.

Do not overengineer the infrastructure.

---

# 27. Future AI Support

Design the architecture so that later I could optionally add:

* speech-to-text
* pronunciation analysis
* filler-word analysis
* vocabulary analysis
* automatic communication scores
* AI interviewers
* conversational voice mode
* video/body-language analysis
* personalized curriculum
* automatic resource recommendations

However:

**NONE of these should be required for the initial version.**

V1 must remain fully useful without AI.

---

# Main Product Principle

Sharpr should not just show me content.

It should repeatedly force me to:

**retrieve knowledge from memory, explain it, speak about it, discover weaknesses, learn, and then try again.**

The app should make self-improvement feel like training.

Its identity should be:

> **Sharpr — Sharpen how you think, speak, learn and lead.**

Based on all of the above, help me turn this into a polished product.

First produce:

1. Product architecture
2. Feature hierarchy
3. Recommended navigation
4. Core user flows
5. Database/content model
6. JSON import structure
7. MVP vs later features
8. Page-by-page UX specification
9. Recommended React/Next.js architecture
10. A phased implementation roadmap

Do not add AI APIs to V1 and do not turn this into a generic language-learning application.

I’d use this as the **master product prompt** first. After the AI defines the architecture, we can make a second, much more technical prompt specifically for **generating the Next.js app/UI/database structure**.
