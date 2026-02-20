import type { RoadmapCategory } from '../types';

export const initialRoadmap: RoadmapCategory[] = [
    // ═══════════════════════════════════════════════════
    // 1. DSA — Data Structures & Algorithms
    // ═══════════════════════════════════════════════════
    {
        id: 'dsa',
        title: 'DSA — Elite Level',
        topics: [
            { id: 'dsa-basics', title: 'Programming Basics', targetCount: 30, progress: 0, estimatedTime: '1 week', completed: false, unlocked: true },
            { id: 'dsa-arrays', title: 'Arrays', targetCount: 150, progress: 0, estimatedTime: '4 weeks', completed: false, unlocked: false },
            { id: 'dsa-strings', title: 'Strings', targetCount: 120, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa-2ptr', title: 'Two Pointers', targetCount: 80, progress: 0, estimatedTime: '2 weeks', completed: false, unlocked: false },
            { id: 'dsa-sliding', title: 'Sliding Window', targetCount: 100, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa-bsearch', title: 'Binary Search', targetCount: 100, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa-stack', title: 'Stack', targetCount: 80, progress: 0, estimatedTime: '2 weeks', completed: false, unlocked: false },
            { id: 'dsa-queue', title: 'Queue', targetCount: 60, progress: 0, estimatedTime: '1.5 weeks', completed: false, unlocked: false },
            { id: 'dsa-ll', title: 'Linked List', targetCount: 100, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa-hash', title: 'Hashing', targetCount: 120, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa-trees', title: 'Trees', targetCount: 200, progress: 0, estimatedTime: '6 weeks', completed: false, unlocked: false },
            { id: 'dsa-graphs', title: 'Graphs', targetCount: 200, progress: 0, estimatedTime: '6 weeks', completed: false, unlocked: false },
            { id: 'dsa-dp', title: 'Dynamic Programming', targetCount: 250, progress: 0, estimatedTime: '8 weeks', completed: false, unlocked: false },
            { id: 'dsa-greedy', title: 'Greedy Algorithms', targetCount: 80, progress: 0, estimatedTime: '2 weeks', completed: false, unlocked: false },
            { id: 'dsa-backtrack', title: 'Backtracking', targetCount: 80, progress: 0, estimatedTime: '2 weeks', completed: false, unlocked: false },
            { id: 'dsa-bits', title: 'Bit Manipulation', targetCount: 60, progress: 0, estimatedTime: '1.5 weeks', completed: false, unlocked: false },
            { id: 'dsa-trie', title: 'Tries', targetCount: 40, progress: 0, estimatedTime: '1 week', completed: false, unlocked: false },
        ]
    },

    // ═══════════════════════════════════════════════════
    // 2. Web Development
    // ═══════════════════════════════════════════════════
    {
        id: 'webdev',
        title: 'Web Development',
        topics: [
            {
                id: 'web-html', title: 'HTML Advanced', estimatedTime: '4 days', progress: 0, completed: false, unlocked: true,
                tasks: [
                    { id: 'html-1', title: 'Semantic HTML5 elements (header, main, section, article)', completed: false },
                    { id: 'html-2', title: 'Forms and input types', completed: false },
                    { id: 'html-3', title: 'Accessibility basics (aria labels, roles)', completed: false },
                    { id: 'html-4', title: 'Meta tags and SEO basics', completed: false },
                    { id: 'html-5', title: 'HTML5 Canvas and SVG overview', completed: false },
                ]
            },
            {
                id: 'web-css', title: 'CSS Advanced', estimatedTime: '5 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'css-1', title: 'Flexbox layout model', completed: false },
                    { id: 'css-2', title: 'CSS Grid layout', completed: false },
                    { id: 'css-3', title: 'CSS Variables (custom properties)', completed: false },
                    { id: 'css-4', title: 'Animations and transitions', completed: false },
                    { id: 'css-5', title: 'Responsive design and media queries', completed: false },
                    { id: 'css-6', title: 'CSS Specificity and cascade understanding', completed: false },
                ]
            },
            {
                id: 'web-js-foundations', title: 'JavaScript Foundations', estimatedTime: '1 week', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'jsf-1', title: 'var, let, const — differences and scoping', completed: false },
                    { id: 'jsf-2', title: 'Functions: declaration, expression, arrow', completed: false },
                    { id: 'jsf-3', title: 'Arrays: creation, access, push/pop/map/filter', completed: false },
                    { id: 'jsf-4', title: 'Objects: creation, access, destructuring', completed: false },
                    { id: 'jsf-5', title: 'Loops: for, for…of, forEach', completed: false },
                    { id: 'jsf-6', title: 'Template literals', completed: false },
                    { id: 'jsf-7', title: 'Spread and rest operators', completed: false },
                ]
            },
            {
                id: 'web-js-core', title: 'JavaScript Core', estimatedTime: '1 week', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'jsc-1', title: 'Execution context and call stack', completed: false },
                    { id: 'jsc-2', title: 'Hoisting behavior', completed: false },
                    { id: 'jsc-3', title: 'Closures and lexical scope', completed: false },
                    { id: 'jsc-4', title: 'Prototypes and prototype chain', completed: false },
                    { id: 'jsc-5', title: 'The this keyword and binding rules', completed: false },
                    { id: 'jsc-6', title: 'Event loop, call stack, microtasks, macrotasks', completed: false },
                ]
            },
            {
                id: 'web-dom', title: 'DOM Mastery', estimatedTime: '5 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'dom-1', title: 'querySelector and getElementById', completed: false },
                    { id: 'dom-2', title: 'Changing text, innerHTML, style', completed: false },
                    { id: 'dom-3', title: 'Event listeners (click, input, submit)', completed: false },
                    { id: 'dom-4', title: 'Event delegation and bubbling', completed: false },
                    { id: 'dom-5', title: 'Creating and removing DOM elements', completed: false },
                    { id: 'dom-6', title: 'classList manipulation', completed: false },
                ]
            },
            {
                id: 'web-async', title: 'Async Programming', estimatedTime: '5 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'async-1', title: 'Callbacks and callback hell', completed: false },
                    { id: 'async-2', title: 'Promises: .then(), .catch(), .finally()', completed: false },
                    { id: 'async-3', title: 'async/await syntax', completed: false },
                    { id: 'async-4', title: 'Fetch API and JSON handling', completed: false },
                    { id: 'async-5', title: 'Error handling in async code (try/catch)', completed: false },
                    { id: 'async-6', title: 'Promise.all and Promise.race', completed: false },
                ]
            },
            {
                id: 'web-react-foundation', title: 'React Foundation', estimatedTime: '1 week', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'rf-1', title: 'Create first React app with Vite', completed: false },
                    { id: 'rf-2', title: 'JSX syntax and rules', completed: false },
                    { id: 'rf-3', title: 'Functional components', completed: false },
                    { id: 'rf-4', title: 'Props: passing and receiving', completed: false },
                    { id: 'rf-5', title: 'useState hook', completed: false },
                    { id: 'rf-6', title: 'Conditional rendering', completed: false },
                    { id: 'rf-7', title: 'Rendering lists with .map() and keys', completed: false },
                ]
            },
            {
                id: 'web-react-advanced', title: 'React Advanced', estimatedTime: '10 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'ra-1', title: 'useEffect hook and dependency array', completed: false },
                    { id: 'ra-2', title: 'useRef hook', completed: false },
                    { id: 'ra-3', title: 'Custom hooks', completed: false },
                    { id: 'ra-4', title: 'Context API for global state', completed: false },
                    { id: 'ra-5', title: 'React Router for navigation', completed: false },
                    { id: 'ra-6', title: 'Component lifecycle understanding', completed: false },
                    { id: 'ra-7', title: 'Performance: React.memo, useMemo, useCallback', completed: false },
                ]
            },
            {
                id: 'web-nodejs', title: 'Node.js', estimatedTime: '1 week', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'node-1', title: 'What is Node.js and the event loop', completed: false },
                    { id: 'node-2', title: 'npm and package.json', completed: false },
                    { id: 'node-3', title: 'File system module (fs)', completed: false },
                    { id: 'node-4', title: 'HTTP module: creating a basic server', completed: false },
                    { id: 'node-5', title: 'Environment variables with dotenv', completed: false },
                ]
            },
            {
                id: 'web-express', title: 'Express.js', estimatedTime: '1 week', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'exp-1', title: 'Setup Express server', completed: false },
                    { id: 'exp-2', title: 'Routes: GET, POST, PUT, DELETE', completed: false },
                    { id: 'exp-3', title: 'Middleware (body-parser, cors)', completed: false },
                    { id: 'exp-4', title: 'Error handling middleware', completed: false },
                    { id: 'exp-5', title: 'REST API design principles', completed: false },
                ]
            },
            {
                id: 'web-databases', title: 'Databases', estimatedTime: '1 week', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'db-1', title: 'SQL vs NoSQL — when to use what', completed: false },
                    { id: 'db-2', title: 'Basic SQL: SELECT, INSERT, UPDATE, DELETE', completed: false },
                    { id: 'db-3', title: 'MongoDB basics and CRUD', completed: false },
                    { id: 'db-4', title: 'Connecting DB to Node/Express', completed: false },
                ]
            },
            {
                id: 'web-auth', title: 'Authentication', estimatedTime: '5 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'auth-1', title: 'Session vs JWT based auth', completed: false },
                    { id: 'auth-2', title: 'Implement JWT: sign and verify', completed: false },
                    { id: 'auth-3', title: 'bcrypt for password hashing', completed: false },
                    { id: 'auth-4', title: 'Protected routes middleware', completed: false },
                ]
            },
            {
                id: 'web-deploy', title: 'Deployment', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'dep-1', title: 'Deploy frontend to Vercel / Netlify', completed: false },
                    { id: 'dep-2', title: 'Deploy backend to Railway / Render', completed: false },
                    { id: 'dep-3', title: 'Environment variables in production', completed: false },
                    { id: 'dep-4', title: 'Custom domain setup basics', completed: false },
                ]
            },
        ]
    },

    // ═══════════════════════════════════════════════════
    // 3. Operating Systems
    // ═══════════════════════════════════════════════════
    {
        id: 'os',
        title: 'Operating Systems',
        topics: [
            {
                id: 'os-processes', title: 'Processes & Threads', estimatedTime: '5 days', progress: 0, completed: false, unlocked: true,
                tasks: [
                    { id: 'os-p1', title: 'Process vs Thread difference', completed: false },
                    { id: 'os-p2', title: 'Process states (ready, running, blocked)', completed: false },
                    { id: 'os-p3', title: 'Context switching concept', completed: false },
                    { id: 'os-p4', title: 'Multithreading basics', completed: false },
                ]
            },
            {
                id: 'os-scheduling', title: 'CPU Scheduling', estimatedTime: '4 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'os-s1', title: 'FCFS scheduling', completed: false },
                    { id: 'os-s2', title: 'SJF and SRTF scheduling', completed: false },
                    { id: 'os-s3', title: 'Round Robin scheduling', completed: false },
                    { id: 'os-s4', title: 'Priority scheduling', completed: false },
                ]
            },
            {
                id: 'os-memory', title: 'Memory Management', estimatedTime: '4 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'os-m1', title: 'Virtual memory concept', completed: false },
                    { id: 'os-m2', title: 'Paging and page tables', completed: false },
                    { id: 'os-m3', title: 'Segmentation', completed: false },
                    { id: 'os-m4', title: 'Page replacement algorithms (LRU, FIFO)', completed: false },
                ]
            },
            {
                id: 'os-deadlock', title: 'Deadlocks & Synchronization', estimatedTime: '4 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'os-d1', title: 'Necessary conditions for deadlock', completed: false },
                    { id: 'os-d2', title: 'Deadlock prevention strategies', completed: false },
                    { id: 'os-d3', title: 'Mutex and semaphores', completed: false },
                    { id: 'os-d4', title: 'Producer-consumer problem', completed: false },
                ]
            },
            {
                id: 'os-fs', title: 'File Systems', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'os-f1', title: 'File system structure overview', completed: false },
                    { id: 'os-f2', title: 'Disk allocation methods', completed: false },
                    { id: 'os-f3', title: 'Inode concept in Linux', completed: false },
                ]
            },
        ]
    },

    // ═══════════════════════════════════════════════════
    // 4. DBMS
    // ═══════════════════════════════════════════════════
    {
        id: 'dbms',
        title: 'DBMS',
        topics: [
            {
                id: 'dbms-sql', title: 'SQL Basics', estimatedTime: '5 days', progress: 0, completed: false, unlocked: true,
                tasks: [
                    { id: 'sql-1', title: 'SELECT, WHERE, ORDER BY, LIMIT', completed: false },
                    { id: 'sql-2', title: 'INSERT, UPDATE, DELETE', completed: false },
                    { id: 'sql-3', title: 'Aggregate functions: COUNT, SUM, AVG, MAX, MIN', completed: false },
                    { id: 'sql-4', title: 'GROUP BY and HAVING', completed: false },
                    { id: 'sql-5', title: 'DISTINCT and aliases', completed: false },
                ]
            },
            {
                id: 'dbms-joins', title: 'SQL Joins', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'join-1', title: 'INNER JOIN', completed: false },
                    { id: 'join-2', title: 'LEFT JOIN and RIGHT JOIN', completed: false },
                    { id: 'join-3', title: 'FULL OUTER JOIN', completed: false },
                    { id: 'join-4', title: 'Self JOIN and cross JOIN', completed: false },
                ]
            },
            {
                id: 'dbms-indexing', title: 'Indexing', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'idx-1', title: 'What is an index and why it matters', completed: false },
                    { id: 'idx-2', title: 'B-tree index structure', completed: false },
                    { id: 'idx-3', title: 'When NOT to use indexes', completed: false },
                ]
            },
            {
                id: 'dbms-transactions', title: 'Transactions & ACID', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'txn-1', title: 'ACID properties explained', completed: false },
                    { id: 'txn-2', title: 'COMMIT and ROLLBACK', completed: false },
                    { id: 'txn-3', title: 'Isolation levels', completed: false },
                ]
            },
            {
                id: 'dbms-normalization', title: 'Normalization', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'norm-1', title: '1NF, 2NF, 3NF explained', completed: false },
                    { id: 'norm-2', title: 'BCNF', completed: false },
                    { id: 'norm-3', title: 'Denormalization tradeoffs', completed: false },
                ]
            },
        ]
    },

    // ═══════════════════════════════════════════════════
    // 5. Computer Networks
    // ═══════════════════════════════════════════════════
    {
        id: 'networks',
        title: 'Computer Networks',
        topics: [
            {
                id: 'net-http', title: 'HTTP & HTTPS', estimatedTime: '3 days', progress: 0, completed: false, unlocked: true,
                tasks: [
                    { id: 'http-1', title: 'HTTP methods: GET, POST, PUT, PATCH, DELETE', completed: false },
                    { id: 'http-2', title: 'Status codes (2xx, 3xx, 4xx, 5xx)', completed: false },
                    { id: 'http-3', title: 'Headers: Content-Type, Authorization, Cookie', completed: false },
                    { id: 'http-4', title: 'HTTPS and TLS handshake overview', completed: false },
                ]
            },
            {
                id: 'net-tcpip', title: 'TCP/IP Model', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'tcp-1', title: 'OSI model layers overview', completed: false },
                    { id: 'tcp-2', title: 'TCP vs UDP — when to use each', completed: false },
                    { id: 'tcp-3', title: 'Three-way handshake (SYN, SYN-ACK, ACK)', completed: false },
                    { id: 'tcp-4', title: 'IP addressing and subnets', completed: false },
                ]
            },
            {
                id: 'net-dns', title: 'DNS', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'dns-1', title: 'How DNS resolution works', completed: false },
                    { id: 'dns-2', title: 'DNS record types (A, CNAME, MX, TXT)', completed: false },
                    { id: 'dns-3', title: 'CDN and its relation to DNS', completed: false },
                ]
            },
            {
                id: 'net-rest', title: 'REST API Concepts', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'rest-1', title: 'REST constraints and principles', completed: false },
                    { id: 'rest-2', title: 'Statelessness in REST', completed: false },
                    { id: 'rest-3', title: 'API versioning and best practices', completed: false },
                    { id: 'rest-4', title: 'GraphQL vs REST overview', completed: false },
                ]
            },
        ]
    },

    // ═══════════════════════════════════════════════════
    // 6. System Design
    // ═══════════════════════════════════════════════════
    {
        id: 'system-design',
        title: 'System Design (Beginner)',
        topics: [
            {
                id: 'sd-scalability', title: 'Scalability Basics', estimatedTime: '3 days', progress: 0, completed: false, unlocked: true,
                tasks: [
                    { id: 'sc-1', title: 'Vertical vs horizontal scaling', completed: false },
                    { id: 'sc-2', title: 'Latency vs throughput', completed: false },
                    { id: 'sc-3', title: 'CAP theorem explained simply', completed: false },
                ]
            },
            {
                id: 'sd-lb', title: 'Load Balancing', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'lb-1', title: 'Round robin and least connections algorithms', completed: false },
                    { id: 'lb-2', title: 'Sticky sessions concept', completed: false },
                    { id: 'lb-3', title: 'L4 vs L7 load balancers', completed: false },
                ]
            },
            {
                id: 'sd-caching', title: 'Caching', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'cache-1', title: 'Cache invalidation strategies', completed: false },
                    { id: 'cache-2', title: 'LRU cache implementation concept', completed: false },
                    { id: 'cache-3', title: 'Redis basics overview', completed: false },
                    { id: 'cache-4', title: 'CDN as a cache layer', completed: false },
                ]
            },
            {
                id: 'sd-databases', title: 'Databases at Scale', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false,
                tasks: [
                    { id: 'sdb-1', title: 'Database sharding concept', completed: false },
                    { id: 'sdb-2', title: 'Replication: master-slave setup', completed: false },
                    { id: 'sdb-3', title: 'When to use NoSQL vs SQL at scale', completed: false },
                ]
            },
        ]
    },

    // ═══════════════════════════════════════════════════
    // 7. Projects
    // ═══════════════════════════════════════════════════
    {
        id: 'projects',
        title: 'Project Portfolio',
        topics: [
            { id: 'proj-landing', title: 'Landing Page', estimatedTime: '1 week', progress: 0, completed: false, unlocked: true },
            { id: 'proj-todo', title: 'To-Do App (React)', estimatedTime: '1 week', progress: 0, completed: false, unlocked: false },
            { id: 'proj-devtrack', title: 'DevTrack Dashboard', estimatedTime: '3 weeks', progress: 0, completed: false, unlocked: false },
            { id: 'proj-fullstack', title: 'Full Stack CRUD App', estimatedTime: '4 weeks', progress: 0, completed: false, unlocked: false },
            { id: 'proj-auth', title: 'Auth System (JWT + bcrypt)', estimatedTime: '2 weeks', progress: 0, completed: false, unlocked: false },
            { id: 'proj-portfolio', title: 'Portfolio Website', estimatedTime: '2 weeks', progress: 0, completed: false, unlocked: false },
        ]
    },
];
