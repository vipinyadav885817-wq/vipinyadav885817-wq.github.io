const welcomeText = document.getElementById("welcomeText");
const logoutBtn = document.getElementById("logoutBtn");
const resetProgressButton = document.getElementById("resetProgress");
const courseList = document.getElementById("dashboardCourses");
const dashboardMessage = document.getElementById("dashboardMessage");

const courses = window.cyberShieldCurriculum;

const authClient = window.cyberShieldAuth;
let currentUser;
let completedLessons = {};
let progressSaveQueue = Promise.resolve();
let expandedLessons = new Set();

function showDashboardError(text) {
    dashboardMessage.textContent = text;
    dashboardMessage.classList.add("error");
}

async function initializeDashboard() {
    if (!authClient) {
        showDashboardError("Secure sign-in is not connected yet. Please check back after setup.");
        return;
    }

    try {
        const { data, error } = await authClient.auth.getUser();
        if (error || !data.user) {
            window.location.replace("auth.html");
            return;
        }

        currentUser = data.user;
        const name = (currentUser.user_metadata && currentUser.user_metadata.full_name) || "Learner";
        welcomeText.textContent = "Welcome, " + name + ".";
        completedLessons = await loadProgress();
        renderDashboard();
    } catch (error) {
        console.error("Could not load the signed-in learner.", error);
        showDashboardError("Could not load your account. Refresh the page and try again.");
    }
}

async function loadProgress() {
    const { data, error } = await authClient
        .from("user_progress")
        .select("completed_lessons")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error("Could not load synced learning progress.", error);
        showDashboardError("Progress could not be loaded. The site owner may need to finish database setup.");
        return {};
    }

    if (!data && currentUser.email) {
        const legacyKey = "cybershieldProgress_" + encodeURIComponent(currentUser.email.toLowerCase());
        try {
            const saved = localStorage.getItem(legacyKey);
            if (saved) {
                const legacyProgress = JSON.parse(saved);
                if (legacyProgress && typeof legacyProgress === "object" && !Array.isArray(legacyProgress)) {
                    const { error: migrationError } = await authClient.from("user_progress").upsert({
                        user_id: currentUser.id,
                        completed_lessons: legacyProgress,
                        updated_at: new Date().toISOString()
                    }, { onConflict: "user_id" });
                    if (migrationError) {
                        console.error("Could not migrate local learning progress.", migrationError);
                        showDashboardError("Your earlier progress remains on this browser and could not be synced yet.");
                    } else {
                        localStorage.removeItem(legacyKey);
                    }
                    return legacyProgress;
                }
            }
        } catch (migrationError) {
            console.error("Could not read earlier learning progress.", migrationError);
        }
    }

    const progress = data && data.completed_lessons;
    return progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
}

initializeDashboard();

function makeSvgElement(name, attributes, value) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attributes || {}).forEach(function(key) {
        element.setAttribute(key, attributes[key]);
    });
    if (value) element.textContent = value;
    return element;
}

function renderCourseDiagram(course) {
    if (!course.diagram) return null;

    const spec = course.diagram;
    const accent = spec.accent || "#55c4ff";
    const figure = document.createElement("figure");
    figure.className = "course-map";
    const svg = makeSvgElement("svg", {
        viewBox: "0 0 560 176",
        role: "img",
        "aria-label": course.title + " concept map. " + spec.caption
    });
    svg.appendChild(makeSvgElement("rect", {
        x: "1", y: "1", width: "558", height: "174", rx: "15",
        fill: "#091827", stroke: "#243b52"
    }));
    svg.appendChild(makeSvgElement("text", {
        x: "20", y: "25", class: "diagram-label"
    }, "CYBERSHIELD FIELD MAP"));

    function drawBox(label, x, y, width, height, number) {
        svg.appendChild(makeSvgElement("rect", {
            x: String(x), y: String(y), width: String(width), height: String(height),
            rx: "11", fill: "#10253a", stroke: accent, "stroke-width": "1.5"
        }));
        svg.appendChild(makeSvgElement("circle", {
            cx: String(x + 14), cy: String(y + 14), r: "9", fill: accent, opacity: ".18"
        }));
        svg.appendChild(makeSvgElement("text", {
            x: String(x + 14), y: String(y + 17), class: "diagram-number",
            "text-anchor": "middle", fill: accent
        }, String(number)));
        svg.appendChild(makeSvgElement("text", {
            x: String(x + width / 2), y: String(y + height / 2 + 4),
            class: "diagram-node-label", "text-anchor": "middle"
        }, label));
    }

    function drawLine(x1, y1, x2, y2) {
        svg.appendChild(makeSvgElement("line", {
            x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2),
            stroke: accent, "stroke-width": "2", "stroke-dasharray": "5 5", opacity: ".8"
        }));
        svg.appendChild(makeSvgElement("circle", {
            cx: String(x2 - 5), cy: String(y2), r: "3.5", fill: accent
        }));
    }

    if (spec.kind === "triangle") {
        const points = [{ x: 280, y: 82 }, { x: 170, y: 139 }, { x: 390, y: 139 }];
        [[0, 1], [1, 2], [2, 0]].forEach(function(pair) {
            svg.appendChild(makeSvgElement("line", {
                x1: String(points[pair[0]].x), y1: String(points[pair[0]].y),
                x2: String(points[pair[1]].x), y2: String(points[pair[1]].y),
                stroke: accent, "stroke-width": "2", opacity: ".75"
            }));
        });
        spec.nodes.forEach(function(label, index) {
            const point = points[index];
            svg.appendChild(makeSvgElement("circle", {
                cx: String(point.x), cy: String(point.y), r: "54",
                fill: "#10253a", stroke: accent, "stroke-width": "2"
            }));
            svg.appendChild(makeSvgElement("text", {
                x: String(point.x), y: String(point.y + 4), class: "diagram-node-label",
                "text-anchor": "middle"
            }, label));
        });
    } else if (spec.kind === "stack") {
        svg.appendChild(makeSvgElement("line", {
            x1: "280", y1: "45", x2: "280", y2: "148",
            stroke: accent, "stroke-width": "2", "stroke-dasharray": "4 5"
        }));
        spec.nodes.forEach(function(label, index) {
            const y = 40 + index * 31;
            svg.appendChild(makeSvgElement("rect", {
                x: "158", y: String(y), width: "244", height: "24", rx: "8",
                fill: "#10253a", stroke: accent, "stroke-width": "1.3"
            }));
            svg.appendChild(makeSvgElement("text", {
                x: "280", y: String(y + 16), class: "diagram-node-label", "text-anchor": "middle"
            }, label));
        });
    } else if (spec.kind === "scope") {
        svg.appendChild(makeSvgElement("rect", {
            x: "11", y: "40", width: "538", height: "111", rx: "13",
            fill: "none", stroke: accent, "stroke-width": "1.5", "stroke-dasharray": "7 6"
        }));
        svg.appendChild(makeSvgElement("text", {
            x: "280", y: "36", class: "diagram-label", "text-anchor": "middle", fill: accent
        }, "AUTHORIZED SCOPE"));
        spec.nodes.forEach(function(label, index) {
            const x = 20 + index * 136;
            if (index > 0) drawLine(x - 19, 96, x - 3, 96);
            drawBox(label, x, 70, 116, 52, index + 1);
        });
    } else {
        const width = 118;
        const gap = 20;
        const start = 10;
        spec.nodes.forEach(function(label, index) {
            const x = start + index * (width + gap);
            if (index > 0) drawLine(x - gap + 3, 89, x - 5, 89);
            drawBox(label, x, 62, width, 54, index + 1);
        });
    }

    const caption = document.createElement("figcaption");
    caption.textContent = spec.caption;
    figure.append(svg, caption);
    return figure;
}

function addLessonPanel(parent, headingText, bodyText, className) {
    if (!bodyText) return;
    const panel = document.createElement("section");
    panel.className = "lesson-panel" + (className ? " " + className : "");
    const heading = document.createElement("h4");
    heading.textContent = headingText;
    const body = document.createElement("p");
    body.textContent = bodyText;
    panel.append(heading, body);
    parent.append(panel);
}

function renderLessonContent(lesson, course) {
    const content = document.createElement("div");
    content.className = "lesson-content";
    content.hidden = true;

    const meta = document.createElement("div");
    meta.className = "lesson-meta";
    const level = document.createElement("span");
    level.className = "lesson-level";
    level.textContent = lesson.level + " LEVEL";
    const time = document.createElement("span");
    time.textContent = lesson.minutes + " MIN READ";
    meta.append(level, time);

    const reading = document.createElement("div");
    reading.className = "lesson-reading";
    (lesson.read || []).forEach(function(paragraphText) {
        const paragraph = document.createElement("p");
        paragraph.textContent = paragraphText;
        reading.append(paragraph);
    });
    content.append(meta, reading);
    addLessonPanel(content, "REAL-WORLD EXAMPLE", lesson.example, "lesson-example");
    addLessonPanel(content, "SAFE PRACTICE", lesson.practice, "lesson-practice");

    if (lesson.question && lesson.answer) {
        const check = document.createElement("details");
        check.className = "lesson-check";
        const summary = document.createElement("summary");
        summary.textContent = "Quick check";
        const question = document.createElement("p");
        question.textContent = lesson.question;
        const answer = document.createElement("details");
        answer.className = "lesson-answer";
        const answerSummary = document.createElement("summary");
        answerSummary.textContent = "Show answer";
        const answerText = document.createElement("p");
        answerText.textContent = lesson.answer;
        answer.append(answerSummary, answerText);
        check.append(summary, question, answer);
        content.append(check);
    }

    if (course.references && course.references.length) {
        const readingLink = document.createElement("a");
        readingLink.className = "lesson-reference";
        readingLink.href = course.references[0].url;
        readingLink.target = "_blank";
        readingLink.rel = "noopener noreferrer";
        readingLink.textContent = "Trusted source: " + course.references[0].label;
        content.append(readingLink);
    }
    return content;
}

function renderDashboard() {
    courseList.replaceChildren();

    courses.forEach(function(course) {
        const card = document.createElement("article");
        card.className = "dashboard-course";

        const header = document.createElement("div");
        header.className = "dashboard-course-head";
        const headingGroup = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = course.title;
        const description = document.createElement("p");
        description.textContent = course.description;
        headingGroup.append(title, description);
        const category = document.createElement("span");
        category.className = "course-count";
        category.textContent = course.category + " · " + course.lessons.length + " LESSONS";
        header.append(headingGroup, category);

        const doneCount = course.lessons.filter(function(lesson, index) {
            return Boolean(completedLessons[`${course.id}-${index}`]);
        }).length;
        const progressBar = document.createElement("div");
        progressBar.className = "dashboard-progress";
        progressBar.setAttribute("role", "progressbar");
        progressBar.setAttribute("aria-label", `${course.title} progress`);
        progressBar.setAttribute("aria-valuemin", "0");
        progressBar.setAttribute("aria-valuemax", String(course.lessons.length));
        progressBar.setAttribute("aria-valuenow", String(doneCount));
        const progressFill = document.createElement("span");
        progressFill.style.width = `${Math.round(doneCount / course.lessons.length * 100)}%`;
        progressBar.append(progressFill);

        const countLabel = document.createElement("span");
        countLabel.className = "course-count";
        countLabel.textContent = `${doneCount} of ${course.lessons.length} lessons complete`;

        const lessonList = document.createElement("ul");
        lessonList.className = "lesson-list";
        course.lessons.forEach(function(lesson, index) {
            const lessonId = `${course.id}-${index}`;
            const item = document.createElement("li");
            item.className = "lesson-item";
            const lessonHeader = document.createElement("div");
            lessonHeader.className = "lesson-header";
            const expandButton = document.createElement("button");
            expandButton.className = "lesson-expand";
            expandButton.type = "button";
            expandButton.textContent = lesson.title;
            const isExpanded = expandedLessons.has(lessonId);
            expandButton.setAttribute("aria-expanded", String(isExpanded));
            const levelBadge = document.createElement("span");
            levelBadge.className = "lesson-row-level";
            levelBadge.textContent = lesson.level;
            const lessonContent = renderLessonContent(lesson, course);
            lessonContent.hidden = !isExpanded;
            expandButton.addEventListener("click", function() {
                const open = expandedLessons.has(lessonId);
                if (open) expandedLessons.delete(lessonId);
                else expandedLessons.add(lessonId);
                lessonContent.hidden = open;
                expandButton.setAttribute("aria-expanded", String(!open));
            });
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `lesson-${lessonId}`;
            checkbox.checked = Boolean(completedLessons[lessonId]);
            checkbox.dataset.lessonId = lessonId;
            checkbox.dataset.courseId = course.id;
            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.textContent = "Done";
            lessonHeader.append(expandButton, levelBadge, checkbox, label);
            item.append(lessonHeader, lessonContent);
            lessonList.append(item);
        });

        card.append(header);
        const diagram = renderCourseDiagram(course);
        if (diagram) card.append(diagram);
        card.append(progressBar, countLabel, lessonList);
        courseList.append(card);
    });

    courseList.querySelectorAll("input[type=checkbox]").forEach(function(checkbox) {
        checkbox.addEventListener("change", function() {
            completedLessons[checkbox.dataset.lessonId] = checkbox.checked;
            saveProgress();
            renderDashboard();
        });
    });

    updateStats();
}

function saveProgress() {
    if (!authClient || !currentUser) return Promise.resolve();

    const snapshot = Object.assign({}, completedLessons);
    progressSaveQueue = progressSaveQueue.then(async function() {
        const { error } = await authClient.from("user_progress").upsert({
            user_id: currentUser.id,
            completed_lessons: snapshot,
            updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        if (error) {
            console.error("Could not save synced learning progress.", error);
            showDashboardError("Progress could not be saved. Check your connection and try again.");
            return;
        }
        dashboardMessage.textContent = "";
        dashboardMessage.classList.remove("error");
    }).catch(function(error) {
        console.error("Could not save synced learning progress.", error);
        showDashboardError("Progress could not be saved. Check your connection and try again.");
    });

    return progressSaveQueue;
}
function updateStats() {
    const completedCount = Object.values(completedLessons).filter(Boolean).length;
    const totalLessons = courses.reduce(function(total, course) {
        return total + course.lessons.length;
    }, 0);
    const startedCount = courses.filter(function(course) {
        return course.lessons.some(function(lesson, index) {
            return Boolean(completedLessons[`${course.id}-${index}`]);
        });
    }).length;

    document.getElementById("pathsStarted").textContent = String(startedCount);
    document.getElementById("lessonsCompleted").textContent = String(completedCount);
    document.getElementById("overallProgress").textContent = `${Math.round(completedCount / totalLessons * 100)}%`;
}

resetProgressButton.addEventListener("click", async function() {
    if (!window.confirm("Reset all lesson progress for your account?")) return;
    completedLessons = {};
    renderDashboard();
    await saveProgress();
});
logoutBtn.addEventListener("click", async function() {
    if (!authClient) {
        window.location.replace("auth.html");
        return;
    }
    logoutBtn.disabled = true;
    try {
        await progressSaveQueue;
        const { error } = await authClient.auth.signOut();
        if (error) throw error;
        window.location.replace("auth.html");
    } catch (error) {
        console.error("Could not sign out.", error);
        showDashboardError("Could not sign out. Check your connection and try again.");
        logoutBtn.disabled = false;
    }
});
