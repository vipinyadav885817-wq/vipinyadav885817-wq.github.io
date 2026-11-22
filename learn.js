(function() {
    const courses = window.cyberShieldCurriculum || [];
    const pathFilters = document.getElementById("pathFilters");
    const catalog = document.getElementById("lessonCatalog");
    const reader = document.getElementById("lessonReader");
    const searchInput = document.getElementById("lessonSearch");
    const levelFilter = document.getElementById("levelFilter");
    const noResults = document.getElementById("noResults");
    const progressKey = "cybershieldPublicProgress";
    const totalLessons = courses.reduce(function(total, course) { return total + course.lessons.length; }, 0);
    let activeCourseId = "";
    let selectedLessonKey = "";
    let completed = readProgress();

    function readProgress() {
        try {
            const value = JSON.parse(localStorage.getItem(progressKey) || "{}");
            return value && typeof value === "object" && !Array.isArray(value) ? value : {};
        } catch (error) {
            return {};
        }
    }

    function makeElement(name, className, text) {
        const element = document.createElement(name);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function activeCourse() {
        return courses.find(function(course) { return course.id === activeCourseId; }) || null;
    }

    function visibleLessons() {
        const query = searchInput.value.trim().toLowerCase();
        const level = levelFilter.value;
        const selectedCourses = activeCourseId === "all" ? courses : courses.filter(function(course) { return course.id === activeCourseId; });
        return selectedCourses.flatMap(function(course) {
            return course.lessons.map(function(lesson, index) { return { course: course, lesson: lesson, index: index }; });
        }).filter(function(item) {
            const text = [item.course.title, item.course.category, item.lesson.title, item.lesson.level,
                (item.lesson.read || []).join(" "), item.lesson.code || "", item.lesson.example, item.lesson.practice, item.lesson.question].join(" ").toLowerCase();
            return (level === "all" || item.lesson.level === level) && (!query || text.includes(query));
        });
    }

    function setPathButtons() {
        pathFilters.replaceChildren();
        const buttons = [{ id: "all", title: "All topics", category: totalLessons + " lessons" }].concat(courses.map(function(course) {
            return { id: course.id, title: course.title, category: course.category + " · " + course.lessons.length };
        }));
        buttons.forEach(function(item) {
            const button = makeElement("button", "learn-path-button");
            button.type = "button";
            button.dataset.pathId = item.id;
            button.setAttribute("aria-pressed", String(activeCourseId === item.id));
            button.classList.toggle("active", activeCourseId === item.id);
            button.append(makeElement("span", "learn-path-name", item.title), makeElement("span", "learn-path-count", item.category));
            button.addEventListener("click", function() {
                activeCourseId = item.id;
                searchInput.value = "";
                levelFilter.value = "all";
                const first = visibleLessons()[0];
                selectedLessonKey = first ? first.course.id + "-" + first.index : "";
                updateUrl(first);
                render();
            });
            pathFilters.append(button);
        });
    }

    function updateCourseHeading() {
        const course = activeCourse();
        document.getElementById("activeCourseKicker").textContent = course ? course.category + " · " + course.lessons.length + " LESSONS" : "FULL LIBRARY · " + totalLessons + " LESSONS";
        document.getElementById("activeCourseTitle").textContent = course ? course.title : "Explore every learning path";
        document.getElementById("activeCourseDescription").textContent = course ? course.description : "Search across every beginner-to-advanced technology and security path.";
    }

    function updateUrl(item) {
        const params = new URLSearchParams();
        params.set("path", activeCourseId || "all");
        if (item) params.set("lesson", String(item.index));
        const page = document.body.classList.contains("article-only") ? "article.html" : "learn.html";
        history.replaceState(null, "", page + "?" + params.toString() + (page === "learn.html" ? "#library" : ""));
    }

    function renderCatalog() {
        const items = visibleLessons();
        const currentKey = selectedLessonKey;
        if (!items.some(function(item) { return item.course.id + "-" + item.index === currentKey; })) {
            selectedLessonKey = items.length ? items[0].course.id + "-" + items[0].index : "";
        }
        catalog.replaceChildren();
        items.forEach(function(item) {
            const key = item.course.id + "-" + item.index;
            const button = makeElement("button", "learn-topic-button");
            button.type = "button";
            button.classList.toggle("active", key === selectedLessonKey);
            button.setAttribute("aria-current", key === selectedLessonKey ? "true" : "false");
            const heading = makeElement("span", "learn-topic-title", item.lesson.title);
            const meta = makeElement("span", "learn-topic-meta");
            meta.append(makeElement("span", "lesson-row-level", item.lesson.level), makeElement("span", "learn-topic-time", item.lesson.minutes + " min"));
            if (completed[key]) meta.append(makeElement("span", "learn-topic-done", "READ"));
            button.append(heading, meta);
            button.addEventListener("click", function() {
                selectedLessonKey = key;
                updateUrl(item);
                renderCatalog();
                renderReader(item);
            });
            catalog.append(button);
        });
        document.getElementById("lessonCountLabel").textContent = items.length + (items.length === 1 ? " topic" : " topics");
        noResults.hidden = items.length > 0;
        if (!items.length) reader.replaceChildren();
        return items;
    }

    function createDiagram(course) {
        if (!course.diagram) return null;
        const spec = course.diagram;
        const figure = makeElement("figure", "course-map learn-course-map");
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 560 176");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", course.title + " concept map. " + spec.caption);
        function svgNode(tag, attrs, value) {
            const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
            Object.keys(attrs).forEach(function(key) { node.setAttribute(key, attrs[key]); });
            if (value) node.textContent = value;
            svg.append(node);
            return node;
        }
        const accent = spec.accent || "#55c4ff";
        svgNode("rect", { x: "1", y: "1", width: "558", height: "174", rx: "15", fill: "#091827", stroke: "#243b52" });
        svgNode("text", { x: "20", y: "25", class: "diagram-label" }, "CYBERSHIELD FIELD MAP");
        if (spec.kind === "triangle") {
            const points = [{ x: 280, y: 63 }, { x: 170, y: 135 }, { x: 390, y: 135 }];
            [[0, 1], [0, 2], [1, 2]].forEach(function(pair) {
                svgNode("line", { x1: points[pair[0]].x, y1: points[pair[0]].y, x2: points[pair[1]].x, y2: points[pair[1]].y, stroke: accent, "stroke-width": "2", "stroke-dasharray": "5 5" });
            });
            points.forEach(function(point, index) {
                svgNode("circle", { cx: point.x, cy: point.y, r: "38", fill: "#10253a", stroke: accent, "stroke-width": "2" });
                svgNode("text", { x: point.x, y: point.y + 4, class: "diagram-node-label", "text-anchor": "middle" }, spec.nodes[index]);
            });
        } else if (spec.kind === "stack") {
            spec.nodes.forEach(function(label, index) {
                const y = 39 + index * 31;
                svgNode("rect", { x: "155", y: String(y), width: "250", height: "25", rx: "8", fill: "#10253a", stroke: accent, "stroke-width": "1.4" });
                svgNode("text", { x: "280", y: String(y + 16), class: "diagram-node-label", "text-anchor": "middle" }, label);
            });
        } else {
            const count = spec.nodes.length;
            const width = count > 3 ? 116 : 145;
            const gap = count > 3 ? 20 : 25;
            const total = count * width + (count - 1) * gap;
            const start = (560 - total) / 2;
            spec.nodes.forEach(function(label, index) {
                const x = start + index * (width + gap);
                if (index > 0) svgNode("line", { x1: String(x - gap + 3), y1: "89", x2: String(x - 5), y2: "89", stroke: accent, "stroke-width": "2", "stroke-dasharray": "5 5" });
                svgNode("rect", { x: String(x), y: "61", width: String(width), height: "56", rx: "11", fill: "#10253a", stroke: accent, "stroke-width": "1.5" });
                svgNode("circle", { cx: String(x + 15), cy: "77", r: "9", fill: accent, opacity: ".2" });
                svgNode("text", { x: String(x + 15), y: "80", class: "diagram-number", "text-anchor": "middle", fill: accent }, String(index + 1));
                svgNode("text", { x: String(x + width / 2), y: "93", class: "diagram-node-label", "text-anchor": "middle" }, label);
            });
        }
        figure.append(svg, makeElement("figcaption", "", spec.caption));
        return figure;
    }

    function addPanel(parent, title, text, className) {
        if (!text) return;
        const panel = makeElement("section", "lesson-panel " + className);
        panel.append(makeElement("h3", "", title), makeElement("p", "", text));
        parent.append(panel);
    }

    function renderReader(item) {
        if (!item) return;
        const course = item.course;
        const lesson = item.lesson;
        const key = course.id + "-" + item.index;
        reader.replaceChildren();
        reader.classList.remove("reader-empty");
        const head = makeElement("header", "topic-reader-head");
        const crumb = makeElement("p", "topic-breadcrumb", course.title + "  /  Lesson " + (item.index + 1) + " of " + course.lessons.length);
        const title = makeElement("h1", "", lesson.title);
        const meta = makeElement("div", "lesson-meta");
        meta.append(makeElement("span", "lesson-level", lesson.level + " LEVEL"), makeElement("span", "", lesson.minutes + " MIN READ"));
        const doneLabel = makeElement("label", "lesson-done-toggle");
        const done = document.createElement("input");
        done.type = "checkbox";
        done.checked = Boolean(completed[key]);
        done.setAttribute("aria-label", "Mark " + lesson.title + " as read");
        done.addEventListener("change", function() {
            if (done.checked) completed[key] = true;
            else delete completed[key];
            try { localStorage.setItem(progressKey, JSON.stringify(completed)); } catch (error) {}
            renderProgress();
            renderCatalog();
            renderReader(item);
        });
        doneLabel.append(done, makeElement("span", "", done.checked ? "Read" : "Mark as read"));
        head.append(crumb, title, meta, doneLabel);
        const articleLink = makeElement("a", "learn-article-link", document.body.classList.contains("article-only") ? "← Back to all topics" : "Open this topic as an article ↗");
        articleLink.href = document.body.classList.contains("article-only") ? "learn.html?path=" + encodeURIComponent(course.id) + "&lesson=" + item.index + "#library" : "article.html?path=" + encodeURIComponent(course.id) + "&lesson=" + item.index;
        head.append(articleLink);
        document.title = lesson.title + " | " + course.title + " | CyberShield Academy";
        reader.append(head);
        const diagram = createDiagram(course);
        if (diagram) reader.append(diagram);
        const reading = makeElement("div", "topic-reading");
        (lesson.read || []).forEach(function(paragraph) { reading.append(makeElement("p", "", paragraph)); });
        reader.append(reading);
        if (lesson.code) {
            const codePanel = makeElement("section", "lesson-code-block");
            const codeHead = makeElement("div", "lesson-code-head");
            codeHead.append(makeElement("span", "", "CODE EXAMPLE"), makeElement("span", "lesson-code-language", lesson.codeLanguage || "CODE"));
            const pre = document.createElement("pre");
            pre.append(makeElement("code", "", lesson.code));
            codePanel.append(codeHead, pre);
            reader.append(codePanel);
        }
        addPanel(reader, "REAL-WORLD EXAMPLE", lesson.example, "lesson-example");
        addPanel(reader, "SAFE PRACTICE", lesson.practice, "lesson-practice");
        if (lesson.question && lesson.answer) {
            const check = document.createElement("details");
            check.className = "lesson-check topic-quick-check";
            check.append(makeElement("summary", "", "Quick check"), makeElement("p", "", lesson.question));
            const answer = document.createElement("details");
            answer.className = "lesson-answer";
            answer.append(makeElement("summary", "", "Show answer"), makeElement("p", "", lesson.answer));
            check.append(answer);
            reader.append(check);
        }
        if (course.references && course.references.length) {
            const links = makeElement("div", "topic-references");
            course.references.forEach(function(reference) {
                const link = makeElement("a", "lesson-reference", "Trusted source: " + reference.label + " ↗");
                link.href = reference.url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                links.append(link);
            });
            reader.append(links);
        }
        const lessonNav = makeElement("nav", "topic-next-nav");
        lessonNav.setAttribute("aria-label", "Move between lessons");
        const previous = makeElement("button", "small-button", "← Previous");
        previous.type = "button";
        previous.disabled = item.index === 0;
        previous.addEventListener("click", function() { selectLesson(course.id, item.index - 1); });
        const next = makeElement("button", "button button-primary", "Next lesson →");
        next.type = "button";
        next.disabled = item.index >= course.lessons.length - 1;
        next.addEventListener("click", function() { selectLesson(course.id, item.index + 1); });
        lessonNav.append(previous, next);
        reader.append(lessonNav);
    }

    function selectLesson(courseId, index) {
        const course = courses.find(function(item) { return item.id === courseId; });
        if (!course || !course.lessons[index]) return;
        activeCourseId = courseId;
        selectedLessonKey = courseId + "-" + index;
        setPathButtons();
        updateCourseHeading();
        const item = { course: course, lesson: course.lessons[index], index: index };
        updateUrl(item);
        renderCatalog();
        renderReader(item);
        if (window.matchMedia("(max-width: 800px)").matches) reader.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderProgress() {
        const count = Object.keys(completed).filter(function(key) { return completed[key]; }).length;
        const countText = count + " of " + totalLessons + " lessons read";
        document.getElementById("learnPathCount").textContent = String(courses.length);
        document.getElementById("learnTotalCount").textContent = String(totalLessons);
        document.getElementById("learnSidebarPathCount").textContent = courses.length + " PATHS";
        document.getElementById("learnProgressCount").textContent = count + " / " + totalLessons;
        document.getElementById("learnProgressText").textContent = countText;
        const bar = document.getElementById("learnProgressFill");
        bar.style.width = totalLessons ? Math.round(count / totalLessons * 100) + "%" : "0%";
        bar.parentElement.setAttribute("aria-valuemax", String(totalLessons));
        bar.parentElement.setAttribute("aria-valuenow", String(count));
    }

    function render() {
        setPathButtons();
        updateCourseHeading();
        const items = renderCatalog();
        const selected = items.find(function(item) { return item.course.id + "-" + item.index === selectedLessonKey; }) || items[0];
        if (selected) {
            selectedLessonKey = selected.course.id + "-" + selected.index;
            renderReader(selected);
        }
        renderProgress();
    }

    if (!courses.length) {
        document.getElementById("activeCourseTitle").textContent = "Lessons could not be loaded";
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedPath = params.get("path") || courses[0].id;
    activeCourseId = requestedPath === "all" || courses.some(function(course) { return course.id === requestedPath; }) ? requestedPath : courses[0].id;
    const requestedCourse = courses.find(function(course) { return course.id === activeCourseId; }) || courses[0];
    const requestedIndex = Math.max(0, Math.min(Number(params.get("lesson")) || 0, requestedCourse.lessons.length - 1));
    selectedLessonKey = requestedCourse.id + "-" + requestedIndex;
    searchInput.addEventListener("input", render);
    levelFilter.addEventListener("change", render);
    render();
})();

