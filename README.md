# STEMNet Greece

STEMNet Greece is a community-driven platform built for Greek high school robotics clubs, STEM students, and young makers. During robotics competitions and school projects, many students create innovative solutions but rarely have a place to share them outside their own teams. STEMNet was created to solve that problem by providing a dedicated platform where students can connect, collaborate, and learn from one another.

Members can showcase projects, publish open-source code, share 3D-printing designs, discuss technical challenges, and build connections with students from schools across Greece. Whether someone wants help debugging a robotics project, sharing a CAD model, or presenting a finished build, STEMNet offers a centralized environment designed specifically for student collaboration.

---

## Features

### User Accounts & Authentication

- Secure user registration and login
- Session-based authentication
- Protected routes
- Secure logout functionality

### User Profiles

Each member has a customizable profile featuring:

- Profile picture
- Personal biography
- Registration date
- GitHub profile link
- LinkedIn profile link
- Up to five custom external links

### Social Features

- Follow and unfollow users
- Live follower and following counts
- Notifications for replies and new followers

### Category-Based Feed

Posts can be organized into:

- Robotics
- 3D Modeling
- Software
- Electronics
- Artificial Intelligence
- Events
- Other

### Rich Posts

Posts support:

- Text descriptions
- Category tags
- Optional GitHub repository links
- Image uploads
- Video uploads

### Media Support

- Native image rendering
- HTML5 video playback (`.mp4` & `.webm`)
- Multiple-image project galleries with carousel navigation

### Discussions

- Threaded replies
- Parent post previews
- Organized technical discussions

### Live Interactions

- Instant like/unlike system
- AJAX-powered updates using the Fetch API
- Infinite scrolling feed
- Automatic polling for newly published posts

### User Achievements

Achievement badges based on milestones such as:

- First project
- Like milestones
- Robotics activity
- CAD activity
- AI activity

### Search

- Search users and posts

### Themes

- Dark and Light mode
- Theme preference stored per user

### Responsive Design

- Mobile-friendly layouts
- Flexbox-based interface
- Responsive navigation
- CSS custom properties

### Security

- CSRF protection
- Password hashing
- Secure session management
- Protected authenticated endpoints
- Proper HTTP 401 handling

---

## Technologies

### Backend

- Python 3
- Flask
- Jinja2
- SQLite (development)
- PostgreSQL (production)

### Frontend

- HTML5
- CSS3
- JavaScript (ES6)

### Services

- Git
- GitHub
- Name.com (Domain & DNS)
- Resend (Transactional Email API)
- Nest (Application Hosting)

---

## What I Learned

Building STEMNet Greece became a complete full-stack software engineering project and provided experience in many areas of web development.

Key concepts learned include:

- Full-stack web development with Flask
- Database design and relational modeling
- Authentication and web security
- Session management
- Password hashing
- CSRF protection
- Jinja2 template engineering
- AJAX using the Fetch API and async/await
- Responsive UI/UX design
- Git and GitHub workflows
- API integration
- Domain and DNS configuration
- Production deployment

---

## Project Goals

STEMNet Greece aims to create a collaborative environment where students can:

- Share robotics projects
- Publish open-source code
- Upload CAD models
- Showcase engineering builds
- Ask technical questions
- Learn from other students
- Build a public portfolio
- Connect with robotics teams across Greece

The long-term vision is to strengthen the Greek high school STEM community by making knowledge sharing simple, accessible, and collaborative.

---

## Future Improvements

Planned features include:

- Direct messaging
- Project bookmarking
- Team pages for robotics clubs
- Competition and event announcements
- Improved search functionality
- Better notification system
- User portfolio pages
- API for third-party integrations