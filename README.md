# STEMNet Greece

<img width="1842" height="996" alt="image" src="https://github.com/user-attachments/assets/18100af1-db5d-4a0a-8b98-e9785935faef" />

STEMNet Greece is a community-driven platform built for Greek high school robotics clubs, STEM students, and young makers. Throughout robotics competitions and school projects, many talented students develop innovative solutions but rarely have an opportunity to share their work outside their own teams. STEMNet was created to bridge that gap by providing a dedicated space where students can connect, collaborate, and learn from one another.

The platform allows members to showcase projects, share open-source code, publish 3D-printing designs, discuss technical challenges, and build connections with students from schools across Greece. Whether someone is looking for help debugging a robotics project, sharing a CAD model, or presenting a completed build, STEMNet provides a centralized environment designed specifically for student collaboration.

---

# Features

### User Accounts & Authentication

* Secure user registration and login system
* Session-based authentication
* Protected routes and authenticated actions
* Secure logout functionality

### Customizable User Profiles

Each member has a personalized profile that includes:

* Profile picture/avatar
* Personal bio
* Registration date
* GitHub profile link
* LinkedIn profile link
* Up to five custom external links

### Interactive Follower System

* Follow and unfollow other users
* Real-time follower and following counts
* Build connections with students across Greece

### Category-Based Feed

Posts can be organized and filtered into dedicated categories:

* Robotics
* 3D Modeling
* Software
* Electronics
* Artificial Intelligence
* Events
* Other

### Rich Post Creation

Users can create posts containing:

* Text descriptions
* Category tags
* Optional GitHub repository links
* Images
* Video uploads

### Media Support

* Native HTML5 image rendering
* Built-in video playback for `.mp4` and `.webm` files
* High-quality media showcase for robotics demonstrations and prototypes

### Threaded Discussions

* Reply directly to any post
* Parent post previews provide conversation context
* Organized discussion threads for technical questions and collaboration

### Real-Time Like System

* Like and unlike posts instantly
* Background JavaScript `fetch()` requests eliminate page reloads
* Dynamic UI updates for a smoother user experience

### Security

Security was an important part of the project and includes:

* CSRF protection on form submissions
* Protected authenticated endpoints
* Secure session management
* HTTP 401 handling for unauthorized requests

### Responsive Design

* Mobile-friendly interface
* Flexbox-based layouts
* Responsive navigation and content display
* Modern CSS styling using custom properties
* Notifications for replies and followers

### Search Function 
---

# Technologies Used

## Backend

* Python 3
* Flask
* Jinja2
* SQLite (originally)
* PostgreSQL (wrapper functions)

## Frontend

* HTML5
* CSS3
* JavaScript

## Development & Services

* Git & GitHub
* Name.com (Domain & DNS)
* Resend (Transactional Email API)
* Nest (Application infrastructure)

---

# What I Learned

Building STEMNet Greece was much more than creating a social platform—it became a comprehensive full-stack development project that covered both software engineering fundamentals and real-world deployment.

During development, I gained experience with:

* **Full-Stack Web Development** by connecting Flask routes, databases, templates, and client-side interfaces into a complete web application.
* **Asynchronous JavaScript (AJAX)** through the use of `async`/`await` and the Fetch API to update likes dynamically without refreshing the page.
* **Relational Database Design** by modeling relationships between users, posts, replies, followers, and likes.
* **Authentication & Security** by implementing secure sessions, password hashing, CSRF protection, and authenticated route handling.
* **Template Engineering** with Jinja2, creating reusable templates and defensive conditional rendering to prevent runtime errors.
* **API Integration** by configuring Resend for transactional email delivery.
* **Domain & DNS Management** through Name.com, including configuring DNS records such as A, CNAME, MX, and TXT records.
* **Version Control** using Git and GitHub to manage development, organize commits, and maintain the codebase.
* **Responsive UI/UX Design** by building layouts with Flexbox, CSS custom variables, and responsive design principles that work across desktop and mobile devices.

---

# Project Goals

The primary goal of STEMNet Greece is to create a collaborative environment where students interested in robotics and STEM can:

* Share open-source projects
* Publish code repositories
* Upload CAD models and media
* Ask technical questions
* Learn from other students
* Build an online portfolio of their work
* Connect with peers from schools across Greece

By encouraging knowledge sharing and collaboration, STEMNet aims to help strengthen Greece's growing STEM and robotics community while giving students a platform to showcase their skills and inspire future projects.

---

# Future Improvements

Some planned features for future development include:

* Direct messaging between users
* Project bookmarking and favorites
* Team pages for robotics clubs
* Event and competition announcements

---

# License

This project was developed as an educational full-stack web application demonstrating modern web development practices, secure authentication, responsive design, and collaborative community features.
