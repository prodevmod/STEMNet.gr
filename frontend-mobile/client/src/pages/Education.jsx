import { View, Text, StyleSheet, Dimensions } from 'react-native';
 
import Navbar from '../components/Navbar';

export default function Education({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
  // SVG Icons for section headers with dynamic theme-aware coloring
  const iconColor = theme === 'dark' ? '#ccff00' : '#15803d';

  const LaptopIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="2" y1="20" x2="22" y2="20"></line>
    </svg>
  );

  const AchievementIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
      <path d="M4 22h16"></path>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path>
    </svg>
  );

  const AcademicIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
      <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
    </svg>
  );

  const cardStyle = {
    background: 'var(--card-bg, #ffffff)',
    border: '1px solid var(--border-color, #333333)',
    borderRadius: 'var(--radius, 8px)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
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
    backgroundColor: theme === 'dark' ? 'rgba(204, 255, 0, 0.15)' : 'rgba(21, 128, 61, 0.1)',
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
    <View>
      <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

      <main className="app-main-container" style={{ maxWidth: '1050px', margin: '2rem auto', padding: '0 1rem' }}>
        
        {/* Header Banner */}
        <View 
          className="card" 
          style={{ 
            background: 'var(--card-bg, #fff)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius)', 
            padding: '2rem', 
            marginBottom: '2.5rem' 
          }}
        >
          <Text style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            STEMNet Greece Student Extra Vault
          </Text>
          <Text style={{ margin: 0, color: '#64748b', fontSize: '1.05rem', lineHeight: '1.6' }}>
            An expanded, hand-picked directory of free software developer benefits, interactive science simulators, competitive coding platforms, open textbooks, Greek academic portfolios, hardware labs, and global STEM opportunities.
          </Text>
        </View>

        {/* 1. GREEK ACADEMIC PORTALS & OPEN RESOURCES */}
        <View style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <AcademicIcon />
          <Text style={{ margin: 0, color: 'var(--text-primary)' }}>Greek Academic Portals & Open Resources</Text>
        </View>
        <View style={gridStyle}>
          
          <a href="https://repository.kallipos.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Kallipos Open Textbooks</strong>
                <Text style={badgeStyle}>100% Free</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Official Greek academic digital repository with free textbooks for Greek university engineering, math, and physics courses.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Browse Library ↗</Text>
          </a>

          <a href="https://mathesis.cup.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Mathesis (Crete Univ. Press)</strong>
                <Text style={badgeStyle}>Free Online Courses</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                High-level Greek online university courses on quantum mechanics, computer programming, differential equations, and history of science.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Start Course ↗</Text>
          </a>

          <a href="https://opencourses.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>OpenCourses Greece</strong>
                <Text style={badgeStyle}>Greek Higher Ed</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Central portal providing open courseware, syllabi, lecture slides, and notes from universities across Greece (NTUA, AUTH, UoA, UPatras).
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore Subjects ↗</Text>
          </a>

          <a href="https://photodentro.edu.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Photodentro Repository</strong>
                <Text style={badgeStyle}>National Aggregator</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Greek national aggregator for educational content, interactive learning objects, digital school software, and multimedia files.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Open Photodentro ↗</Text>
          </a>

          <a href="https://dschool.edu.gr/en/" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Dschool Greece</strong>
                <Text style={badgeStyle}>Innovation Hub</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Open educational repositories, digital innovation centers, and interactive learning scenarios designed for Greek students.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Visit Dschool ↗</Text>
          </a>

          <a href="https://www.vodafonegenerationnext.gr/" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Vodafone Generation Next</strong>
                <Text style={badgeStyle}>Greece STEM</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Greece's flagship youth technology program offering free online labs in IoT, robotics, 3D printing, and annual student competitions.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Join Platform ↗</Text>
          </a>

        </View>

        {/* 2. COMPUTER SCIENCE, WEB & AI */}
        <View style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <LaptopIcon />
          <Text style={{ margin: 0, color: 'var(--text-primary)' }}>Computer Science, Web Dev & AI</Text>
        </View>
        <View style={gridStyle}>
          
          <a href="https://education.github.com/pack" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>GitHub Student Developer Pack</strong>
                <Text style={badgeStyle}>Must Have</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free GitHub Copilot, domains, Azure/AWS cloud credits, JetBrains IDE licenses, and premium developer tools for students.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Claim Benefits ↗</Text>
          </a>

          <a href="https://free-for.dev" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Free for Developers</strong>
                <Text style={badgeStyle}>Dev Resources</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A curated compilation of SaaS, PaaS, and IaaS products that have free tiers for developers and students building projects.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore Free Tiers ↗</Text>
          </a>

          <a href="https://hackclub.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Hack Club</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A worldwide community of high school hackers who build creative software projects and support each other.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Join Community ↗</Text>
          </a>

          <a href="https://hackclub.com/clubs" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Hack Club (Clubs)</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Start or join a high school coding club in your area. Everything you need to get your local chapter running.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore Clubs ↗</Text>
          </a>

          <a href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>freeCodeCamp</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Learn to code for free through thousands of interactive challenges, full curricula, and project certifications.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Start Coding ↗</Text>
          </a>

          <a href="https://colab.research.google.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Google Colab</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Write and execute Python code in your browser with zero configuration, featuring free GPU and TPU access.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Open Colab ↗</Text>
          </a>

          <a href="https://www.kaggle.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Kaggle</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Explore data science datasets, code notebooks, machine learning competitions, and free micro-courses.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore Kaggle ↗</Text>
          </a>

          <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Hugging Face</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The AI community platform. Access open-source machine learning models, datasets, and spaces to build AI apps.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore AI Models ↗</Text>
          </a>

          <a href="https://makeschool.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Make School</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Resources and modern software development learning pathways for building real-world application software.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Start Learning ↗</Text>
          </a>

          <a href="https://cs50.harvard.edu/" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Harvard CS50</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Harvard's legendary introduction to computer science, covering C, Python, SQL, HTML/CSS, and foundational algorithms.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Access Course ↗</Text>
          </a>

          <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Roadmap.sh</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Interactive, community-curated visual roadmaps detailing exact learning paths for Frontend, Backend, DevOps, AI, and Cybersecurity.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore Roadmaps ↗</Text>
          </a>

          <a href="https://www.theodinproject.com/dashboard" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>The Odin Project</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A 100% free open-source full-stack web development curriculum designed to get you hired building real projects.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Start Learning ↗</Text>
          </a>

          <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>LeetCode & Codeforces</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Practice data structures and algorithms, compete in weekly coding contests, and prepare for tech software engineering interviews.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Practice Problems ↗</Text>
          </a>

          <a href="https://www.hackerrank.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>HackerRank</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Practice coding challenges across various programming languages, algorithms, data structures, and database queries.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Solve Challenges ↗</Text>
          </a>

          <a href="https://www.codewars.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Codewars</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Improve your coding skills by training on martial arts-themed kata challenges created by the community.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Train Katas ↗</Text>
          </a>

        </View>

        {/* 3. HARDWARE, IOT & MAKER LABS */}
        <View style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <LaptopIcon />
          <Text style={{ margin: 0, color: 'var(--text-primary)' }}>Hardware, IoT & Maker Labs</Text>
        </View>
        <View style={gridStyle}>

          <a href="https://www.arduino.cc" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Arduino Official</strong>
                <Text style={badgeStyle}>Open Hardware</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Microcontroller documentation, project hubs, software IDE downloads, and tutorials for embedded electronics and IoT.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore Arduino ↗</Text>
          </a>

          <a href="https://www.raspberrypi.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Raspberry Pi Foundation</strong>
                <Text style={badgeStyle}>Maker Projects</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free coding projects, computing lesson plans, digital making guides, and resources for single-board computers.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Get Projects ↗</Text>
          </a>

          <a href="https://scratch.mit.edu" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Scratch MIT</strong>
                <Text style={badgeStyle}>Visual Coding</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free visual programming language created by MIT media lab enabling students to code interactive stories, games, and animations.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Create in Scratch ↗</Text>
          </a>

        </View>

        {/* 4. MATH, PHYSICS & PRODUCTIVITY TOOLS */}
        <View style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <LaptopIcon />
          <Text style={{ margin: 0, color: 'var(--text-primary)' }}>Math, Physics & Productivity Tools</Text>
        </View>
        <View style={gridStyle}>
          
          <a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Overleaf LaTeX Editor</strong>
                <Text style={badgeStyle}>Free Editor</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Online collaborative LaTeX editor essential for writing university lab reports, math documents, and thesis papers.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Open Overleaf ↗</Text>
          </a>

          <a href="https://www.khanacademy.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Khan Academy</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free tutorials and self-paced exercises covering High School and University Calculus, Linear Algebra, and Physics.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Open Academy ↗</Text>
          </a>

          <a href="https://phet.colorado.edu" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>PhET Interactive Simulations</strong>
                <Text style={badgeStyle}>CU Boulder</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Fun, interactive, research-based simulations of physical, chemical, earth, and math phenomena developed by the University of Colorado.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Launch Sims ↗</Text>
          </a>

          <a href="https://openstax.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>OpenStax Free Textbooks</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Peer-reviewed, openly licensed college and high school textbooks covering physics, calculus, statistics, and chemistry.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Browse Textbooks ↗</Text>
          </a>

          <a href="https://ocw.mit.edu" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>MIT OpenCourseWare</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free publication of MIT course materials including lecture notes, exams, and videos spanning all undergraduate and graduate subjects.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Browse MIT OCW ↗</Text>
          </a>

          <a href="https://www.wolframalpha.com" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>WolframAlpha</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Computational intelligence engine for solving complex calculus integrals, physics formulas, data analysis, and step-by-step math proofs.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Compute with Wolfram ↗</Text>
          </a>

          <a href="https://projecteuler.net" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Project Euler</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                A collection of challenging mathematical and computer programming problems requiring creative algorithmic problem solving.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Solve Problems ↗</Text>
          </a>

          <a href="https://www.edx.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>edX Online Learning</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Access high-quality online courses from top global universities and institutions in computer science, data, and engineering.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore edX Courses ↗</Text>
          </a>

          <a href="https://www.geogebra.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>GeoGebra & Desmos</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Free interactive 2D and 3D graphing calculators for geometry, calculus functions, vectors, and algebra.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Launch Calculators ↗</Text>
          </a>

        </View>

        {/* 5. COMPETITIONS, OLYMPIADS & FAIRS */}
        <View style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <AchievementIcon />
          <Text style={{ margin: 0, color: 'var(--text-primary)' }}>Competitions, Olympiads & Fairs</Text>
        </View>
        <View style={gridStyle}>
          
          <a href="https://wro-learn.org/en_us/welcome" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>WRO Learn</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The official learning platform for the World Robot Olympiad, providing training modules for robotics teams.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Start Training ↗</Text>
          </a>

          <a href="https://firsttechchallenge.gr" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>FIRST Tech Challenge Greece</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The Greek division of the global robotics competition—design, build, and program robots for a yearly challenge.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Join Greece FTC ↗</Text>
          </a>

          <a href="https://www.robocup.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>RoboCupJunior</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                International robotics competition designed for primary and secondary school students focusing on rescue, soccer, and onSpace challenges.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Explore RoboCup ↗</Text>
          </a>

          <a href="https://ioinformatics.org" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>International Olympiad in Informatics (IOI)</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                The top global computer science olympiad. Access archive tasks, solutions, and qualification criteria.
              </Text>
            </View>
            <Text style={linkGreenStyle}>IOI Portal ↗</Text>
          </a>

          <a href="https://icscompetition.org/en/#qualification" target="_blank" rel="noopener noreferrer" style={cardStyle} className="vault-card">
            <View>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Int'l Computer Science Competition</strong>
              <Text style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                Global computer science problem-solving competition for high school students.
              </Text>
            </View>
            <Text style={linkGreenStyle}>Learn More ↗</Text>
          </a>

        </View>
      </main>
    </View>
  );
}



const { width } = Dimensions.get('window');

// 1. Color Palette (Light & Dark Theme Tokens)
export const theme = {
  light: {
    bg: '#f8fafc',
    cardBg: '#ffffff',
    text: '#000000',
    borderColor: '#e2e8f0',
    primary: '#ccff00',
    primaryHover: '#b3e600',
    primaryText: '#000000',
    danger: '#ef4444',
    secondaryText: '#475569',
    headerBg: '#0f172a',
    headerText: '#ffffff',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#047857',
    badgeBorder: '#10b981',
  },
  dark: {
    bg: '#000000',
    cardBg: '#121212',
    text: '#ffffff',
    borderColor: '#333333',
    primary: '#ccff00',
    primaryHover: '#b3e600',
    primaryText: '#000000',
    danger: '#ef4444',
    secondaryText: '#94a3b8',
    headerBg: '#000000',
    headerText: '#ffffff',
    badgeBg: 'rgba(204, 255, 0, 0.12)',
    badgeText: '#ccff00',
    badgeBorder: '#ccff00',
  },
};

// 2. React Native Stylesheet
export const styles = StyleSheet.create({
  // --- Containers & Layout ---
  mainContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  brand: {
    fontWeight: '700',
    fontSize: 20,
    color: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // --- Cards ---
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#121212',
    borderColor: '#333333',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 13,
    color: '#64748b',
  },

  // --- Buttons ---
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  btnPrimary: {
    backgroundColor: '#ccff00',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    // Emulates retro 3D shadow in RN:
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 15,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  btnOutlineText: {
    color: '#000000',
    fontWeight: '500',
  },
  btnGithub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#24292e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnGithubText: {
    color: '#ffffff',
    fontSize: 13,
  },

  // --- Form Controls ---
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },

  // --- Hero Section ---
  hero: {
    backgroundColor: '#0f172a',
    paddingVertical: 40,
    paddingHorizontal: 32,
    borderRadius: 6,
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#ffffff',
  },
  heroText: {
    color: '#ffffff',
    marginBottom: 24,
    fontSize: 17,
  },

  // --- Flash Messages ---
  flash: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  flashText: {
    fontSize: 14,
  },
  flashInfo: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd', borderWidth: 1 },
  flashWarning: { backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1 },
  flashDanger: { backgroundColor: '#fee2e2', borderColor: '#fecaca', borderWidth: 1 },
  flashSuccess: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0', borderWidth: 1 },

  // --- Vault Section ---
  vaultGrid: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 40,
  },
  vaultCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 20,
    justifyContent: 'space-between',
  },
  vaultBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#047857',
    borderWidth: 1,
    borderColor: '#10b981',
  },

  // --- Avatar ---
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

