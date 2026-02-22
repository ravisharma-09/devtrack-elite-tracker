import React, { useEffect, useState } from 'react';
import { Github, Star, GitFork, Users, ExternalLink, Zap, Award, Code2, BookOpen, Flame, Calendar, CheckCircle, ArrowRight, Globe } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';

// ── Open Source Programs ─────────────────────────────────────────────────────
const OS_PROGRAMS = [
    {
        name: 'Google Summer of Code',
        short: 'GSoC',
        org: 'Google',
        color: 'text-yellow-400',
        border: 'border-yellow-400/30',
        bg: 'bg-yellow-400/5',
        link: 'https://summerofcode.withgoogle.com',
        description: 'Work with open source orgs for 3 months. Get paid $1500–$6600 by Google. Prestigious international program.',
        timeline: 'Applications: Feb–Mar | Coding: May–Aug',
        difficulty: 'Intermediate',
        tips: ['Contribute to the org before applying', 'Write a strong proposal with weekly milestones', 'Contact mentors early on their mailing lists'],
    },
    {
        name: 'GirlScript Summer of Code',
        short: 'GSSoC',
        org: 'GirlScript Foundation',
        color: 'text-pink-400',
        border: 'border-pink-400/30',
        bg: 'bg-pink-400/5',
        link: 'https://gssoc.girlscript.tech',
        description: "India's largest open source program. Contribute to curated projects over 3 months. Great for beginners.",
        timeline: 'Applications: Feb–Mar | Coding: May–Jul',
        difficulty: 'Beginner',
        tips: ['Pick beginner-friendly projects', 'Join their Discord immediately', 'Focus on labeled "good first issue" tasks'],
    },
    {
        name: 'Hacktoberfest',
        short: 'Hacktober',
        org: 'DigitalOcean',
        color: 'text-orange-400',
        border: 'border-orange-400/30',
        bg: 'bg-orange-400/5',
        link: 'https://hacktoberfest.com',
        description: 'October-only event. Make 4 accepted PRs to any public repo and earn a shirt/digital badge. Global community.',
        timeline: 'October 1–31 every year',
        difficulty: 'Beginner',
        tips: ['Look for repos tagged "hacktoberfest"', 'Fix docs, typos, and small bugs first', 'Avoid spam PRs — quality over quantity'],
    },
    {
        name: 'Outreachy',
        short: 'Outreachy',
        org: 'Software Freedom Conservancy',
        color: 'text-purple-400',
        border: 'border-purple-400/30',
        bg: 'bg-purple-400/5',
        link: 'https://www.outreachy.org',
        description: '3-month paid internships in open source for underrepresented groups. $7000 stipend. Highly selective.',
        timeline: 'Applications: Jan & Aug',
        difficulty: 'Intermediate',
        tips: ['Apply early during contribution phase', 'Make multiple contributions to different projects', 'Strong cover letter matters a lot'],
    },
    {
        name: 'Linux Foundation Mentorship',
        short: 'LFX',
        org: 'Linux Foundation',
        color: 'text-blue-400',
        border: 'border-blue-400/30',
        bg: 'bg-blue-400/5',
        link: 'https://mentorship.lfx.linuxfoundation.org',
        description: 'Paid mentorship with leading open source projects like Kubernetes, CNCF, Hyperledger. $3000–$6600 stipend.',
        timeline: 'Rolling — 3 terms per year',
        difficulty: 'Intermediate',
        tips: ['Filter by term and skill level', 'Read project README and issues before applying', 'Kubernetes and CNCF projects are high-value'],
    },
    {
        name: 'Season of Docs',
        short: 'GSoD',
        org: 'Google',
        color: 'text-green-400',
        border: 'border-green-400/30',
        bg: 'bg-green-400/5',
        link: 'https://developers.google.com/season-of-docs',
        description: 'Google program for technical writers to contribute documentation to open source projects. $5000–$15000.',
        timeline: 'Applications: Mar–Apr | Writing: May–Nov',
        difficulty: 'Beginner',
        tips: ['Great if you can write clearly', 'Pick projects with poor existing docs', 'Organize your portfolio of writing before applying'],
    },
    {
        name: 'KWOC (Kharagpur WoC)',
        short: 'KWoC',
        org: 'IIT Kharagpur',
        color: 'text-cyan-400',
        border: 'border-cyan-400/30',
        bg: 'bg-cyan-400/5',
        link: 'https://kwoc.kossiitkgp.org',
        description: "IIT-KGP's winter open source program. Great for Indian students. Build portfolio through structured contributions.",
        timeline: 'Dec–Jan (Winter)',
        difficulty: 'Beginner',
        tips: ['Look for projects in your tech stack', 'Engage with mentors via GitHub Issues', 'Submit at least 5 PRs for certificate'],
    },
    {
        name: 'Social Summer of Code',
        short: 'SSoC',
        org: 'Social Winter of Code',
        color: 'text-red-400',
        border: 'border-red-400/30',
        bg: 'bg-red-400/5',
        link: 'https://ssoc.devfolio.co',
        description: 'Indian open source program for students. Contribute to social-impact projects. Great for building your contribution count.',
        timeline: 'June–Aug',
        difficulty: 'Beginner',
        tips: ['Register early — slots fill fast', 'Social projects often use React and Node.js', 'Document your contributions well'],
    },
];

// ── GitHub Improvement Roadmap ───────────────────────────────────────────────
const GITHUB_ROADMAP = [
    {
        level: 1,
        title: 'Setup: Make Your Profile Shine',
        color: 'text-green-400',
        steps: [
            'Add a professional profile README.md with badges (GitHub stats, languages, streak)',
            'Fill out bio, location, website, and social links fully',
            'Pin your 6 best repos on your profile page',
            'Add profile picture and a clear tagline',
            'Set up GitHub bio with keywords (e.g., "Open Source | React | Python")',
        ],
        link: 'https://github.com/abhisheknaiidu/awesome-github-profile-readme',
        linkText: 'Awesome Profile READMEs',
    },
    {
        level: 2,
        title: 'Streak: Build Contribution Consistency',
        color: 'text-yellow-400',
        steps: [
            'Commit something every single day — even a README update counts',
            'Use GitHub\'s contribution graph as a habit tracker',
            'Set a daily reminder at 10 PM to commit if you haven\'t',
            'Work on 1 personal project and 1 open source project simultaneously',
            'Use GitHub Issues to plan daily tasks',
        ],
        link: 'https://github-readme-streak-stats.herokuapp.com',
        linkText: 'GitHub Streak Stats Widget',
    },
    {
        level: 3,
        title: 'Repository Quality: Make Projects Stand Out',
        color: 'text-blue-400',
        steps: [
            'Every project needs: README, LICENSE, .gitignore, and live demo link',
            'Add topics/tags to all repos (e.g. "react", "open-source", "beginner-friendly")',
            'Use GitHub Projects to show your workflow management skills',
            'Write proper commit messages: "feat: add user auth" not "update stuff"',
            'Add CI/CD via GitHub Actions for automated tests',
        ],
        link: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes',
        linkText: 'GitHub README Guide',
    },
    {
        level: 4,
        title: 'Contributions: Get Into Real Open Source',
        color: 'text-purple-400',
        steps: [
            'Search: github.com/issues?q=label:"good+first+issue"+is:open',
            'Pick a project you actually use (React, VS Code, FastAPI, etc.)',
            'Start by fixing docs or adding tests — lower bar, still counts',
            'Always comment "I\'d like to work on this" before starting',
            'Use forks properly: fork → branch → commit → PR',
        ],
        link: 'https://goodfirstissues.com',
        linkText: 'Find Good First Issues',
    },
    {
        level: 5,
        title: 'Networking: Make Yourself Known',
        color: 'text-orange-400',
        steps: [
            'Star repos you\'ve contributed to — and tell them on Twitter/X',
            'Follow the authors of libraries you use',
            'Comment on issues — provide context and reproduce bugs',
            'Share your open source journey on LinkedIn with project links',
            'Apply for programs: GSoC, GSSoC, Hacktoberfest every year',
        ],
        link: 'https://twitter.com/github',
        linkText: '@GitHub on Twitter',
    },
];

interface GitHubStats {
    login: string;
    name: string;
    avatar_url: string;
    public_repos: number;
    followers: number;
    following: number;
    public_gists: number;
    bio: string;
    blog: string;
    location: string;
    created_at: string;
    html_url: string;
}

interface GitHubRepo {
    name: string;
    stargazers_count: number;
    forks_count: number;
    language: string;
    description: string;
    html_url: string;
    updated_at: string;
}

type TabType = 'stats' | 'programs' | 'roadmap';

export const GitHubHub: React.FC = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState<TabType>('stats');
    const [githubUsername, setGithubUsername] = useState<string>('');
    const [stats, setStats] = useState<GitHubStats | null>(null);
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
    const [expandedStep, setExpandedStep] = useState<number | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                const supabase = await getSupabaseClient();
                if (!supabase) return;

                // Read from `users` table — this is where Profile page saves handles
                const { data: userRow } = await supabase
                    .from('users')
                    .select('github_username, codeforces_handle')
                    .eq('id', user.id)
                    .single();

                const ghUsername = userRow?.github_username || '';
                if (ghUsername) {
                    setGithubUsername(ghUsername);
                    await fetchGitHubData(ghUsername);
                }
            } catch (e) {
                console.error('Profile fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    const fetchGitHubData = async (username: string) => {
        try {
            const [userRes, reposRes] = await Promise.all([
                fetch('https://api.github.com/users/' + username),
                fetch('https://api.github.com/users/' + username + '/repos?sort=stars&per_page=6')
            ]);
            if (userRes.ok) setStats(await userRes.json());
            if (reposRes.ok) setRepos(await reposRes.json());
        } catch (e) {
            console.error('GitHub API error:', e);
        }
    };

    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
    const topLang = repos.map(r => r.language).filter(Boolean).reduce((acc: Record<string, number>, l) => {
        acc[l] = (acc[l] || 0) + 1; return acc;
    }, {});
    const dominantLang = Object.entries(topLang).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    if (loading) {
        return (
            <div className="retro-panel p-12 text-center mt-8">
                <Github className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4 animate-pulse" />
                <h3 className="text-brand-secondary font-mono tracking-widest uppercase">Loading GitHub Hub...</h3>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-6 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2 flex items-center gap-3">
                    <Github className="text-green-400" /> GitHub Hub
                </h2>
                <p className="retro-text-sub">Your GitHub stats, open source programs, and a real improvement roadmap</p>
            </header>

            {/* TABS */}
            <div className="flex border-b border-brand-border/50 gap-6">
                {([['stats', Github, 'Stats'], ['programs', Award, 'Programs'], ['roadmap', Zap, 'Roadmap']] as const).map(([t, Icon, label]) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative flex items-center gap-2 ${tab === t ? 'text-green-400 font-bold' : 'text-brand-secondary hover:text-brand-primary'}`}>
                        <Icon size={14} /> {label}
                        {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-400 rounded-t-md" />}
                    </button>
                ))}
            </div>

            {/* ── STATS TAB ─────────────────────────────────────────────────── */}
            {tab === 'stats' && (
                <div className="space-y-6">
                    {!githubUsername ? (
                        <div className="retro-panel p-8 text-center border-yellow-400/20">
                            <Github className="w-12 h-12 mx-auto text-yellow-400/40 mb-4" />
                            <h3 className="text-brand-primary font-mono uppercase tracking-widest mb-2">No GitHub Handle Set</h3>
                            <p className="text-brand-secondary text-sm font-mono mb-4">Go to Profile page and add your GitHub username to see live stats.</p>
                            <a href="/profile" className="inline-flex items-center gap-2 px-4 py-2 border border-green-400/40 text-green-400 font-mono text-sm rounded hover:bg-green-400/10 transition-colors">
                                Set GitHub Handle <ArrowRight size={14} />
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* Profile Card */}
                            {stats && (
                                <div className="retro-panel p-6 border-green-400/20">
                                    <div className="flex items-center gap-5 mb-6">
                                        <img src={stats.avatar_url} alt={stats.login} className="w-20 h-20 rounded-full border-2 border-green-400/40" />
                                        <div>
                                            <h3 className="text-brand-primary font-bold text-lg font-mono">{stats.name || stats.login}</h3>
                                            <p className="text-green-400 font-mono text-sm">@{stats.login}</p>
                                            {stats.bio && <p className="text-brand-secondary text-xs mt-1 font-mono">{stats.bio}</p>}
                                            {stats.location && <p className="text-brand-secondary/60 text-xs font-mono mt-1">📍 {stats.location}</p>}
                                        </div>
                                        <a href={stats.html_url} target="_blank" rel="noreferrer"
                                            className="ml-auto flex items-center gap-1 px-3 py-1 border border-green-400/30 text-green-400 font-mono text-xs rounded hover:bg-green-400/10 transition-colors">
                                            View Profile <ExternalLink size={12} />
                                        </a>
                                    </div>

                                    {/* Stat Chips */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {[
                                            { icon: BookOpen, label: 'Public Repos', value: stats.public_repos },
                                            { icon: Users, label: 'Followers', value: stats.followers },
                                            { icon: Star, label: 'Stars Earned', value: totalStars },
                                            { icon: GitFork, label: 'Total Forks', value: totalForks },
                                        ].map(({ icon: Icon, label, value }) => (
                                            <div key={label} className="retro-panel p-4 text-center border-green-400/10">
                                                <Icon size={20} className="text-green-400 mx-auto mb-2" />
                                                <div className="text-xl font-bold text-brand-primary font-mono">{value}</div>
                                                <div className="text-xs text-brand-secondary font-mono uppercase tracking-wide">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contribution Graph Embed */}
                            <div className="retro-panel p-5 border-green-400/10">
                                <h4 className="text-sm font-mono uppercase tracking-widest text-green-400 mb-4 flex items-center gap-2"><Flame size={14} /> Contribution Activity</h4>
                                <img src={'https://ghchart.rshah.org/39d353/' + githubUsername} alt="GitHub Contribution Chart"
                                    className="w-full rounded opacity-90" style={{ filter: 'brightness(0.95)' }} />
                            </div>

                            {/* GitHub Stats Card */}
                            <div className="retro-panel p-5 border-green-400/10">
                                <h4 className="text-sm font-mono uppercase tracking-widest text-green-400 mb-4 flex items-center gap-2"><Code2 size={14} /> Language & Stats</h4>
                                <div className="flex flex-wrap gap-4">
                                    <img src={'https://github-readme-stats.vercel.app/api?username=' + githubUsername + '&show_icons=true&theme=dark&bg_color=0d1117&border_color=30363d&title_color=39d353&icon_color=39d353&text_color=8b949e&hide_border=false'}
                                        alt="GitHub Stats" className="rounded" style={{ maxHeight: '180px' }} />
                                    <img src={'https://github-readme-stats.vercel.app/api/top-langs/?username=' + githubUsername + '&layout=compact&theme=dark&bg_color=0d1117&border_color=30363d&title_color=39d353&text_color=8b949e'}
                                        alt="Top Languages" className="rounded" style={{ maxHeight: '180px' }} />
                                </div>
                            </div>

                            {/* Top Repos */}
                            {repos.length > 0 && (
                                <div className="retro-panel p-5 border-green-400/10">
                                    <h4 className="text-sm font-mono uppercase tracking-widest text-green-400 mb-4 flex items-center gap-2"><GitFork size={14} /> Top Repositories</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {repos.map(repo => (
                                            <a key={repo.name} href={repo.html_url} target="_blank" rel="noreferrer"
                                                className="retro-panel p-4 border-green-400/10 hover:border-green-400/40 transition-colors group">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h5 className="text-brand-primary font-mono text-sm font-bold group-hover:text-green-400 transition-colors truncate">{repo.name}</h5>
                                                    <ExternalLink size={12} className="text-brand-secondary/40 group-hover:text-green-400 flex-shrink-0 ml-2 mt-0.5" />
                                                </div>
                                                {repo.description && <p className="text-brand-secondary text-xs mb-3 line-clamp-2">{repo.description}</p>}
                                                <div className="flex items-center gap-3 text-xs font-mono text-brand-secondary/70">
                                                    {repo.language && <span className="flex items-center gap-1"><Code2 size={10} /> {repo.language}</span>}
                                                    <span className="flex items-center gap-1"><Star size={10} /> {repo.stargazers_count}</span>
                                                    <span className="flex items-center gap-1"><GitFork size={10} /> {repo.forks_count}</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* What to improve based on stats */}
                            <div className="retro-panel p-5 border-yellow-400/20 bg-yellow-400/3">
                                <h4 className="text-sm font-mono uppercase tracking-widest text-yellow-400 mb-4 flex items-center gap-2"><Zap size={14} /> Profile Improvements</h4>
                                <div className="space-y-3">
                                    {stats && stats.public_repos < 10 && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                                            <p className="text-sm font-mono text-brand-secondary">Only <span className="text-red-400">{stats.public_repos} repos</span> — aim for 15+ public projects to look active.</p>
                                        </div>
                                    )}
                                    {stats && stats.followers < 50 && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                                            <p className="text-sm font-mono text-brand-secondary"><span className="text-yellow-400">{stats.followers} followers</span> — engage in open source to grow your network.</p>
                                        </div>
                                    )}
                                    {totalStars < 20 && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                                            <p className="text-sm font-mono text-brand-secondary"><span className="text-yellow-400">{totalStars} stars</span> — build tools others want to use. Share on Reddit and Twitter.</p>
                                        </div>
                                    )}
                                    {!stats?.bio && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                                            <p className="text-sm font-mono text-brand-secondary"><span className="text-red-400">No bio set</span> — add a short tagline like "CS student | Open Source | React".</p>
                                        </div>
                                    )}
                                    {stats && dominantLang && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                                            <p className="text-sm font-mono text-brand-secondary">Primary language: <span className="text-green-400">{dominantLang}</span>. Diversify with 2–3 languages for better employer appeal.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── PROGRAMS TAB ──────────────────────────────────────────────── */}
            {tab === 'programs' && (
                <div className="space-y-4">
                    <div className="retro-panel p-4 border-green-400/20 bg-green-400/5 flex items-start gap-3">
                        <Award size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-mono text-brand-secondary">
                            These are the best open source programs to build your GitHub profile, get paid internships, and land top tech jobs. Click any card to see how to get in.
                        </p>
                    </div>
                    {OS_PROGRAMS.map(p => (
                        <div key={p.short} className={'retro-panel border cursor-pointer transition-all duration-200 ' + p.border + ' ' + (expandedProgram === p.short ? p.bg : '')}
                            onClick={() => setExpandedProgram(expandedProgram === p.short ? null : p.short)}>
                            <div className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={'font-mono font-bold text-lg ' + p.color}>{p.short}</span>
                                        <span className="text-brand-secondary font-mono text-sm">{p.name}</span>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${p.difficulty === 'Beginner' ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'}`}>
                                            {p.difficulty}
                                        </span>
                                    </div>
                                    <ArrowRight size={16} className={`text-brand-secondary/40 transition-transform ${expandedProgram === p.short ? 'rotate-90' : ''}`} />
                                </div>
                                <p className="text-xs font-mono text-brand-secondary mt-2">{p.description}</p>
                                <div className="flex items-center gap-2 mt-3 text-xs font-mono text-brand-secondary/60">
                                    <Calendar size={12} /> {p.timeline}
                                </div>
                            </div>
                            {expandedProgram === p.short && (
                                <div className={'p-5 pt-0 border-t ' + p.border}>
                                    <h4 className={'text-xs font-mono uppercase tracking-widest mb-3 flex items-center gap-2 ' + p.color}><CheckCircle size={12} /> How to Get In</h4>
                                    <ul className="space-y-2">
                                        {p.tips.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm font-mono text-brand-secondary">
                                                <span className={'text-xs mt-0.5 flex-shrink-0 ' + p.color}>{i + 1}.</span> {tip}
                                            </li>
                                        ))}
                                    </ul>
                                    <a href={p.link} target="_blank" rel="noreferrer"
                                        className={'mt-4 inline-flex items-center gap-2 px-3 py-1.5 border rounded font-mono text-xs transition-colors hover:bg-opacity-10 ' + p.color + ' ' + p.border}>
                                        Apply / Learn More <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── ROADMAP TAB ───────────────────────────────────────────────── */}
            {tab === 'roadmap' && (
                <div className="space-y-4">
                    <div className="retro-panel p-4 border-brand-accent/20 bg-brand-accent/5 flex items-start gap-3">
                        <Zap size={20} className="text-brand-accent flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-mono text-brand-secondary">
                            A level-by-level guide to turning a basic GitHub profile into a <span className="text-brand-primary">recruiter magnet</span> and open source contributor identity.
                        </p>
                    </div>
                    {GITHUB_ROADMAP.map(level => (
                        <div key={level.level} className="retro-panel border border-brand-border/30 cursor-pointer"
                            onClick={() => setExpandedStep(expandedStep === level.level ? null : level.level)}>
                            <div className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className={`text-2xl font-bold font-mono ${level.color}`}>0{level.level}</span>
                                    <div>
                                        <h4 className={'font-bold font-mono text-sm ' + level.color}>{level.title}</h4>
                                        <p className="text-xs text-brand-secondary font-mono mt-0.5">{level.steps.length} actionable steps</p>
                                    </div>
                                </div>
                                <ArrowRight size={16} className={`text-brand-secondary/40 transition-transform ${expandedStep === level.level ? 'rotate-90' : ''}`} />
                            </div>
                            {expandedStep === level.level && (
                                <div className="px-5 pb-5 border-t border-brand-border/20">
                                    <ul className="space-y-3 mt-4">
                                        {level.steps.map((step, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <CheckCircle size={14} className={level.color + ' flex-shrink-0 mt-0.5'} />
                                                <p className="text-sm font-mono text-brand-secondary">{step}</p>
                                            </li>
                                        ))}
                                    </ul>
                                    <a href={level.link} target="_blank" rel="noreferrer"
                                        className={'mt-4 inline-flex items-center gap-2 px-3 py-1.5 border border-brand-border/30 rounded font-mono text-xs transition-colors hover:border-brand-primary/40 ' + level.color}>
                                        <Globe size={12} /> {level.linkText}
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
