import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

// SVG Icons for section headers
const LaptopIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-color, #ccff00)' }}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="2" y1="20" x2="22" y2="20"></line>
  </svg>
);

const AchievementIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-color, #ccff00)' }}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path>
  </svg>
);

const AcademicIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-color, #ccff00)' }}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
  </svg>
);

export default function Education({ currentUser, theme, toggleTheme }) {
  const cardStyle = {
    background: 'var(--card-bg, #ffffff)',
    border: '1px solid var(--border-color, #333333)',
    borderRadius: 'var(--radius, 8px)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justify: 'space-between',
    textDecoration: 'none',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.25rem',
    marginBottom: '3rem',
  };

  const badgeStyle = {
    backgroundColor: 'rgba(204, 255, 0, 0.15)',
    color: theme === 'dark' ? '#ccff00' : '#15803d',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  };

  const linkGreenStyle = {
    color: theme === 'dark' ? '#ccff00' : '#16a34a',
    fontWeight: '600',
    fontSize: '0.85rem',
    marginTop: '1rem',
    display: 'inline-block',
  };

  return (
    <div>
      <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />

      <main className="app-main-container" style={{ maxWidth: '1050px', margin: '2rem auto', padding: '0 1rem' }}>
        
        {/* Header Banner */}
        <div 
          className="card" 
          style={{ 
            background: 'var(--card-bg, #fff)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius)', 
            padding: '2rem', 
            marginBottom: '2.5rem' 
          }}
        >
          <h1 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            STEMNet Greece Student Extra Vault
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1.05rem', lineHeight: '1.6' }}>
            An expanded, hand-picked directory of free software developer benefits, interactive science simulators, competitive coding platforms, open textbooks, Greek academic portfolios, hardware labs, and global STEM opportunities.
          </p>
        </div>

        {/* 1. GREEK ACADEMIC PORTALS & OPEN RESOURCES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <AcademicIcon />
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Greek Academic Portals & Open Resources</h2>
        </div>
        <div style={gridStyle}>
          
          <a href="https://repository.kallipos.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Kallipos Open Textbooks</strong>
                <span style={badgeStyle}>100% Free</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Official Greek academic digital repository with free textbooks for Greek university engineering, math, and physics courses.
              </p>
            </div>
            <span style={linkGreenStyle}>Browse Library ↗</span>
          </a>

          <a href="https://mathesis.cup.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Mathesis (Crete Univ. Press)</strong>
                <span style={badgeStyle}>Free Online Courses</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                High-level Greek online university courses on quantum mechanics, computer programming, differential equations, and history of science.
              </p>
            </div>
            <span style={linkGreenStyle}>Start Course ↗</span>
          </a>

          <a href="https://opencourses.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>OpenCourses Greece</strong>
                <span style={badgeStyle}>Greek Higher Ed</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Central portal providing open courseware, syllabi, lecture slides, and notes from universities across Greece (NTUA, AUTH, UoA, UPatras).
              </p>
            </div>
            <span style={linkGreenStyle}>Explore Subjects ↗</span>
          </a>

          <a href="https://photodentro.edu.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Photodentro Repository</strong>
                <span style={badgeStyle}>National Aggregator</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Greek national aggregator for educational content, interactive learning objects, digital school software, and multimedia files.
              </p>
            </div>
            <span style={linkGreenStyle}>Open Photodentro ↗</span>
          </a>

          <a href="https://dschool.edu.gr/en/" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Dschool Greece</strong>
                <span style={badgeStyle}>Innovation Hub</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Open educational repositories, digital innovation centers, and interactive learning scenarios designed for Greek students.
              </p>
            </div>
            <span style={linkGreenStyle}>Visit Dschool ↗</span>
          </a>

          <a href="https://www.vodafonegenerationnext.gr/" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Vodafone Generation Next</strong>
                <span style={badgeStyle}>Greece STEM</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Greece's flagship youth technology program offering free online labs in IoT, robotics, 3D printing, and annual student competitions.
              </p>
            </div>
            <span style={linkGreenStyle}>Join Platform ↗</span>
          </a>

        </div>

        {/* 2. COMPUTER SCIENCE, WEB & AI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <LaptopIcon />
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Computer Science, Web Dev & AI</h2>
        </div>
        <div style={gridStyle}>
          
          <a href="https://education.github.com/pack" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>GitHub Student Developer Pack</strong>
                <span style={badgeStyle}>Must Have</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free GitHub Copilot, domains, Azure/AWS cloud credits, JetBrains IDE licenses, and premium developer tools for students.
              </p>
            </div>
            <span style={linkGreenStyle}>Claim Benefits ↗</span>
          </a>

          <a href="https://free-for.dev" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Free for Developers</strong>
                <span style={badgeStyle}>Dev Resources</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A curated compilation of SaaS, PaaS, and IaaS products that have free tiers for developers and students building projects.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore Free Tiers ↗</span>
          </a>

          <a href="https://hackclub.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Hack Club</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A worldwide community of high school hackers who build creative software projects and support each other.
              </p>
            </div>
            <span style={linkGreenStyle}>Join Community ↗</span>
          </a>

          <a href="https://hackclub.com/clubs" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Hack Club (Clubs)</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Start or join a high school coding club in your area. Everything you need to get your local chapter running.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore Clubs ↗</span>
          </a>

          <a href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>freeCodeCamp</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Learn to code for free through thousands of interactive challenges, full curricula, and project certifications.
              </p>
            </div>
            <span style={linkGreenStyle}>Start Coding ↗</span>
          </a>

          <a href="https://colab.research.google.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Google Colab</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Write and execute Python code in your browser with zero configuration, featuring free GPU and TPU access.
              </p>
            </div>
            <span style={linkGreenStyle}>Open Colab ↗</span>
          </a>

          <a href="https://www.kaggle.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Kaggle</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Explore data science datasets, code notebooks, machine learning competitions, and free micro-courses.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore Kaggle ↗</span>
          </a>

          <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Hugging Face</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The AI community platform. Access open-source machine learning models, datasets, and spaces to build AI apps.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore AI Models ↗</span>
          </a>

          <a href="https://makeschool.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Make School</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Resources and modern software development learning pathways for building real-world application software.
              </p>
            </div>
            <span style={linkGreenStyle}>Start Learning ↗</span>
          </a>

          <a href="https://cs50.harvard.edu/" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Harvard CS50</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Harvard's legendary introduction to computer science, covering C, Python, SQL, HTML/CSS, and foundational algorithms.
              </p>
            </div>
            <span style={linkGreenStyle}>Access Course ↗</span>
          </a>

          <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Roadmap.sh</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Interactive, community-curated visual roadmaps detailing exact learning paths for Frontend, Backend, DevOps, AI, and Cybersecurity.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore Roadmaps ↗</span>
          </a>

          <a href="https://www.theodinproject.com/dashboard" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>The Odin Project</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A 100% free open-source full-stack web development curriculum designed to get you hired building real projects.
              </p>
            </div>
            <span style={linkGreenStyle}>Start Learning ↗</span>
          </a>

          <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>LeetCode & Codeforces</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Practice data structures and algorithms, compete in weekly coding contests, and prepare for tech software engineering interviews.
              </p>
            </div>
            <span style={linkGreenStyle}>Practice Problems ↗</span>
          </a>

          <a href="https://www.hackerrank.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>HackerRank</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Practice coding challenges across various programming languages, algorithms, data structures, and database queries.
              </p>
            </div>
            <span style={linkGreenStyle}>Solve Challenges ↗</span>
          </a>

          <a href="https://www.codewars.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Codewars</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Improve your coding skills by training on martial arts-themed kata challenges created by the community.
              </p>
            </div>
            <span style={linkGreenStyle}>Train Katas ↗</span>
          </a>

        </div>

        {/* 3. HARDWARE, IOT & MAKER LABS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <LaptopIcon />
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Hardware, IoT & Maker Labs</h2>
        </div>
        <div style={gridStyle}>

          <a href="https://www.arduino.cc" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Arduino Official</strong>
                <span style={badgeStyle}>Open Hardware</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Microcontroller documentation, project hubs, software IDE downloads, and tutorials for embedded electronics and IoT.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore Arduino ↗</span>
          </a>

          <a href="https://www.raspberrypi.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Raspberry Pi Foundation</strong>
                <span style={badgeStyle}>Maker Projects</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free coding projects, computing lesson plans, digital making guides, and resources for single-board computers.
              </p>
            </div>
            <span style={linkGreenStyle}>Get Projects ↗</span>
          </a>

          <a href="https://scratch.mit.edu" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Scratch MIT</strong>
                <span style={badgeStyle}>Visual Coding</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free visual programming language created by MIT media lab enabling students to code interactive stories, games, and animations.
              </p>
            </div>
            <span style={linkGreenStyle}>Create in Scratch ↗</span>
          </a>

        </div>

        {/* 4. MATH, PHYSICS & PRODUCTIVITY TOOLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <LaptopIcon />
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Math, Physics & Productivity Tools</h2>
        </div>
        <div style={gridStyle}>
          
          <a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Overleaf LaTeX Editor</strong>
                <span style={badgeStyle}>Free Editor</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Online collaborative LaTeX editor essential for writing university lab reports, math documents, and thesis papers.
              </p>
            </div>
            <span style={linkGreenStyle}>Open Overleaf ↗</span>
          </a>

          <a href="https://www.khanacademy.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Khan Academy</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free tutorials and self-paced exercises covering High School and University Calculus, Linear Algebra, and Physics.
              </p>
            </div>
            <span style={linkGreenStyle}>Open Academy ↗</span>
          </a>

          <a href="https://phet.colorado.edu" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>PhET Interactive Simulations</strong>
                <span style={badgeStyle}>CU Boulder</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Fun, interactive, research-based simulations of physical, chemical, earth, and math phenomena developed by the University of Colorado.
              </p>
            </div>
            <span style={linkGreenStyle}>Launch Sims ↗</span>
          </a>

          <a href="https://openstax.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>OpenStax Free Textbooks</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Peer-reviewed, openly licensed college and high school textbooks covering physics, calculus, statistics, and chemistry.
              </p>
            </div>
            <span style={linkGreenStyle}>Browse Textbooks ↗</span>
          </a>

          <a href="https://ocw.mit.edu" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>MIT OpenCourseWare</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free publication of MIT course materials including lecture notes, exams, and videos spanning all undergraduate and graduate subjects.
              </p>
            </div>
            <span style={linkGreenStyle}>Browse MIT OCW ↗</span>
          </a>

          <a href="https://www.wolframalpha.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>WolframAlpha</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Computational intelligence engine for solving complex calculus integrals, physics formulas, data analysis, and step-by-step math proofs.
              </p>
            </div>
            <span style={linkGreenStyle}>Compute with Wolfram ↗</span>
          </a>

          <a href="https://projecteuler.net" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Project Euler</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A collection of challenging mathematical and computer programming problems requiring creative algorithmic problem solving.
              </p>
            </div>
            <span style={linkGreenStyle}>Solve Problems ↗</span>
          </a>

          <a href="https://www.edx.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>edX Online Learning</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Access high-quality online courses from top global universities and institutions in computer science, data, and engineering.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore edX Courses ↗</span>
          </a>

          <a href="https://www.geogebra.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>GeoGebra & Desmos</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free interactive 2D and 3D graphing calculators for geometry, calculus functions, vectors, and algebra.
              </p>
            </div>
            <span style={linkGreenStyle}>Launch Calculators ↗</span>
          </a>

        </div>

        {/* 5. COMPETITIONS, OLYMPIADS & FAIRS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <AchievementIcon />
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Competitions, Olympiads & Fairs</h2>
        </div>
        <div style={gridStyle}>
          
          <a href="https://wro-learn.org/en_us/welcome" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>WRO Learn</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The official learning platform for the World Robot Olympiad, providing training modules for robotics teams.
              </p>
            </div>
            <span style={linkGreenStyle}>Start Training ↗</span>
          </a>

          <a href="https://firsttechchallenge.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>FIRST Tech Challenge Greece</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The Greek division of the global robotics competition—design, build, and program robots for a yearly challenge.
              </p>
            </div>
            <span style={linkGreenStyle}>Join Greece FTC ↗</span>
          </a>

          <a href="https://www.robocup.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>RoboCupJunior</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                International robotics competition designed for primary and secondary school students focusing on rescue, soccer, and onSpace challenges.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore RoboCup ↗</span>
          </a>

          <a href="https://ioinformatics.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>International Olympiad in Informatics (IOI)</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The top global computer science olympiad. Access archive tasks, solutions, and qualification criteria.
              </p>
            </div>
            <span style={linkGreenStyle}>IOI Portal ↗</span>
          </a>

          <a href="https://icscompetition.org/en/#qualification" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Int'l Computer Science Competition</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Global contest testing computational thinking, logic, programming speed, and creative problem solving.
              </p>
            </div>
            <span style={linkGreenStyle}>View Qualifications ↗</span>
          </a>

          <a href="https://www.firstinspires.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>FIRST Robotics Competition</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Leading global youth robotics initiative combining hardware engineering, CAD, and team competition.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore FIRST ↗</span>
          </a>

          <a href="https://isef.net" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Regeneron ISEF</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The premier international science research competition for high school innovators and young scientists.
              </p>
            </div>
            <span style={linkGreenStyle}>Discover ISEF ↗</span>
          </a>

        </div>

        {/* 6. SPACE, SCIENCE & GLOBAL RESEARCH */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <LaptopIcon />
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Space, Science & Global Research</h2>
        </div>
        <div style={gridStyle}>
          
          <a href="https://stemgateway.nasa.gov/s/course-offering/a0BSJ0000049icD/open-science-essentials" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>NASA Open Science Essentials</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Official NASA training course covering accessible scientific research methodologies and open-source space data.
              </p>
            </div>
            <span style={linkGreenStyle}>Enroll Free ↗</span>
          </a>

          <a href="https://www.esa.int/Education" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>ESA Education (European Space Agency)</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Space-themed educational projects, classroom resources, student satellite missions, and robotics challenges across Europe.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore ESA Education ↗</span>
          </a>

          <a href="https://home.cern/youth-education" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>CERN Education & Students</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Particle physics resources, student lab visits, teacher programmes, and open educational resources from the world's leading lab.
              </p>
            </div>
            <span style={linkGreenStyle}>Explore CERN Labs ↗</span>
          </a>

          <a href="https://www.zooniverse.org/projects" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Zooniverse Projects</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Assist university researchers worldwide by analyzing astrophysics images, biological data, and climate logs.
              </p>
            </div>
            <span style={linkGreenStyle}>Browse Projects ↗</span>
          </a>

          <a href="https://scistarter.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>SciStarter</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A searchable database connecting students to thousands of active citizen science research projects.
              </p>
            </div>
            <span style={linkGreenStyle}>Find Projects ↗</span>
          </a>

          <a href="https://bwsi.mit.edu/about/mit-additional-resources/" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>MIT Beaver Works (BWSI)</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free open courseware from MIT on autonomous cognitive mini-racecars, cybersecurity, and satellite engineering.
              </p>
            </div>
            <span style={linkGreenStyle}>Access MIT Material ↗</span>
          </a>

        </div>

        {/* 7. VIDEO LEARNING & TECH CREATORS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <LaptopIcon />
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Video Learning & Tech Creators</h2>
        </div>
        <div style={gridStyle}>
          
          <a href="https://www.youtube.com/@veritasium" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Veritasium</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                In-depth science, technology, and engineering video essays exploring the fundamental workings of the universe.
              </p>
            </div>
            <span style={linkGreenStyle}>Watch Videos ↗</span>
          </a>

          <a href="https://www.youtube.com/@HackClubHQ" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Hack Club HQ</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Showcases student builds, live coding sessions, and event highlights from the global Hack Club community.
              </p>
            </div>
            <span style={linkGreenStyle}>Watch Videos ↗</span>
          </a>

          <a href="https://www.youtube.com/@Fireship" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Fireship</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Fast-paced, high-energy summaries of programming languages, frameworks, and modern tech trends.
              </p>
            </div>
            <span style={linkGreenStyle}>Watch Videos ↗</span>
          </a>

          <a href="https://www.youtube.com/@Robonyx" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Robonyx</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Practical tutorials, project builds, and insights into robotics and embedded systems engineering.
              </p>
            </div>
            <span style={linkGreenStyle}>Watch Videos ↗</span>
          </a>

          <a href="https://www.youtube.com/@BroCodez" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Bro Code</strong>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Comprehensive, beginner-friendly programming tutorials covering Python, Java, C++, and more.
              </p>
            </div>
            <span style={linkGreenStyle}>Watch Videos ↗</span>
          </a>

        </div>

      </main>
    </div>
  );
}