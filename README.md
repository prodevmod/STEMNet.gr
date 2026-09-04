## For STARDANCERS:
Guys when reviewing my project please make an account if you dont want to share your real info atleast use a fake email generator and login from the inbox cause rly all the dedication i ve put into this project is in that page after logging in

# STEMNET GREECE
Be me:
* 15yo
* Just finished th cs50 course
* Equiped with basic and primal Full-Stack knoledge
* In a country that thru it s school curriculum doesn't promote STEM or advanced problem-solving and creative thinking for students (Greece)

STEMNet.gr or STEMNET GREECE or even STEMNET (Global) is a vision for every underpriviledged child in every such part of the word with a passion to STEM to come together and contribute
whatever they can for others alike to learn from, through this medium. 

---
<img width="1881" height="1008" alt="image" src="https://github.com/user-attachments/assets/c144f444-eff1-47db-b25e-a45d1adb59e1" />

## The vision

* Every student can post about their own projects, ask for help, help others and talk even about their passion and find co-workers to build something incredible in a team.
* Every student can start a group, essentialy a groupchat, about anything they'd like to discuss.
* Every student can join any group they are interested in joining.
* Every student can post about an STEM or STEAM event they have heard of, acompaned with basic info about when/where it takes place and who is eligible for it.
* Every student can add affiliate links to their bio to network and connect with fellow aspirants.
* Every student can acces the STEM EXTRAS page with open/free resources to actually start building and learning about their stem passion.

---
<img width="1878" height="1012" alt="image" src="https://github.com/user-attachments/assets/96710c33-350c-48fe-adcb-0b88d58435fc" />


## Basic structure
This project is still an MVP so although it is functional and can probably handle a couple handred of users it is not using the most viable and efficient framework:

### FRONTEND
* HTML 5
* CSS 3
* JAVASCRIPT
* Jinja

### BACKEND
* Python
* Flask
* PostgreSQL (for online use)
* SQLite (for local testing)

## app.py structure
1. Imports and Environment Setup:
    - Import necessary libraries and modules.
    - Load environment variables from a .env file.
2. Flask App Initialization:
    - Create a Flask application instance.
    - Configure session management and security settings.
3. Database Configuration:
    - Define database paths and connection settings for SQLite and PostgreSQL.
    - Implement a wrapper to make PostgreSQL behave like SQLite for compatibility.
4. Utility Functions:
    - Functions for CSRF protection, email verification, and link sanitization.
5. Before Request Handlers:
    - Upgrade the database schema if necessary.
6. User Session Management:
    - Load the current user from the session before each request.
7. Routes:
    - /register: User registration with reCAPTCHA v3 and email verification.
    - /login: User login with reCAPTCHA v3 and brute force mitigation.
    - /logout: User logout.
    - /create: Create a new post, including replies and group posts.
    - /group/create: Create a new group (requires login).
    - /group/<int:group_id>: View group details and posts.
    - /stem-extras: Additional STEM resources page.

---
<img width="1884" height="1006" alt="image" src="https://github.com/user-attachments/assets/4945168e-81cd-43df-a7c1-d6dc4a890c13" />


## Installation

1. Open your terminal or command prompt.
2. Clone the repository directly to your PC:
   ```bash
   git clone https://github.com/prodevmod/STEMNet.gr
   ```
---

## Usage

This project is currently not intended for local Usage...

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

Copyright (c) 2026 prodevmod. All rights reserved.

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Proprietary Rights
This project, including all source code, design elements, layouts, logic, and documentation, is the exclusive intellectual property of the copyright holder (prodevmod). 

2. Permitted Actions (Pull Requests & Forking)
Permission is granted to public users to view the source code and fork this repository strictly within the GitHub platform for the sole purpose of submitting contributions, bug fixes, or enhancements back to the original project via Pull Requests (PRs). 

3. Strict Prohibitions (No Recreation or Derivation)
You are strictly prohibited from:
- Recreating, cloning, copying, or duplicating the project, its core ideas, or its codebase to launch a separate product, service, website, or platform.
- Creating derivative works based on this project.
- Modifying and redistributing the source code outside of direct contributions to the original repository.
- Using any part of this project for commercial purposes.

4. Title to Contributions
By submitting a Pull Request, you agree to grant the copyright holder a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable license to use, modify, and integrate your code contributions into the main project.

THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.
